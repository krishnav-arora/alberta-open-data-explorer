"use client";

import { useEffect, useState } from "react";

type Record = {
  csduid: string;
  municipality: string;
  year: number;
  population: number;
  sourceRows: number;
  sourceKey: string;
  sourceUrl: string;
};
type Comparison = {
  from: Record;
  to: Record;
  change: number;
  percentChange: number | null;
};
type Metadata = {
  years: number[];
  records: number;
  municipalities: number;
  sourceUrl: string;
  datasetUrl: string;
};
type Summary = {
  available: boolean;
  text: string | null;
  reason: string | null;
  sourceKeys: string[];
};

const number = new Intl.NumberFormat("en-CA");
const signed = (value: number) =>
  `${value > 0 ? "+" : ""}${number.format(value)}`;
const params = (
  fromId: string,
  fromYear: number,
  toId: string,
  toYear: number,
) =>
  new URLSearchParams({
    fromId,
    fromYear: String(fromYear),
    toId,
    toYear: String(toYear),
  });

export default function Home() {
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [query, setQuery] = useState("");
  const [searchYear, setSearchYear] = useState(2025);
  const [results, setResults] = useState<Record[]>([]);
  const [fromId, setFromId] = useState("4806016");
  const [toId, setToId] = useState("4806016");
  const [fromYear, setFromYear] = useState(2001);
  const [toYear, setToYear] = useState(2025);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metadata")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((value: Metadata) => setMeta(value))
      .catch(() =>
        setError(
          "The API is unavailable. Start the Spring Boot server on port 8080.",
        ),
      );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `/api/municipalities?q=${encodeURIComponent(query)}&year=${searchYear}&limit=100`,
        { signal: controller.signal },
      )
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((value: Record[]) => setResults(value))
        .catch(() => {
          if (!controller.signal.aborted)
            setError("Search could not load. Check the API server.");
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchYear]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSummary(null);
    fetch(`/api/compare?${params(fromId, fromYear, toId, toYear)}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((value: Comparison) => {
        setComparison(value);
        setError("");
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setComparison(null);
          setError(
            "A selected municipality/year has no complete source record.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [fromId, fromYear, toId, toYear]);

  async function loadSummary() {
    setSummary(null);
    try {
      const response = await fetch(
        `/api/summary?${params(fromId, fromYear, toId, toYear)}`,
      );
      if (!response.ok) throw new Error();
      setSummary(await response.json());
    } catch {
      setSummary({
        available: false,
        text: null,
        reason:
          "Summary could not load. The calculated comparison is still available.",
        sourceKeys: [],
      });
    }
  }

  const max = comparison
    ? Math.max(comparison.from.population, comparison.to.population, 1)
    : 1;

  return (
    <main>
      <header className="site-header">
        <div className="shell header-inner">
          <a
            className="brand"
            href="#top"
            aria-label="Alberta Open Data Explorer home"
          >
            <span className="brand-mark" aria-hidden="true">
              A
            </span>
            <span>
              Alberta Open Data
              <br />
              <strong>Explorer</strong>
            </span>
          </a>
          <a className="header-link" href="#source">
            About the data <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <section id="top" className="hero">
        <div className="shell hero-grid">
          <div>
            <p className="eyebrow">PUBLIC DATA · CLEAR COMPARISONS</p>
            <h1>See how Alberta communities have changed.</h1>
            <p className="hero-copy">
              Search municipality population estimates from 2001 to 2025.
              Compare two places or two years, with every figure tied to its
              source record.
            </p>
            <a className="primary-link" href="#explore">
              Explore the data <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-note" aria-label="Dataset at a glance">
            <span className="note-top">DATASET AT A GLANCE</span>
            <strong>{meta ? number.format(meta.municipalities) : "—"}</strong>
            <span>municipality codes</span>
            <hr />
            <div>
              <strong>
                {meta ? `${meta.years[0]}–${meta.years.at(-1)}` : "—"}
              </strong>
              <span>annual estimates</span>
            </div>
            <p>Government of Alberta · Population by municipality</p>
          </div>
        </div>
      </section>
      <div className="shell">
        <p className="notice">
          <span className="notice-dot" aria-hidden="true" /> Estimates are
          summed from age and gender rows. Six incomplete municipality/year
          groups are excluded.
        </p>
      </div>
      <section id="explore" className="shell section">
        <div className="section-heading">
          <div>
            <p className="eyebrow green">01 / EXPLORE</p>
            <h2>Find a municipality</h2>
            <p>
              Search by name or census subdivision code, then add a result to
              the comparison.
            </p>
          </div>
          <div className="filters">
            <label htmlFor="search">
              Municipality or code
              <input
                id="search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try Calgary or 4806016"
              />
            </label>
            <label htmlFor="search-year">
              Year
              <select
                id="search-year"
                value={searchYear}
                onChange={(e) => setSearchYear(Number(e.target.value))}
              >
                {(meta?.years ?? [2025]).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <caption>
              Population estimates for {searchYear}
              {query ? ` matching “${query}”` : ""}; first 100 results
            </caption>
            <thead>
              <tr>
                <th scope="col">Municipality</th>
                <th scope="col">CSDUID</th>
                <th scope="col" className="numeric">
                  Estimated population
                </th>
                <th scope="col">Compare</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.sourceKey}>
                  <th scope="row">{r.municipality}</th>
                  <td className="mono">{r.csduid}</td>
                  <td className="numeric value">
                    {number.format(r.population)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        aria-label={`Use ${r.municipality}, ${r.year} as A`}
                        onClick={() => {
                          setFromId(r.csduid);
                          setFromYear(r.year);
                        }}
                      >
                        Use as A
                      </button>
                      <button
                        type="button"
                        aria-label={`Use ${r.municipality}, ${r.year} as B`}
                        onClick={() => {
                          setToId(r.csduid);
                          setToYear(r.year);
                        }}
                      >
                        Use as B
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && (
            <p className="empty">No matches for this search and year.</p>
          )}
        </div>
      </section>
      <section className="compare-band">
        <div className="shell section">
          <div className="section-heading">
            <div>
              <p className="eyebrow green">02 / COMPARE</p>
              <h2>Put two estimates side by side</h2>
              <p>
                Choose a municipality from the table, then adjust either year.
              </p>
            </div>
          </div>
          <div className="compare-grid">
            <div className="select-card">
              <span className="card-label">A · START</span>
              <strong>{comparison?.from.municipality ?? fromId}</strong>
              <label htmlFor="from-year">
                Year
                <select
                  id="from-year"
                  value={fromYear}
                  onChange={(e) => setFromYear(Number(e.target.value))}
                >
                  {(meta?.years ?? [2001, 2025]).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="select-card">
              <span className="card-label">B · END</span>
              <strong>{comparison?.to.municipality ?? toId}</strong>
              <label htmlFor="to-year">
                Year
                <select
                  id="to-year"
                  value={toYear}
                  onChange={(e) => setToYear(Number(e.target.value))}
                >
                  {(meta?.years ?? [2001, 2025]).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="comparison-output" aria-live="polite">
            {loading && <p>Calculating comparison…</p>}
            {comparison && !loading && (
              <>
                <div className="result-top">
                  <div>
                    <span className="card-label">DIFFERENCE</span>
                    <strong>{signed(comparison.change)}</strong>
                    <span>
                      people{" "}
                      {comparison.percentChange === null
                        ? "· percentage unavailable from a zero baseline"
                        : `· ${comparison.percentChange > 0 ? "+" : ""}${comparison.percentChange}%`}
                    </span>
                  </div>
                  <p>
                    The difference is B minus A. Percentage difference uses A as
                    the baseline.
                  </p>
                </div>
                <div className="bars">
                  <div>
                    <span>
                      A · {comparison.from.municipality}, {comparison.from.year}
                    </span>
                    <div className="bar-track">
                      <div
                        className="bar a"
                        style={{
                          width: `${(comparison.from.population / max) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{number.format(comparison.from.population)}</strong>
                  </div>
                  <div>
                    <span>
                      B · {comparison.to.municipality}, {comparison.to.year}
                    </span>
                    <div className="bar-track">
                      <div
                        className="bar b"
                        style={{
                          width: `${(comparison.to.population / max) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{number.format(comparison.to.population)}</strong>
                  </div>
                </div>
                <p className="source-records">
                  Source records:{" "}
                  <a
                    href={comparison.from.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {comparison.from.sourceKey}
                  </a>{" "}
                  and{" "}
                  <a
                    href={comparison.to.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {comparison.to.sourceKey}
                  </a>
                  . Each estimate sums {comparison.from.sourceRows} age and
                  gender rows.
                </p>
                <div className="summary-box">
                  <div>
                    <strong>AI assisted explanation</strong>
                    <p>
                      The API checks the figures and writes the final wording
                      from verified values.
                    </p>
                  </div>
                  <button type="button" onClick={loadSummary}>
                    Explain comparison
                  </button>
                  {summary && (
                    <p className="summary-message" role="status">
                      {summary.available ? summary.text : summary.reason}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <p className="error" role="alert">
            {error}
          </p>
        </div>
      </section>
      <footer id="source">
        <div className="shell footer-grid">
          <div>
            <p className="eyebrow">SOURCE & METHOD</p>
            <h2>Check the numbers yourself.</h2>
            <p>
              Data: Government of Alberta, “Population by municipality.” The
              snapshot was made from the official CSV by summing all available
              ages and both genders for each municipality code and year.
              Incomplete groups are omitted.
            </p>
          </div>
          <div>
            <a
              href={
                meta?.datasetUrl ??
                "https://open.canada.ca/data/dataset/1bef4453-1dab-4f2a-bc63-2b3df318d47c"
              }
              target="_blank"
              rel="noreferrer"
            >
              Dataset catalogue ↗
            </a>
            <a
              href={
                meta?.sourceUrl ??
                "https://open.alberta.ca/dataset/1bef4453-1dab-4f2a-bc63-2b3df318d47c/resource/6b20754e-5a8c-4d2d-9995-b137459c1210/download/population.csv"
              }
              target="_blank"
              rel="noreferrer"
            >
              Download source CSV ↗
            </a>
            <a
              href="https://open.alberta.ca/opendata/1bef4453-1dab-4f2a-bc63-2b3df318d47c"
              target="_blank"
              rel="noreferrer"
            >
              Original metadata ↗
            </a>
            <small>
              Open Government Licence – Alberta. This independent portfolio
              project is not an official Government of Alberta service.
            </small>
          </div>
        </div>
      </footer>
    </main>
  );
}

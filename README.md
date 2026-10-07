# Alberta Open Data Explorer

A small portfolio MVP for exploring Alberta municipality population estimates. It pairs a Next.js interface with a Spring Boot REST API. Search by municipality name or census subdivision ID (CSDUID), filter by year, then compare two municipality/year records.

## Run locally

Requirements: Node.js 22+ and Java 23. Maven is downloaded automatically by the included wrapper.

In separate terminals:

```bash
cd api
./mvnw spring-boot:run
```

```bash
cd web
npm ci
npm run dev
```

Open http://localhost:3000. The Next.js server forwards `/api/*` to the Spring Boot API on port 8080. No account or API key is needed for search and comparison.

## Data provenance and method

- Source: Government of Alberta, [Population by municipality](https://open.canada.ca/data/dataset/1bef4453-1dab-4f2a-bc63-2b3df318d47c), [original Alberta metadata](https://open.alberta.ca/opendata/1bef4453-1dab-4f2a-bc63-2b3df318d47c), and [official CSV](https://open.alberta.ca/dataset/1bef4453-1dab-4f2a-bc63-2b3df318d47c/resource/6b20754e-5a8c-4d2d-9995-b137459c1210/download/population.csv). Licence: Open Government Licence – Alberta.
- The committed snapshot was generated on 2026-10-07 from that CSV (SHA-256 `12812bda03a28e5b31fca78ba8a5849e9bb9e561f28dffa1c9cfe704b78fd5f5`). The raw file is ~104 MB, so only the derived snapshot is committed.
- `scripts/build_snapshot.py` sums `Value` across all 91 ages and both genders for each CSDUID/year. The result contains 10,572 complete municipality/year records covering 2001–2025. Each API record exposes its source key (`CSDUID:year`), original CSV URL, and count of contributing rows (182).
- Six CSDUID/year groups (`4806009` and `4806011`, 2023–2025) have only 180 source rows and fractional totals. The script excludes them instead of presenting a potentially misleading estimate. Municipality names can change over time; the snapshot keeps the name supplied for each year and comparisons use the stable CSDUID.
- Difference is `B − A`. Percent difference is `(B − A) / A × 100`, rounded to one decimal place. If A is zero, the percentage is unavailable. Comparing different municipalities is a difference between estimates, not a growth rate for one place.

To refresh the snapshot, download the official CSV, then run:

```bash
python3 scripts/build_snapshot.py /path/to/population.csv
```

Review the script's reported exclusions and source hash before committing a refresh. Upstream age categories, counts, or identifiers may change and require revisiting the completeness rule.

## API

- `GET /api/metadata` — years, counts, and source URLs
- `GET /api/municipalities?q=Calgary&year=2025&limit=50` — filtered records
- `GET /api/compare?fromId=4806016&fromYear=2001&toId=4806016&toYear=2025` — values and calculated difference
- `GET /api/summary` — same four query parameters; optional AI assisted explanation

For an AI assisted explanation, set both `OPENAI_API_KEY` and `OPENAI_MODEL` on the API process. The model receives only the already calculated public figures and chooses whether absolute or percentage difference is the clearer focus. The API itself renders the final text from verified values and source keys; it rejects unexpected model output. With no model configured or on model failure, the endpoint returns `available: false` and the calculated comparison remains usable. This makes the AI output a presentation choice, not a data source.

## Privacy, accessibility, and scope

The app has no accounts, analytics, or database of visitors. Search and comparison parameters stay on the local servers. When AI is configured and used, the API sends only the selected public municipality names, years, and aggregate values to the model provider. Do not enter personal information in the search field. The interface uses labelled controls, table headers, keyboard accessible buttons, visible focus, and status messages.

This is a fixed snapshot, not a live data feed. Search shows the first 100 matching records for a selected year. The project is independent and is not an official Government of Alberta service.

## Checks

```bash
cd api && ./mvnw test
cd web && npm ci && npm run build
```

GitHub Actions runs the same API tests and frontend build on pushes and pull requests. The API tests check a known Calgary figure, the difference and percentage calculation, exclusion of incomplete source groups, search, and the no-model path.

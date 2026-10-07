package ca.albertaexplorer.api;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

@Repository
public class PopulationRepository {
    public static final String SOURCE_URL = "https://open.alberta.ca/dataset/1bef4453-1dab-4f2a-bc63-2b3df318d47c/resource/6b20754e-5a8c-4d2d-9995-b137459c1210/download/population.csv";
    public static final String DATASET_URL = "https://open.canada.ca/data/dataset/1bef4453-1dab-4f2a-bc63-2b3df318d47c";
    private final List<PopulationRecord> records;
    private final Map<String, PopulationRecord> byKey;
    private final List<Integer> years;

    public PopulationRepository() throws Exception {
        var loaded = new ArrayList<PopulationRecord>();
        try (var reader = new BufferedReader(new InputStreamReader(
                new ClassPathResource("municipality_totals.tsv").getInputStream(), StandardCharsets.UTF_8))) {
            reader.readLine();
            String line;
            while ((line = reader.readLine()) != null) {
                var parts = line.split("\t", -1);
                if (parts.length != 5) throw new IllegalStateException("Invalid snapshot row: " + line);
                String id = parts[0];
                int year = Integer.parseInt(parts[2]);
                loaded.add(new PopulationRecord(id, parts[1], year, Long.parseLong(parts[3]),
                        Integer.parseInt(parts[4]), id + ":" + year, SOURCE_URL));
            }
        }
        records = List.copyOf(loaded);
        byKey = records.stream().collect(Collectors.toUnmodifiableMap(
                r -> r.csduid() + ":" + r.year(), r -> r));
        years = records.stream().map(PopulationRecord::year).distinct().sorted().toList();
    }

    public List<PopulationRecord> search(String query, Integer year, int limit) {
        String normalized = query == null ? "" : query.trim().toLowerCase(java.util.Locale.ROOT);
        return records.stream()
                .filter(r -> year == null || r.year() == year)
                .filter(r -> r.municipality().toLowerCase(java.util.Locale.ROOT).contains(normalized)
                        || r.csduid().contains(normalized))
                .sorted(Comparator.comparing(PopulationRecord::municipality)
                        .thenComparing(PopulationRecord::year).thenComparing(PopulationRecord::csduid))
                .limit(limit).toList();
    }

    public PopulationRecord get(String id, int year) {
        return byKey.get(id + ":" + year);
    }

    public List<Integer> years() { return years; }
    public int recordCount() { return records.size(); }
    public int municipalityCount() { return (int) records.stream().map(PopulationRecord::csduid).distinct().count(); }
}

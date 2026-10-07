package ca.albertaexplorer.api;

public record PopulationRecord(
        String csduid,
        String municipality,
        int year,
        long population,
        int sourceRows,
        String sourceKey,
        String sourceUrl
) {}

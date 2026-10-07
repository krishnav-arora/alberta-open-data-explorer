package ca.albertaexplorer.api;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record Comparison(PopulationRecord from, PopulationRecord to, long change, BigDecimal percentChange) {
    public static Comparison of(PopulationRecord from, PopulationRecord to) {
        long difference = to.population() - from.population();
        BigDecimal percent = from.population() == 0 ? null :
                BigDecimal.valueOf(difference).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(from.population()), 1, RoundingMode.HALF_UP);
        return new Comparison(from, to, difference, percent);
    }
}

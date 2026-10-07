package ca.albertaexplorer.api;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class PopulationController {
    private final PopulationRepository data;
    private final SummaryService summary;

    public PopulationController(PopulationRepository data, SummaryService summary) {
        this.data = data;
        this.summary = summary;
    }

    @GetMapping("/metadata")
    public Map<String, Object> metadata() {
        return Map.of("years", data.years(), "records", data.recordCount(),
                "municipalities", data.municipalityCount(), "sourceUrl", PopulationRepository.SOURCE_URL,
                "datasetUrl", PopulationRepository.DATASET_URL);
    }

    @GetMapping("/municipalities")
    public List<PopulationRecord> search(@RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "50") int limit) {
        if (limit < 1 || limit > 500) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "limit must be 1–500");
        return data.search(q, year, limit);
    }

    @GetMapping("/compare")
    public Comparison compare(@RequestParam String fromId, @RequestParam int fromYear,
            @RequestParam String toId, @RequestParam int toYear) {
        var from = data.get(fromId, fromYear);
        var to = data.get(toId, toYear);
        if (from == null || to == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                "No complete source record for one or both selections");
        return Comparison.of(from, to);
    }

    @GetMapping("/summary")
    public SummaryService.SummaryResult summary(@RequestParam String fromId, @RequestParam int fromYear,
            @RequestParam String toId, @RequestParam int toYear) {
        return summary.summarize(compare(fromId, fromYear, toId, toYear));
    }
}

package ca.albertaexplorer.api;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class SummaryService {
    public record SummaryResult(boolean available, String text, String reason, List<String> sourceKeys) {}

    private final String apiKey;
    private final String model;
    private final String endpoint;
    private final RestClient client;

    @Autowired
    public SummaryService(@Value("${OPENAI_API_KEY:}") String apiKey,
            @Value("${OPENAI_MODEL:}") String model) {
        this(apiKey, model, "https://api.openai.com/v1/responses");
    }

    SummaryService(String apiKey, String model, String endpoint) {
        this.apiKey = apiKey;
        this.model = model;
        this.endpoint = endpoint;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        this.client = RestClient.builder().requestFactory(factory).build();
    }

    public SummaryResult summarize(Comparison comparison) {
        var keys = List.of(comparison.from().sourceKey(), comparison.to().sourceKey());
        if (apiKey.isBlank() || model.isBlank()) {
            return new SummaryResult(false, null, "AI summary is unavailable until OPENAI_API_KEY and OPENAI_MODEL are configured.", keys);
        }
        try {
            String choice = chooseFocus(comparison);
            if (!choice.equals("absolute") && !choice.equals("percentage")) throw new IllegalStateException("Unexpected model output");
            return new SummaryResult(true, render(comparison, choice), null, keys);
        } catch (Exception ignored) {
            return new SummaryResult(false, null, "AI summary is temporarily unavailable. The verified comparison remains available.", keys);
        }
    }

    private String chooseFocus(Comparison c) {
        String facts = "From: " + c.from().municipality() + " " + c.from().year() + " = " + c.from().population()
                + "; to: " + c.to().municipality() + " " + c.to().year() + " = " + c.to().population()
                + "; absolute difference = " + c.change() + "; percentage difference = " + c.percentChange() + ".";
        @SuppressWarnings("unchecked")
        Map<String, Object> response = client.post().uri(endpoint)
                .header("Authorization", "Bearer " + apiKey)
                .body(Map.of("model", model,
                        "instructions", "Choose which of two already calculated figures best explains this comparison. Reply with exactly one word: absolute or percentage. If percentage is unavailable, choose absolute. Do not add other text.",
                        "input", facts, "max_output_tokens", 32))
                .retrieve().body(Map.class);
        if (response == null) throw new IllegalStateException("Empty model response");
        Object output = response.get("output");
        if (!(output instanceof List<?> items)) throw new IllegalStateException("No model output");
        for (Object item : items) {
            if (!(item instanceof Map<?, ?> message)) continue;
            if (!(message.get("content") instanceof List<?> content)) continue;
            for (Object part : content) {
                if (part instanceof Map<?, ?> textPart && "output_text".equals(textPart.get("type"))
                        && textPart.get("text") instanceof String text) return text.trim().toLowerCase(Locale.ROOT);
            }
        }
        throw new IllegalStateException("No text output");
    }

    private String render(Comparison c, String focus) {
        var format = NumberFormat.getIntegerInstance(Locale.CANADA);
        String left = c.from().municipality() + " (" + c.from().year() + ") was "
                + format.format(c.from().population()) + " [" + c.from().sourceKey() + "]";
        String right = c.to().municipality() + " (" + c.to().year() + ") was "
                + format.format(c.to().population()) + " [" + c.to().sourceKey() + "]";
        String direction = c.change() > 0 ? "higher" : c.change() < 0 ? "lower" : "the same";
        String difference = format.format(Math.abs(c.change()));
        if (c.change() == 0) return left + "; " + right + ". The estimates were equal.";
        if (focus.equals("percentage") && c.percentChange() != null) {
            return left + "; " + right + ". The second estimate was " + direction + " by "
                    + c.percentChange().abs().toPlainString() + "% (" + difference + " people).";
        }
        return left + "; " + right + ". The second estimate was " + direction + " by "
                + difference + " people" + (c.percentChange() == null ? "." : " (" + c.percentChange().abs().toPlainString() + "%).");
    }
}

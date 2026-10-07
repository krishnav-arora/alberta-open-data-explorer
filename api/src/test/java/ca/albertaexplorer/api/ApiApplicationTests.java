package ca.albertaexplorer.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import com.sun.net.httpserver.HttpServer;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class ApiApplicationTests {
	@Autowired PopulationRepository data;
	@Autowired PopulationController controller;

	@Test
	void snapshotAndComparisonUseCompleteSourceRows() {
		assertEquals(10_572, data.recordCount());
		var calgary = data.get("4806016", 2025);
		assertEquals(1_612_834, calgary.population());
		assertEquals(182, calgary.sourceRows());
		assertEquals("4806016:2025", calgary.sourceKey());
		var comparison = controller.compare("4806016", 2001, "4806016", 2025);
		assertEquals(708_918, comparison.change());
		assertEquals(new BigDecimal("78.4"), comparison.percentChange());
	}

	@Test
	void searchAndMissingDataAreHandled() {
		assertTrue(data.search("Calgary", 2025, 20).stream().anyMatch(r -> r.csduid().equals("4806016")));
		assertNull(data.get("4806009", 2025));
		assertThrows(ResponseStatusException.class,
				() -> controller.compare("4806009", 2025, "4806016", 2025));
	}

	@Test
	void summaryFailsSafelyWithoutModelConfiguration() {
		var service = new SummaryService("", "");
		var result = service.summarize(controller.compare("4806016", 2001, "4806016", 2025));
		assertFalse(result.available());
		assertNull(result.text());
		assertEquals(2, result.sourceKeys().size());
	}

	@Test
	void configuredModelCanOnlyChooseVerifiedWording() throws Exception {
		var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/responses", exchange -> {
			var request = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			assertTrue(request.contains("708918"));
			var body = "{\"output\":[{\"content\":[{\"type\":\"output_text\",\"text\":\"absolute\"}]}]}".getBytes(StandardCharsets.UTF_8);
			exchange.getResponseHeaders().set("Content-Type", "application/json");
			exchange.sendResponseHeaders(200, body.length);
			try (var stream = exchange.getResponseBody()) { stream.write(body); }
		});
		server.start();
		try {
			var service = new SummaryService("test-key", "test-model", "http://127.0.0.1:" + server.getAddress().getPort() + "/responses");
			var result = service.summarize(controller.compare("4806016", 2001, "4806016", 2025));
			assertTrue(result.available());
			assertTrue(result.text().contains("708,918"));
			assertTrue(result.text().contains("[4806016:2001]"));
			assertTrue(result.text().contains("[4806016:2025]"));
		} finally {
			server.stop(0);
		}
	}

}

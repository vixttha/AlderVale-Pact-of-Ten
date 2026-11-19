import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public final class AssetDeliveryContracts {
    private static final Pattern SCRIPTS = Pattern.compile("<script\\b([^>]*)>", Pattern.CASE_INSENSITIVE);
    private static final Pattern LINKS = Pattern.compile("<link\\b([^>]*)>", Pattern.CASE_INSENSITIVE);
    private static final Pattern ATTRIBUTES = Pattern.compile(
            "([\\w:-]+)\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))");
    private static final List<String> JAVASCRIPT = List.of("text/javascript", "application/javascript");
    private static final List<String> CSS = List.of("text/css");

    private final HttpClient client;
    private final URI origin;
    private final Path build;

    private AssetDeliveryContracts(HttpClient client, URI origin, Path build) {
        this.client = client;
        this.origin = origin;
        this.build = build;
    }

    public static void main(String[] args) throws IOException, InterruptedException {
        if (args.length < 3) {
            throw new IllegalArgumentException("Usage: AssetDeliveryContracts.java PORT BUILD_DIR ASSET_PATH [ASSET_PATH ...]");
        }
        var origin = URI.create("http://127.0.0.1:" + Integer.parseInt(args[0]) + "/");
        var build = Path.of(args[1]).toAbsolutePath().normalize();
        try (var client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build()) {
            var suite = new AssetDeliveryContracts(client, origin, build);
            String html = suite.entryPage();
            var assets = Arrays.stream(args).skip(2).map(origin::resolve).toList();
            var cases = List.of(
                    new TestCase("E30-001", "built module scripts",
                            () -> suite.checkReferences(html, SCRIPTS, "type", "module", "src", JAVASCRIPT, CSS)),
                    new TestCase("E30-002", "built stylesheets",
                            () -> suite.checkReferences(html, LINKS, "rel", "stylesheet", "href", CSS, JAVASCRIPT)),
                    new TestCase("E30-003", "complete binary asset",
                            () -> suite.checkFullAssets(assets)),
                    new TestCase("E30-004", "binary byte-range delivery",
                            () -> suite.checkRanges(assets)),
                    new TestCase("E28-001", "conditional asset revalidation",
                            () -> suite.checkRevalidation(assets)));

            int passed = 0;
            for (var test : cases) {
                try {
                    test.check().run();
                    passed++;
                    System.out.println("PASS " + test.id() + " " + test.name());
                } catch (IOException | AssertionError failure) {
                    System.err.println("FAIL " + test.id() + " " + test.name() + " - " + failure.getMessage());
                }
            }
            System.out.printf("Java asset delivery contracts: %d/%d passed%n", passed, cases.size());
            check(passed == cases.size(), "See failing case diagnostics above.");
        }
    }

    private String entryPage() throws IOException, InterruptedException {
        var response = get(origin);
        status(response, 200, origin);
        contentType(response, List.of("text/html"), origin);
        return new String(response.body(), StandardCharsets.UTF_8);
    }

    private void checkReferences(String html, Pattern tags, String roleAttribute, String role,
                                 String urlAttribute, List<String> expectedTypes, List<String> wrongTypes)
            throws IOException, InterruptedException {
        var references = new ArrayList<URI>();
        var tagsFound = tags.matcher(html);
        while (tagsFound.find()) {
            String attributes = tagsFound.group(1);
            if (!role.equalsIgnoreCase(attribute(attributes, roleAttribute))) continue;
            String reference = attribute(attributes, urlAttribute);
            if (reference.isEmpty()) continue;
            var url = origin.resolve(reference);
            if (sameOrigin(url)) references.add(url);
        }
        check(!references.isEmpty(), "Entry page links no same-origin " + role + " assets");
        for (var url : references) {
            var response = get(url);
            status(response, 200, url);
            contentType(response, expectedTypes, url);
            body(response, expectedBytes(url), url);
            rejects("content type", () -> contentType(response, wrongTypes, url));
        }
    }

    private void checkFullAssets(List<URI> assets) throws IOException, InterruptedException {
        for (var url : assets) {
            byte[] expected = expectedBytes(url);
            var response = get(url);
            status(response, 200, url);
            body(response, expected, url);

            byte[] changed = expected.clone();
            changed[changed.length / 2] ^= 1;
            rejects("body differs", () -> body(response, changed, url));
        }
    }

    private void checkRanges(List<URI> assets) throws IOException, InterruptedException {
        for (var url : assets) {
            byte[] expected = expectedBytes(url);
            check(expected.length >= 24, url + " needs at least 24 fixture bytes");
            checkRange(url, expected, 0, 11);
            checkRange(url, expected, expected.length - 12, expected.length - 1);
        }
    }

    private void checkRange(URI url, byte[] expected, int start, int end)
            throws IOException, InterruptedException {
        var response = get(url, "Range", "bytes=" + start + "-" + end);
        status(response, 206, url);
        String range = "bytes " + start + "-" + end + "/" + expected.length;
        contentRange(response, range, url);
        body(response, Arrays.copyOfRange(expected, start, end + 1), url);
        rejects("content range", () -> contentRange(response, range + "0", url));
    }

    private void checkRevalidation(List<URI> assets) throws IOException, InterruptedException {
        for (var url : assets) {
            var original = get(url);
            status(original, 200, url);
            String tag = original.headers().firstValue("ETag").orElse("");
            check(!tag.isBlank(), url + " returned no ETag");
            var cached = get(url, "If-None-Match", tag);
            status(cached, 304, url);
            check(cached.body().length == 0, url + " returned a body with 304");

            String otherTag = tag.equals("\"vault-other\"") ? "\"vault-different\"" : "\"vault-other\"";
            var changed = get(url, "If-None-Match", otherTag);
            status(changed, 200, url);
            body(changed, expectedBytes(url), url);
            rejects("expected HTTP 304", () -> status(changed, 304, url));
        }
    }

    private static String attribute(String attributes, String name) {
        var matches = ATTRIBUTES.matcher(attributes);
        while (matches.find()) {
            if (name.equalsIgnoreCase(matches.group(1))) {
                if (matches.group(2) != null) return matches.group(2);
                if (matches.group(3) != null) return matches.group(3);
                return matches.group(4);
            }
        }
        return "";
    }

    private boolean sameOrigin(URI url) {
        return origin.getScheme().equalsIgnoreCase(url.getScheme())
                && origin.getRawAuthority().equalsIgnoreCase(url.getRawAuthority());
    }

    private byte[] expectedBytes(URI url) throws IOException {
        check(sameOrigin(url), "Expected a loopback asset URL: " + url);
        var path = build.resolve(url.getPath().substring(1)).normalize();
        check(path.startsWith(build) && Files.isRegularFile(path),
                url + " has no corresponding built file at " + path);
        var bytes = Files.readAllBytes(path);
        check(bytes.length > 0, "Empty built file: " + path);
        return bytes;
    }

    private HttpResponse<byte[]> get(URI url, String... headers) throws IOException, InterruptedException {
        check(sameOrigin(url), "Expected a loopback URL: " + url);
        var request = HttpRequest.newBuilder(url).timeout(Duration.ofSeconds(10)).GET();
        if (headers.length != 0) request.headers(headers);
        return client.send(request.build(), HttpResponse.BodyHandlers.ofByteArray());
    }

    private static void status(HttpResponse<byte[]> response, int expected, URI url) {
        check(response.statusCode() == expected,
                url + " expected HTTP " + expected + " but got " + response.statusCode());
    }

    private static void body(HttpResponse<byte[]> response, byte[] expected, URI url) {
        byte[] actual = response.body();
        int mismatch = Arrays.mismatch(actual, expected);
        check(mismatch == -1,
                url + " body differs at byte " + mismatch + " (expected " + expected.length
                        + " bytes, got " + actual.length + ")");
    }

    private static void contentType(HttpResponse<byte[]> response, List<String> expected, URI url) {
        String actual = response.headers().firstValue("Content-Type").orElse("<missing>");
        String mediaType = actual.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        check(expected.contains(mediaType), url + " expected content type " + expected + " but got " + actual);
    }

    private static void contentRange(HttpResponse<byte[]> response, String expected, URI url) {
        String actual = response.headers().firstValue("Content-Range").orElse("<missing>");
        check(expected.equals(actual), url + " expected content range " + expected + " but got " + actual);
    }

    private static void rejects(String diagnostic, Runnable control) {
        try {
            control.run();
        } catch (AssertionError failure) {
            check(failure.getMessage().contains(diagnostic), "Unexpected control failure: " + failure.getMessage());
            return;
        }
        throw new AssertionError("Known-bad control passed for " + diagnostic);
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    @FunctionalInterface
    private interface TestCheck {
        void run() throws IOException, InterruptedException;
    }

    private record TestCase(String id, String name, TestCheck check) {}
}

# Java asset delivery contracts

Java Batch 1 checks that the built game serves the files needed to start and render AlderVale. The Node fixture runs the production Express frontend on an ephemeral loopback port. The checks use the Java 21 standard library.

| Case | Assertion |
|---|---|
| E30-001 | Same-origin module scripts from the delivered entry page return HTTP 200, a JavaScript media type, and the built bytes. |
| E30-002 | Same-origin stylesheets from the delivered entry page return HTTP 200, the CSS media type, and the built bytes. |
| E30-003 | Full responses for the Rowan and prototype GLBs return HTTP 200 and match the built bytes. |
| E30-004 | First and last byte ranges of each GLB return HTTP 206 with exact ranges and bytes. |
| E28-001 | Matching ETags produce a bodyless HTTP 304. A mismatched ETag returns HTTP 200 with the full file. |

Run from the repository root with Node 24, Bun 1.4.4 and JDK 21:

```sh
bun install --frozen-lockfile
bun run build
node tests/vault/java/run-asset-delivery.mjs
```

The existing Linux Core job records the checkout SHA, pull request revisions, run attempt, Java version and each case result. Each check exercises an incorrect media type, changed byte, wrong range header or wrong status as a negative control.

For reuse with another built web app, start its HTTP server on a loopback port and run `java --source 21 AssetDeliveryContracts.java PORT BUILD_DIR ASSET_PATH [ASSET_PATH ...]`. Pass assets that support byte ranges and ETag revalidation. Use a root entry page with direct same-origin HTML module script and stylesheet references and a directory layout matching their HTTP paths. This suite covers the local production server's asset delivery. Rendering, remote deployments and CDN behavior have separate validation.

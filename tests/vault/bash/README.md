# Graphify publisher contracts

Run from the repository root on the public Ubuntu Graphify job:

```sh
bash tests/vault/bash/graphify-publish-contracts.sh
```

Each case creates a temporary source repository and bare Git remote, seeds a valid `main` snapshot, and exercises the repository's real `tools/graphify/publish.sh`. Fixtures use synthetic graph and receipt bytes. The harness limits Git to file transport and discards any inherited publisher token. A failure reports the case and the publisher's diagnostic.

| Case | Contract |
| --- | --- |
| E32-001 | Advancing remote `main` causes an older build to skip publication. The snapshot branch tip and both archived files stay identical. |
| E32-002 | An ordinary feature ref fails with the refusal diagnostic and leaves the published state intact. |
| E32-003 | The explicit feature-ref opt-in appends `commits/<sha>` with the expected graph and receipt. The main snapshot is preserved. |
| E32-004 | A valid tag is published, then its stored graph is deliberately changed without updating the receipt. Republishing fails the checksum and preserves the archived state for diagnosis. |
| E32-005 | A competing publisher pushes immediately before the first outgoing push. Git rejects the stale push, and the retry preserves the competing commit and both snapshots. |
| E32-006 | The Vault publishes and refreshes its own latest snapshot, rejects a superseded checkout, and preserves the bytes of the main snapshot. |

The fixtures cover Git publication behavior. The existing Graphify job also builds a real graph and verifies MCP readback.

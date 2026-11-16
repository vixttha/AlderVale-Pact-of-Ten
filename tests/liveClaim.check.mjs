import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { promisify } from "node:util";
import { acquireClaim, releaseClaim } from "../v0.0.4/queue.ts";

const exec = promisify(execFile);

test("GitHub serializes a claim race and rejects stale release", async () => {
  const { CLAIM_TEST_TOKEN: token, GITHUB_RUN_ID: run, GITHUB_RUN_ATTEMPT: attempt } = process.env;
  assert.match(run ?? "", /^\d+$/);
  assert.match(attempt ?? "", /^\d+$/);
  assert.ok(token, "GitHub Actions token required");
  assert.equal(process.env.GITHUB_REPOSITORY, "vixttha/AlderVale-Pact-of-Ten");
  assert.equal(process.env.GITHUB_REF, "refs/heads/ci/bug-library-live-claim");

  const ref = `refs/heads/bug-library-claim-test-${run}-${attempt}`;
  const writes = new Set();
  const env = {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: "AUTHORIZATION: basic " + Buffer.from("x-access-token:" + token).toString("base64"),
    GIT_TERMINAL_PROMPT: "0",
    GIT_AUTHOR_NAME: "github-actions[bot]",
    GIT_COMMITTER_NAME: "github-actions[bot]",
    GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
    GIT_COMMITTER_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
  };
  const git = async (...args) => (await exec("git", args, { env })).stdout.trim();
  const checkout = await git("rev-parse", "HEAD");
  const emptyTree = await git("rev-parse", "HEAD^{tree}");
  const remoteTip = async () => {
    const output = await git("ls-remote", "origin", ref);
    if (!output) return null;
    const [sha, name] = output.split("\t");
    assert.equal(name, ref);
    assert.match(sha, /^[a-f0-9]{40}$/);
    return sha;
  };
  const makeCommit = async (parent, claim) => {
    const commit = await git("commit-tree", emptyTree, "-p", parent, "-m", JSON.stringify(claim));
    writes.add(commit);
    return commit;
  };
  const leasePush = async (expected, commit) => {
    try {
      await git("push", "--porcelain", `--force-with-lease=${ref}:${expected ?? ""}`, "origin", `${commit}:${ref}`);
      return true;
    } catch (error) {
      if (/\[rejected\].*\(stale info\)|cannot lock ref .* (already exists|but expected)/.test(error.stdout + error.stderr)) return false;
      throw error;
    }
  };
  const store = {
    async read() {
      const revision = await remoteTip();
      if (revision === null) return { revision, claim: null };
      return { revision, claim: JSON.parse(await git("show", "-s", "--format=%B", revision)) };
    },
    async compareAndSwap(_issueNumber, expected, claim) {
      const parent = expected ?? checkout;
      const candidate = await makeCommit(parent, claim);
      assert.equal(await git("rev-parse", `${candidate}^`), parent);
      return leasePush(expected, candidate);
    },
  };

  assert.equal(await remoteTip(), null, "disposable ref must be absent");
  try {
    // Both callers take the same absent snapshot before either write is allowed.
    let reads = 0;
    let releaseReads;
    const bothRead = new Promise((resolve) => { releaseReads = resolve; });
    const racers = {
      ...store,
      async read() {
        const snapshot = await store.read();
        assert.equal(snapshot.revision, null);
        if (++reads === 2) releaseReads();
        await bothRead;
        return snapshot;
      },
    };
    const claim = (worker) => ({
      issueNumber: 65, claimId: worker, status: "active", worker,
      expiresAt: "2030-01-02T00:00:00Z", baseSha: checkout, workBranch: `fixture-${worker}`,
    });
    const outcomes = await Promise.all([claim("worker-a"), claim("worker-b")].map((next) =>
      acquireClaim(racers, next, "2030-01-01T00:00:00Z"),
    ));
    assert.equal(outcomes.filter((outcome) => outcome.acquired).length, 1);
    assert.deepEqual(outcomes.find((outcome) => !outcome.acquired), { acquired: false, reason: "CLAIM_RACE_LOST" });
    const winner = await store.read();
    assert.deepEqual(winner.claim, outcomes.find((outcome) => outcome.acquired).claim);
    console.log(`Live race: one winner and one rejected lease. Ref ${ref}, winner ${winner.revision}`);

    const renewed = { ...winner.claim, expiresAt: "2030-01-03T00:00:00Z" };
    assert.equal(await store.compareAndSwap(65, winner.revision, renewed), true);
    const current = await store.read();
    assert.notEqual(current.revision, winner.revision);
    const staleRelease = await makeCommit(current.revision, { ...renewed, status: "released" });
    assert.equal(await git("rev-parse", `${staleRelease}^`), current.revision);
    assert.equal(await leasePush(winner.revision, staleRelease), false,
      "GitHub must reject a stale lease even when the proposed release is a fast-forward");
    assert.equal(await releaseClaim(store, 65, winner.revision, winner.claim.claimId, "2030-01-01T01:00:00Z"), false);
    assert.equal(await remoteTip(), current.revision);
    assert.equal(await releaseClaim(store, 65, current.revision, winner.claim.claimId, "2030-01-01T01:00:00Z"), true);
    const released = await store.read();
    assert.equal(released.claim.status, "released");
    assert.equal(await git("rev-parse", `${released.revision}^`), current.revision);
    console.log(`Live release: stale ${winner.revision} rejected, current ${current.revision} released at ${released.revision}`);
  } finally {
    const tip = await remoteTip();
    if (tip !== null) {
      assert.ok(writes.has(tip), "ref is owned by this test before cleanup");
      await git("push", "--porcelain", `--force-with-lease=${ref}:${tip}`, "origin", `:${ref}`);
    }
    assert.equal(await remoteTip(), null);
    console.log(`Disposable ref removed: ${ref}`);
  }
});

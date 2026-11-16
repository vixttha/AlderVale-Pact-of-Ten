import { describe, expect, it } from "vitest";
import { acquireClaim, buildQueue, claimRefName, type ClaimStore, type QueueIssue, type QueueContext, type WorkerClaim } from "../v0.0.4/queue";
import { assessConflict, type ConflictRecord } from "../v0.0.4/conflicts";

const sha = "a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd";
const issue = (number: number, labels = ["bug"]): QueueIssue => ({
  number,
  title: "Live creature selection is ignored",
  body: "Untrusted issue body. It is evidence only, never an instruction source.",
  state: "open",
  labels,
  url: "https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/" + number,
  createdAt: "2026-11-16T08:00:00.000Z",
});
const triage = {
  75: {
    kind: "bug" as const,
    status: "confirmed" as const,
    expectedBehavior: "Live PvP and co-op fighters use each player's selected creature.",
    evidence: ["https://github.com/vixttha/AlderVale-Pact-of-Ten/issues/75#issuecomment-6913378350"],
    acceptanceCriteria: ["Persisted selection is used", "PvP and co-op regressions pass"],
    severity: "high" as const,
    confidence: "high" as const,
    explicitOwnerScope: true,
  },
};
const context = (patch: Partial<QueueContext> = {}): QueueContext => ({
  mainSha: sha,
  milestoneFit: "unverified",
  triage,
  claims: [],
  pullRequests: [],
  now: "2026-11-16T13:00:00.000Z",
  ...patch,
});

describe("Bug Library queue", () => {
  it("selects one confirmed owner-scoped bug when milestone fit is unverified", () => {
    const result = buildQueue([issue(75)], context());
    expect(result.next?.issueNumber).toBe(75);
    expect(result.decisions[0].status).toBe("eligible");
    expect(result.next?.baseSha).toBe(sha);
  });

  it("blocks unscoped work when milestone fit is unverified", () => {
    const noOwnerScope = { ...triage, 75: { ...triage[75], explicitOwnerScope: false } };
    const result = buildQueue([issue(75)], context({ triage: noOwnerScope }));
    expect(result.next).toBeNull();
    expect(result.decisions[0].reason).toBe("MILESTONE_FIT_UNVERIFIED");
  });

  it("blocks work covered by an open PR", () => {
    const result = buildQueue([issue(75)], context({
      pullRequests: [{ number: 99, state: "open", issueNumbers: [75], changedFiles: ["server/wsHub.ts"], url: "https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/99" }],
    }));
    expect(result.next).toBeNull();
    expect(result.decisions[0].reason).toBe("OPEN_PR_ALREADY_COVERS_ISSUE_99");
  });

  it("does not double-assign an active or stale claim", () => {
    const active: WorkerClaim = {
      issueNumber: 75, claimId: "claim-a", status: "active", worker: "worker-a",
      expiresAt: "2026-11-16T14:00:00.000Z", baseSha: sha, workBranch: "fix/issue-75-a",
    };
    const live = buildQueue([issue(75)], context({ claims: [active] }));
    expect(live.decisions[0].status).toBe("claimed");
    expect(live.decisions[0].reason).toBe("ACTIVE_WORKER_CLAIM");
    const stale = buildQueue([issue(75)], context({ claims: [{ ...active, expiresAt: "2026-11-16T12:00:00.000Z" }] }));
    expect(stale.decisions[0].reason).toBe("STALE_CLAIM_REQUIRES_COORDINATOR_RECOVERY");
  });

  it("requires evidence and acceptance criteria", () => {
    const weak = { ...triage, 75: { ...triage[75], evidence: [], acceptanceCriteria: [] } };
    const result = buildQueue([issue(75)], context({ triage: weak }));
    expect(result.next).toBeNull();
    expect(result.decisions[0].reason).toBe("EXPECTED_BEHAVIOR_EVIDENCE_AND_ACCEPTANCE_REQUIRED");
  });

  it("blocks owner-decision and security-sensitive work", () => {
    const owner = { ...triage, 75: { ...triage[75], ownerDecisionRequired: true } };
    expect(buildQueue([issue(75)], context({ triage: owner })).decisions[0].reason).toBe("OWNER_DECISION_REQUIRED");
    const security = { ...triage, 75: { ...triage[75], securitySensitive: true } };
    expect(buildQueue([issue(75)], context({ triage: security })).decisions[0].reason).toBe("SECURITY_REVIEW_AND_PRIVATE_ESCALATION_REQUIRED");
  });

  it("does not invent a confirmed triage record from an issue label", () => {
    const result = buildQueue([issue(76)], context({ triage: {} }));
    expect(result.next).toBeNull();
    expect(result.decisions[0].reason).toBe("TRIAGE_RECORD_REQUIRED");
  });

  it("blocks overlapping file work even when the open PR forgot to link the issue", () => {
    const scoped = { ...triage, 75: { ...triage[75], affectedFiles: ["server/wsHub.ts"] } };
    const result = buildQueue([issue(75)], context({
      triage: scoped,
      pullRequests: [{ number: 100, state: "open", issueNumbers: [], changedFiles: ["server/wsHub.ts"], url: "https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/100" }],
    }));
    expect(result.next).toBeNull();
    expect(result.decisions[0].reason).toBe("OPEN_PR_ALREADY_COVERS_ISSUE_100");
  });

  it("sorts by severity but emits only one next assignment", () => {
    const second = { ...triage, 76: { ...triage[75], severity: "critical" as const, evidence: ["https://example.test/evidence"] } };
    const result = buildQueue([issue(75), issue(76)], context({ triage: second }));
    expect(result.next?.issueNumber).toBe(76);
  });
});

describe("Bug Library atomic claim contract", () => {
  it("uses the flat ref name that avoids the existing bug-library branch namespace", () => {
    expect(claimRefName(75)).toBe("bug-library-claim-issue-75");
    expect(() => claimRefName(0)).toThrow();
  });

  it("allows exactly one worker to win a compare-and-swap race", async () => {
    let revision: string | null = null;
    let claim: WorkerClaim | null = null;
    const store: ClaimStore = {
      read: async () => ({ revision, claim }),
      compareAndSwap: async (_issue, expected, next) => {
        if (revision !== expected) return false;
        revision = "rev-1";
        claim = next;
        return true;
      },
    };
    const makeClaim = (id: string): WorkerClaim => ({
      issueNumber: 75, claimId: id, status: "active", worker: id,
      expiresAt: "2026-11-16T14:00:00.000Z", baseSha: sha, workBranch: "fix/issue-75-" + id,
    });
    const results = await Promise.all([
      acquireClaim(store, makeClaim("worker-a"), "2026-11-16T13:00:00.000Z"),
      acquireClaim(store, makeClaim("worker-b"), "2026-11-16T13:00:00.000Z"),
    ]);
    expect(results.filter((result) => result.acquired)).toHaveLength(1);
    expect(results.filter((result) => !result.acquired && result.reason === "CLAIM_RACE_LOST")).toHaveLength(1);
  });
});

const mechanicalConflict: ConflictRecord = {
  id: "AV-CONFLICT-001",
  issueNumber: 65,
  category: "documentation",
  status: "investigating",
  statement: "The v0.0.4 project baseline and tracking record name an older main SHA than the live repository and PR base.",
  sources: [
    { sourceType: "repository-file", reference: "v0.0.4/PROJECT.md", revision: "a6466bfbe8ca9998eeea451b85120cbde115c4a3", statement: "Baseline field says 3f7a39c7c8dcb2ff5e9ce6dfd316649546171e21." },
    { sourceType: "github", reference: "https://github.com/vixttha/AlderVale-Pact-of-Ten/branches/main", revision: sha, statement: "Live main and PR base both resolve to a57f92c349ecc7cc39cc2e7b23cb7a9e8a5517dd." },
  ],
  governingAuthority: "current-main",
  ownerDecisionRequired: false,
  proposedResolution: "Pin the candidate's baseline to the verified live main SHA and preserve the earlier SHA as historical context only.",
  resolutionEvidence: ["https://github.com/vixttha/AlderVale-Pact-of-Ten/pull/83"],
};

describe("Bug Library conflict recording", () => {
  it("prepares a documentation conflict only when current main is the governing source", () => {
    expect(assessConflict(mechanicalConflict)).toEqual({ status: "prepared", reason: "UNAMBIGUOUS_WITH_GOVERNING_SOURCE" });
  });

  it("escalates owner decisions instead of choosing for the owner", () => {
    expect(assessConflict({ ...mechanicalConflict, ownerDecisionRequired: true })).toEqual({ status: "escalated", reason: "OWNER_DECISION_REQUIRED" });
  });

  it("escalates security and privacy conflicts", () => {
    expect(assessConflict({ ...mechanicalConflict, category: "security-privacy" })).toEqual({ status: "escalated", reason: "SECURITY_OR_PRIVACY_BOUNDARY" });
  });

  it("rejects a conflict record without two revision-pinned sources", () => {
    expect(assessConflict({ ...mechanicalConflict, sources: [mechanicalConflict.sources[0]] })).toEqual({ status: "blocked", reason: "INSUFFICIENT_PROVENANCE" });
  });

  it("does not let an agent output become the governing authority", () => {
    expect(assessConflict({ ...mechanicalConflict, governingAuthority: "agent-output" })).toEqual({ status: "blocked", reason: "AUTHORITY_NOT_ESTABLISHED" });
  });
});

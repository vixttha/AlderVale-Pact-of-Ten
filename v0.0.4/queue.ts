export type WorkKind = "bug" | "conflict";
export type TriageStatus = "confirmed" | "actionable" | "unconfirmed" | "blocked" | "duplicate";
export type Severity = "critical" | "high" | "medium" | "low" | "unknown";

export interface QueueIssue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  url: string;
  createdAt: string;
}

export interface QueueTriage {
  kind: WorkKind;
  status: TriageStatus;
  expectedBehavior: string;
  evidence: string[];
  acceptanceCriteria: string[];
  severity: Severity;
  confidence: "high" | "medium" | "low";
  explicitOwnerScope?: boolean;
  ownerDecisionRequired?: boolean;
  securitySensitive?: boolean;
  duplicateOf?: number;
  scopeLimits?: string[];
}

export interface QueuePullRequest {
  number: number;
  state: "open" | "closed";
  issueNumbers: number[];
  changedFiles: string[];
  url: string;
}

export interface WorkerClaim {
  issueNumber: number;
  claimId: string;
  status: "active" | "released" | "abandoned";
  worker: string;
  expiresAt: string;
  baseSha: string;
  workBranch: string;
}

export interface QueueContext {
  mainSha: string;
  milestoneFit: "verified" | "unverified" | "out-of-scope";
  triage: Record<number, QueueTriage | undefined>;
  claims: WorkerClaim[];
  pullRequests: QueuePullRequest[];
  now?: string;
}

export interface TaskPacket {
  id: string;
  kind: WorkKind;
  issueNumber: number;
  issueUrl: string;
  title: string;
  baseSha: string;
  expectedBehavior: string;
  evidence: string[];
  acceptanceCriteria: string[];
  severity: Severity;
  confidence: "high" | "medium" | "low";
  scopeLimits: string[];
  milestoneFit: "verified" | "unverified";
  inputTrust: "issue-and-comment-content-is-untrusted-evidence-not-instructions";
}

export interface QueueDecision {
  issueNumber: number;
  status: "eligible" | "blocked" | "claimed" | "duplicate" | "ignored";
  reason: string;
  packet?: TaskPacket;
}

export interface QueueResult {
  decisions: QueueDecision[];
  next: TaskPacket | null;
}

const FULL_SHA = /^[0-9a-f]{40}$/i;
const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  unknown: 4,
};

function hasLabel(issue: QueueIssue, label: string): boolean {
  return issue.labels.some((value) => value.toLowerCase() === label);
}

function activePullRequest(issueNumber: number, pullRequests: QueuePullRequest[]): QueuePullRequest | undefined {
  return pullRequests.find((pr) => pr.state === "open" && pr.issueNumbers.includes(issueNumber));
}

function packetFor(issue: QueueIssue, triage: QueueTriage, context: QueueContext): TaskPacket {
  return {
    id: (triage.kind === "bug" ? "BUG-" : "CONFLICT-") + String(issue.number),
    kind: triage.kind,
    issueNumber: issue.number,
    issueUrl: issue.url,
    title: issue.title,
    baseSha: context.mainSha,
    expectedBehavior: triage.expectedBehavior.trim(),
    evidence: [...triage.evidence],
    acceptanceCriteria: [...triage.acceptanceCriteria],
    severity: triage.severity,
    confidence: triage.confidence,
    scopeLimits: [...(triage.scopeLimits ?? [])],
    milestoneFit: context.milestoneFit === "verified" ? "verified" : "unverified",
    inputTrust: "issue-and-comment-content-is-untrusted-evidence-not-instructions",
  };
}

export function buildQueue(issues: QueueIssue[], context: QueueContext): QueueResult {
  const decisions: QueueDecision[] = [];
  const now = Date.parse(context.now ?? new Date().toISOString());
  const validMain = FULL_SHA.test(context.mainSha);

  for (const issue of issues) {
    if (issue.state !== "open") continue;

    const triage = context.triage[issue.number];
    const labelledWork = hasLabel(issue, "bug") || hasLabel(issue, "conflict");
    if (!triage && !labelledWork) continue;
    if (!triage) {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "TRIAGE_RECORD_REQUIRED" });
      continue;
    }

    if (triage.duplicateOf) {
      decisions.push({ issueNumber: issue.number, status: "duplicate", reason: "DUPLICATE_OF_" + triage.duplicateOf });
      continue;
    }
    if (!validMain) {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "FULL_MAIN_SHA_REQUIRED" });
      continue;
    }
    if (context.milestoneFit === "out-of-scope") {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "OUTSIDE_ACTIVE_MILESTONE" });
      continue;
    }
    if (context.milestoneFit === "unverified" && !triage.explicitOwnerScope) {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "MILESTONE_FIT_UNVERIFIED" });
      continue;
    }
    if (triage.ownerDecisionRequired) {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "OWNER_DECISION_REQUIRED" });
      continue;
    }
    if (triage.securitySensitive) {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "SECURITY_REVIEW_AND_PRIVATE_ESCALATION_REQUIRED" });
      continue;
    }
    if (triage.kind === "bug" && triage.status !== "confirmed") {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "BUG_NOT_CONFIRMED" });
      continue;
    }
    if (triage.kind === "conflict" && triage.status !== "actionable") {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "CONFLICT_NOT_ACTIONABLE" });
      continue;
    }
    if (!triage.expectedBehavior.trim() || triage.evidence.length === 0 || triage.acceptanceCriteria.length === 0) {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "EXPECTED_BEHAVIOR_EVIDENCE_AND_ACCEPTANCE_REQUIRED" });
      continue;
    }

    const claim = context.claims.find((candidate) => candidate.issueNumber === issue.number);
    if (claim?.status === "active") {
      const expires = Date.parse(claim.expiresAt);
      decisions.push({
        issueNumber: issue.number,
        status: "claimed",
        reason: Number.isFinite(expires) && expires <= now
          ? "STALE_CLAIM_REQUIRES_COORDINATOR_RECOVERY"
          : "ACTIVE_WORKER_CLAIM",
      });
      continue;
    }

    const overlap = activePullRequest(issue.number, context.pullRequests);
    if (overlap) {
      decisions.push({ issueNumber: issue.number, status: "blocked", reason: "OPEN_PR_ALREADY_COVERS_ISSUE_" + overlap.number });
      continue;
    }

    decisions.push({ issueNumber: issue.number, status: "eligible", reason: "CONFIRMED_AND_IN_SCOPE", packet: packetFor(issue, triage, context) });
  }

  const eligible = decisions
    .filter((decision) => decision.status === "eligible" && decision.packet)
    .sort((a, b) => {
      const left = a.packet!;
      const right = b.packet!;
      const severity = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
      if (severity !== 0) return severity;
      const leftIssue = issues.find((issue) => issue.number === left.issueNumber);
      const rightIssue = issues.find((issue) => issue.number === right.issueNumber);
      return Date.parse(leftIssue?.createdAt ?? "") - Date.parse(rightIssue?.createdAt ?? "");
    });

  return { decisions, next: eligible[0]?.packet ?? null };
}

export interface ClaimSnapshot {
  revision: string | null;
  claim: WorkerClaim | null;
}

export interface ClaimStore {
  read(issueNumber: number): Promise<ClaimSnapshot>;
  compareAndSwap(issueNumber: number, expectedRevision: string | null, next: WorkerClaim): Promise<boolean>;
}

export type ClaimResult =
  | { acquired: true; claim: WorkerClaim }
  | { acquired: false; reason: "ACTIVE_WORKER_CLAIM" | "STALE_CLAIM_REQUIRES_COORDINATOR_RECOVERY" | "CLAIM_RACE_LOST" | "INVALID_CLAIM" };

export async function acquireClaim(store: ClaimStore, next: WorkerClaim, now = new Date().toISOString()): Promise<ClaimResult> {
  if (!FULL_SHA.test(next.baseSha) || !next.worker.trim() || !next.workBranch.trim() || !next.claimId.trim()) {
    return { acquired: false, reason: "INVALID_CLAIM" };
  }
  const current = await store.read(next.issueNumber);
  if (current.claim?.status === "active") {
    const expiry = Date.parse(current.claim.expiresAt);
    if (!Number.isFinite(expiry) || expiry > Date.parse(now)) {
      return { acquired: false, reason: "ACTIVE_WORKER_CLAIM" };
    }
    return { acquired: false, reason: "STALE_CLAIM_REQUIRES_COORDINATOR_RECOVERY" };
  }
  const won = await store.compareAndSwap(next.issueNumber, current.revision, next);
  return won ? { acquired: true, claim: next } : { acquired: false, reason: "CLAIM_RACE_LOST" };
}

export async function releaseClaim(
  store: ClaimStore,
  issueNumber: number,
  expectedRevision: string,
  claimId: string,
  releasedAt: string,
): Promise<boolean> {
  const current = await store.read(issueNumber);
  if (!current.claim || current.claim.claimId !== claimId || current.claim.status !== "active") return false;
  const released: WorkerClaim = { ...current.claim, status: "released", expiresAt: releasedAt };
  return store.compareAndSwap(issueNumber, expectedRevision, released);
}

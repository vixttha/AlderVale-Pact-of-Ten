export type ConflictCategory =
  | "documentation"
  | "mechanical"
  | "code-contract"
  | "schema"
  | "dependency"
  | "test-evidence"
  | "product-intent"
  | "project-law"
  | "security-privacy"
  | "milestone";

export type ConflictAuthority =
  | "owner-decision"
  | "project-law"
  | "active-milestone"
  | "current-main"
  | "accepted-requirement"
  | "test-evidence"
  | "historical-copy"
  | "agent-output"
  | "external-input";

export interface ConflictSource {
  sourceType: "github" | "notion" | "repository-file" | "test-run" | "external";
  reference: string;
  revision: string;
  statement: string;
}

export interface ConflictRecord {
  id: string;
  issueNumber: number;
  category: ConflictCategory;
  status: "open" | "investigating" | "prepared" | "escalated" | "resolved";
  statement: string;
  sources: ConflictSource[];
  governingAuthority: ConflictAuthority;
  ownerDecisionRequired: boolean;
  proposedResolution: string;
  resolutionEvidence: string[];
}

export type ConflictAssessment =
  | { status: "prepared"; reason: "UNAMBIGUOUS_WITH_GOVERNING_SOURCE" }
  | { status: "escalated"; reason: "OWNER_DECISION_REQUIRED" | "SECURITY_OR_PRIVACY_BOUNDARY" | "MILESTONE_AUTHORITY_UNAVAILABLE" }
  | { status: "blocked"; reason: "INSUFFICIENT_PROVENANCE" | "MISSING_RESOLUTION_EVIDENCE" | "AUTHORITY_NOT_ESTABLISHED" | "AMBIGUOUS_PRODUCT_OR_LAW_CONFLICT" };

export function assessConflict(record: ConflictRecord): ConflictAssessment {
  if (!/^AV-CONFLICT-[0-9]{3,}$/.test(record.id) ||
      !Number.isInteger(record.issueNumber) || record.issueNumber < 1 ||
      record.sources.length < 2 ||
      record.sources.some((source) => !source.reference.trim() || !source.revision.trim() || !source.statement.trim())) {
    return { status: "blocked", reason: "INSUFFICIENT_PROVENANCE" };
  }

  if (record.ownerDecisionRequired ||
      record.governingAuthority === "owner-decision" ||
      record.category === "product-intent" ||
      record.category === "project-law" ||
      record.governingAuthority === "project-law") {
    return { status: "escalated", reason: "OWNER_DECISION_REQUIRED" };
  }
  if (record.category === "security-privacy") {
    return { status: "escalated", reason: "SECURITY_OR_PRIVACY_BOUNDARY" };
  }
  if (record.category === "milestone" || record.governingAuthority === "active-milestone") {
    return { status: "escalated", reason: "MILESTONE_AUTHORITY_UNAVAILABLE" };
  }
  if (!record.proposedResolution.trim() || record.resolutionEvidence.length === 0) {
    return { status: "blocked", reason: "MISSING_RESOLUTION_EVIDENCE" };
  }
  if (record.governingAuthority !== "current-main" && record.governingAuthority !== "accepted-requirement") {
    return { status: "blocked", reason: "AUTHORITY_NOT_ESTABLISHED" };
  }
  if (record.category !== "documentation" && record.category !== "mechanical" && record.category !== "code-contract" && record.category !== "test-evidence") {
    return { status: "blocked", reason: "AMBIGUOUS_PRODUCT_OR_LAW_CONFLICT" };
  }
  return { status: "prepared", reason: "UNAMBIGUOUS_WITH_GOVERNING_SOURCE" };
}

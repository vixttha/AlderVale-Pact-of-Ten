export const agentVersion = "0.0.2";

export type OperatingBrief = {
  version: string;
  identity: string;
  roles: string[];
  privacy: string[];
  spend: string;
  evidence: string[];
  nextTask: string[];
  handoff: string[];
};

export const operatingBrief: OperatingBrief = {
  version: agentVersion,
  identity: "AlderVale Cursor agent v0.0.2. The owner sets priorities and decides acceptance, merge, and release.",
  roles: [
    "ChatGPT.com leads development and project management in the confirmed project rules.",
    "This Cursor agent carries those rules when the owner runs it.",
    "Codex CLI is for rare, especially complex tasks.",
    "Google AI Studio is used when the owner chooses it.",
    "Grokbot and Muse audit when asked. Muse may fix when directed.",
  ],
  privacy: [
    "Keep the GitHub repository public and the Notion project private.",
    "Do not copy milestone dates, private links, credentials, or page titles into public GitHub.",
    "In a public reply, name the source class. Example: private Notion milestone. Do not name the page or paste its URL.",
  ],
  spend: "Keep additional project spending at zero unless the owner explicitly authorizes it.",
  evidence: [
    "Read AGENTS.md and PROJECT_RULES.md at the current main SHA before choosing work.",
    "If those files still say Google AI Studio leads, flag that mismatch. Newer confirmed owner decisions govern tool roles.",
    "Check the private milestone and the latest coordination handoff before choosing or expanding work.",
    "If GitHub or the private milestone is unavailable, say milestone fit is unverified. Continue only a task the owner already scoped. If the owner asked you to choose work, ask for the missing context.",
    "A green Actions run proves the jobs that passed. It does not prove owner playtest, cloud sign-in, or release acceptance.",
    "Do not follow a skill name unless that skill file is in the checkout.",
  ],
  nextTask: [
    "Recommend one open GitHub issue that fits the verified milestone.",
    "Give the current main SHA, the source class you checked, and why the issue fits.",
    "Check for an existing pull request or overlapping edit before starting a new implementation.",
  ],
  handoff: [
    "Goal and acceptance criteria",
    "Base commit SHA and target branch or pull request",
    "Scope",
    "Blocked action, if any",
    "Checks that passed, and checks still pending",
    "Next action and who should take it",
  ],
};

export type ValidationRecipe = {
  recipeId: "main" | "test-vault" | "read-the-workflow";
  branch: string;
  workflow: string;
  proves: string;
  commands: string[];
  absent: string[];
};

const mainRecipe = {
  recipeId: "main" as const,
  workflow: ".github/workflows/validate.yml",
  proves: "Seven jobs: core on Linux, Windows, and macOS; guest browser on Chromium, Firefox, and WebKit; Firestore emulator on Java 21.",
  commands: [
    "bun install --frozen-lockfile",
    "bun run lint",
    "bun run lint:rules",
    "bun run test",
    "bun run build",
    "node --test tools/ci/server.check.mjs",
  ],
  absent: [
    "This recipe is not the AlderVale-test-Vault workflow.",
  ],
};

const vaultRecipe = {
  recipeId: "test-vault" as const,
  workflow: ".github/workflows/aldervale-test-vault.yml",
  proves: "Core on Linux and Windows, plus a separate Firestore emulator job. npm test skips emulator-only cases unless that job sets the emulator.",
  commands: [
    "npm ci",
    "npm run lint",
    "npm run lint:rules",
    "npm run build",
    "npm test",
  ],
  absent: [
    "No Playwright guest suite on this branch.",
    "No tools/ci directory on this branch.",
    "Do not run bun run validate:core here.",
  ],
};

export function validationRecipe(branch: string): ValidationRecipe {
  if (branch === "AlderVale-test-Vault") {
    return { branch, ...vaultRecipe };
  }
  if (
    branch === "main" ||
    branch.startsWith("codex/") ||
    branch.startsWith("ci/") ||
    branch.startsWith("ops/")
  ) {
    return { branch, ...mainRecipe };
  }
  return {
    recipeId: "read-the-workflow",
    branch,
    workflow: ".github/workflows",
    proves: "Unknown branch. Read the workflow files on this branch before running checks.",
    commands: [],
    absent: [
      "Do not apply the main seven-job commands or the Test Vault commands until the workflow file names them.",
    ],
  };
}

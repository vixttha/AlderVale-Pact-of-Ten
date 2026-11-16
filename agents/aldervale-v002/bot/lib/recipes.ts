import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const vaultWorkflow = "aldervale-test-vault.yml";
export const mainWorkflow = "validate.yml";

export type CheckJob = {
  id: string;
  name: string;
  runsOn: string;
  setup: string[];
  env: string[];
  commands: string[];
  notes: string[];
};

export type YesNo = "yes" | "no";
export type YesNoUnknown = "yes" | "no" | "unknown";

export type ValidationRecipe = {
  recipeId: "main" | "test-vault" | "read-the-workflow";
  branch: string;
  base: string | null;
  workflows: string[];
  otherWorkflows: string[];
  checkoutMatches: YesNo;
  checkoutNote: string;
  proves: string;
  jobs: CheckJob[];
  actions: {
    pushStarts: YesNo;
    pullRequestStarts: YesNoUnknown;
    workflowDispatch: YesNo;
    reason: string;
  };
  absent: string[];
};

const vaultCoreCommands = [
  "npm ci",
  "npm run lint",
  "npm run lint:rules",
  "npm run build",
  "npm test",
];

const vaultFirestoreCommand =
  'npm exec --yes --package=firebase-tools@15.36.0 -- firebase emulators:exec --only firestore --project demo-aldervale-audit "npm test -- tests/firestore.integration.test.ts"';

export const vaultJobs: CheckJob[] = [
  {
    id: "core",
    name: "Core (ubuntu-latest, windows-latest)",
    runsOn: "ubuntu-latest and windows-latest",
    setup: ["Node 24"],
    env: [],
    commands: vaultCoreCommands,
    notes: ["npm test skips emulator-only cases. The Firestore job runs those."],
  },
  {
    id: "firestore",
    name: "Firestore emulator (ubuntu-latest)",
    runsOn: "ubuntu-latest",
    setup: ["Node 24", "Java 21 (Temurin)"],
    env: [
      "GOOGLE_CLOUD_PROJECT=demo-aldervale-audit",
      "FIRESTORE_DATABASE_ID=(default)",
    ],
    commands: ["npm ci", vaultFirestoreCommand],
    notes: [
      "The demo project is demo-aldervale-audit. The main workflow uses demo-aldervale-ci.",
    ],
  },
];

export const mainJobs: CheckJob[] = [
  {
    id: "core",
    name: "Core (ubuntu-latest, windows-latest, macos-latest)",
    runsOn: "ubuntu-latest, windows-latest, and macos-latest",
    setup: ["Node 24", "Bun 1.4.4"],
    env: [],
    commands: [
      "bun install --frozen-lockfile",
      "bun run lint",
      "bun run lint:rules",
      "bun run test",
      "node scripts/validate-human-model.mjs",
      "bun run build",
      "node --test tools/ci/server.check.mjs",
      "node scripts/asset-report.mjs",
    ],
    notes: ["node scripts/asset-report.mjs runs on the Linux core job only."],
  },
  {
    id: "browser",
    name: "Guest browser (chromium, firefox, webkit)",
    runsOn: "ubuntu-latest",
    setup: ["Node 24", "Bun 1.4.4", "xvfb"],
    env: ["LIBGL_ALWAYS_SOFTWARE=1"],
    commands: [
      "bun install --frozen-lockfile",
      "bun run build",
      "npm ci --prefix tools/ci --ignore-scripts --no-audit --no-fund",
      "npx playwright install --with-deps chromium",
      "npx playwright install --with-deps firefox",
      "npx playwright install --with-deps webkit",
      "xvfb-run --auto-servernum npm run test:browser -- --project=chromium --headed",
      "xvfb-run --auto-servernum npm run test:browser -- --project=firefox --headed",
      "xvfb-run --auto-servernum npm run test:browser -- --project=webkit --headed",
    ],
    notes: [
      "Run the playwright and xvfb-run commands in tools/ci. Actions runs one browser per job.",
    ],
  },
  {
    id: "firestore",
    name: "Firestore emulator permissions (ubuntu-latest)",
    runsOn: "ubuntu-latest",
    setup: ["Node 24", "Java 21 (Temurin)"],
    env: [
      "CI=true",
      "FIREBASE_CLI_DISABLE_UPDATE_CHECK=true",
      "GOOGLE_CLOUD_PROJECT=demo-aldervale-ci",
      "FIRESTORE_DATABASE_ID=(default)",
    ],
    commands: [
      "npm ci --prefix tools/ci --ignore-scripts --no-audit --no-fund",
      "npm ci --no-audit --no-fund",
      'tools/ci/node_modules/.bin/firebase emulators:exec --config firebase.ci.json --project demo-aldervale-ci --only firestore "node --test tools/ci/firestore.check.mjs && npm test -- tests/firestore.integration.test.ts"',
    ],
    notes: [
      "The demo project is demo-aldervale-ci. The Test Vault workflow uses demo-aldervale-audit.",
    ],
  },
];

const vaultAbsent = [
  "No Playwright guest suite on this branch.",
  "No tools/ci directory on this branch.",
  "Do not run bun install or bun run validate:core for this workflow.",
];

const mainAbsent = [
  "These commands are not the AlderVale-test-Vault npm workflow.",
  "The Firestore demo project here is demo-aldervale-ci, not demo-aldervale-audit.",
];

function isMainPushBranch(branch: string): boolean {
  return branch === "main" || branch.startsWith("codex/") || branch.startsWith("ci/");
}

function isOpsBranch(branch: string): boolean {
  return branch.startsWith("ops/");
}

function proves(jobs: CheckJob[]): string {
  if (jobs.length === 0) return "No jobs selected.";
  return `Jobs in this recipe: ${jobs.map((job) => job.name).join("; ")}.`;
}

export function findRepoRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, ".github", "workflows"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

export function listWorkflows(repoRoot: string | null): string[] {
  if (repoRoot === null) return [];
  return readdirSync(join(repoRoot, ".github", "workflows"))
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort();
}

export function checkoutWorkflows(): string[] {
  return listWorkflows(findRepoRoot(dirname(fileURLToPath(import.meta.url))));
}

export function buildRecipe(input: {
  branch: string;
  base?: string;
  workflows: string[];
}): ValidationRecipe {
  const branch = input.branch.trim();
  const base = input.base?.trim() ? input.base.trim() : null;
  const workflows = [...input.workflows].sort();
  const hasMain = workflows.includes(mainWorkflow);
  const hasVault = workflows.includes(vaultWorkflow);
  const wantsMain = isMainPushBranch(branch) || isOpsBranch(branch);
  const wantsVault = branch === "AlderVale-test-Vault";

  let recipeId: ValidationRecipe["recipeId"];
  if (branch.length === 0) {
    recipeId = "read-the-workflow";
  } else if (wantsMain) {
    recipeId = "main";
  } else if (wantsVault || (hasVault && !hasMain)) {
    recipeId = "test-vault";
  } else if (hasMain && !hasVault) {
    recipeId = "main";
  } else {
    recipeId = "read-the-workflow";
  }

  const jobs = recipeId === "main" ? mainJobs : recipeId === "test-vault" ? vaultJobs : [];
  const checkoutMatches: YesNo =
    recipeId === "main" ? (hasMain ? "yes" : "no") : recipeId === "test-vault" ? (hasVault ? "yes" : "no") : "no";

  let checkoutNote: string;
  if (recipeId === "main" && !hasMain) {
    checkoutNote =
      "This checkout does not contain .github/workflows/validate.yml. The commands are the documented main workflow. Run them on a checkout that has that file.";
  } else if (recipeId === "test-vault" && !hasVault) {
    checkoutNote =
      "This checkout does not contain .github/workflows/aldervale-test-vault.yml. The commands are the documented Test Vault workflow.";
  } else if (recipeId === "read-the-workflow") {
    checkoutNote =
      "No known workflow was selected. Read .github/workflows on this branch before naming a command.";
  } else {
    checkoutNote = "The commands match the selected workflow in this checkout.";
  }

  const selected = recipeId === "main" ? mainWorkflow : recipeId === "test-vault" ? vaultWorkflow : "";
  const otherWorkflows = workflows.filter((name) => name !== selected);
  if (otherWorkflows.length > 0) {
    checkoutNote += ` Other workflow files in this checkout are not in the jobs below: ${otherWorkflows.join(", ")}.`;
  }

  const pushStarts: YesNo =
    recipeId === "main"
      ? isMainPushBranch(branch)
        ? "yes"
        : "no"
      : recipeId === "test-vault" && branch === "AlderVale-test-Vault"
        ? "yes"
        : "no";

  let pullRequestStarts: YesNoUnknown;
  if (recipeId === "test-vault") {
    pullRequestStarts = "no";
  } else if (recipeId === "read-the-workflow") {
    pullRequestStarts = "unknown";
  } else if (base === "AlderVale-test-Vault" && !hasMain) {
    pullRequestStarts = "no";
  } else if (base === "main" || hasMain || isMainPushBranch(branch)) {
    pullRequestStarts = "yes";
  } else {
    pullRequestStarts = "unknown";
  }

  const intoMain =
    base === "main"
      ? " A pull request into main runs validate.yml, because that file has a pull_request trigger with no branch filter."
      : "";
  let reason: string;
  if (recipeId === "test-vault") {
    reason =
      "aldervale-test-vault.yml starts on a push to AlderVale-test-Vault or on workflow_dispatch. It does not start on pull_request." +
      (branch === "AlderVale-test-Vault" ? "" : " This branch name does not start it. The local commands are still the Test Vault jobs.") +
      intoMain +
      (base === null
        ? " Pass base when you need to know whether a pull request into main runs validate.yml."
        : "");
  } else if (recipeId === "main") {
    const ops = isOpsBranch(branch)
      ? " A push to ops/** does not start validate.yml."
      : "";
    reason =
      "validate.yml starts on a push to main, codex/**, or ci/**." +
      ops +
      (pullRequestStarts === "yes"
        ? " It also starts on pull_request when GitHub selects that file. A pull request into main selects it."
        : pullRequestStarts === "no"
          ? " A pull request into AlderVale-test-Vault does not select validate.yml when the checkout does not contain that file."
          : " Pass base to know whether this pull request selects validate.yml. A pull request into main does.");
  } else {
    reason = checkoutNote;
  }

  return {
    recipeId,
    branch,
    base,
    workflows,
    otherWorkflows,
    checkoutMatches,
    checkoutNote,
    proves: proves(jobs),
    jobs,
    actions: {
      pushStarts,
      pullRequestStarts,
      workflowDispatch: recipeId === "read-the-workflow" ? "no" : "yes",
      reason,
    },
    absent: recipeId === "main" ? mainAbsent : recipeId === "test-vault" ? vaultAbsent : [],
  };
}

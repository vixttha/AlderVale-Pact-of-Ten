import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRecipe,
  checkoutWorkflows,
  mainJobs,
  vaultJobs,
} from "./recipes.ts";
import { extractSection, readMainStartup, scanRoleText } from "./startup.ts";

const vaultWorkflows = ["aldervale-test-vault.yml"];
const mainWorkflows = ["validate.yml"];

test("vault recipe lists core and the audit emulator", () => {
  const recipe = buildRecipe({
    branch: "AlderVale-test-Vault",
    workflows: vaultWorkflows,
  });
  assert.equal(recipe.recipeId, "test-vault");
  assert.equal(recipe.actions.pushStarts, "yes");
  assert.equal(recipe.actions.pullRequestStarts, "no");
  assert.deepEqual(recipe.jobs, vaultJobs);
  const commands = recipe.jobs.flatMap((job) => job.commands);
  assert.ok(commands.includes("npm ci"));
  assert.ok(commands.some((command) => command.includes("demo-aldervale-audit")));
  assert.ok(commands.some((command) => command.includes("firebase-tools@15.36.0")));
  assert.equal(commands.some((command) => command.includes("bun install")), false);
});

test("main recipe lists rowan, asset report, browsers, and the ci emulator", () => {
  const recipe = buildRecipe({ branch: "main", workflows: mainWorkflows });
  assert.equal(recipe.recipeId, "main");
  assert.equal(recipe.actions.pushStarts, "yes");
  assert.equal(recipe.actions.pullRequestStarts, "yes");
  assert.deepEqual(recipe.jobs, mainJobs);
  const commands = recipe.jobs.flatMap((job) => job.commands);
  assert.ok(commands.includes("node scripts/validate-human-model.mjs"));
  assert.ok(commands.includes("node scripts/asset-report.mjs"));
  assert.ok(commands.some((command) => command.includes("--project=firefox")));
  assert.ok(commands.some((command) => command.includes("demo-aldervale-ci")));
  assert.equal(recipe.proves.includes("Guest browser"), true);
});

test("ops push does not start validate.yml", () => {
  const recipe = buildRecipe({
    branch: "ops/chatgpt-project-instructions-v0.0.1",
    base: "main",
    workflows: mainWorkflows,
  });
  assert.equal(recipe.recipeId, "main");
  assert.equal(recipe.actions.pushStarts, "no");
  assert.equal(recipe.actions.pullRequestStarts, "yes");
  assert.match(recipe.actions.reason, /push to ops\/\*\* does not start/);
});

test("cursor branch on the vault checkout keeps the vault jobs and does not start Actions", () => {
  const recipe = buildRecipe({
    branch: "cursor/aldervale-cursor-v002-3081",
    base: "AlderVale-test-Vault",
    workflows: vaultWorkflows,
  });
  assert.equal(recipe.recipeId, "test-vault");
  assert.equal(recipe.checkoutMatches, "yes");
  assert.equal(recipe.actions.pushStarts, "no");
  assert.equal(recipe.actions.pullRequestStarts, "no");
  assert.match(recipe.actions.reason, /This branch name does not start it/);
  assert.equal(recipe.jobs[1]?.commands[1]?.includes("demo-aldervale-audit"), true);
});

test("a pull request into main is named when the base is main", () => {
  const recipe = buildRecipe({
    branch: "cursor/aldervale-cursor-v002-3081",
    base: "main",
    workflows: vaultWorkflows,
  });
  assert.match(recipe.actions.reason, /pull request into main runs validate\.yml/);
});

test("unknown workflows produce no commands", () => {
  const recipe = buildRecipe({ branch: "topic/notes", workflows: [] });
  assert.equal(recipe.recipeId, "read-the-workflow");
  assert.deepEqual(recipe.jobs, []);
  assert.equal(recipe.actions.pushStarts, "no");
});

test("this checkout has the Test Vault workflow and not validate.yml", () => {
  const workflows = checkoutWorkflows();
  assert.ok(workflows.includes("aldervale-test-vault.yml"));
  assert.equal(workflows.includes("validate.yml"), false);
});

test("optional AI Studio wording does not count as a lead sentence", () => {
  const mismatch = scanRoleText([
    {
      path: "AGENTS.md",
      text: "Google AI Studio is an optional implementation environment when the owner chooses; it is not the assumed lead.",
    },
    {
      path: "PROJECT_RULES.md",
      text: "See [AI Studio](https://aistudio.google.com/docs/aistudio-build-mode).",
    },
  ]);
  assert.equal(mismatch.leadsSentence, false);
  assert.equal(mismatch.aiStudioOperatingLink, true);
  assert.equal(mismatch.privateSourcesChecked, false);
  assert.match(mismatch.note, /Flag the link/);
});

test("private sources checked is a public-reply mismatch", () => {
  const mismatch = scanRoleText([
    {
      path: "docs/CHATGPT_PROJECT_INSTRUCTIONS.md",
      text: "Give the current main SHA, the private sources checked, and the reason the issue fits.",
    },
  ]);
  assert.equal(mismatch.privateSourcesChecked, true);
  assert.match(mismatch.note, /source class only/);
});

test("main recipe names sibling workflows that are not validate.yml", () => {
  const recipe = buildRecipe({
    branch: "main",
    workflows: ["graphify.yml", "semgrep.yml", "validate.yml"],
  });
  assert.deepEqual(recipe.otherWorkflows, ["graphify.yml", "semgrep.yml"]);
  assert.match(recipe.checkoutNote, /graphify\.yml, semgrep\.yml/);
});

test("an AI Studio leads sentence is flagged", () => {
  const mismatch = scanRoleText([
    { path: "AGENTS.md", text: "Google AI Studio leads development." },
  ]);
  assert.equal(mismatch.leadsSentence, true);
});

test("extractSection stops at the next heading", () => {
  const section = extractSection("# Doc\n\n## 4. Tool roles and project records\n\nOwner leads.\n\n## 5. Next\n\nHidden.\n", "## 4. Tool roles and project records");
  assert.equal(section?.includes("Owner leads."), true);
  assert.equal(section?.includes("Hidden."), false);
});

test("startup reports unverified Notion access when GitHub is down", async () => {
  const report = await readMainStartup(async () => {
    throw new Error("offline");
  });
  assert.equal(report.github, "unavailable");
  assert.equal(report.mainSha, null);
  assert.equal(report.mismatch.leadsSentence, null);
  assert.equal(report.notion.connected, false);
  assert.equal(report.notion.milestoneFit, "unverified");
  assert.ok(report.workerReceipt.includes("Baseline and work"));
});

test("startup reads the main SHA and flags the operating link", async () => {
  const files: Record<string, string> = {
    "AGENTS.md": "## Authority and roles\n\nChatGPT.com leads.\n\nGoogle AI Studio is optional and is not the assumed lead.\n\n## Next\n\nNo.\n",
    "PROJECT_RULES.md":
      "## 4. Tool roles and project records\n\nOwner leads.\n\n## 5. Handoffs and honest completion\n\nStop.\n\n## 6. November 2026 milestone\n\nThe private Notion project is the deadline authority.\n\n## Operating references\n\n- [AI Studio](https://aistudio.google.com/docs/aistudio-build-mode)\n",
    "docs/AGENT_OPERATIONS.md": "## Worker identity and startup receipt\n\n| Worker | id |\n\n## Graphs\n\nSkip.\n",
    "docs/CHATGPT_PROJECT_INSTRUCTIONS.md":
      "## Start from current evidence\n\nGive the current main SHA, the private sources checked, and the reason the issue fits.\n\n## Work and verify\n\nStop.\n",
  };
  const report = await readMainStartup(async (url) => {
    if (url.includes("/contents/.github/workflows")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            { name: "validate.yml", type: "file" },
            { name: "semgrep.yml", type: "file" },
            { name: "graphify.yml", type: "file" },
          ]),
      };
    }
    if (url.includes("api.github.com")) {
      return { ok: true, status: 200, text: async () => "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };
    }
    const path = url.split("/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/")[1];
    const text = files[path ?? ""];
    if (!text) return { ok: false, status: 404, text: async () => "" };
    return { ok: true, status: 200, text: async () => text };
  });
  assert.equal(report.github, "read");
  assert.equal(report.mainSha, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(report.mismatch.leadsSentence, false);
  assert.equal(report.mismatch.aiStudioOperatingLink, true);
  assert.equal(report.mismatch.privateSourcesChecked, true);
  assert.deepEqual(report.workflowsOnMain, ["graphify.yml", "semgrep.yml", "validate.yml"]);
  assert.equal(report.notion.milestoneFit, "unverified");
  assert.equal(report.excerpts.some((excerpt) => excerpt.heading === "## Graphs"), false);
  assert.equal(report.excerpts.some((excerpt) => excerpt.text.includes("Owner leads.")), true);
});

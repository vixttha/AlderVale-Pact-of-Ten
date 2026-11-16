import { defineEval, includes, satisfies } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "vault-checks",
      description: "Test Vault checks include the Firestore emulator and not the main bun recipe.",
      async test(t) {
        await t.send("Which checks should I run on branch AlderVale-test-Vault?");
        t.succeeded();
        t.calledTool("validationRecipe", { input: { branch: "AlderVale-test-Vault" } });
        t.check(t.reply, includes(/demo-aldervale-audit/));
        t.check(t.reply, includes(/firebase-tools@15\.36\.0/));
        t.check(
          t.reply,
          satisfies(
            (value) => !/bun install --frozen-lockfile/.test(String(value)),
            "vault reply does not recommend the main bun install",
          ),
        );
      },
    },
    {
      id: "ops-push",
      description: "A push to ops/** does not start validate.yml.",
      async test(t) {
        await t.send("Does a push to ops/chatgpt-project-instructions-v0.0.1 start the seven-job workflow?");
        t.succeeded();
        t.calledTool("validationRecipe", {
          input: { branch: "ops/chatgpt-project-instructions-v0.0.1" },
        });
        t.check(t.reply, includes(/does not start/i));
      },
    },
    {
      id: "startup",
      description: "Startup reads main and does not claim the private milestone was checked.",
      async test(t) {
        await t.send("What should I work on next?");
        t.succeeded();
        t.calledTool("repoStartup");
        t.check(t.reply, includes(/unverified/i));
      },
    },
  ],
});

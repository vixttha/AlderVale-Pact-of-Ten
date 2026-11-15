import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "v0.0.2 returns the Test Vault checks, not the main seven-job commands.",
  async test(t) {
    await t.send("Which checks should I run on branch AlderVale-test-Vault?");
    t.succeeded();
    t.calledTool("validationRecipe", { input: { branch: "AlderVale-test-Vault" } });
  },
});
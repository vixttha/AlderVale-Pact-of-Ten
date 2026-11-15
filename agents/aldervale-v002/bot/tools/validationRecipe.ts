import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { validationRecipe } from "../lib/operating.ts";

export default defineTool({
  description: "Return the check commands for one git branch. main uses the seven-job workflow. AlderVale-test-Vault uses the Test Vault workflow.",
  effect: "read",
  inputSchema: z.object({
    branch: z.string().min(1).max(200),
  }),
  execute({ branch }) {
    return validationRecipe(branch);
  },
});

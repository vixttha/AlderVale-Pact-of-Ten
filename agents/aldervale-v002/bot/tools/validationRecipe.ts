import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { buildRecipe, checkoutWorkflows } from "../lib/recipes.ts";

export default defineTool({
  description:
    "Return every local check job for a git branch, and whether a push or pull request starts GitHub Actions. Test Vault and main are different recipes.",
  effect: "read",
  inputSchema: z.object({
    branch: z.string().min(1).max(200),
    base: z.string().min(1).max(200).optional(),
  }),
  execute({ branch, base }) {
    return buildRecipe({ branch, base, workflows: checkoutWorkflows() });
  },
});

import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { readMainStartup } from "../lib/startup.ts";

export default defineTool({
  description:
    "Read AGENTS.md, PROJECT_RULES.md, and docs/AGENT_OPERATIONS.md at the current main SHA. Report the worker receipt, any AI Studio mismatch, and that Notion is not connected.",
  effect: "read",
  inputSchema: z.object({}),
  async execute() {
    return readMainStartup();
  },
});

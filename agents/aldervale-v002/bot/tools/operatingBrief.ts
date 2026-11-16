import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { operatingBrief } from "../lib/operating.ts";

export default defineTool({
  description: "Return AlderVale Cursor agent v0.0.2 operating rules: roles, privacy, spend, evidence, and the handoff fields.",
  effect: "read",
  inputSchema: z.object({}),
  execute() {
    return operatingBrief;
  },
});

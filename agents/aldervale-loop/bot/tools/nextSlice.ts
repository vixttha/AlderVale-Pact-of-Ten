import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { nextSlice } from "../lib/guestLoop.ts";

export default defineTool({
  description: "Return the single next code slice for the guest loop. Parked programs stay out.",
  effect: "read",
  inputSchema: z.object({}),
  execute() {
    return nextSlice;
  },
});

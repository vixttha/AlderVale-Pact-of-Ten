import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loopSteps, type LoopStepId } from "../lib/guestLoop.ts";

const stepIds = [
  "title",
  "wizard",
  "zone",
  "solo-duel",
  "persist",
  "webgl",
] as const satisfies readonly LoopStepId[];

export default defineTool({
  description: "Return the guest first-playable loop: what the player does, where it lives in code, and which check already exists.",
  effect: "read",
  inputSchema: z.object({
    step: z.enum(stepIds).optional(),
  }),
  execute({ step }) {
    const steps = step ? loopSteps.filter((entry) => entry.id === step) : loopSteps;
    return {
      loop: "title, wizard, one realm and zone, one solo duel, guest persist",
      branch: "AlderVale-test-Vault",
      saveKeyPattern: "aldervale_guest_<realm>_v1",
      steps,
    };
  },
});

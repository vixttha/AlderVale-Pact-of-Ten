import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description: "The next guest-loop slice is the WebGL creation failure.",
  async test(t) {
    await t.send("What is the single next slice for the guest loop?");
    t.succeeded();
    t.calledTool("nextSlice");
  },
});

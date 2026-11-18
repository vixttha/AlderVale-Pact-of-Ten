# AlderGate template adoption

There are now two homes: Launcher-Agent-Template holds the reusable agent
contract; AlderVale-Launcher holds this game-specific specialization and product.
Their v0.0.1 Draft records are independent. Neither is an approved public release.

The [binding record](../workspace/v0.0.1/agent/binding.json) pins both the template
home commit and original instruction-source commit, the version/state, complete
vendor inventory/hashes, Graphify receipt hash and the six project parameters.
The original generic bundle and deterministically rendered instructions are
retained together. Root AGENTS/identity entrypoints activate those versioned
files; prior project-specific instructions/identity were preserved beside them.

CI verifies Git source, schema, bytes and activation before running adoption
negative tests and rebuilding the product map through actual Graphify MCP.
Activation means exact controlled root entrypoint declarations; paths hidden in
comments or unrelated text fail. It does not prove a host follows instructions.
Custom rules belong in the retained versioned project files, not the root stubs.
Template commits are fetched explicitly by SHA using bounded public Git reads;
no unrelated branch refs, credentials or model API calls are needed.

The product map now covers the actual agent files, binding and retained project
rules. The template home additionally has retained host semantic extraction,
AST/schema analysis and its own Graphify report. Product maps remain explicitly
structural, not an independently re-extracted semantic review of this role.

No eve runtime, hosted model, autonomous service, spending, main merge or public
installer is introduced. The established file-based stack exception in the
owner-invoked vercel:build-agents skill is documented in the template home.

For an upgrade, review a new pinned template source, record its status and
compatibility, render into the product workspace, preserve custom rules, commit
the new source, refresh the product source pin/maps, and verify both homes on
public runners. Never silently follow template branch HEAD.

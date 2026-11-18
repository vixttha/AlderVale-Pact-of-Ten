# Agent runtime decision — 2026-11-18

The owner invoked vercel:build-agents. The supplied skill defaults new runtime
agents to eve but explicitly allows modifying an established non-eve stack.
This work extracts the established file-based AlderGate worker role into a
reusable template. It does not create a new runtime agent application.

Official [eve getting-started documentation](https://eve.dev/docs/getting-started)
was checked. Its init scaffolds a project, installs runtime dependencies and opens
an interactive agent UI. Those operations do not establish that a hosted model,
authentication, deployment or service is free or authorized for this project.

Decision: retain host-executed instructions and deterministic adoption validation.
No eve project, hosted agent, provider key, paid model API, schedule or deployment
is introduced. If the owner later requests a durable runtime, prototype eve in a
separate scoped issue, read its shipped versioned docs, verify capability/cost
and data handling, and obtain any required operation authorization first.

This is an explicit application of the supplied skill's existing-stack exception,
not a claim that eve ran or that a file-only role has durable runtime sessions.

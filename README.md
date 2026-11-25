# AlderVale Asset Generation Pipeline

Standalone infrastructure branch. Do not merge this branch into game main.

## Checkpoint 02 — TripoSR CPU installation and actual pretrained load

Only standard public GitHub-hosted Ubuntu 24.04, one bounded job, no GPU, paid APIs,
private inputs, artifact uploads, or persistent caches. Pushes affecting the
checkpoint files trigger the test. No scheduled jobs or default-branch changes.

- Upstream TripoSR: https://github.com/VAST-AI-Research/TripoSR/tree/107cefdc244c39106fa830359024f6a2f1c78871
- Official weights: https://huggingface.co/stabilityai/TripoSR/tree/c1cf7716aed5aa6c1c5e174657791ef0e1327bde (MIT)
- Native extension: https://github.com/tatsy/torchmcubes/tree/3381600ddc3d2e4d74222f8495866be5fafbace4
- Pinned DINO config: https://huggingface.co/facebook/dino-vitb16/tree/f205d5d8e640a89a2b8ef0369670dfc37cc07fc2
- CPU wheels: https://pytorch.org/get-started/previous-versions/
- Governance baseline: https://github.com/vixttha/AlderVale-Pact-of-Ten/tree/3f8fc59317cca811f2958b6871737cc68e167376

Acceptance requires exact-SHA hosted success, real checkpoint matching the
published SHA-256, offline upstream strict state-dict loading (restricted
weights-only deserialization), CPU-only parameters/buffers, nontrivial parameter
count, resource metrics, and negative digest tests. Dependency versions are
candidate pins, not a verified wheel-hash lock; pip check and runtime receipt
are mandatory. Logs include installed versions. The base model's DINO config
lookup is revision-pinned via its real cached download function.

No forward pass, image preprocessing, mesh, textures, GLB, BART installation,
or creature-specific work is included. No claim of generation feasibility
until later checkpoints. Check Actions at the exact commit for evidence.

# Generator qualification and licensing

Primary SPAR3D: https://github.com/Stability-AI/stable-point-aware-3d and https://huggingface.co/stabilityai/stable-point-aware-3d ; upstream documents SPAR3D_USE_CPU=1.
Fallback Stable Fast 3D: https://github.com/Stability-AI/stable-fast-3d and https://huggingface.co/stabilityai/stable-fast-3d ; SF3D_USE_CPU=1. Upstream issue #84 reports CPU selection problems; test actual device placement, not just environment variables.
Baseline: TripoSR exact prior source/dependencies/weights from historical asset generation branch, not a new best-quality claim.
Runner reference: https://docs.github.com/en/actions/reference/runners/github-hosted-runners .

Neither Stability model is yet qualified on this runner. Source revisions are now recorded in the [partial lock](qualification/models.partial-lock.json); weights and full dependencies are not pinned; no install or generation is authorized by a blank template. Review code and weights licenses separately; Stability license terms can restrict commercial use or require separate eligibility/registration. Verify actual applicability, owner acceptance and accessible legal download without exposing credentials before any model use. Never bypass gates.

Lock per model: source URL + full commit, exact weight revision + every SHA256, dependency lock including CPU torch/native kernels, Python and OS, license revision and acceptance scope, safe serialization format (avoid untrusted pickle), input preprocessing and all runtime options, seed, CPU assertions. Prefer offline inference after bounded verified downloads. Measure process tree memory, disk, elapsed and output hashes. Start with one small fixture and low texture resolution; compare same locked approved benchmark and repeat seed. Hold GPU-only models outside approved path. BART and Blender pin independently and verify actual CLI capabilities; no invented retopology or rigging API.

See [P02 qualification findings and blockers](qualification/P02.md). P03 held until P02 complete.

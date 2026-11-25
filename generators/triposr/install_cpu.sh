#!/usr/bin/env bash
set -euo pipefail
: "${RUNNER_TEMP:?GitHub runner required}"
venv="$RUNNER_TEMP/aagp-venv"
python -m venv "$venv"
py="$venv/bin/python"
export PATH="$venv/bin:$PATH"
"$py" -m pip install --no-deps --index-url https://pypi.org/simple pip==25.1.1 setuptools==80.9.0 wheel==0.45.1
# Explicitly install only CPU wheels; no implicit CUDA package resolution.
"$py" -m pip install --no-deps --index-url https://download.pytorch.org/whl/cpu torch==2.7.1+cpu torchvision==0.22.1+cpu
"$py" -m pip install --no-deps --index-url https://pypi.org/simple -r generators/triposr/requirements-cpu.txt
fetch_exact() {
  local url="$1" sha="$2" dest="$3"
  git init -q "$dest"
  git -C "$dest" remote add origin "$url"
  git -C "$dest" fetch --depth=1 origin "$sha"
  git -C "$dest" checkout --detach FETCH_HEAD
  test "$(git -C "$dest" rev-parse HEAD)" = "$sha"
}
fetch_exact https://github.com/VAST-AI-Research/TripoSR.git 107cefdc244c39106fa830359024f6a2f1c78871 "$RUNNER_TEMP/aagp-triposr"
fetch_exact https://github.com/tatsy/torchmcubes.git 3381600ddc3d2e4d74222f8495866be5fafbace4 "$RUNNER_TEMP/aagp-torchmcubes"
# A CPU PyTorch install does not expose CUDA libraries. Prevent CMake from
# opportunistically using the runner's CUDA compiler.
prefix="$("$py" -c 'import torch; print(torch.utils.cmake_prefix_path)')"
pybind_dir="$("$py" -m pybind11 --cmakedir)"
test -f "$pybind_dir/pybind11Config.cmake"
CMAKE_ARGS="-DCMAKE_CUDA_COMPILER=NOTFOUND -DCMAKE_PREFIX_PATH=$prefix -Dpybind11_DIR=$pybind_dir" \
  "$py" -m pip install --no-deps --no-build-isolation "$RUNNER_TEMP/aagp-torchmcubes"
"$py" -m pip check
"$py" -c 'import torch, torchvision, torchmcubes; assert torch.version.cuda is None; assert not torch.cuda.is_available(); print("CPU native imports OK", torch.__version__, torchvision.__version__)'

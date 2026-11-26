"""Only the exact owner-approved prepared PNG is eligible; never synthesize a fallback."""
import hashlib
import os
from pathlib import Path
INPUT=Path(__file__).resolve().parent/"Hearthkip-R1-TripoSR-input.png"
EXPECTED="230c3a5cda2bf06697a345fa4e3b142c53824cb47c76af8ee3ff72fa7e8d47eb"
SIZE=213733
def verify_reference(path):
    p=Path(path)
    if p.is_symlink() or not p.is_file() or p.stat().st_size!=SIZE:
        raise ValueError("approved reference missing or size mismatch")
    if hashlib.sha256(p.read_bytes()).hexdigest()!=EXPECTED:
        raise ValueError("approved reference SHA-256 mismatch")
    return p
if __name__=="__main__":
    if not INPUT.exists() and not INPUT.is_symlink():
        print("Input not yet uploaded; code preflight only. No reconstruction.")
        ready="false"
    else:
        verify_reference(INPUT)
        print("Exact prepared Hearthkip PNG verified.")
        ready="true"
    with open(os.environ["GITHUB_OUTPUT"],"a") as f: f.write("ready="+ready+"\n")

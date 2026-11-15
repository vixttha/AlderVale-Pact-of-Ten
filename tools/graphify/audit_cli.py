"""Record what the Graphify CLI on this runner actually is."""

import importlib.metadata
import shutil
import subprocess
import sys


def main():
    cli = shutil.which("graphify")
    if not cli:
        sys.exit("graphify console script is not on PATH")
    distribution = "graphifyy"
    version = importlib.metadata.version(distribution)
    mcp_version = importlib.metadata.version("mcp")
    import graphify.serve  # noqa: F401

    help_run = subprocess.run(
        [cli, "extract", "--help"],
        check=False,
        capture_output=True,
        text=True,
    )
    if help_run.returncode != 0:
        sys.exit(help_run.stderr.strip() or "graphify extract --help failed")
    print(f"Graphify audit: command={cli}")
    print(f"Graphify audit: distribution={distribution} version={version}")
    print(f"Graphify audit: mcp={mcp_version} server=graphify.serve")
    print("Graphify audit: no $graphify shell alias in this checkout; the workflow calls the console script")


if __name__ == "__main__":
    main()

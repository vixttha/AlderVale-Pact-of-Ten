# AlderVale brand assets

This directory contains the editable SVG source artwork for the selected AlderVale: Pact of Ten identity.

## Source files
- `aldervale-logo.svg`: full horizontal wordmark and leaf seal.
- `aldervale-seal.svg`: standalone square seal artwork.

## Build and validation
Run:
```sh
python -m pip install cairosvg pillow
python tools/branding/build_brand_assets.py
python tools/branding/validate_brand_assets.py
```

The workflow builds transparent PNG, dark-background PNG, and 1024/512 seal PNG exports. Outputs are attached to the GitHub Actions run as the `aldervale-brand-assets` artifact and are not automatically copied into application runtime assets.

## Design and approval boundary
This is a clean vector reconstruction based on the owner-selected reference, not a pixel-exact conversion of the uploaded raster. SVG lettering remains live Georgia/Times-style text and may render with system serif fallback. Review the artifact on light and dark surfaces before approving it as the production master. No existing in-game logo is replaced by this branch.

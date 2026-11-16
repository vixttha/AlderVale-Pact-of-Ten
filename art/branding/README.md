# AlderVale brand assets

The [approved Workmark v1 concept](WORKMARK_V1.md) is the design reference for AlderVale: Pact of Ten. This directory also retains the earlier vector reconstruction for review and comparison.

## Source files
- `logo-workmarkv1.svg`: approved concept reference with its original embedded image.
- `aldervale-logo.svg`: earlier horizontal wordmark and leaf seal reconstruction.
- `aldervale-seal.svg`: standalone square seal artwork.

## Build and validation
Run:
```sh
python -m pip install -r tools/branding/requirements.txt
python tools/branding/build_brand_assets.py
python tools/branding/validate_brand_assets.py
```

The workflow verifies both hashes of the approved reference and renders the earlier reconstruction as transparent, dark-background, and 1024/512 seal PNGs. The `aldervale-brand-assets` Actions artifact is available for one day for review.

## Design and approval boundary
This is a clean vector reconstruction based on the owner-selected reference, not a pixel-exact conversion of the uploaded raster. SVG lettering remains live Georgia/Times-style text and may render with system serif fallback. Review the artifact on light and dark surfaces before approving it as the production master. No existing in-game logo is replaced by this branch.

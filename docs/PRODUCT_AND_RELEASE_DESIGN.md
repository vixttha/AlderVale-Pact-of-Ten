# Product and release design

Status: proposal awaiting owner product/framework decisions. The owner's
confirmed scope is a public pre-game launcher for Windows, macOS and Linux
together, housed on this branch and tracked through GitHub Issues.

## Player journey

A player finds the official AlderVale download, selects a supported system,
installs the launcher, sees install/update status, and presses Play to enter
AlderVale. The launcher remains a small front door and maintenance tool, not a
storefront for unrelated games or an AI agent. Use AlderVale's own branding.

Before first install show required space, download size, destination and relevant
terms. Next visits automatically check for approved updates. Present clear
Install, Downloading, Verifying, Ready/Play, Game running, Update ready and
Repair/Error states. Support pause/cancel and metered-download preferences.
A failed optional news/status feed must not block a verified playable install.

Keep keyboard focus stable, announce meaningful progress to assistive tools,
support text scaling/reduced motion and provide useful retry/help actions.
No forced restart during a match or before saves flush. No persistent updater
service or scheduled task is required. Check while the launcher is open.

## Runtime approaches

| Option | Benefits | Costs/risks to measure |
| --- | --- | --- |
| Electron with bundled Node/Chromium | Closest match to the session-tested JS/Express game runtime. Recommended candidate. | Larger distribution and ongoing Chromium/Node maintenance; native packaging and signature gates. |
| Tauri plus packaged Node sidecar | Signed updater available; system-webview approach. | Rust/sidecar integration, OS webview prerequisites and actual total size/compatibility. |
| Browser/PWA | Separate possible web channel. | Hosted backend and browser lifecycle needed; does not satisfy the requested desktop installers alone. |

Choose through #145 using the real game on all platforms. No dependency,
framework, new paid service or supported minimum OS is approved by this document.
Use stable supported versions, lock them, and check primary documentation.
Do not plan against unreleased electron-builder v27 features as if stable.

## Two component lifecycles

Launcher and game have separate version numbers and immutable source SHAs.
The launcher package owns the UI, downloader/verifier, repair logic and narrowly
scoped OS integration. A compatible game package owns the game runtime/assets.
Game updates can be independent of launcher updates. Launcher self-updates use
the selected platform updater after the running launcher exits.

Only owner-approved release artifacts are eligible. Do not fetch/execute source,
npm scripts or arbitrary main commits on players' computers. Separate stable and
opt-in beta data/channels. A channel switch cannot silently downgrade a newer
save. The game payload must declare supported launcher protocol/save schema and
required runtime. See [integration](INTEGRATION.md).

Proposed delivery after framework selection:
- Windows per-user full installer, proposed NSIS if Electron is chosen.
- macOS signed/notarized DMG with the update ZIP required by the selected updater.
- Linux AppImage in a user-writable location; avoid competing package managers.
- Proposed CPU matrix: Windows x64, macOS arm64/x64, Linux x64. Validate and approve
  minimum OS/graphics support before advertising it. Other architectures deferred.

## Authentic download and repair

A trusted signed manifest binds product/component, version, channel, source SHA,
OS/architecture, allowed HTTPS artifact URL, hash, size, compatibility and expiry.
Pin trust keys and define rotation/revocation and replay handling before release.
An unsigned hash from the same feed is not publisher authentication.

Download to owned staging, enforce quota/size/time limits, verify before extraction
or execution, and reject absolute/traversal/symlink paths escaping the installation.
Use one update lock and validate destination ownership. Promote only complete
packages. Maintain a last-working install and bounded recovery cache. Native
installer rollback varies by platform; prove it or provide a verified manual
recovery path. Publish reverted code under a higher version for forward recovery.

Repair compares a signed installed-file manifest and replaces only game-owned
files. Never delete user content to make checks pass. Keep saves/settings/screenshots
outside versioned installs; retain backups during migration and compatible
recovery. Offer explicit uninstall choices, preserving data by default.

## Accounts, saves and online scope

Browser guest saves do not automatically transfer to the desktop app. Provide
validated export from the browser and explicit import into the correct desktop
profile. Never scrape browser profiles. Test roundtrip progress/settings, invalid
input, duplicate import, migration interruption and rollback compatibility.

Reuse a supported existing game authentication flow; use the system browser where
appropriate and narrowly validate callback destinations. Never ask players to
enter provider passwords in a launcher form or pass tokens on command lines.
Bind sign-in, selected account and game handoff without leaking credentials.

The first public release's guest/offline versus online scope is unresolved.
Guest/offline first is a recommendation, not an owner decision. A shared online
economy must use a trusted production backend; packaging a local Node process
does not fix #82 or approve PR #138. Keep unsupported online actions unavailable
in a guest candidate and state the limit honestly. Any new metered backend remains
a separate authorization and acceptance gate.

## Release operation

1. Resolve approved launcher/game SHAs and compatible versions.
2. Validate and build native packages from those exact sources with locked tools
   on bounded standard public GitHub-hosted jobs.
3. Sign/notarize only in trusted release contexts; inspect public publisher fields
   against creator privacy and verify no secret/private text enters packages.
4. Run clean-machine installation and real older-to-newer signed-feed upgrades for
   every advertised target, including failure/recovery and rendered play.
5. Prepare a complete draft with artifacts, notes, hashes and test receipts.
6. After explicit owner release acceptance, publish the full approved channel.
   Main pushes, tags or green CI do not grant release authority.
7. Inspect served artifact bytes and actual feed selection; retain safe recovery.

A small artifact index can use GitHub Releases within verified provider limits.
No site, service, signing key, certificate, billing enrollment, release workflow
or installer was created in this foundation task. Signing availability, publisher
identity disclosure, asset rights and backend costs remain explicit gates.

## Minimum acceptance

See #149. Require real install/upgrade, offline behavior, corruption rejection,
concurrency, interrupted download, disk exhaustion, invalid manifests/archives,
expiry/replay/downgrade rejection, locked files, repair, save/import compatibility,
sign-in if enabled, graphics/accessibility, clean shutdown/uninstall and recovery.
No claim covers an untested OS/architecture or physical device.

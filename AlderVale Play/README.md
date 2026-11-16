# Play AlderVale on Windows

Double-click **Play AlderVale.cmd**. Keep its window open while you play, and use
the same browser profile to keep your guest saves.

On a fresh PC, install [Node.js 24 LTS](https://nodejs.org/en/download) and
[Git for Windows](https://git-scm.com/install/windows) first. If you already have
both tools, the launcher installs and builds the game for you. The first launch
and launches after a new commit can take a few minutes.

Every launch checks the public GitHub `main` branch and installs a new build
when its commit changes. Close and reopen the launcher to pick up an update.
If an update fails, the launcher tries the last working build and prints its
commit. The installed commit is recorded in `.installation/current.txt`.
Builds are cached by commit in `.installation`. Guest saves live in browser
storage at `http://127.0.0.1:4178`, outside that cache.

This is the Windows owner-play launcher. It runs the game's production build
with a local server. The website, a standalone player installer, and Steam
distribution are future release work. When publishing a release for this
channel, ship it from `main` so the launcher picks up its source.

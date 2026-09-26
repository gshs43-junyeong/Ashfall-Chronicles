# Ashfall Chronicles — English Project Guide

[← Back to the README](../README.md)

## At a glance

Ashfall Chronicles is a browser-native, story-led 2D sandbox adventure. Its core loop is:

> **Explore → gather → craft or automate → overcome a regional objective → unlock the next region.**

The project is intentionally a single-player, no-install experience. A current development build is playable in a browser; packaged desktop-friendly releases are also provided for Windows and macOS.

| Current scope | Count |
|---|---:|
| Sessions / chapters | 3 / 18 |
| Items / recipes | 447 / 223 |
| Enemies / bosses | 72 / 23 |
| Achievements / machines | 75 / 26 |

## What v1.1 adds

v1.1 is feature-complete; only asset polish (mostly monster sprites) remains before release.
Full details (Korean) are in the [changelog](v1.1-changelog.md).

- **Three sessions, eighteen chapters** — session 2 "Beyond the Wall" and session 3 "What the Water Erased".
- **World sizes** — small (the classic 5000×720), medium (1.5×) and large (2×), chosen per new game.
- **The drowned sea and glacier** — swimming, breath, oxygen tanks, and flowing water/lava physics.
- **Caves with four kinds** (moss, dripstone, crystal, fume) and hidden caverns behind cracked gravel.
- **Living ruins** — pulse, survey ranks, echo trials, built entrance halls and a real pyramid.
- **Five starting characters, three difficulties**, a skill tree, farming/fishing mastery, an anvil and pet levels.
- **Pine forests in the snow, per-tree leaves, rare meteor strikes**, a redrawn sky with sunsets.
- **On-screen tab buttons** (bag, skills, journal, crafting, map, menu) with the current key shown.

## Play safely

- **Browser build:** [ashfall-chronicles.vercel.app](https://ashfall-chronicles.vercel.app/)
- **Packaged builds:** [GitHub Releases](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases/latest)
- **Status:** **v1.1.0** (2026-09-26) — the browser build and the downloadable archive are the same version.
- **Saves:** v1.0.x saves do not open in v1.1 — the world grew from 4200 to 5000 tiles wide. Start a new journey; old slots stay untouched.

Keep a save export before switching between the web build and a downloaded build. They use different browser origins, so their saves do not automatically transfer.

## New-player route

1. Start a new single-player slot.
2. Read the active chapter goal in the journal (`J`).
3. Mine basic material, establish a small work area, and craft the tools the objective asks for.
4. Treat the first boss and the first dungeon as tutorials for combat preparation and exploration.
5. Add farming, fishing, and machines when your supply needs outgrow hand-gathering.
6. Export saves occasionally from **Settings**.

The game gives each chapter a destination, but does not force one base location or one equipment build. If progress feels unclear, return to the journal before searching for a new area.

## Controls

| Input | Action |
|---|---|
| `A` / `D`, `←` / `→` | Move |
| `Space`, `W`, `↑` | Jump (swim up in water) |
| `S`, `↓` | Drop through wooden platforms |
| Left click / right click | Attack or mine / place or interact |
| `Shift` | Dodge dash |
| `Q` `E` `R` `F` | Active skills |
| `1`–`0` | Hotbar |
| `I` `K` `J` `H` | Inventory, abilities, journal, crafting |
| `Esc` | Pause and settings |

All key bindings are configurable in Settings.

## Save model

Progress lives in the browser (IndexedDB, gzip-compressed; `localStorage` where IndexedDB is unavailable). There is no account or online sync.

- Do not rely on private/incognito browsing for persistent play.
- Clearing site data removes that build's local save.
- Use **Export save** before changing browsers, profiles, or computers.
- The game can run directly from the packaged `index.html`; a separate server is unnecessary.

## Project layout

| Path | Role |
|---|---|
| `game/` | Playable runtime folder (serve it as-is). `game/js/ashfall.js` is a generated bundle. |
| `src/legacy/*.js` | **Game source** — ES modules. `tools/bundle.mjs` (esbuild) bundles them from `main.js` into `game/js/ashfall.js`, a single classic script that also runs from `file://`. |
| `src/legacy/data.js` | Content tables: chapters, dialogue, items, enemies, objectives, and balancing data. |
| `src/legacy/world.js` | World generation, terrain, biome, and dungeon logic. |
| `src/legacy/entity.js` | Player, enemy, boss, combat, and interaction behavior. |
| `src/legacy/factory.js` | Power and production automation. |
| `src/legacy/ui.js` | HUD, panels, journal, settings, and in-game UI. |
| `site/` | Public site source; generated `site/play/` mirrors the game. |
| `tools/` | Asset validation plus site/release builds. |
| `docs/` | Working documentation and release records. |

### Source-of-truth rule

Edit game code in `src/legacy/` (run `npm ci` once, then `npm run dev` to rebuild the bundle on save) and commit the rebuilt `game/js/ashfall.js` with it; assets and HTML stay in `game/`. `site/play/` is generated output and is overwritten by the next build. `npm run check` runs the regression suite. The repository’s [CLAUDE.md](../CLAUDE.md) and [story/session rules](story-and-sessions.md) document the content tables and save-sensitive constraints to check before extending the game.

## Documentation map

- [Story and session rules](story-and-sessions.md) — Korean operational rules for adding chapters and sessions.
- [v1.1 changelog](v1.1-changelog.md) — what v1.1 adds (Korean).
- [System requirements](system-requirements.md) — Korean environment and runtime notes.
- [Deployment cache notes](deploy-cache.md) — Korean deployment/cache procedure.

Finished v1.1 working notes (plans, prompts, interim reports) were removed; they remain in git history.

## Build and release

```bash
bash tools/build.sh 1.1.0
git tag v1.1.0
git push origin v1.1.0
```

The release workflow produces Windows and macOS archives and a `SHA256SUMS.txt` checksum file. See `.github/workflows/release.yml` and `tools/build.sh` for the exact process.

## Credits and license

Concept: gshs43-junyeong · Production: Claude Code + Codex · Artwork assets: Claude Design · Music: Suno · Sound effects: ElevenLabs.

Code and original graphics are [MIT licensed](../LICENSE). Music and sound-effect folders are exceptions because they were generated with external services; see [NOTICE.md](../NOTICE.md) before redistributing audio separately.

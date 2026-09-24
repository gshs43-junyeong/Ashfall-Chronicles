# Ashfall Chronicles — English Project Guide

[← Back to the README](../README.md) · [Game assessment and roadmap](game-assessment.md)

## At a glance

Ashfall Chronicles is a browser-native, story-led 2D sandbox adventure. Its core loop is:

> **Explore → gather → craft or automate → overcome a regional objective → unlock the next region.**

The project is intentionally a single-player, no-install experience. A current development build is playable in a browser; packaged desktop-friendly releases are also provided for Windows and macOS.

| Current scope | Count |
|---|---:|
| Sessions / chapters | 3 / 18 |
| Items / recipes | 425 / 220 |
| Enemies / bosses | 72 / 23 |
| Achievements / machines | 70 / 26 |

## Latest in the web build

Recent changes to the v1.1 development build (details in Korean in the [changelog](v1.1-changelog.md)):

- **Ruin entrances are built dungeon passages** — brick-lined 45° staircases, flat halls, short climbs, landing rooms and switchback stairwells with floating steps — ending at a side door into the ruin. Far fewer ladder platforms than the old vertical shafts.
- **The pyramid is a real pyramid:** a symmetric, half-buried triangle with a gold capstone, rooms stacked in levels, and a door on one face.
- **Fishing reads on screen:** a fish shadow approaches before a bite, a shrinking gauge shows the hook window (visible at night), the water splashes when you reel in, and richer water glints gold around the bobber.
- **Sound:** three new music tracks (death screen, five-phase finale bosses) and 44 new sound effects for materials, skills, hits and star moments; enemy projectiles now make sound.
- **One skill tree:** the three branches share one board with cross-branch prerequisites.
- **Balance:** multi-shot weapons deal 0.35× from the second hit on the same target; the overtuned session 3 weapons and bosses were brought in line.
- **World:** ash now fades only the grass, rain brings dark clouds only, and mining ticks are quieter than the break sound.

## Play safely

- **Browser build:** [ashfall-chronicles.vercel.app](https://ashfall-chronicles.vercel.app/)
- **Packaged builds:** [GitHub Releases](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases/latest)
- **Status:** the browser build is the active **v1.1 development build**. The latest downloadable archive remains **v1.0.5**.

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

Progress lives in the browser's `localStorage`. There is no account or online sync.

- Do not rely on private/incognito browsing for persistent play.
- Clearing site data removes that build's local save.
- Use **Export save** before changing browsers, profiles, or computers.
- The game can run directly from the packaged `index.html`; a separate server is unnecessary.

## Project layout

| Path | Role |
|---|---|
| `game/` | Authoritative playable source. |
| `game/js/data.js` | Content tables: chapters, dialogue, items, enemies, objectives, and balancing data. |
| `game/js/world.js` | World generation, terrain, biome, and dungeon logic. |
| `game/js/entity.js` | Player, enemy, boss, combat, and interaction behavior. |
| `game/js/factory.js` | Power and production automation. |
| `game/js/ui.js` | HUD, panels, journal, settings, and in-game UI. |
| `site/` | Public site source; generated `site/play/` mirrors the game. |
| `tools/` | Asset validation plus site/release builds. |
| `docs/` | Working documentation and release records. |

### Source-of-truth rule

Edit **only** `game/` for game changes. `site/play/` is generated output and is overwritten by the next build. The repository’s [CLAUDE.md](../CLAUDE.md) and [story/session rules](story-and-sessions.md) document the content tables and save-sensitive constraints to check before extending the game.

## Documentation map

- [Game assessment and roadmap](game-assessment.md) — English/Korean evaluation with prioritized next steps.
- [Story and session rules](story-and-sessions.md) — Korean operational rules for adding chapters and sessions.
- [v1.1 changelog](v1.1-changelog.md) — Korean implementation and change record for the development build.
- [System requirements](system-requirements.md) — Korean environment and runtime notes.
- [Deployment cache notes](deploy-cache.md) — Korean deployment/cache procedure.

Several historical `v1.1-*.md` files are detailed production records. They are valuable for implementation history, but the README, this guide, the story/session rules, and the current changelog should be preferred for orientation.

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

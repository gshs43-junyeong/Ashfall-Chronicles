# Ashfall Chronicles

> **별이 잠든 땅 / The Land Where Stars Sleep**

[![Play in browser](https://img.shields.io/badge/Play-Browser-5c8ee6?logo=googlechrome&logoColor=white)](https://ashfall-chronicles.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-6f8b5f.svg)](LICENSE)

**한국어** · [English guide](docs/README.en.md) · [Play now](https://ashfall-chronicles.vercel.app/) · [Downloads](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases/latest)

*Ashfall Chronicles* is a story-led 2D sandbox adventure made with plain HTML5 and JavaScript. Carve routes through terrain, turn gathered materials into gear, and use that gear to open the next region.

지형을 직접 깎아 길을 내고, 캔 것으로 장비를 만들고, 그 장비로 다음 지역을 여는 스토리 중심 2D 샌드박스 어드벤처입니다. 순수 HTML5 + JavaScript로 만들어 브라우저에서 바로 실행됩니다.

| Items | Enemies | Bosses | Achievements | Machines | Recipes |
|---:|---:|---:|---:|---:|---:|
| 425 | 72 | 23 | 70 | 26 | 220 |

The journey spans **3 sessions and 18 chapters**, across 9 surface biomes, sky islands, 4 underground layers, and the submerged sea at the western edge of the world.

---

## Play and release status

**[▶ Play the current browser build](https://ashfall-chronicles.vercel.app/)** · **[Download a release](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases/latest)**

> **Important:** the web build is the in-development **v1.1** build; the downloadable package is currently **v1.0.5**. Their content and save data are not interchangeable. See [the v1.1 changelog](docs/v1.1-changelog.md) for in-progress changes.

### What you do

- **Mine and build** — reshape terrain, place blocks, and make a base anywhere.
- **Fight your way** — specialize in melee, ranged, or magic; equip four active skills and raise a pet.
- **Explore** — find biome-specific dungeons, secrets, bosses, and the story’s critical path.
- **Live off the land** — farm, fish, cook, and prepare supplies for longer expeditions.
- **Automate** — power and connect machines to move, process, and sort production.
- **Grow a home** — Dawn Village develops with your progress and becomes a safer place to return to.

The sandbox is open-ended in *how* you solve problems, while each chapter provides a clear objective and a destination.

---

## Quick start / 빠른 시작

1. Open the [browser build](https://ashfall-chronicles.vercel.app/) or download the latest release.
2. Start a new single-player slot.
3. Follow the current chapter objective in the journal; it introduces the core loop gradually.
4. Make regular backups through **Settings → Export save**.

No installation or server is required. The game runs from `index.html`; current progress is stored locally in the browser.

### Save data

- Saves use browser `localStorage`, not a game server.
- Private/incognito windows can discard saves when closed.
- Web and downloaded builds have different origins, so their saves are separate.
- Use **Settings → Export/Import save** before moving browsers or machines.

### Controls

| Input | Action |
|---|---|
| `A` / `D`, `←` / `→` | Move |
| `Space`, `W`, `↑` | Jump; unlock double jump through traits |
| `S`, `↓` | Drop through platforms |
| Left click | Attack; mine or till while holding the relevant tool |
| Right click | Place, interact, or cast a fishing line |
| `Shift` | Dodge dash |
| `Q` `E` `R` `F` | Active-skill slots |
| `1`–`0`, mouse wheel | Hotbar selection |
| `I` `K` `J` `H` | Inventory, abilities, journal, crafting |
| `Esc` | Pause |
| `F5` | Save |

Controls, audio, visual effects, and UI preferences can be changed in **Settings**.

---

## Repository map

| Path | Purpose |
|---|---|
| `game/` | Canonical game source. It can run on any static server. |
| `site/` | Public website; `site/play/` is generated from `game/` and must not be edited directly. |
| `docs/` | Project, release, deployment, and design-operation documentation. |
| `launchers/` | Windows and macOS launch helpers for packaged builds. |
| `tools/` | Asset, verification, site, and release build scripts. |
| `design/` | Design canvases and reference material. |
| `.github/workflows/` | Release and deployment automation. |

For contributors: **edit `game/`, then rebuild.** Generated `site/play/` output is ignored and will be replaced by the next build.

---

## Documentation

| Document | Use it for |
|---|---|
| [English project guide](docs/README.en.md) | English quick start, project layout, release notes, and contribution orientation |
| [Game assessment & roadmap](docs/game-assessment.md) | Current strengths, risks, scorecard, and prioritized improvements |
| [Story and session rules](docs/story-and-sessions.md) | Safely extending chapters, sessions, content tables, and assets |
| [v1.1 changelog](docs/v1.1-changelog.md) | Changes included in the in-development v1.1 build |
| [System requirements](docs/system-requirements.md) | Supported environments and technical assumptions |
| [Deployment cache notes](docs/deploy-cache.md) | Deployment and cache invalidation procedures |
| [CLAUDE.md](CLAUDE.md) | Engineering constraints that can silently break saves, assets, or world generation |

The older `v1.1-*.md` planning and change documents are preserved as implementation records. The guides above are the best entry points for current work.

---

## Build and release

Create a release by tagging a version:

```bash
git tag v1.1.0
git push origin v1.1.0
```

The release workflow builds Windows and macOS archives and attaches them with `SHA256SUMS.txt`. To build locally:

```bash
bash tools/build.sh 1.1.0
```

Artifacts are written to `dist/`.

---

## License and attribution

Code and original visual assets are available under the [MIT License](LICENSE). Keep the copyright notice when redistributing or modifying them.

Music in `game/assets/audio/` was generated with [Suno](https://suno.com), and sound effects in `game/assets/sound_effects/` were generated with [ElevenLabs](https://elevenlabs.io). Those two asset folders are **not** relicensed under MIT; check the originating services’ terms before redistributing the audio separately. See [NOTICE.md](NOTICE.md) for details.

Concept: gshs43-junyeong · Production: Claude Code + Codex · Music: Suno · Sound effects: ElevenLabs.

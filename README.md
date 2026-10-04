# Ashfall Chronicles

> The Land Where Stars Sleep

A story-driven adventure built on a Terraria-style 2D sandbox, with RPG progression and weapon/skill builds on top.
Written in plain HTML5 + JavaScript, it runs entirely in the browser.

Three sessions · eighteen chapters · thirteen story bosses. Nine surface biomes, sky islands and four underground layers,
and at the far west a **drowned sea** — you can only go as deep as your breath allows.
Each new game picks a **small · medium (1.5×) · large (2×)** world.

| | | | | | |
|---|---|---|---|---|---|
| Items **494** | Monsters **75** | Bosses **23** | Achievements **75** | Machines **28** | Recipes **230** |

<sub>How these are counted: items are every entry in the item table (blocks, decorations and pets included); monsters exclude bosses (sea flotsam and passive critters included). `node tests/counts.mjs` checks these numbers against the game tables.</sub>

Of the twenty-three bosses, **thirteen are where the story takes you**; the other ten wait deep inside ruins and in places nobody
tells you about. The seventy-five achievements are split into eight groups and three difficulties, and the hard ones stay hidden until you earn them.

**[▶ Play in your browser](https://ashfall-chronicles.vercel.app/)** ·
**[Download](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases/latest)** ·
**[한국어 README](README-ko.md)**

> **v1.1.3 (2026-10-04)** — redrawn skill effects (textured slashes, shockwaves, rune circles, light pillars) · monsters that
> **catch fire** and freeze along their outline · effects that follow flying monsters · hopping rabbits · no sky islands over the
> camp and village · a slimmer title logo and the new app icon. Full list: [`docs/update/v1.1.3-changelog.md`](docs/update/v1.1.3-changelog.md).
> v1.1.2 added **multiplayer** (2–4 players), monster skills, the **Ashfall** font and the **app edition** (Electron, unsigned) —
> [`docs/update/v1.1.2-changelog.md`](docs/update/v1.1.2-changelog.md). v1.1.x saves open as they are.
>
> ⚠ **v1.0.x saves do not open from v1.1 onward** — the world grew from 4200 to 5000 tiles wide.
> Start a new journey; old records stay in their slots.

Six languages: 한국어 · English · 日本語 · 简体中文 · Deutsch · Español. Phones and tablets get touch controls.

---

## Downloads and the first launch

| Edition | Size | How it opens |
|---|---|---|
| Browser edition | tens of MB | A launcher (or `index.html`) opens the game in your default browser |
| App edition | about 200 MB | Opens in its own window (Electron) — the same screen regardless of browser settings or extensions |

Both editions ship the same game files. Neither is signed with a developer certificate, so the operating system asks once the
first time you open it (the files are not damaged or dangerous):

- **Windows** — when "Windows protected your PC" appears, choose **More info → Run anyway**.
- **macOS 13 or earlier** — **right-click → Open → Open**.
- **macOS 14 / 15** — the first launch shows "Apple could not verify … is free of malware". Click **Done** (**Move to Trash deletes it**),
  then go to **System Settings → Privacy & Security** and click **Open Anyway** at the bottom. macOS shows this for every app that is not
  notarized through a paid Apple account; it does not mean anything was found.
  To skip it, run `xattr -dr com.apple.quarantine "/Applications/Ashfall Chronicles.app"` in Terminal (for the browser edition, use the extracted folder name).
- **Linux (app edition)** — extract and run `./ashfall-chronicles`.

No install, no server and no Python are needed. Do not play in a private window — saves vanish when it closes.
To move to another folder or computer, use **Settings → Export / Import save** in the game.

---

## Multiplayer

From **Multiplayer** on the title screen, either open a room (pick one of your worlds) or join with a room code. Two to four players **share the host's world**.

- The world, monsters, time and story progress belong to the host; characters belong to each player. A guest character is remembered by that world and picks up where it left off next time (separate from singleplayer slots).
- The host toggles chat and PvP. The party list shows HP and latency, and the host can remove players.
- Browsers connect directly (WebRTC), so no world is uploaded to a server. Networks that block direct connections (some offices and schools) may not work.

---

## Controls

| Input | Action |
|---|---|
| `A` `D` · `←` `→` | Move |
| `Space` `W` `↑` | Jump (double jump from talents and accessories) · swim up in water |
| `S` `↓` | Drop through wooden platforms |
| Left click | Attack — mine or till when holding a pickaxe or hoe |
| Right click | Place · interact · cast a fishing rod |
| `Shift` | Dodge dash (invulnerable frames) |
| `Q` `E` `R` `F` | Skill slots |
| `Z` `X` | Utility slots (detectors, oxygen tanks and the like) |
| `T` | Rotate the machine you are about to place |
| `1`–`9`, `0` | Hotbar (mouse wheel works too) |
| `I` `K` `J` `H` `M` | Bag · abilities · journal · crafting · map — also on the buttons at the bottom right |
| `Enter` | Chat (multiplayer, when the host allows it) |
| `Esc` | Pause |
| `F5` | Save |

Movement, jump, dash, skills, panels and save can be rebound in **Settings → Controls**.

Entering water shows a **breath bar**. When it runs out you lose health, so to go deeper, craft a portable oxygen tank and put it in a utility slot.

---

## Saves

Progress is stored **inside the browser** (IndexedDB, compressed), not on a server. Three large-world slots fit comfortably.

- Launch with the same browser to continue.
- Switching browsers or clearing site data removes it.
- Private/incognito windows lose it as soon as they close.
- **Saves from the web build and from a downloaded build live in different places** because their origins differ. Keep using the same one, or move saves with export/import.

---

## Repository layout

| Path | Contents |
|---|---|
| `play/` | The game itself. This folder alone runs as-is on any static server. |
| `src/` | Source code (TypeScript) — `src/game` (the game) and `src/engine` (a game-agnostic engine). `play/js/ashfall.js` is their bundle |
| `desktop/` | The app edition (an Electron shell) — opens the same `play/` in its own window |
| `launchers/windows/` · `launchers/macos/` | Browser-edition launchers and per-OS READMEs |
| `site/` | The public site. Building it copies `play/` to `site/play/`. `site/home/` is `/home`, `site/download/` is `/download` |
| `docs/` | Changelogs, story/session rules, deploy cache notes, system requirements |
| `LICENSE` · `NOTICE.md` | The MIT text, and notes on the **two folders it does not cover** (music and sound effects) |
| `tools/` | Release build scripts (browser and app editions) and Python tools that bake and measure assets |
| `.github/workflows/` | Release automation and site deployment |
| `Dockerfile` · `docker-compose.yml` · `docker/` | Containers for building, checking and serving (see "Development · Docker") |

**`play/` is the source of truth for assets and HTML; `src/` is the source of truth for code.** `site/play/` is build output and is
git-ignored — edits there are lost on the next build. Release zips are not committed; pushing a tag builds them in Actions.

---

## Documentation

| Document | Contents |
|---|---|
| [`README-ko.md`](README-ko.md) | This README in Korean |
| [`docs/README.md`](docs/README.md) | **Documentation map** — what to read and where to start (Korean) |
| [`docs/update/v1.1.3-changelog.md`](docs/update/v1.1.3-changelog.md) · [`docs/update/v1.1.2-changelog.md`](docs/update/v1.1.2-changelog.md) | **What v1.1.3 and v1.1.2 add** (Korean: [`v1.1.3`](docs/update/v1.1.3-changelog.ko.md) · [`v1.1.2`](docs/update/v1.1.2-changelog.ko.md)) |
| [`docs/update/v1.1.1-changelog.md`](docs/update/v1.1.1-changelog.md) · [`docs/update/v1.1-changelog.md`](docs/update/v1.1-changelog.md) | What v1.1.1 and v1.1.0 added (Korean) |
| [`docs/story-and-sessions.md`](docs/story-and-sessions.md) | Shared rules for adding chapters and sessions (Korean) |
| [`docs/engine.md`](docs/engine.md) | The engine's public API and the engine-only sample game (Korean) |
| [`docs/debug-urls.md`](docs/debug-urls.md) | Debug shortcuts that start in front of a region or feature, including `?debug=showcase` for recording footage (Korean) |
| [`docs/system-requirements.md`](docs/system-requirements.md) | System requirements and how they were measured (Korean) |
| [`DESIGN.md`](DESIGN.md) | Art consistency and cropping rules for new assets (Korean) |
| [`CLAUDE.md`](CLAUDE.md) | Rules for changing the code — tile ids, coordinates (`SHIFT`), saves: **the things that break silently** (Korean) |

---

## Releasing a new version

```bash
git tag v1.1.3
git push origin v1.1.3
```

When the tag lands, `.github/workflows/release.yml`:

1. builds the **browser edition** (Windows and macOS zips) with `tools/build.sh`,
2. builds the **app edition** (Windows, macOS Intel, macOS Apple silicon, Linux zips) with `tools/build-desktop.sh` — the macOS apps are
   **ad-hoc signed** on a macOS runner so Gatekeeper shows the "unidentified developer" prompt instead of "damaged, move to Trash",
3. attaches them to the Release with `SHA256SUMS.txt` and `SHA256SUMS-App.txt`. The release body is `docs/update/v<version>-changelog.md`.

To build locally:

```bash
bash tools/build.sh 1.1.3
(cd desktop && npm ci) && bash tools/build-desktop.sh 1.1.3
```

Output goes to `dist/`.

---

## Development · Docker

Code lives in `src/` (TypeScript); `play/js/ashfall.js` is the bundled **output** (committed — `play/` alone runs without a build).

```bash
npm ci            # once
npm run dev       # rebuilds the bundle on save and serves play/
npm run check     # the full regression suite (syntax, types, modules, translations, generation hashes, behaviour, screenshots)
```

**Docker alone** does the same without Node:

| Command | What it does |
|---|---|
| `docker compose up dev` | Mounts the source, rebundles on change and serves the game → http://localhost:8000/index.html |
| `docker compose up game` | Serves the game built from the current source with nginx → http://localhost:8001 |
| `docker compose up site` | Serves the site exactly like production (`/home` · `/download` · `/play`, with `vercel.json` redirects and cache rules) → http://localhost:8002 |
| `docker compose run --rm check` | Runs the regression suite inside the official Playwright image |

- Bundles built inside an image do not come back to the repository — **always make the bundle you commit with `npm run build`** (`dev` mounts the source, so it is the exception).
- On networks that intercept TLS (some company or school proxies), pass the CA if `npm ci` fails with certificate errors:
  `CA_CERT=/path/to/ca.crt docker compose build` (or `docker build --secret id=ca,src=/path/to/ca.crt …`).
- The old ways (double-click `index.html` · `python3 -m http.server` · Vercel) still work.

---

## License

**[MIT](LICENSE)**. Use, change and redistribute the code and the art freely — just keep the copyright notice. Copyright belongs to `gshs43-junyeong`.

**Exactly two folders are exceptions.**

| What | Where | Made with |
|---|---|---|
| 14 music tracks | `play/assets/audio/*.m4a` | [Suno](https://suno.com) |
| 92 sound effects | `play/assets/sound_effects/*.mp3` | [ElevenLabs](https://elevenlabs.io) |

These were made with outside services, so this repository has no right to re-license them under MIT. Playing the game is unrestricted,
but **if you want to reuse the sound files on their own**, check those services' terms yourself. Details are in [`NOTICE.md`](NOTICE.md).
The game font **Ashfall** is a modified Pretendard under the **SIL Open Font License 1.1** (`play/assets/fonts/OFL.txt` · `FONTLOG.txt`).

Apart from those, **every image was made in this repository** — nothing was bought or downloaded: hand-drawn sheets, plus what
`tileart` and `itemart` paint procedurally at runtime.

## Credits

Concept `gshs43-junyeong` · Production Claude Code + Codex · Art assets Claude Design · Font Ashfall (modified Pretendard, SIL OFL 1.1) ·
Music [Suno](https://suno.com) · Sound effects [ElevenLabs](https://elevenlabs.io).

Per-version changes are on the [releases page](https://github.com/gshs43-junyeong/Ashfall-Chronicles/releases) and in the
[download page changelog](https://ashfall-chronicles.vercel.app/download#changelog).

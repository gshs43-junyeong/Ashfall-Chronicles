#!/usr/bin/env bash
# 앱으로 여는 판(Electron · 서명 없음) — dist/ 에 Windows · macOS(Intel · Apple) · Linux zip 을 만들고 SHA256SUMS-App.txt 를 적는다.
# 사용법: bash tools/build-desktop.sh 1.1.2   (처음 한 번 cd desktop && npm ci)
# 브라우저로 여는 판(tools/build.sh)과 같은 play/ 를 그대로 싣는다 — 게임 파일은 하나, 여는 방법만 둘.
set -euo pipefail

VERSION="${1:?사용법: bash tools/build-desktop.sh <버전>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
NAME="AshfallChronicles-$VERSION-App"
STAGE="$DIST/_app_src"
OUT="$DIST/_app_out"

[ -d "$ROOT/desktop/node_modules/@electron/packager" ] || { echo "cd desktop && npm ci 를 먼저"; exit 1; }
if command -v node >/dev/null 2>&1 && [ -d "$ROOT/node_modules/esbuild" ]; then
  node "$ROOT/tools/bundle.mjs" --check || { echo "번들이 소스와 다릅니다 — node tools/bundle.mjs 후 커밋하세요"; exit 1; }
fi

rm -rf "$STAGE" "$OUT"; mkdir -p "$STAGE" "$OUT"
cp "$ROOT/desktop/main.js" "$ROOT/desktop/icon.png" "$STAGE/"
# package.json 은 판 번호만 바꿔 싣는다(의존성은 앱에 넣지 않는다 — Electron 은 packager 가 붙인다)
node -e "const p=require('$ROOT/desktop/package.json'); p.version='$VERSION'; delete p.devDependencies; delete p.scripts; require('fs').writeFileSync('$STAGE/package.json', JSON.stringify(p, null, 2))"
cp -R "$ROOT/play" "$STAGE/game"

EV="$(node -p "require('$ROOT/desktop/node_modules/electron/package.json').version")"
PK="$ROOT/desktop/node_modules/.bin/electron-packager"
COMMON=(--electron-version="$EV" --out="$OUT" --overwrite --asar --app-version="$VERSION" --app-copyright="MIT · music/SFX and font: see NOTICE")
# Windows 아이콘(rcedit)은 wine 이 있어야 박힌다 — 없으면 기본 아이콘으로(창 아이콘은 icon.png 가 따로 단다)
WINICON=(); if command -v wine >/dev/null 2>&1 || [ "$(uname -s | cut -c1-5)" = "MINGW" ]; then WINICON=(--icon="$ROOT/desktop/icon.ico"); fi

"$PK" "$STAGE" "Ashfall Chronicles" --platform=win32  --arch=x64   "${COMMON[@]}" "${WINICON[@]}"
"$PK" "$STAGE" "Ashfall Chronicles" --platform=darwin --arch=x64   "${COMMON[@]}" --icon="$ROOT/desktop/icon.icns"
"$PK" "$STAGE" "Ashfall Chronicles" --platform=darwin --arch=arm64 "${COMMON[@]}" --icon="$ROOT/desktop/icon.icns"
"$PK" "$STAGE" "ashfall-chronicles" --platform=linux  --arch=x64   "${COMMON[@]}"

# 묶기 — macOS 앱 안의 심볼릭 링크를 그대로 두려면 zip -y(파이썬 zipfile 은 링크를 파일로 풀어 앱이 깨진다)
pack() { # <packager 폴더> <zip 이름>
  local d="$OUT/$1" z="$DIST/$2.zip"
  cp "$ROOT/desktop/README-APP.txt" "$d/"
  rm -f "$z"; ( cd "$d" && TZ=UTC find . -exec touch -h -d '2026-01-01 00:00:00' {} + && zip -qry -X "$z" . )
}
pack "Ashfall Chronicles-win32-x64"   "$NAME-Windows"
pack "Ashfall Chronicles-darwin-x64"  "$NAME-macOS-Intel"
pack "Ashfall Chronicles-darwin-arm64" "$NAME-macOS-AppleSilicon"
pack "ashfall-chronicles-linux-x64"   "$NAME-Linux"
rm -rf "$STAGE" "$OUT"

( cd "$DIST" && sha256sum "$NAME"-*.zip > SHA256SUMS-App.txt )
echo; echo "SHA-256 (App):"; cat "$DIST/SHA256SUMS-App.txt"

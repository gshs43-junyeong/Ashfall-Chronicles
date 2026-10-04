#!/usr/bin/env bash
# 앱으로 여는 판(Electron · 서명 없음) — dist/ 에 Windows · macOS(Intel · Apple) · Linux zip 을 만들고 SHA256SUMS-App.txt 를 적는다.
# 사용법: bash tools/build-desktop.sh 1.1.2   (처음 한 번 cd desktop && npm ci)
#         APP_TARGETS="win linux" 처럼 일부만 — 기본은 win linux mac. 릴리스는 mac 을 macOS 러너에서 따로 만든다(.github/workflows/release.yml).
# 브라우저로 여는 판(tools/build.sh)과 같은 play/ 를 그대로 싣는다 — 게임 파일은 하나, 여는 방법만 둘.
#
# ★ macOS 앱은 반드시 서명(임시 서명 ad-hoc 이라도)해서 낸다. packager 가 Info.plist · 이름을 바꾸면 Electron 원래 서명이 깨지고,
#   서명이 깨진(또는 없는) 앱은 Apple 실리콘에서 아예 실행되지 않고 "손상되었기 때문에 열 수 없습니다 — 휴지통으로 이동"만 뜬다
#   (사용자가 고를 길이 없다). ad-hoc 서명이면 "확인되지 않은 개발자" 경고 → 시스템 설정 '그래도 열기'로 열린다.
#   codesign(macOS) 또는 rcodesign 이 없으면 mac 판을 만들지 않는다 — ALLOW_UNSIGNED_MAC=1 은 로컬 시험용.
set -euo pipefail
TARGETS="${APP_TARGETS:-win linux mac}"
has() { case " $TARGETS " in *" $1 "*) return 0;; esac; return 1; }
sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }

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

SIGN=""
if has mac; then
  if command -v codesign >/dev/null 2>&1; then SIGN=codesign
  elif command -v rcodesign >/dev/null 2>&1; then SIGN=rcodesign
  elif [ "${ALLOW_UNSIGNED_MAC:-}" = 1 ]; then echo "  ! macOS 앱을 서명 없이 만든다(시험용 — 내보내지 말 것)"
  else echo "macOS 앱은 서명해야 한다 — macOS(codesign) 또는 rcodesign 이 있는 곳에서, 아니면 APP_TARGETS 에서 mac 을 뺄 것"; exit 1; fi
fi
has win   && "$PK" "$STAGE" "Ashfall Chronicles" --platform=win32  --arch=x64   "${COMMON[@]}" "${WINICON[@]}"
has mac   && "$PK" "$STAGE" "Ashfall Chronicles" --platform=darwin --arch=x64   "${COMMON[@]}" --icon="$ROOT/desktop/icon.icns"
has mac   && "$PK" "$STAGE" "Ashfall Chronicles" --platform=darwin --arch=arm64 "${COMMON[@]}" --icon="$ROOT/desktop/icon.icns"
has linux && "$PK" "$STAGE" "ashfall-chronicles" --platform=linux  --arch=x64   "${COMMON[@]}"

# macOS 앱 임시 서명 — 안쪽(도우미 앱 · 프레임워크)부터 바깥 앱까지 --deep 으로 한 번에, 끝나면 검증
signmac() { # <앱 경로>
  local app="$1"
  [ -n "$SIGN" ] || return 0
  if [ "$SIGN" = codesign ]; then
    xattr -cr "$app"
    codesign --force --deep --sign - --timestamp=none "$app"
    codesign --verify --deep --strict --verbose=1 "$app"
  else
    rcodesign sign "$app"
  fi
  echo "  서명(ad-hoc): $app"
}
has mac && signmac "$OUT/Ashfall Chronicles-darwin-x64/Ashfall Chronicles.app"
has mac && signmac "$OUT/Ashfall Chronicles-darwin-arm64/Ashfall Chronicles.app"

# 묶기 — macOS 앱 안의 심볼릭 링크를 그대로 두려면 zip -y(파이썬 zipfile 은 링크를 파일로 풀어 앱이 깨진다)
pack() { # <packager 폴더> <zip 이름>
  local d="$OUT/$1" z="$DIST/$2.zip"
  cp "$ROOT/desktop/README-APP.txt" "$d/"
  # -t 는 GNU · BSD(macOS) touch 둘 다 읽는다 — 서명은 파일 시각을 보지 않으므로 서명 뒤에 맞춰도 된다
  rm -f "$z"; ( cd "$d" && TZ=UTC find . -exec touch -h -t 202601010000 {} + && zip -qry -X "$z" . )
}
has win   && pack "Ashfall Chronicles-win32-x64"    "$NAME-Windows"
has mac   && pack "Ashfall Chronicles-darwin-x64"   "$NAME-macOS-Intel"
has mac   && pack "Ashfall Chronicles-darwin-arm64" "$NAME-macOS-AppleSilicon"
has linux && pack "ashfall-chronicles-linux-x64"    "$NAME-Linux"
rm -rf "$STAGE" "$OUT"

( cd "$DIST" && sha "$NAME"-*.zip > SHA256SUMS-App.txt )
echo; echo "SHA-256 (App):"; cat "$DIST/SHA256SUMS-App.txt"

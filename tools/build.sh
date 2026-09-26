#!/usr/bin/env bash
# 배포용 zip 두 개(Windows/macOS)와 SHA256SUMS.txt 를 dist/ 에 만든다.
# 사용법: bash tools/build.sh 1.0.5
set -euo pipefail

VERSION="${1:?사용법: bash tools/build.sh <버전>   예: bash tools/build.sh 1.0.5}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
NAME="AshfallChronicles-$VERSION"

# Windows 스토어의 python3 스텁은 이름만 있고 실행하면 죽는다.
# 존재 여부가 아니라 실제로 도는지를 확인해야 한다.
PY=""
for CAND in python3 python "py -3"; do
  if $CAND -c "import sys; sys.exit(0 if sys.version_info[0]==3 else 1)" >/dev/null 2>&1; then
    PY="$CAND"; break
  fi
done
[ -n "$PY" ] || { echo "동작하는 Python 3 을 찾지 못했습니다."; exit 1; }

# 게임 코드는 src/game/ 가 원본이고 game/js/ashfall.js 는 그 번들이다. 둘이 어긋난 채 zip 을 내면
# 고친 것이 빠진 판이 나간다 — 커밋된 번들이 소스와 같을 때만 묶는다.
if command -v node >/dev/null 2>&1 && [ -d "$ROOT/node_modules/esbuild" ]; then
  node "$ROOT/tools/bundle.mjs" --check || { echo "번들이 소스와 다릅니다 — node tools/bundle.mjs 후 커밋하세요"; exit 1; }
else
  echo "node · npm ci 가 없어 번들 대조를 건너뜁니다(커밋된 game/js/ashfall.js 를 그대로 씁니다)"
fi

mkdir -p "$DIST"

for PLATFORM in Windows macOS; do
  case "$PLATFORM" in
    Windows) LAUNCHER_DIR="$ROOT/launchers/windows" ;;
    macOS)   LAUNCHER_DIR="$ROOT/launchers/macos"   ;;
  esac

  STAGE="$DIST/_stage/$NAME"
  rm -rf "$DIST/_stage"
  mkdir -p "$STAGE"

  cp -R "$ROOT/game/." "$STAGE/"
  cp -R "$LAUNCHER_DIR/." "$STAGE/"

  rm -f "$DIST/$NAME-$PLATFORM.zip"
  $PY "$ROOT/tools/mkzip.py" "$STAGE" "$DIST/$NAME-$PLATFORM.zip"
done

rm -rf "$DIST/_stage"

( cd "$DIST" && sha256sum "$NAME"-*.zip > SHA256SUMS.txt )
echo
echo "SHA-256:"
cat "$DIST/SHA256SUMS.txt"

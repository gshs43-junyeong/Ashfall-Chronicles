#!/usr/bin/env bash
# 배포용 사이트를 만든다: game/ 을 site/play/ 로 복사해 브라우저에서 바로 플레이되게 한다.
#
# site/play/ 는 git 에 올리지 않는다(.gitignore). game/ 과 똑같은 381개 파일을 저장소에
# 두 벌 두게 되기 때문이다. 대신 배포할 때마다 이 스크립트가 만든다.
# Vercel(vercel.json 의 buildCommand)과 GitHub Pages 워크플로가 둘 다 이걸 부른다.
#
# ★ v1.1 — 여기서 **?v= 를 이 배포의 값으로 갈아 끼운다**.
#   여태 ?v= 는 손으로 올리는 숫자였다(183 -> 184 -> 185). 두 가지가 어긋났다.
#     ① 손으로 올리는 것을 잊으면 옛 스크립트가 계속 돌고,
#     ② 올리더라도 그 번호를 **들고 있는 파일이 index.html 자신**이라, 브라우저가
#        index.html 을 캐시에 물고 있으면 번호를 올린 사실 자체가 전달되지 않는다.
#   그래서 배포 때마다 커밋 해시로 자동으로 찍고(①), vercel.json 에서 html 은 매번
#   확인하도록(no-cache) 못 박았다(②). 이제 손으로 올릴 일이 없다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/game/index.html" ]; then
  echo "game/index.html 이 없습니다. 저장소 루트에서 실행했는지 확인하세요." >&2
  exit 1
fi

# ---- 이 배포의 표식 ----------------------------------------------------------
# Vercel / GitHub Actions 는 얕은 복제라 git 이 없을 수도 있어 환경 변수를 먼저 본다.
BUILD="${VERCEL_GIT_COMMIT_SHA:-${GITHUB_SHA:-}}"
if [ -z "$BUILD" ]; then
  BUILD="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)"
fi
if [ -n "$BUILD" ]; then
  BUILD="${BUILD:0:12}"
else
  BUILD="$(date -u +%Y%m%d%H%M%S)"   # git 도 환경 변수도 없을 때(손으로 돌릴 때)
fi

rm -rf "$ROOT/site/play"
mkdir -p "$ROOT/site/play"
cp -R "$ROOT/game/." "$ROOT/site/play/"

# ---- ?v= 를 이 배포의 값으로 -------------------------------------------------
# html 의 <script src="js/x.js?v=185"> 를 전부 ?v=<해시> 로 바꾼다.
# assets/sprites.js 는 자기 <script> 태그의 물음표 뒤를 그대로 물려받아 그림 URL 에도
# 붙이므로(sprites.js 의 _ver), 이 한 줄로 스크립트·CSS·그림이 한꺼번에 따라온다.
find "$ROOT/site/play" -name '*.html' -print0 \
  | xargs -0 perl -pi -e "s/\\?v=[A-Za-z0-9_.\\-]+/?v=$BUILD/g; s/__AC_BUILD__/$BUILD/g"

# 실제로 도는 판이 어느 것인지 브라우저가 물어볼 자리. vercel.json 에서 no-store 다.
printf '{"build":"%s"}\n' "$BUILD" > "$ROOT/site/play/version.json"

# ---- 확인 --------------------------------------------------------------------
# 여기서 막지 않으면 "찍힌 줄 알았는데 안 찍힌" 판이 immutable 로 1년 캐시된다.
LEFT="$(grep -rhoE '\?v=[A-Za-z0-9_.\-]+' "$ROOT/site/play" --include='*.html' | sort -u | grep -v "^?v=$BUILD$" || true)"
if [ -n "$LEFT" ]; then
  echo "?v= 가 안 찍힌 자리가 있습니다: $LEFT" >&2
  exit 1
fi
if grep -rq '__AC_BUILD__' "$ROOT/site/play" --include='*.html'; then
  echo "__AC_BUILD__ 가 남아 있습니다 — 자리 표시자가 안 바뀌었습니다." >&2
  exit 1
fi

echo "site/play/ 준비 완료 — $(find "$ROOT/site/play" -type f | wc -l | tr -d ' ')개 파일 · build $BUILD"

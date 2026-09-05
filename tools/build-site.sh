#!/usr/bin/env bash
# 배포용 사이트를 만든다: game/ 을 site/play/ 로 복사해 브라우저에서 바로 플레이되게 한다.
#
# site/play/ 는 git 에 올리지 않는다(.gitignore). game/ 과 똑같은 파일을 저장소에 두 벌
# 두게 되기 때문이다. 대신 배포할 때마다 이 스크립트가 만든다.
# Vercel(vercel.json 의 buildCommand)과 GitHub Pages 워크플로가 둘 다 이걸 부른다.
#
# ★★ 이 스크립트의 첫째 규칙: **죽지 않는다.**
#   빌드가 실패하면 Vercel 은 아무 말 없이 **직전 배포판을 그대로 계속 서빙한다**.
#   화면에서는 "고친 게 반영이 안 된다"로만 보이고 캐시와 구별이 안 된다.
#   실제로 이 프로젝트에서 두 번 났다 — vercel.json 의 "//" 주석 키, 그리고
#   빌드 이미지에 없을 수도 있는 도구(perl·python3)에 기댄 것.
#   그래서 여기서는 꼭 필요한 복사만 실패로 치고, 나머지(매니페스트 동기화·?v= 찍기)는
#   안 되면 경고만 남기고 넘어간다. 캐시가 좀 덜 끊기는 것이 배포가 통째로 멈추는 것보다
#   언제나 낫다.
set -uo pipefail        # -e 는 일부러 빼 두었다. 아래에서 필요한 곳만 직접 검사한다.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
warn() { echo "  ! $*" >&2; }

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

# ---- 매니페스트를 스크립트로 옮겨 적는다 ----------------------------------
# file:// 에서 fetch 가 막히므로 assets/sprites-manifest.js 가 원본을 대신한다.
# node 를 먼저 쓴다 — Vercel 은 Node 빌드 이미지라 node 는 반드시 있지만 python3 은
# 보장되지 않는다. 둘 다 없으면 저장소에 커밋된 파일을 그대로 쓴다(경고만).
if command -v node >/dev/null 2>&1; then
  node "$ROOT/tools/sync-manifest.mjs" || warn "매니페스트 동기화 실패 — 커밋된 파일을 그대로 씁니다"
elif command -v python3 >/dev/null 2>&1; then
  python3 "$ROOT/tools/sync-manifest.py" || warn "매니페스트 동기화 실패 — 커밋된 파일을 그대로 씁니다"
else
  warn "node·python3 이 없습니다 — sprites-manifest.js 는 커밋된 것을 그대로 씁니다"
fi

# ---- 복사 (여기만 실패로 친다) -----------------------------------------------
rm -rf "$ROOT/site/play" || true
mkdir -p "$ROOT/site/play" || { echo "site/play 를 만들 수 없습니다" >&2; exit 1; }
cp -R "$ROOT/game/." "$ROOT/site/play/" || { echo "game/ 복사 실패" >&2; exit 1; }

# ---- ?v= 를 이 배포의 값으로 -------------------------------------------------
# html 의 <script src="js/x.js?v=185"> 를 전부 ?v=<해시> 로 바꾼다.
# assets/sprites.js 는 자기 <script> 태그의 물음표 뒤를 그대로 물려받아 그림 URL 에도
# 붙이므로(sprites.js 의 _ver), 이 한 줄로 스크립트·CSS·그림이 한꺼번에 따라온다.
# sed 만 쓴다(perl 은 없을 수 있다). sed -i 는 GNU/BSD 문법이 갈리므로 임시 파일로 돈다.
STAMPED=0
while IFS= read -r -d '' f; do
  if sed -e "s/?v=[A-Za-z0-9_.-]*/?v=$BUILD/g" -e "s/__AC_BUILD__/$BUILD/g" "$f" > "$f.stamp" 2>/dev/null; then
    mv "$f.stamp" "$f" && STAMPED=$((STAMPED + 1))
  else
    rm -f "$f.stamp"; warn "$f 에 ?v= 를 찍지 못했습니다"
  fi
done < <(find "$ROOT/site/play" -name '*.html' -print0)

# 실제로 도는 판이 어느 것인지 브라우저가 물어볼 자리. vercel.json 에서 no-store 다.
printf '{"build":"%s"}\n' "$BUILD" > "$ROOT/site/play/version.json" \
  || warn "version.json 을 쓰지 못했습니다"

# ---- 확인 (경고만 한다. 여기서 죽으면 배포가 통째로 옛것으로 남는다) ----------
LEFT="$(grep -rhoE '\?v=[A-Za-z0-9_.-]+' "$ROOT/site/play" --include='*.html' 2>/dev/null \
        | sort -u | grep -v "^?v=$BUILD$" || true)"
[ -n "$LEFT" ] && warn "?v= 가 안 찍힌 자리: $LEFT (캐시가 덜 끊길 수 있습니다)"
grep -rq '__AC_BUILD__' "$ROOT/site/play" --include='*.html' 2>/dev/null \
  && warn "__AC_BUILD__ 가 남아 있습니다 — 판 번호가 화면에 안 뜹니다"

echo "site/play/ 준비 완료 — $(find "$ROOT/site/play" -type f | wc -l | tr -d ' ')개 파일 · build $BUILD · html $STAMPED장"

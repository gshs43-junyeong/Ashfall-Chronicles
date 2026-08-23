#!/usr/bin/env bash
# 배포용 사이트를 만든다: game/ 을 site/play/ 로 복사해 브라우저에서 바로 플레이되게 한다.
#
# site/play/ 는 git 에 올리지 않는다(.gitignore). game/ 과 똑같은 381개 파일을 저장소에
# 두 벌 두게 되기 때문이다. 대신 배포할 때마다 이 스크립트가 만든다.
# Vercel(vercel.json 의 buildCommand)과 GitHub Pages 워크플로가 둘 다 이걸 부른다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/game/index.html" ]; then
  echo "game/index.html 이 없습니다. 저장소 루트에서 실행했는지 확인하세요." >&2
  exit 1
fi

rm -rf "$ROOT/site/play"
mkdir -p "$ROOT/site/play"
cp -R "$ROOT/game/." "$ROOT/site/play/"

echo "site/play/ 준비 완료 — $(find "$ROOT/site/play" -type f | wc -l | tr -d ' ')개 파일"

#!/bin/bash
# ⚠ 2026-09-20부터 **이 스크립트를 쓰지 않는다.** 작업은 리포(game/)에서 한다.
#   평면 작업본은 v1.1 통합 시점에서 멈춰 있으므로, 지금 이걸 돌리면 통합 이후의
#   리포 작업이 통째로 옛 코드로 덮인다. 남겨 두는 것은 기록용이다.
#   정말 돌려야 한다면 아래 GUARD 를 지우고, 먼저 브랜치를 따 둘 것.
GUARD=1
if [ "${GUARD:-1}" = "1" ]; then
  echo "이 스크립트는 더 쓰지 않습니다 — 리포(game/)가 원본입니다. 위 주석을 읽으세요." >&2
  exit 1
fi
#
# 평면 작업본(file.1 루트) → 이 리포의 game/ 으로 옮긴다.
#
# 왜 필요한가: 게임은 file.1 루트에서 평면 구조(index.html · js/ · css/ · assets/)로
# 고치고, 리포는 game/ 아래에 같은 것을 담는다. 손으로 복사하다 한 파일을 빠뜨리면
# 리포만 옛 코드로 남아 조용히 갈라진다 — v1.1 시작 때 실제로 그런 상태였다
# (리포가 안내줄 제거분만큼 앞서 있었다).
#
# 사용: repo/ 안에서  bash tools/sync-from-flat.sh
set -e
cd "$(dirname "$0")/.."
FLAT="$(cd .. && pwd)"

for p in index.html css js assets; do
  [ -e "$FLAT/$p" ] || { echo "평면 작업본에 $p 이 없다: $FLAT"; exit 1; }
done

rsync -a --delete \
  --exclude '.DS_Store' \
  "$FLAT/index.html" "$FLAT/css" "$FLAT/js" "$FLAT/assets" game/

find game -name '.DS_Store' -delete

echo "동기화 완료."
echo -n "캐시 무효화 값: "
grep -o '?v=[0-9]*' game/index.html | sort -u | tr '\n' ' '
echo
echo "※ css/js 를 고쳤다면 game/index.html 의 ?v= 를 올렸는지 확인할 것 (12곳)."

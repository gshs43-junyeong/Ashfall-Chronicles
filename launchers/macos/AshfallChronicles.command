#!/bin/bash
# 별이 잠든 땅 — Ashfall Chronicles 1.0.5
# 실행: 터미널에서 `bash launch.sh` (더블클릭이 아니라 터미널에서 실행하세요 —
# 서명·공증이 안 된 .app으로 만들면 최신 macOS가 실행 즉시 앱을 지워 버립니다.
# 이 스크립트는 앱이 아니라 이미 신뢰된 시스템 python3로 로컬 서버만 띄우는 방식이라
# 그 문제를 피해 갑니다.)
set -e
cd "$(dirname "$0")"

PORT=8418
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT+1)); done

echo "별이 잠든 땅 — Ashfall Chronicles 를 http://127.0.0.1:$PORT 에서 띄웁니다..."
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM

sleep 1
open "http://127.0.0.1:$PORT/"
echo "브라우저에서 열렸습니다. 이 터미널 창을 닫거나 Ctrl+C를 누르면 게임 서버가 함께 꺼집니다."
wait $SERVER_PID

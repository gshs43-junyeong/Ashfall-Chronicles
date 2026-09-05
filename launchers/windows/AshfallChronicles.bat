@echo off
chcp 65001 >nul
title 별이 잠든 땅 — Ashfall Chronicles
cd /d "%~dp0"

rem 서버가 필요 없습니다. index.html 을 기본 브라우저로 열기만 하면 됩니다.
rem (예전에는 파이썬으로 http.server 를 띄웠습니다. 크롬이 file:// 에서 fetch 를
rem  막아 그림이 안 붙었기 때문인데, 그 fetch 를 없애서 이유가 사라졌습니다.)
start "" "%~dp0index.html"

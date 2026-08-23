@echo off
chcp 65001 >nul
title 별이 잠든 땅 — Ashfall Chronicles 1.0.5
cd /d "%~dp0"

rem Python 3 찾기 — 윈도우는 py 런처가 있으면 그걸 먼저 쓴다
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY goto nopython

rem 8418부터 비어 있는 포트를 찾는다 (이미 켜 둔 게 있어도 겹치지 않게)
set PORT=8418
:findport
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul 2>nul
if errorlevel 1 goto gotport
set /a PORT+=1
goto findport
:gotport

echo.
echo  별이 잠든 땅 — Ashfall Chronicles
echo  http://127.0.0.1:%PORT% 에서 띄웁니다...
echo.
echo  이 창을 닫거나 Ctrl+C 를 누르면 게임 서버가 함께 꺼집니다.
echo.

rem 서버가 뜰 때까지 잠깐 기다렸다가 브라우저를 연다
start "" cmd /c "timeout /t 2 >nul & start "" http://127.0.0.1:%PORT%/"

rem 서버는 이 창에서 그대로 돈다 (창을 닫으면 서버도 꺼진다)
%PY% -m http.server %PORT% --bind 127.0.0.1
goto :eof

:nopython
echo.
echo  Python 3 이 필요합니다.
echo  https://www.python.org/downloads/ 에서 설치한 뒤 다시 실행하세요.
echo  설치 화면에서 "Add python.exe to PATH" 를 반드시 체크하세요.
echo.
pause

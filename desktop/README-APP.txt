Ashfall Chronicles — 앱으로 여는 판 (App edition)
=================================================

[한국어]
이 판은 브라우저 없이 창 하나로 열리는 앱입니다. 설치하지 않고 압축을 풀어 바로 실행합니다.
코드 서명을 하지 않은 앱이라 처음 열 때 운영체제가 한 번 묻습니다 — 악성 파일이라서가 아니라
"서명한 회사가 없다"는 경고입니다. 받은 파일의 SHA-256 은 릴리스의 SHA256SUMS-App.txt 와 대조할 수 있습니다.

- Windows: 압축을 푼 폴더의 "Ashfall Chronicles.exe" 를 엽니다.
  "Windows의 PC 보호" 창이 뜨면 [추가 정보] → [실행] 을 누릅니다.
- macOS: "Ashfall Chronicles.app" 을 응용 프로그램 폴더로 옮긴 뒤 엽니다.
  "Apple은 'Ashfall Chronicles'에 악성 코드가 없음을 확인할 수 없습니다" 창이 뜨면 [완료] 를 누르세요
  ([휴지통으로 이동] 을 누르면 앱이 지워집니다). 그다음 시스템 설정 → 개인정보 보호 및 보안 → 맨 아래
  "그래도 열기" → 암호. Apple 공증(유료)을 받지 않은 앱이면 모두 뜨는 창입니다(macOS 13 이하는 오른쪽 클릭 → 열기).
  창 없이 바로 열려면 터미널에서:
  xattr -dr com.apple.quarantine "/Applications/Ashfall Chronicles.app"
- Linux: 압축을 푼 폴더에서 ./ashfall-chronicles 를 실행합니다.

F11 전체 화면 · 세이브는 앱 안에 따로 저장됩니다(브라우저 판과 나눠 쓰지 않음 — 옮기려면 게임 설정의 내보내기/가져오기).

[English]
This edition runs as its own window without a browser. Unzip and run — no installer.
The app is not code-signed, so the OS asks once on first launch. That warning means "no signing
company", not "malware". Compare the file's SHA-256 with SHA256SUMS-App.txt on the release page.

- Windows: open "Ashfall Chronicles.exe". On "Windows protected your PC", click More info → Run anyway.
- macOS: move "Ashfall Chronicles.app" to Applications and open it. When "Apple could not verify
  'Ashfall Chronicles' is free of malware" appears, click [Done] ([Move to Trash] deletes the app). Then go to
  System Settings → Privacy & Security → "Open Anyway" at the bottom → password. macOS shows this for every app
  that is not notarized through a paid Apple account (macOS 13 or earlier: right-click → Open).
  To skip the dialog entirely, run in Terminal:
  xattr -dr com.apple.quarantine "/Applications/Ashfall Chronicles.app"
- Linux: run ./ashfall-chronicles in the unzipped folder.

F11 toggles full screen. Saves live inside the app (separate from the browser edition — use
Export/Import in the game settings to move them).

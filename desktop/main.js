/* ===== desktop/main.js — 앱으로 여는 판(Electron, 서명 없음) ===== */
/* 게임은 브라우저 판과 **같은 파일**(play/)을 그대로 연다 — 앱 쪽은 창 · 메뉴 · 바깥 링크만 맡는다.
   ★ 노드는 게임 페이지에 들이지 않는다(nodeIntegration 끔 · 문맥 분리 · 샌드박스). 게임이 할 수 있는 일은 브라우저 판과 똑같다.
   포장할 때 tools/build-desktop.sh 가 play/ 를 desktop/game/ 으로 복사한다. 그 폴더가 없으면(개발 중) ../play 를 연다. */
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const GAME = [path.join(__dirname, 'game', 'index.html'), path.join(__dirname, '..', 'play', 'index.html')].find(f => fs.existsSync(f));

/* 같은 게임을 두 번 띄우면 세이브(IndexedDB)를 둘이 같이 쓴다 — 한 창만 */
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
function open() {
  win = new BrowserWindow({
    width: 1280, height: 760, minWidth: 960, minHeight: 540,
    backgroundColor: '#000000', title: 'Ashfall Chronicles', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  /* 게임 밖 주소(사이트 · 깃허브)는 앱 안이 아니라 기본 브라우저로 */
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); } });
  /* F11 전체 화면 · F12 개발자 도구(메뉴를 없앴으니 키로) */
  win.webContents.on('before-input-event', (e, inp) => {
    if (inp.type !== 'keyDown') return;
    if (inp.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (inp.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
  win.loadFile(GAME, { query: { app: 'desktop' } });
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(open);
app.on('window-all-closed', () => app.quit());

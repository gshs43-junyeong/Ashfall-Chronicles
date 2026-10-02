/* ===== game/netui.ts — 멀티플레이 창: 타이틀의 방 만들기·참가하기 · 일시정지의 방 줄 · 참가 캐릭터 저장 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { escHtml } from '../util.js';
import { tr } from '../lang.js';
import { CHARACTERS } from '../data/start.js';
import { $ } from '../ui.js';
import { G, NONAME, SAVE_VERSION, SaveStore, saveHead, saveSealOk, upgradeSave } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const NetUiPart: Bag = {
  bindMpUi() {
    $('#btn-multi').onclick = () => this.openMpScreen();
    $('#btn-mp-close').onclick = () => this.closeModal('#mp-screen');
    $('#btn-mp-host').onclick = () => {
      this.mpWant = 'host';                      // 슬롯에서 이어 하거나 새로 시작하면 mpAuto 가 방을 연다
      this.closeModal('#mp-screen'); this.renderSlotScreen(); this.openModal('#slots-screen');
    };
    $('#btn-mp-join').onclick = () => this.mpJoinFromTitle();
    $('#mp-char').onchange = () => { $('#mp-new').hidden = $('#mp-char').value !== 'new'; };
    $('#mp-code').onkeydown = e => { if (e.key === 'Enter') this.mpJoinFromTitle(); };
    const el = $('#mp-screen');
    el.onclick = e => { if (e.target === el) this.closeModal('#mp-screen'); };
    $('#btn-room-open').onclick = async () => { await this.mpHost('ROOM'); this.refreshPauseMp(); };
    $('#btn-room-close').onclick = () => { this.mpClose(); this.refreshPauseMp(); };
    $('#btn-room-leave').onclick = () => this.mpLeave();
    $('#btn-room-copy').onclick = () => {
      const room = this.net && this.net.room;
      if (!room) return;
      const done = () => this.toast(tr('방 코드를 복사했다'), 'info');
      if (navigator.clipboard) navigator.clipboard.writeText(room).then(done, () => {}); else done();
    };
  },

  /** 타이틀의 멀티플레이 창 — 참가 캐릭터는 저장 슬롯의 캐릭터 또는 새 캐릭터(저장 안 됨). */
  async openMpScreen() {
    this.mpWant = null;
    let slots;
    try { slots = await SaveStore.list(); } catch (e) { console.error(e); slots = []; }
    const opts = slots.map((s, i) => s && !s.bad
      ? `<option value="${i}">${escHtml(s.name === NONAME ? tr(NONAME) : s.name)} · Lv.${s.level}</option>` : '').join('');
    $('#mp-char').innerHTML = opts + `<option value="new">${tr('새 캐릭터')}</option>`;
    $('#mp-class').innerHTML = CHARACTERS.map(c => `<option value="${c.id}">${escHtml(c.n)}</option>`).join('');
    $('#mp-new').hidden = $('#mp-char').value !== 'new';
    this.netSay('');
    this.openModal('#mp-screen');
    this.fillIcons($('#mp-screen'));
  },
  async mpJoinFromTitle() {
    if (this.net) return;                        // 이미 방을 찾는 중
    const code = String($('#mp-code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { this.netSay(tr('방 코드를 넣어라')); return; }
    const v = $('#mp-char').value;
    let char, slot = null;
    if (v === 'new') char = this.freshPlayer(0, 0, $('#mp-name').value, $('#mp-class').value);
    else {
      slot = +v;
      const d = await this.netReadSlot(slot);
      if (!d) { this.netSay(tr('이 기록은 열 수 없다')); return; }
      this.drops = this.drops || [];             // 옛 펫 기록은 남는 펫을 떨어뜨린다(unpackChar)
      char = this.unpackChar(d.p, d.name, d.chapter);
    }
    this.netSay(tr('방을 찾는 중…'), true);
    this.mpJoin(code, char, slot);
  },
  /** 참가 창이 열려 있으면 거기에, 아니면 알림으로. */
  netSay(text, ok = false) {
    const box = $('#mp-screen');
    if (box && box.classList.contains('open')) { const el = $('#mp-msg'); el.textContent = text; el.classList.toggle('ok', ok); }
    else if (text) this.toast(text, ok ? 'info' : 'bad');
  },
  /** 슬롯의 세이브를 읽어 지금 판 모양으로 — 손댄 기록이면 null. */
  async netReadSlot(slot) {
    let rec = null;
    try { rec = await SaveStore.get(slot); } catch (e) { console.error(e); }
    if (!rec) return null;
    let d = null;
    try { d = JSON.parse(rec.raw); } catch (e) { return null; }
    if (!saveSealOk(rec.raw, d, rec.sig)) return null;
    upgradeSave(d);
    return d;
  },
  /** 참가 캐릭터를 제 슬롯에 되적는다 — 캐릭터 몫(packChar)만 바꾸고 그 슬롯의 세계·자리는 그대로. 새 캐릭터면 저장하지 않는다. */
  async netSaveChar(room = null, loud = false) {
    const n = room || this.net;
    if (!n || n.role !== 'guest' || !n.char) return false;
    if (n.slot === null || n.slot === undefined) {
      if (loud) this.toast(tr('새로 만든 참가 캐릭터는 저장되지 않는다'), 'info');
      return false;
    }
    try {
      const d = await this.netReadSlot(n.slot);
      if (!d) { if (loud) this.toast(tr('저장 실패'), 'bad'); return false; }
      const c = this.packChar(n.char);
      c.x = d.p.x; c.y = d.p.y;                  // 자리는 제 세계의 것
      d.p = c; d.name = n.char.name; d.v = SAVE_VERSION; d.savedAt = Date.now(); d.sealed = 1;
      await SaveStore.put(n.slot, JSON.stringify(d), saveHead(d));
      if (loud) this.toast(tr('캐릭터를 저장했다'), 'good');
      return true;
    } catch (e) {
      console.error(e);
      if (loud) this.toast(tr('저장 실패'), 'bad');
      return false;
    }
  },

  /** 일시정지 창의 방 줄 — 혼자면 '방 열기', 호스트면 코드·닫기, 참가자면 나가기. */
  refreshPauseMp() {
    const n = this.net, host = !!n && n.role === 'host', guest = !!n && n.role === 'guest';
    $('#ps-room').hidden = !host || !n.room;
    if (host) $('#ps-room-code').textContent = n.room || '';
    $('#btn-room-open').hidden = !!n || !this.world;
    $('#btn-room-close').hidden = !host;
    $('#btn-room-leave').hidden = !guest;
    $('#btn-save-export').hidden = guest;        // 참가자는 캐릭터만 저장한다
  }
};

mixin(G, NetUiPart);

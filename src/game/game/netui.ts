/* ===== game/netui.ts — 멀티플레이 창: 타이틀의 방 만들기·참가하기 · 일시정지의 방 줄 · 참가 캐릭터 저장 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { randomCode } from '../../engine/net/signal.js';
import { escHtml } from '../util.js';
import { tr } from '../lang.js';
import { CHARACTERS } from '../data/start.js';
import { $, $$ } from '../ui.js';
import { SaveStore, saveHead, saveSealOk, upgradeSave } from '../savefmt.js';
import { G } from '../game.js';
import { NET_MAX } from './net.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

/* 방 코드 — 자체 중개 다섯 자 · PeerJS 여섯 자(net.ts PEER_CODE), 영문 대문자·숫자 */
export const ROOM_CODE_RE = /^[A-Z0-9]{5,6}$/;

export const NetUiPart: Bag = {
  bindMpUi() {
    $('#btn-multi').onclick = () => this.openMpScreen();
    $('#btn-mp-close').onclick = () => this.closeModal('#mp-screen');
    $('#btn-mp-host').onclick = () => {
      this.mpWant = 'host';                      // 슬롯에서 이어 하거나 새로 시작하면 mpAuto 가 방을 연다
      this.closeModal('#mp-screen'); this.renderSlotScreen(); this.openModal('#slots-screen');
    };
    $('#btn-mp-join').onclick = () => this.mpJoinFromTitle();
    /* 방 코드 — 글자마다 네모 한 칸(여섯째는 PeerJS 방만 · 점선). 실제 입력은 네모 위에 겹친 투명한 칸 하나라
       붙여넣기·한글 입력기·폰 자판이 그대로 된다. 치는 대로 대문자 · 영문·숫자 밖(한글 조합 포함)은 지운다 */
    const code = $('#mp-code');
    const tidy = () => { const v = String(code.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (code.value !== v) code.value = v; this.mpCodeCells(); };
    const toEnd = () => { const l = code.value.length; try { code.setSelectionRange(l, l); } catch (e) { } this.mpCodeCells(); };
    code.oninput = e => { if (!e.isComposing) tidy(); };
    code.addEventListener('compositionend', tidy);
    code.onfocus = code.onclick = toEnd;
    code.onblur = () => this.mpCodeCells();
    code.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) this.mpJoinFromTitle(); };
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

  /** 타이틀의 멀티플레이 창 — 참가 캐릭터는 싱글플레이와 따로다. 처음 가는 세계면 이 이름·직업으로 새로 만들고,
      그 세계(호스트)가 기억해 두었다가 다시 오면 돌려준다. */
  openMpScreen() {
    this.mpWant = null;
    $('#mp-class').innerHTML = CHARACTERS.map(c => `<option value="${c.id}">${escHtml(c.n)}</option>`).join('');
    this.mpCodeCells();
    this.netSay('');
    this.openModal('#mp-screen');
    this.fillIcons($('#mp-screen'));
  },
  /** 방 코드 네모 — 글자 · 지금 칠 칸 · 참가 단추. */
  mpCodeCells() {
    const code = $('#mp-code'), v = String(code.value || ''), on = document.activeElement === code;
    $$('#mp-cells i').forEach((el, i) => {
      el.textContent = v[i] || '';
      el.classList.toggle('cur', on && i === Math.min(v.length, 5));
    });
    $('#btn-mp-join').disabled = !ROOM_CODE_RE.test(v);
  },
  mpJoinFromTitle() {
    if (this.net) return;                        // 이미 방을 찾는 중
    const code = String($('#mp-code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!ROOM_CODE_RE.test(code)) { this.netSay(tr('방 코드는 영문·숫자 5~6자다')); return; }
    const char = this.freshPlayer(0, 0, $('#mp-name').value, $('#mp-class').value);
    this.netSay(tr('방을 찾는 중…'), true);
    this.mpJoin(code, char);
  },
  /** 이 브라우저의 손님 아이디 — 호스트 세계가 다시 온 사람을 알아본다(설정에 한 번 만들어 둔다). */
  mpPlayerId() {
    if (!this.settings.mpId) { this.settings.mpId = randomCode(12).toLowerCase(); this.saveSettings(); }
    return this.settings.mpId;
  },
  /** 호스트 — 그 손님의 기록(없으면 null). */
  netGuestRec(pid) { return pid && this.mpGuests && this.mpGuests[pid] || null; },
  /** 호스트 — 손님의 마지막 자리(1초마다 · 나갈 때)와 캐릭터(손님이 보낸 것)를 세계 기록에. */
  netGuestKeep(peer, char) {
    if (!peer || !peer.pid || !peer.rp) return;
    this.mpGuests = this.mpGuests || {};
    const rec = this.mpGuests[peer.pid] || (this.mpGuests[peer.pid] = {});
    Object.assign(rec, { x: Math.round(peer.rp.x), y: Math.round(peer.rp.y), n: peer.rp.name, c: peer.rp.charId, t: Date.now() });
    if (char && typeof char === 'object' && JSON.stringify(char).length < 60000) rec.char = char;
  },
  /** 호스트 — 손님 기록만 제 슬롯에 바로 적는다(세계는 마지막 저장 그대로). 호스트가 저장을 잊어도 손님 캐릭터는 남게 —
      나갈 때 · 손님이 저장할 때만(15초마다 슬롯 전체를 쓰면 무겁다). */
  netGuestPersist() {
    const n = this.net, slot = this.currentSlot;
    if (!n || n.role !== 'host' || slot === null || slot === undefined) return;
    clearTimeout(n.persistT);
    n.persistT = setTimeout(async () => {
      if (this._saving) return;                  // 전체 저장이 손님 기록까지 담는다
      const seq = this._saveSeq;
      try {
        const d = await this.netReadSlot(slot);
        if (!d || this.currentSlot !== slot || this._saving || this._saveSeq !== seq) return;
        d.mpGuests = JSON.parse(JSON.stringify(this.mpGuests || {}));
        await SaveStore.put(slot, JSON.stringify(d), saveHead(d));
      } catch (e) { console.error(e); }
    }, 1500);
  },
  /** 참가자 — 캐릭터는 호스트 세계에 맡긴다(15초마다 · 나갈 때 · 저장할 때). */
  netCharOut(n, save = false) {
    if (!n || n.role !== 'guest' || !n.t || n.id <= 0) return false;
    this.netSend(n.t, 'rel', { k: 'csave', char: this.packChar(n.char), s: save ? 1 : 0 });
    return true;
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
  /** 참가자의 저장 — 제 슬롯에 쓰지 않고 호스트 세계에 맡긴다(그쪽 슬롯에 손님 기록으로 남는다). */
  netSaveChar(room = null, loud = false) {
    const n = room || this.net;
    if (!n || n.role !== 'guest' || !n.char) return false;
    const ok = this.netCharOut(n, true);
    if (loud) this.toast(ok ? tr('캐릭터를 이 세계에 맡겼다') : tr('저장 실패'), ok ? 'good' : 'bad');
    return ok;
  },

  /* ---- 파티 목록(HUD — 보기만) · 내보내기는 일시정지 창에서 ---- */
  netPartyTick(dt) {
    const n = this.net;
    n.partyT = (n.partyT || 0) - dt;
    if (n.partyT > 0) return;
    n.partyT = 0.25;
    this.refreshParty(); this.refreshChat();
    n.csaveT = (n.csaveT || 0) - 0.25;
    if (n.csaveT <= 0) { n.csaveT = 15; this.netCharOut(n); }   // 15초마다 — 갑자기 끊겨도 잃는 것이 적게
  },
  /** 그 플레이어의 왕복 시간(ms) — 호스트 자신은 없다. */
  netPing(id) {
    const n = this.net;
    if (!n || !id) return null;
    if (n.role === 'host') { const q = n.peers.get(id); return q && q.ping !== undefined ? q.ping : null; }
    return n.pings && n.pings.has(id) ? n.pings.get(id) : null;
  },
  refreshParty() {
    const box = $('#party'), n = this.net;
    if (!box) return;
    if (!n || (n.role === 'guest' && n.id < 0)) { box.hidden = true; return; }
    const rows = this.players.map(p => {
      const id = p === this.me ? (n.role === 'host' ? 0 : n.id) : p.netId;
      const mhp = p.remote ? (p.netMaxHp || p.d.maxHp) : p.d.maxHp, ping = this.netPing(id);
      return `<div class="pt-row${p === this.me ? ' me' : ''}">
        <span class="pt-name">${id === 0 ? `<i class="pt-host">${tr('호스트')}</i>` : ''}${escHtml(p.name)}</span>
        <span class="pt-lv">Lv.${p.level | 0}</span><span class="pt-ping">${ping === null ? '' : ping + 'ms'}</span>
        <div class="pt-hp"><i style="width:${clamp(p.hp / (mhp || 1), 0, 1) * 100}%"></i></div></div>`;
    }).join('');
    const head = `<div class="pt-head">${n.role === 'host' && n.room ? tr('방 {room}', { room: n.room }) + ' · ' : ''}${this.players.length}/${NET_MAX}${this.netPvpOn() ? ' · <b class="pt-pvp">PvP</b>' : ''}</div>`;
    box.innerHTML = head + rows;
    box.hidden = false;
  },

  /** 일시정지 창 — 혼자면 왼쪽 메뉴에 '방 열기'만, 멀티플레이면 오른쪽 열(방 코드 · 함께하는 사람 · 방 설정 · 닫기/나가기). */
  refreshPauseMp() {
    const n = this.net, host = !!n && n.role === 'host', guest = !!n && n.role === 'guest';
    $('#ps-side').hidden = !n;
    $('#btn-room-open').hidden = !!n || !this.world;
    $('#btn-save-export').hidden = guest;        // 참가자는 캐릭터만 저장한다
    if (!n) return;
    $('#ps-room').hidden = !n.room;
    $('#ps-room-code').textContent = n.room || '';
    $('#btn-room-close').hidden = !host;
    $('#btn-room-leave').hidden = !guest;
    const cfg = this.netCfg();
    for (const [id, key] of [['#mp-pvp', 'pvp'], ['#mp-chat', 'chat']]) { const el = $(id); el.checked = !!cfg[key]; el.disabled = !host; }
    $('#ps-cfg-note').hidden = host;
    const list = $('#ps-party');
    list.innerHTML = this.players.map(p => {
      const id = p === this.me ? (host ? 0 : n.id) : p.netId;
      const kick = host && p.remote ? `<button class="mini-btn" data-kick="${id}">${tr('내보내기')}</button>` : '';
      return `<div class="ps-guest"><span>${id === 0 ? `<i class="pt-host">${tr('호스트')}</i> ` : ''}${escHtml(p.name)} · Lv.${p.level | 0}</span>${kick}</div>`;
    }).join('');
    list.querySelectorAll('[data-kick]').forEach(b => {
      b.onclick = () => { this.mpKick(+b.dataset.kick); this.refreshPauseMp(); };
    });
  }
};

mixin(G, NetUiPart);

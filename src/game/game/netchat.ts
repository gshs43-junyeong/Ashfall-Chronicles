/* ===== game/netchat.ts — 멀티플레이 채팅 · PvP · 호스트 설정(cfg) ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { escHtml } from '../util.js';
import { tr } from '../lang.js';
import { DmgText } from '../entity.js';
import { $ } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const CHAT_MAX = 200;       // 글 한 줄 최대 글자
export const CHAT_LINES = 6;       // 화면에 남기는 줄
export const CHAT_FADE = 12;       // 이 초가 지나면 흐려진다(입력 중에는 다 보인다)
/* 플레이어끼리는 몹이 칠 때보다 덜 아프게 — 레벨 차가 큰 둘이 한 방에 끝나지 않게(M5 에서 실측으로 고친다) */
export const PVP_SCALE = 0.5;

export const NetChatPart: Bag = {
  bindChat() {
    const inp = $('#chat-input');
    /* ★ 엔진 키 입력은 창(window)에서 받는다 — 여기서 전파를 끊어야 글을 치는 동안 캐릭터가 걷거나 가방이 열리지 않는다 */
    inp.onkeydown = e => {
      e.stopPropagation();
      if (e.key === 'Enter') { const s = inp.value; inp.value = ''; this.closeChat(); this.sendChat(s); e.preventDefault(); }
      else if (e.key === 'Escape') { this.closeChat(); e.preventDefault(); }
    };
    inp.onkeyup = e => e.stopPropagation();
    inp.onblur = () => this.closeChat();
    $('#mp-pvp').onchange = e => this.mpSetCfg('pvp', e.target.checked);
    $('#mp-chat').onchange = e => this.mpSetCfg('chat', e.target.checked);
  },

  /* ---- 호스트 설정 ---- */
  /** 방의 설정(PvP · 채팅) — 혼자면 null. 참가자는 호스트가 보낸 것. */
  netCfg() {
    const n = this.net;
    return n ? (n.cfg || { pvp: false, chat: true }) : null;
  },
  /** 호스트가 바꾼다 — 다음 판에도 쓰게 설정에 남기고 모두에게 알린다. */
  mpSetCfg(key, v) {
    const n = this.net;
    if (!n || n.role !== 'host') return;
    n.cfg = Object.assign({}, this.netCfg(), { [key]: !!v });
    this.settings[key === 'pvp' ? 'mpPvp' : 'mpChat'] = !!v; this.saveSettings();
    const m = Object.assign({ k: 'cfg' }, n.cfg);
    for (const q of n.peers.values()) if (q.rp) this.netSend(q.t, 'rel', m);
    this.netCfgToast(key, !!v);
  },
  /** 참가자 — 호스트가 보낸 설정. 바뀐 것만 알린다. */
  netGotCfg(m) {
    const n = this.net, old = this.netCfg();
    n.cfg = { pvp: !!m.pvp, chat: !!m.chat };
    for (const key of ['pvp', 'chat']) if (old[key] !== n.cfg[key]) this.netCfgToast(key, n.cfg[key]);
    if (!n.cfg.chat) this.closeChat();
  },
  netCfgToast(key, on) {
    if (key === 'pvp') this.toast(on ? tr('플레이어끼리 싸울 수 있다(PvP 켜짐)') : tr('PvP 꺼짐'), on ? 'bad' : 'info');
    else this.toast(on ? tr('채팅이 켜졌다') : tr('호스트가 채팅을 껐다'), 'info');
  },

  /* ---- 채팅 ---- */
  openChat() {
    const c = this.netCfg();
    if (!c) return;
    if (!c.chat) { this.toast(tr('호스트가 채팅을 껐다'), 'info'); return; }
    for (const k in this.keys) this.keys[k] = 0;  // 누르고 있던 걸음이 글 치는 동안 이어지지 않게
    this.input.m1 = this.input.m2 = 0;
    $('#chat').hidden = false;
    const inp = $('#chat-input');
    inp.hidden = false; inp.focus();
    this.chatOpen = true; this.refreshChat();
  },
  closeChat() {
    if (!this.chatOpen) return;
    this.chatOpen = false;
    const inp = $('#chat-input');
    inp.hidden = true; inp.blur();
    this.refreshChat();
  },
  sendChat(text) {
    const n = this.net, s = String(text || '').trim().slice(0, CHAT_MAX);
    if (!n || !s) return;
    if (n.role === 'host') this.netChatOut(this.me.name, s);
    else if (n.t) this.netSend(n.t, 'rel', { k: 'chat', s });
  },
  /** 호스트 — 보낸 이 이름을 박아 모두에게(참가자 글은 호스트를 거친다 — 채팅을 껐으면 여기서 막힌다). */
  netChatOut(name, s) {
    const n = this.net;
    if (!this.netCfg().chat) return;
    const m = { k: 'chat', n: name, s: String(s).slice(0, CHAT_MAX) };
    for (const q of n.peers.values()) if (q.rp) this.netSend(q.t, 'rel', m);
    this.chatLine(m.n, m.s);
  },
  chatLine(name, s) {
    this.chatLog = (this.chatLog || []).concat({ n: String(name || ''), s: String(s || ''), t: performance.now() }).slice(-CHAT_LINES * 4);
    this.refreshChat();
  },
  /** 대화 줄 — 입력 중이면 최근 것을 다 보이고, 아니면 CHAT_FADE 초 안의 것만. */
  refreshChat() {
    const box = $('#chat');
    if (!box) return;
    if (!this.net) { box.hidden = true; this.chatLog = []; return; }
    const now = performance.now(), log = (this.chatLog || []).slice(-CHAT_LINES);
    const lines = log.filter(l => this.chatOpen || now - l.t < CHAT_FADE * 1000);
    $('#chat-log').innerHTML = lines.map(l => `<div class="ch-line"><b>${escHtml(l.n)}</b> ${escHtml(l.s)}</div>`).join('');
    box.hidden = !this.chatOpen && !lines.length;
  },

  /* ---- PvP ---- */
  netPvpOn() { const c = this.netCfg(); return !!(c && c.pvp); },
  /** 이 화면에서 칠 수 있는 남의 아바타 — PvP 가 꺼져 있으면 없다. */
  pvpTargets() { return this.netPvpOn() ? this.players.filter(p => p.remote && p.hp > 0) : []; },
  /** 내 공격이 남의 아바타에 닿았다 — 숫자는 바로 띄우고 피해는 주인 화면으로(호스트를 거친다). */
  pvpHit(q, dmg, sx) {
    const n = this.net;
    if (!n || !this.netPvpOn()) return;
    const a = Math.max(1, Math.round(dmg * PVP_SCALE));
    this.texts.push(new DmgText(q.cx, q.y, a, '#ffb070', 0));
    if (n.role === 'host') { const peer = n.peers.get(q.netId); if (peer) this.netSend(peer.t, 'rel', { k: 'hurt', a, sx }); }
    else if (n.t) this.netSend(n.t, 'rel', { k: 'pvp', id: q.netId, a, sx });
  },
  /** 호스트 — 참가자가 남을 쳤다. PvP 가 켜져 있고 둘이 가까울 때만 맞은 사람에게 넘긴다. */
  netPvpIn(peer, m) {
    const n = this.net;
    if (!this.netPvpOn() || !peer.rp) return;
    const tgt = m.id === 0 ? this.me : (n.peers.get(m.id) || {}).rp;
    if (!tgt || Math.abs(tgt.cx - peer.rp.cx) > 700 || Math.abs(tgt.cy - peer.rp.cy) > 500) return;
    const a = clamp(+m.a || 0, 0, 1e6);
    if (m.id === 0) this.me.hurt(a, peer.rp.cx);
    else this.netSend(n.peers.get(m.id).t, 'rel', { k: 'hurt', a, sx: peer.rp.cx });
  }
};

mixin(Game.prototype, NetChatPart, true);

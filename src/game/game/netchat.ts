/* ===== game/netchat.ts — 멀티플레이 채팅 · PvP · 호스트 설정(cfg) ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { escHtml } from '../util.js';
import { N_, tr } from '../lang.js';
import { ENEMIES } from '../data/enemies.js';
import { DmgText } from '../entity.js';
import { $ } from '../ui.js';
import { EMOJI, drawEmoji, emojiHtml, emojify, soloEmoji } from '../ui/emoji.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const CHAT_MAX = 200;       // 글 한 줄 최대 글자
export const CHAT_LINES = 6;       // 화면에 남기는 줄
export const CHAT_FADE = 12;       // 이 초가 지나면 흐려진다(입력 중에는 다 보인다)
/* 플레이어끼리는 몹이 칠 때보다 덜 아프게 — 레벨 차가 큰 둘이 한 방에 끝나지 않게(M5 에서 실측으로 고친다) */
export const PVP_SCALE = 0.5;
/* 남에게 알리는 공지 — 중요한 것만(사용자 결정 2026-10-16: 내 알림은 전부, 남의 것은 중요한 것만). 열쇠와 값만 보내 받는 쪽이 제 말로 옮긴다 */
export const NOTE_MSG: Record<string, string> = {
  lv: N_('{lv}레벨이 되었다'), ach: N_('업적 달성 — {a}'), boss: N_('{b|을} 쓰러뜨렸다'), die: N_('쓰러졌다')
};

export const NetChatPart: Bag = {
  bindChat() {
    const inp = $('#chat-input');
    /* ★ 엔진 키 입력은 창(window)에서 받는다 — 여기서 전파를 끊어야 글을 치는 동안 캐릭터가 걷거나 가방이 열리지 않는다 */
    inp.onkeydown = (e: any) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const s = inp.value; inp.value = ''; this.closeChat(); this.sendChat(s); e.preventDefault(); }
      else if (e.key === 'Escape') { this.closeChat(); e.preventDefault(); }
    };
    inp.onkeyup = (e: any) => e.stopPropagation();
    inp.onblur = () => this.closeChat();
    // 그림말 고르기 — 누르는 순간 입력 칸이 초점을 잃지 않게 mousedown 을 막는다(잃으면 채팅이 닫힌다)
    const emoBtn = $('#chat-emo'), emos = $('#chat-emos');
    emoBtn.onmousedown = (e: any) => { e.preventDefault(); emos.hidden = !emos.hidden; };
    emos.innerHTML = EMOJI.map(e => `<button type="button" data-k="${e.k}">${emojiHtml(e.k, 24)}</button>`).join('');
    emos.onmousedown = (e: any) => {
      e.preventDefault();
      const b = e.target.closest('button'); if (!b) return;
      const at = inp.selectionStart ?? inp.value.length, ins = ':' + b.dataset.k + ':';
      inp.value = (inp.value.slice(0, at) + ins + inp.value.slice(at)).slice(0, CHAT_MAX);
      inp.setSelectionRange(at + ins.length, at + ins.length);
    };
    $('#mp-pvp').onchange = (e: any) => this.mpSetCfg('pvp', e.target.checked);
    $('#mp-chat').onchange = (e: any) => this.mpSetCfg('chat', e.target.checked);
  },

  /* ---- 호스트 설정 ---- */
  /** 방의 설정(PvP · 채팅) — 혼자면 null. 참가자는 호스트가 보낸 것. */
  netCfg() {
    const n = this.net;
    return n ? (n.cfg || { pvp: false, chat: true }) : null;
  },
  /** 호스트가 바꾼다 — 다음 판에도 쓰게 설정에 남기고 모두에게 알린다. */
  mpSetCfg(key: string, v: number) {
    const n = this.net;
    if (!n || n.role !== 'host') return;
    n.cfg = Object.assign({}, this.netCfg(), { [key]: !!v });
    this.settings[key === 'pvp' ? 'mpPvp' : 'mpChat'] = !!v; this.saveSettings();
    const m = Object.assign({ k: 'cfg' }, n.cfg);
    for (const q of n.peers.values()) if (q.rp) this.netSend(q.t, 'rel', m);
    this.netCfgToast(key, !!v);
  },
  /** 참가자 — 호스트가 보낸 설정. 바뀐 것만 알린다. */
  netGotCfg(m: any) {
    const n = this.net, old = this.netCfg();
    n.cfg = { pvp: !!m.pvp, chat: !!m.chat };
    for (const key of ['pvp', 'chat']) if (old[key] !== n.cfg[key]) this.netCfgToast(key, n.cfg[key]);
    if (!n.cfg.chat) this.closeChat();
  },
  netCfgToast(key: string, on: boolean) {
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
    inp.hidden = false; $('#chat-emo').hidden = false; inp.focus();
    this.chatOpen = true; this.chatUnread = 0; this.refreshChat();
  },
  closeChat() {
    if (!this.chatOpen) return;
    this.chatOpen = false;
    const inp = $('#chat-input');
    inp.hidden = true; inp.blur(); $('#chat-emo').hidden = true; $('#chat-emos').hidden = true;
    this.refreshChat();
  },
  sendChat(text: string) {
    const n = this.net, s = String(text || '').trim().slice(0, CHAT_MAX);
    if (!n || !s) return;
    if (n.role === 'host') this.netChatOut(this.me.name, s);
    else if (n.t) this.netSend(n.t, 'rel', { k: 'chat', s });
  },
  /** 호스트 — 보낸 이 이름을 박아 모두에게(참가자 글은 호스트를 거친다 — 채팅을 껐으면 여기서 막힌다). */
  netChatOut(name: string, s: any) {
    const n = this.net;
    if (!this.netCfg().chat) return;
    const m = { k: 'chat', n: name, s: String(s).slice(0, CHAT_MAX) };
    for (const q of n.peers.values()) if (q.rp) this.netSend(q.t, 'rel', m);
    this.chatLine(m.n, m.s);
  },
  /** 공지 한 줄 — mine 이면 내 알림(모두), 아니면 남의 중요한 소식 */
  noteLine(name: string, s: any, mine: boolean) {
    if (!this.net) return;
    this.chatLog = (this.chatLog || []).concat({ n: String(name || ''), s: String(s || ''), t: performance.now(), sys: mine ? 2 : 1 }).slice(-CHAT_LINES * 4);
    this.refreshChat();
  },
  /** 중요한 소식을 다른 플레이어에게 — 참가자는 호스트에게, 호스트는 모두에게(보낸 이 빼고) */
  netNote(key: string, p: Bag = {}) {
    const n = this.net; if (!n || !NOTE_MSG[key]) return;
    if (n.role === 'host') this.netNoteOut(this.me.name, key, p, -1);
    else if (n.t) this.netSend(n.t, 'rel', { k: 'note', key, p });
  },
  netNoteOut(name: string, key: string, p: Bag, from: number) {
    const n = this.net, m = { k: 'note', n: name, key, p };
    for (const [id, q] of n.peers) if (q.rp && id !== from) this.netSend(q.t, 'rel', m);
    if (from >= 0) this.noteIn(m);
  },
  noteIn(m: any) {
    if (!NOTE_MSG[m.key]) return;
    const p = Object.assign({}, m.p || {});
    if (p.b) p.b = (ENEMIES[p.b] && ENEMIES[p.b].n) || p.b;      // 보스는 id 로 받아 제 언어 이름으로
    this.noteLine(m.n, tr(NOTE_MSG[m.key], p), false);
  },
  chatLine(name: string, s: any) {
    // 그림말 하나뿐인 글은 보낸 이 머리 위에도 말풍선으로(rEmotes)
    const k = soloEmoji(String(s || '')), who = k && this.players.find((q: any) => q.name === name);
    if (who) who.emote = { k, t: this.time };
    this.chatLog = (this.chatLog || []).concat({ n: String(name || ''), s: String(s || ''), t: performance.now() }).slice(-CHAT_LINES * 4);
    if (!this.chatOpen && name !== (this.me && this.me.name)) this.chatUnread = (this.chatUnread || 0) + 1;
    this.refreshChat();
  },
  /** 대화 줄 — 입력 중이면 최근 것을 다 보이고, 아니면 CHAT_FADE 초 안의 것만. */
  refreshChat() {
    const box = $('#chat');
    if (!box) return;
    /* 화면 단추(탭 줄의 '채팅') — 함께하는 판에서만 · 안 읽은 글 수를 단다 */
    const btn = $('#tabbar [data-tab="chat"]');
    if (btn) {
      btn.hidden = !this.net || !(this.netCfg() || {}).chat;
      btn.classList.toggle('on', !!this.chatOpen);
      const bd = btn.querySelector('.tb-badge'), n = this.chatUnread || 0;
      bd.hidden = !n || this.chatOpen; bd.textContent = n > 9 ? '9+' : String(n);
    }
    if (!this.net) { box.hidden = true; this.chatLog = []; return; }
    box.classList.toggle('open', !!this.chatOpen);
    const now = performance.now(), log = (this.chatLog || []).slice(-CHAT_LINES);
    const lines = log.filter((l: any) => this.chatOpen || now - l.t < CHAT_FADE * 1000);
    $('#chat-log').innerHTML = lines.map((l: any) => l.sys
      ? `<div class="ch-line ch-sys${l.sys === 2 ? ' mine' : ''}"><b>${l.sys === 2 ? tr('알림') : escHtml(l.n)}</b> ${escHtml(l.s)}</div>`
      : `<div class="ch-line"><b>${escHtml(l.n)}</b> ${emojify(escHtml(l.s))}</div>`).join('');
    box.hidden = !this.chatOpen && !lines.length;
  },

  /** 머리 위 그림말 말풍선 — 3.5초, 처음 0.15초는 부풀며 나온다 */
  rEmotes(f: any) {
    const { c, camX, camY } = f;
    for (const p of this.players) {
      const em = p.emote; if (!em) continue;
      const age = this.time - em.t;
      if (age > 3.5 || age < 0) { p.emote = null; continue; }
      const k = Math.min(1, age / 0.15) * Math.min(1, (3.5 - age) / 0.3), S = 26 * (0.6 + 0.4 * k);
      const x = p.cx - camX, y = p.y - camY - 12 - S;
      c.save(); c.globalAlpha = Math.min(1, k * 1.5);
      c.fillStyle = '#f4ecd8'; c.strokeStyle = '#2a1a10'; c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(x - S / 2 - 4, y - 4, S + 8, S + 8, 6); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 4, y + S + 4); c.lineTo(x, y + S + 10); c.lineTo(x + 4, y + S + 4); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x - 4, y + S + 4.5); c.lineTo(x, y + S + 10); c.lineTo(x + 4, y + S + 4.5); c.stroke();
      drawEmoji(c, em.k, x - S / 2, y, S, this.time);
      c.restore();
    }
  },

  /* ---- PvP ---- */
  netPvpOn() { const c = this.netCfg(); return !!(c && c.pvp); },
  /** 이 화면에서 칠 수 있는 남의 아바타 — PvP 가 꺼져 있으면 없다. */
  pvpTargets() { return this.netPvpOn() ? this.players.filter((p: Player) => p.remote && p.hp > 0) : []; },
  /** 내 공격이 남의 아바타에 닿았다 — 숫자는 바로 띄우고 피해는 주인 화면으로(호스트를 거친다). */
  pvpHit(q: any, dmg: any, sx: any) {
    const n = this.net;
    if (!n || !this.netPvpOn()) return;
    const a = Math.max(1, Math.round(dmg * PVP_SCALE));
    this.texts.push(new DmgText(q.cx, q.y, a, '#ffb070', 0));
    if (n.role === 'host') { const peer = n.peers.get(q.netId); if (peer) this.netSend(peer.t, 'rel', { k: 'hurt', a, sx }); }
    else if (n.t) this.netSend(n.t, 'rel', { k: 'pvp', id: q.netId, a, sx });
  },
  /** 호스트 — 참가자가 남을 쳤다. PvP 가 켜져 있고 둘이 가까울 때만 맞은 사람에게 넘긴다. */
  netPvpIn(peer: Bag, m: any) {
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

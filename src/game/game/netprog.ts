/* ===== game/netprog.ts — 멀티플레이 장 진행 공유 · 보스 인원 배율 · 운석 알림 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { CHAPTERS } from '../data/story.js';
import { TS } from '../world.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

/* 장 목표는 그 세계의 **누구든** 채우면 된다 — 다만 플레이어마다 따로 센 값의 최댓값(합하면 남의 세계에서 쌓아 온 처치 수가
   첫 장을 단숨에 끝낸다). 장 완료는 호스트만 판정하고 알리면, 자리에 있는 모두가 제 캐릭터로 보상을 받는다. */
export const PROG_EVERY = 1;       // 초 — 진행 숫자를 주고받는 간격
/* 보스 체력 = 기본 × (1 + 0.6 × (인원 − 1)) — 설계 §3-2 초안(M5 실측으로 고친다) */
export const BOSS_HP_PER = 0.6;

export const NetProgPart: Bag = {
  /** 이 장의 목표가 보는 숫자 열쇠 — 'k:적' · 'm:타일' · 'c:물건' · 'd' 깊이 · 'h' 높이(음수) · 'b:보스' · 'cr:물건' · 't:npc' · 'z:바이옴' · 'r:유적' */
  progKeys(ch) {
    const out = new Set();
    const walk = o => {
      if (!o) return;
      switch (o.type) {
        case 'kill': out.add('k:' + o.target); break;
        case 'mine': out.add('m:' + o.tile); break;
        case 'collect': out.add('c:' + o.item); break;
        case 'craft': out.add('cr:' + o.item); break;
        case 'talk': out.add('t:' + o.npc); break;
        case 'depth': out.add(o.up ? 'h' : 'd'); break;
        case 'boss': out.add('b:' + o.target); break;
        case 'explore': out.add(o.zone ? 'z:' + o.zone : 'r:' + o.ruin); break;
        case 'and': o.parts.forEach(walk); break;
      }
    };
    for (const o of (ch && ch.basics) || []) walk(o);
    if (ch) walk(ch.goal);
    return [...out];
  },
  /** 이 화면 혼자의 값(objProgress 가 보던 것과 같은 원천). */
  progLocal(key) {
    const p = this.me, i = key.indexOf(':'), k = i < 0 ? key : key.slice(0, i), v = i < 0 ? '' : key.slice(i + 1);
    switch (k) {
      case 'k': return p.kills[v] || 0;
      case 'm': return p.mined[v] || 0;
      case 'c': return Math.max(p.countItem(v), p.gathered[v] || 0);
      case 'cr': return this.crafted && this.crafted[v] ? 1 : 0;
      case 't': return this.talked && this.talked[v] ? 1 : 0;
      case 'd': return p.deepest || 0;
      case 'h': return -(p.highest === undefined ? dimsOf(this.world).SURF_BASE : p.highest);
      case 'b': return p.bossKilled[v] ? 1 : 0;
      case 'z': return this.seenBiomes && this.seenBiomes[v] ? 1 : 0;
      case 'r': return this.seenRuins && this.seenRuins[v] ? 1 : 0;
    }
    return 0;
  },
  /** 방 모두의 값 중 가장 큰 것(혼자면 null) — objProgress 가 제 값과 견준다. */
  progShared(key) {
    const n = this.net;
    return n && n.progAll && key in n.progAll ? n.progAll[key] : null;
  },
  /** 1초마다 — 참가자는 제 값을 호스트로, 호스트는 모은 값을 모두에게(바뀌었을 때만). */
  netProgTick(dt) {
    const n = this.net;
    n.progT = (n.progT || 0) - dt;
    if (n.progT > 0) return;
    n.progT = PROG_EVERY;
    const ch = CHAPTERS[this.chapter], keys = this.progKeys(ch), mine = {};
    for (const k of keys) mine[k] = this.progLocal(k);
    if (n.role === 'guest') {
      const s = JSON.stringify(mine);
      if (n.t && n.id > 0 && s !== n.progSent) { n.progSent = s; this.netSend(n.t, 'rel', { k: 'prog', ch: this.chapter, v: mine }); }
      return;
    }
    const all = Object.assign({}, mine);
    for (const q of n.peers.values()) {
      if (!q.rp || !q.prog || q.progCh !== this.chapter) continue;
      for (const k of keys) if (typeof q.prog[k] === 'number') all[k] = Math.max(all[k] || 0, q.prog[k]);
    }
    const s = JSON.stringify(all);
    if (s === n.progSent) return;
    n.progSent = s; n.progAll = all;
    for (const q of n.peers.values()) if (q.rp) this.netSend(q.t, 'rel', { k: 'progs', ch: this.chapter, v: all });
    this.checkChapter();
  },
  /** 호스트 — 참가자 값을 받아 둔다(다음 1초 틱에 모은다). */
  netProgIn(peer, m) {
    if (!m.v || typeof m.v !== 'object') return;
    peer.prog = m.v; peer.progCh = m.ch;
  },
  /** 참가자 — 호스트가 모은 값. 호스트가 앞 장에 있으면(알림을 놓쳤으면) 장 번호만 맞춘다. */
  netProgsIn(m) {
    const n = this.net;
    if (m.ch > this.chapter) { this.chapter = m.ch; UI.chapterCard(CHAPTERS[this.chapter]); }
    if (m.ch !== this.chapter) return;
    n.progAll = m.v;
    UI.refreshTracker();
  },
  /** 호스트가 장을 끝냈다 — 참가자도 같은 장이면 제 캐릭터로 보상과 연출을 받는다. */
  netChapterIn(m) {
    if (m.i !== this.chapter) { if (m.i > this.chapter) this.chapter = m.i + 1; return; }
    const n = this.net;
    if (n) n.progAll = null;
    this.completeChapter(CHAPTERS[this.chapter]);
  },

  /** 보스 체력을 방 인원만큼 — 호스트에서 깨울 때 한 번. */
  netBossScale(e) {
    const n = this.net;
    if (!n || n.role !== 'host' || !e) return;
    const k = 1 + BOSS_HP_PER * (this.players.length - 1);
    if (k <= 1) return;
    e.maxHp = Math.round(e.maxHp * k); e.hp = e.maxHp;
  },

  /* ---- 운석 — 호스트가 굴리고, 참가자는 같은 알림 · 하늘 불덩이 · 지진을 본다(구덩이는 칸 동기화로 온다) ---- */
  netMeteorOut() {
    const n = this.net, m = this.meteor;
    if (!n || n.role !== 'host' || !m) return;
    const msg = { k: 'meteor', x: m.x, y: m.y, R: m.R };
    for (const q of n.peers.values()) if (q.rp) this.netSend(q.t, 'rel', msg);
  },
  netMeteorIn(m) {
    if (this.meteor) return;
    const p = this.me, pd = m.x - Math.floor(p.cx / TS);
    this.meteor = { t: 0, x: m.x, y: m.y, R: m.R, dir: pd >= 0 ? 1 : -1, hit: false, quake: 0, amp: 0, remote: true };
    this.toast(tr('☄ 하늘을 가르는 불덩이 — 운석이 떨어진다!'), 'bad');
    this.sfx('boss');
  }
};

mixin(Game.prototype, NetProgPart, true);

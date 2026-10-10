/* ===== game/memory.js — 석판 유적의 기억 조각 — 유적마다 셋(금 간 벽 뒤 · 천장 턱 · 유물 방 구석), 다 모으면 마지막 줄과 보상 ===== */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { STORY_MEMORY, STORY_RUIN } from '../data/ruins.js';
import { Enemy, Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const MemoryPart: Bag = {

  /** 그 유적의 조각 — [모은 수, 전체] */
  memoryCount(ruin: string) {
    const all = this.world.objects.filter((o: Bag) => o.type === 'memory' && o.ruin === ruin);
    return [all.filter((o: Bag) => o.got).length, all.length];
  },
  /** 조각을 줍는다 — 읽는 것은 주운 사람, 세계 기록(got)과 보상은 호스트 */
  takeMemory(o: Bag) {
    if (o.got) return;
    const M = STORY_MEMORY[o.ruin]; if (!M) return;
    UI.openLore(tr('기억의 조각 — {name}', { name: M.n }), [M.lines[o.k]]);
    this.sfx('chapter');
    for (let k = 0; k < 24; k++) this.parts.push(new Part(o.x + o.w / 2, o.y + o.h / 2, '#cfe8ff', -40, 1));
    if (this.net && this.net.role === 'guest') { o.got = 1; this.netBroadcast({ k: 'mem', r: o.ruin, i: o.k }); return; }
    this.memoryGot(o, this.player);
  },
  /** 호스트 · 혼자 — 조각 하나를 세계에 적고, 지킴이를 깨우고, 셋이면 끝맺는다 */
  memoryGot(o: Bag, who: any) {
    const first = !o.done; o.got = 1; o.done = 1;
    if (!first) return;
    if (o.guard) {                                  // 유물 방 구석의 조각 — 집어 들면 유적이 지킴이를 보낸다
      const sr = STORY_RUIN[+o.ruin.slice(5)], t = (sr && sr.mobs) || ['skeleton'];
      for (let k = 0; k < 2; k++) this.ents.push(new Enemy(t[k % t.length], o.x + (k ? 60 : -60), o.y - 30, this.scale()));
      this.toast(tr('조각을 들자 유적이 깨어났다'), 'bad');
    }
    const [n, all] = this.memoryCount(o.ruin);
    if (n < all) { this.toast(tr('기억의 조각 {n}/{all}', { n, all }), 'good'); }
    else this.memoryEnd(o.ruin, who);
    if (this.net) this.netBroadcast({ k: 'mem', r: o.ruin, i: o.k });
  },
  /** 셋이 다 모였다 — 마지막 줄 · 석판 앞에 상자 · 경험치 */
  memoryEnd(ruin: string, who: any) {
    const M = STORY_MEMORY[ruin], w = this.world;
    const tab = w.objects.find((q: Bag) => q.type === 'tablet' && 'story' + q.tablet === ruin);
    if (tab && !w.objects.some((q: Bag) => q.memChest === ruin)) {
      const sr = STORY_RUIN[+ruin.slice(5)] || {}, tier = clamp(2 + (+ruin.slice(5)) + 2, 3, 6);
      w.objects.push({ type: 'chest', tier, memChest: ruin, cave: 1, bonus: sr.bonus, bonus2: sr.bonus2,
        x: tab.x + tab.w + 8, y: tab.y + tab.h - 26, w: 30, h: 26, items: null });
      if (this.net) this.netObjAdd(w.objects[w.objects.length - 1]);
      for (let k = 0; k < 40; k++) this.parts.push(new Part(tab.x + tab.w + 23, tab.y + tab.h - 13, '#ffe8a0', -50, 1.2));
    }
    for (const q of this.players) if (!q.dead && q.addXp) q.addXp(Math.round(q.xpNext * 0.25));
    this.toast(tr('기억이 이어졌다 — 석판 곁에 무언가가 놓였다'), 'good');
    UI.openLore(tr('기억의 조각 — {name}', { name: M.n }), [...M.lines, M.end]);
    this.shake = Math.max(this.shake, 8);
  },
  /** 여럿 — 참가자가 주운 것(호스트가 받아 적는다) · 호스트가 적은 것(참가자는 그림만) */
  netMemory(m: Bag, fromGuest: boolean, who?: any) {
    const o = this.world.objects.find((q: Bag) => q.type === 'memory' && q.ruin === m.r && q.k === m.i);
    if (!o) return;
    if (fromGuest) this.memoryGot(o, who);
    else { o.got = 1; o.done = 1; }
  },

  /** 조각 그림 — 떠서 천천히 도는 빛 조각 셋, 아래에 흐린 그림자 */
  drawMemory(c: CanvasRenderingContext2D, o: Bag, sx: number, sy: number) {
    if (o.got) return;
    const t = this.time + o.k * 1.7, cx = sx + o.w / 2, cy = sy + o.h / 2 - 4 + Math.sin(t * 1.8) * 3;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(cx, cy, 1, cx, cy, 18);
    g.addColorStop(0, 'rgba(210,235,255,.55)'); g.addColorStop(1, 'rgba(120,170,255,0)');
    c.fillStyle = g; c.fillRect(cx - 18, cy - 18, 36, 36);
    for (let i = 0; i < 3; i++) {
      const a = t * 0.9 + i * TAU / 3, r = 5 + Math.sin(t * 2 + i) * 1.2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.6;
      c.globalAlpha = .85; c.fillStyle = i ? '#bfe0ff' : '#ffffff';
      c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 2.2, y); c.lineTo(x, y + 4); c.lineTo(x - 2.2, y); c.closePath(); c.fill();
    }
    c.restore();
    c.globalAlpha = .25; c.fillStyle = '#000'; c.fillRect(cx - 6, sy + o.h - 2, 12, 2); c.globalAlpha = 1;
  }
};

mixin(Game.prototype, MemoryPart, true);

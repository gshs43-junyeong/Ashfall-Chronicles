/* ===== game/ruin-events-draw.js — 유적 사건 · 고유 몬스터 규칙을 화면에 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RuinEventsDrawPart: Bag = {

  /** 화면 밖이면 가장자리 화살표, 안이면 위에 뜬 표지 */
  evMark(c: CanvasRenderingContext2D, x: number, y: number, col: string) {
    const sx = x - this.cam.x, sy = y - this.cam.y, t = this.time || 0;
    if (sx > 20 && sx < this.W - 20 && sy > 20 && sy < this.H - 20) {
      const bob = Math.sin(t * 4) * 3;
      c.fillStyle = col; c.beginPath();
      c.moveTo(sx, sy + 8 + bob); c.lineTo(sx - 7, sy - 4 + bob); c.lineTo(sx + 7, sy - 4 + bob); c.closePath(); c.fill();
      return;
    }
    const ax = clamp(sx, 26, this.W - 26), ay = clamp(sy, 70, this.H - 90);
    c.save(); c.translate(ax, ay); c.rotate(Math.atan2(sy - ay, sx - ax));
    c.fillStyle = col; c.globalAlpha = 0.85;
    c.beginPath(); c.moveTo(12, 0); c.lineTo(-6, -8); c.lineTo(-6, 8); c.closePath(); c.fill();
    c.restore();
  },
  glowAt(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
  },

  /** 사건 표지 — 조명 위(맥박 막대와 같은 겹)에 그린다 */
  drawRuinEvent(c: CanvasRenderingContext2D) {
    const ev = this.pulseEvent; if (!ev) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, t = this.time || 0, k = ev.k, p = this.player;
    c.save();
    if (k === 'thaw') for (let i = 0; i < ev.mobs.length; i++) {
      const e = ev.mobs[i]; if (e.dead || !(e.frozenT > 0)) continue;
      const sx = e.cx - cx0, sy = e.y - cy0 - 10, f = 1 - e.frozenT / (ev.max0[i] || 1);
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 4; c.beginPath(); c.arc(sx, sy, 8, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = f > 0.75 ? '#ff6a5a' : '#bfe8ff'; c.lineWidth = 3;
      c.beginPath(); c.arc(sx, sy, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); c.stroke();
    }
    if (k === 'ember') {
      const sx = ev.ex - cx0, sy = ev.ey - cy0, fl = 1 + Math.sin(t * 13) * 0.12;
      this.glowAt(c, sx, sy, 60 * fl, 'rgba(255,170,80,0.9)', 0.6);
      c.fillStyle = '#fff0b0'; c.beginPath(); c.arc(sx, sy, 5 * fl, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff9a3a'; c.beginPath(); c.arc(sx, sy - 3, 3 * fl, 0, Math.PI * 2); c.fill();
      if (ev.cold > 1.2) { c.globalAlpha = Math.min(0.35, (ev.cold - 1.2) * 0.2); c.fillStyle = '#bfe8ff'; c.fillRect(0, 0, this.W, this.H); c.globalAlpha = 1; }
      this.evMark(c, ev.ex, ev.ey - 18, '#ffb04a');
    }
    if (k === 'scale' && !ev.chosen) this.drawScale(c, ev.obj.x - cx0, ev.obj.y - cy0, t);
    if (k === 'scale' && !ev.chosen) this.evMark(c, ev.obj.x + 17, ev.obj.y - 14, '#ffd24a');
    if (k === 'sundial') ev.plates.forEach((q: Bag, i: number) => {
      const sx = q.x - cx0, sy = q.y - cy0;
      const shown = ev.show >= 1 && ev.show <= 8 && ev.order[(ev.show - 1) % 4] === i && ev.showT > 0.25;
      c.fillStyle = q.lit ? '#ffe28a' : '#8a6e3c'; c.fillRect(sx - 10, sy - 3, 20, 3);
      c.fillStyle = '#5a4428'; c.fillRect(sx - 10, sy - 1, 20, 1);
      if (shown || q.lit) {
        const g = c.createLinearGradient(0, sy - 140, 0, sy);
        g.addColorStop(0, 'rgba(255,230,140,0)'); g.addColorStop(1, shown ? 'rgba(255,230,140,0.7)' : 'rgba(255,230,140,0.3)');
        c.fillStyle = g; c.fillRect(sx - 9, sy - 140, 18, 140);
      }
    });
    if (k === 'thief' && !ev.thief.dead) this.evMark(c, ev.thief.cx, ev.thief.y - 14, '#ffb04a');
    if (k === 'cavein') {
      const fx = ev.front - cx0;
      const g = c.createLinearGradient(fx - ev.dir * 140, 0, fx + ev.dir * 20, 0);
      g.addColorStop(0, 'rgba(70,58,44,0.85)'); g.addColorStop(1, 'rgba(70,58,44,0)');
      c.fillStyle = g;
      if (ev.dir > 0) c.fillRect(0, 0, Math.max(0, fx + 20), this.H); else c.fillRect(Math.min(this.W, fx - 20), 0, this.W, this.H);
      if (ev.rock) { const rx = ev.rock.x - cx0; c.globalAlpha = 0.25 + (0.8 - ev.rock.t) * 0.5; c.fillStyle = '#000'; c.beginPath(); c.ellipse(rx, p.y + p.h - cy0, 24, 5, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
      this.drawLift(c, ev.lift.x - cx0, ev.lift.y - cy0, t);
      this.evMark(c, ev.lift.x, ev.lift.y - 70, '#9fe0ff');
    }
    if (k === 'host') {
      let hx: number, hy: number;
      if (ev.hop) {
        const q = ev.hop.t, tx = ev.hop.to.cx, ty = ev.hop.to.cy;
        hx = ev.hop.fx + (tx - ev.hop.fx) * q; hy = ev.hop.fy + (ty - ev.hop.fy) * q - Math.sin(q * Math.PI) * 60;
      } else { hx = ev.host.cx; hy = ev.host.y - 6; }
      this.glowAt(c, hx - cx0, hy - cy0, 26, 'rgba(216,90,208,0.9)', 0.8);
      c.fillStyle = '#f0b0f0'; c.beginPath(); c.arc(hx - cx0, hy - cy0 + Math.sin(t * 8) * 2, 4, 0, Math.PI * 2); c.fill();
      if (!ev.hop) this.evMark(c, hx, hy - 16, '#d85ad0');
    }
    if (k === 'heartbeat') {
      const q = ev.beat / 1.4;                               // 0 → 1 로 고리가 닫힌다(1 = 박동)
      for (const e of ev.sacs) {
        if (e.dead) continue;
        const sx = e.cx - cx0, sy = e.cy - cy0, on = q > 1 - 0.25 / 1.4 || q < 0.25 / 1.4;
        c.strokeStyle = on ? '#ffe0f4' : '#c84aa8'; c.lineWidth = on ? 3 : 2;
        c.beginPath(); c.arc(sx, sy, 14 + (1 - q) * 30, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 0.5; c.strokeStyle = '#ffe0f4'; c.lineWidth = 1;
        c.beginPath(); c.arc(sx, sy, 14, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
        this.evMark(c, e.cx, e.y - 12, '#e88ad8');
      }
    }
    if (k === 'crown') this.drawCrown(c, ev.crown.x - cx0, ev.crown.y - cy0, ev, t);
    if (k === 'clearair') {
      c.globalAlpha = ev.inside ? 0.12 : 0.3; c.fillStyle = '#7fd08a'; c.fillRect(0, 0, this.W, this.H); c.globalAlpha = 1;
      for (const b of ev.bubbles) {
        const sx = b.x - cx0, sy = b.y - cy0, fade = Math.min(1, b.life / 1.5);
        const g = c.createRadialGradient(sx, sy, b.r * 0.6, sx, sy, b.r);
        g.addColorStop(0, 'rgba(220,250,255,0.06)'); g.addColorStop(1, 'rgba(220,250,255,0.35)');
        c.globalAlpha = fade; c.fillStyle = g; c.beginPath(); c.arc(sx, sy, b.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(240,255,255,0.7)'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(sx - b.r * 0.4, sy - b.r * 0.4, 4, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }
    }
    if (k === 'tide') {
      const wy = ev.water - cy0;
      if (wy < this.H) {
        c.globalAlpha = 0.38; c.fillStyle = '#1a5a8a'; c.fillRect(0, wy, this.W, this.H - wy);
        c.globalAlpha = 0.7; c.strokeStyle = '#8fd8ff'; c.lineWidth = 2; c.beginPath();
        for (let x = 0; x <= this.W; x += 12) { const yy = wy + Math.sin(x * 0.04 + t * 3) * 3; if (x) c.lineTo(x, yy); else c.moveTo(x, yy); }
        c.stroke(); c.globalAlpha = 1;
      }
      this.glowAt(c, ev.goal.x - cx0, ev.goal.y - cy0 - 20, 40, 'rgba(200,240,255,0.9)', 0.5);
      this.evMark(c, ev.goal.x, ev.goal.y - 60, '#bfeaff');
      if (ev.air > 0) {                                       // 숨 — 머리 위 방울
        const n = Math.max(0, 5 - Math.floor(ev.air / 0.7));
        for (let i = 0; i < n; i++) { c.strokeStyle = '#cfefff'; c.lineWidth = 1.5; c.beginPath(); c.arc(p.cx - cx0 - 16 + i * 8, p.y - cy0 - 12, 3, 0, Math.PI * 2); c.stroke(); }
      }
    }
    if (k === 'hush') {
      const el = this.time - ev.t0, f = el / ev.max;
      c.fillStyle = 'rgba(10,10,20,0.35)'; c.fillRect(0, 0, this.W, 6);
      c.fillStyle = '#9ae0ea'; c.fillRect(0, 0, this.W * Math.min(1, f), 6);
    }
    if (k === 'buried' && ev.d !== undefined && ev.d < 5) {
      const b = ev.bell, sx = (b.tx + 0.5) * TS - cx0, sy = (b.ty + 0.5) * TS - cy0;
      this.glowAt(c, sx, sy, 22 + Math.sin(t * 6) * 4, 'rgba(255,240,180,0.9)', 0.25 + (5 - ev.d) * 0.08);
    }
    if (k === 'statues') for (const e of ev.mobs) if (!e.dead) this.evMark(c, e.cx, e.y - 14, e.still ? '#9fb0c4' : '#6ae0ff');
    if (k === 'shadow' && ev.on) this.drawShade(c, ev.sx - cx0, ev.sy - cy0, t);
    if (k === 'phase' && ev.chest && !ev.chest.items) this.evMark(c, ev.chest.x + 15, ev.chest.y - 12, '#ffd24a');
    if (k === 'seed') {
      const s = ev.seed, sx = s.x - cx0, sy = s.y - cy0;
      this.glowAt(c, sx, sy - 8, 20, 'rgba(200,240,120,0.9)', 0.5);
      c.fillStyle = '#7a6a48'; c.beginPath(); c.ellipse(sx, sy - 8, 6, 8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#140c10'; c.fillRect(sx - 1, sy - 13, 2, 9);
      if (!s.carry) this.evMark(c, s.x, s.y - 26, '#c8f070');
      this.evMark(c, ev.goal.x, ev.goal.y - 50, '#ffd24a');
      const gx = ev.goal.x - cx0, gy = ev.goal.y - cy0;
      c.strokeStyle = 'rgba(200,240,120,0.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(gx, gy - 2, 22, 5, 0, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  },

  drawScale(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const tilt = Math.sin(t * 1.3) * 3;
    c.fillStyle = '#7a5a2a'; c.fillRect(x + 15, y + 8, 4, 34);
    c.fillStyle = '#c8a03a'; c.fillRect(x + 9, y + 40, 16, 4);
    c.strokeStyle = '#ffd24a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x + 1, y + 10 + tilt); c.lineTo(x + 33, y + 10 - tilt); c.stroke();
    for (const [px, dy] of [[x + 3, tilt], [x + 31, -tilt]]) {
      c.beginPath(); c.moveTo(px, y + 10 + dy); c.lineTo(px - 5, y + 22 + dy); c.moveTo(px, y + 10 + dy); c.lineTo(px + 5, y + 22 + dy); c.stroke();
      c.fillStyle = '#c8a03a'; c.fillRect(px - 7, y + 22 + dy, 14, 3);
    }
    c.fillStyle = '#f0ece0'; c.beginPath(); c.ellipse(x + 3, y + 20 + tilt, 4, 1.5, -0.4, 0, Math.PI * 2); c.fill();   // 깃털
    this.glowAt(c, x + 17, y + 10, 30, 'rgba(255,210,120,0.8)', 0.3);
  },
  drawLift(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
    c.fillStyle = '#5a4428'; c.fillRect(x - 18, y - 4, 36, 4);
    c.fillStyle = '#3a2c18'; c.fillRect(x - 18, y - 64, 3, 60); c.fillRect(x + 15, y - 64, 3, 60);
    c.fillStyle = '#7a6a52'; c.fillRect(x - 18, y - 66, 36, 4);
    c.strokeStyle = '#a89878'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 62); c.lineTo(x, y - 4 - Math.abs(Math.sin(t)) * 2); c.stroke();
    this.glowAt(c, x, y - 34, 40, 'rgba(160,224,255,0.9)', 0.18);
  },
  drawCrown(c: CanvasRenderingContext2D, x: number, y: number, ev: Bag, t: number) {
    const f = 1 - ev.t / ev.max, h = 16 + f * 34, w = 14 + f * 30, hp = Math.max(0, ev.crown.hp) / 100;
    this.glowAt(c, x, y - h, w * 1.3, 'rgba(120,240,210,0.9)', 0.35);
    c.fillStyle = '#d8d0b0'; c.fillRect(x - 4, y - h, 8, h);
    c.fillStyle = '#2a7a70'; c.beginPath(); c.ellipse(x, y - h, w, w * 0.45, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#3fb0a0'; c.beginPath(); c.ellipse(x, y - h - 2, w - 3, w * 0.38, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#bff8e8';
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(x + i * w * 0.32, y - h - w * 0.18 - Math.abs(i) * -2, 2, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(x - 22, y + 4, 44, 4);
    c.fillStyle = hp > 0.35 ? '#8fe0c4' : '#ff6a5a'; c.fillRect(x - 22, y + 4, 44 * hp, 4);
    void t;
  },
  /** 뒤따르는 그림자 — 플레이어 실루엣을 어둡게 */
  drawShade(c: CanvasRenderingContext2D, x: number, footY: number, t: number) {
    c.save();
    c.globalAlpha = 0.72; c.fillStyle = '#120c22';
    c.beginPath(); c.ellipse(x, footY - 32, 7, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(x - 7, footY - 26, 14, 18);
    c.fillRect(x - 6, footY - 9, 5, 9); c.fillRect(x + 1, footY - 9, 5, 9);
    c.globalAlpha = 0.9; c.fillStyle = '#8fd8ff'; c.fillRect(x - 3, footY - 34, 2, 2); c.fillRect(x + 2, footY - 34, 2, 2);
    c.globalAlpha = 0.25 + Math.sin(t * 9) * 0.1; c.fillStyle = '#5a5090';
    c.beginPath(); c.ellipse(x, footY - 18, 14, 24, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  },

  /** 묻힌 것 · 모래 속을 헤엄치는 것 — 몸 대신 땅이 들썩인다 */
  drawBuried(c: CanvasRenderingContext2D, e: Enemy, sx: number, sy: number) {
    const fx = sx + e.w / 2, fy = sy + e.h, t = this.time || 0;
    const col = e.def.trait === 'burrow' ? '#c8a868' : '#6a5a40';
    const amp = e.def.trait === 'burrow' ? 3 + Math.sin(t * 14) * 1.5 : 1 + Math.sin(t * 3 + e.x) * 0.6;
    c.fillStyle = col; c.beginPath(); c.ellipse(fx, fy, e.w * 0.6, amp, 0, Math.PI, 0); c.fill();
    if (e.def.trait === 'ambush') {                           // 바닥의 금 — 아는 사람만 본다
      c.strokeStyle = 'rgba(20,12,16,0.7)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(fx - 8, fy); c.lineTo(fx - 3, fy - 2); c.lineTo(fx + 2, fy); c.lineTo(fx + 7, fy - 1); c.stroke();
    }
  },
  /** 규칙이 드러나는 겹 — 훔친 등불 · 깬 낱장의 눈 · 굳은 석상 · 붙은 거머리 · 방패의 빛 */
  drawTraitFx(c: CanvasRenderingContext2D, e: Enemy, sx: number, sy: number) {
    const t = this.time || 0, tr0 = e.def.trait;
    if (tr0 === 'thief' && e.lampT > 0) this.glowAt(c, sx + e.w / 2 + e.facing * 8, sy + e.h * 0.4, 46 + Math.sin(t * 11) * 4, 'rgba(255,176,74,0.9)', 0.5);
    if (tr0 === 'deaf' && e.awake) { c.fillStyle = '#ff5a4a'; c.beginPath(); c.arc(sx + e.w / 2, sy + e.h / 2, 3, 0, Math.PI * 2); c.fill(); }
    if (tr0 === 'statue' && e.still) {
      c.globalAlpha = 0.25; c.fillStyle = '#c8d4e0'; c.fillRect(sx, sy, e.w, e.h); c.globalAlpha = 1;
    }
    if (tr0 === 'shield' && e.shFace) {
      const x = sx + e.w / 2 + e.shFace * (e.w / 2 + 2);
      c.globalAlpha = 0.35 + Math.sin(t * 5) * 0.1; c.fillStyle = '#e0f6ff'; c.fillRect(x - 1, sy + 6, 2, e.h - 12); c.globalAlpha = 1;
    }
    if (tr0 === 'regrow' && t - (e.lastHitT || -9) > 2 && e.hp < e.maxHp) this.glowAt(c, sx + e.w / 2, sy + e.h / 2, 26, 'rgba(143,224,196,0.9)', 0.25);
    if (e.frozenT > 0) { c.globalAlpha = 0.3; c.fillStyle = '#bfe8ff'; c.fillRect(sx - 2, sy - 2, e.w + 4, e.h + 4); c.globalAlpha = 1; }
  },

  /** 유적의 어둠 — 화면을 덮되 플레이어 둘레와 사건의 불빛(불씨 · 훔친 등불)만 뚫는다 */
  drawRuinDark(c: CanvasRenderingContext2D) {
    const W = this.W, H = this.H;
    if (!this._darkCv || this._darkCv.width !== W || this._darkCv.height !== H) {
      this._darkCv = document.createElement('canvas'); this._darkCv.width = W; this._darkCv.height = H;
    }
    const d = this._darkCv.getContext('2d')!;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, W, H);
    d.fillStyle = '#04050a'; d.fillRect(0, 0, W, H);
    const holes: number[][] = [];
    const p = this.player;
    holes.push([p.cx - this.cam.x, p.cy - this.cam.y, 70]);
    const ev = this.pulseEvent;
    if (ev && ev.k === 'ember') holes.push([ev.ex - this.cam.x, ev.ey - this.cam.y, 165]);
    for (const e of this.ents) if (e instanceof Enemy && !e.dead && e.def.trait === 'thief' && e.lampT > 0)
      holes.push([e.cx - this.cam.x, e.cy - this.cam.y, 110]);
    d.globalCompositeOperation = 'destination-out';
    for (const [x, y, r] of holes) {
      const g = d.createRadialGradient(x, y, r * 0.25, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2);
    }
    d.globalCompositeOperation = 'source-over';
    c.save();
    c.globalAlpha = Math.min(1, this.ruinDark / 2) * 0.82;
    c.drawImage(this._darkCv, 0, 0);
    c.restore();
  }
};

mixin(Game.prototype, RuinEventsDrawPart, true);

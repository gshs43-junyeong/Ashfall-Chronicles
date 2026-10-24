/* ===== game/boss-eclipse-art.ts — 일식의 그림 — 하늘의 원판과 외눈(sky 단계) · 그림자 손(인물 앞) · 긴 그림자 · 빛기둥 · 개기일식의 어둠(빛 뒤) ===== */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TILE_DEF } from '../data.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { EC, ecLit, handStage } from '../entity/boss-eclipse.js';
import { Game } from '../game.js';
import { groundZone, hzGlow } from './boss-hazard-art.js';
/* ★ 원판은 하늘(sky 단계 — 원경 산 뒤)에 그린다: 세계에 있지 않고 화면에 걸린 것(카메라를 조금만 따라간다).
   원판이 해를 가린 만큼 낮빛을 줄인다(G.ecDim → dayFactor) — 하늘 · 땅 빛이 같이 어두워진다.
   멈춘 그림이 아니게: 코로나가 돌고 · 원판이 숨 쉬며 · 외눈이 플레이어를 따라 보고 가끔 떴다 감는다. 사연: docs/code-history.md#h228 */

type C2 = CanvasRenderingContext2D;
const BW = EC.W * EC.K, PW = 192, CORONA = '#b48aff', PALE = '#f0e0ff';
const isEc = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_eclipse';
function hzOf(g: Bag, e: Enemy, k: string) {
  for (const h of g.bhz || []) if (h.k === k && g.hzBoss(h) === e) return h;
  return null;
}
const ease = (cur: number, to: number, dt: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));
let DARK: HTMLCanvasElement | null = null;

export const BossEclipseArt: Bag = {
  /** 하늘의 원판 · 코로나 · 외눈(sky 단계) — 그리면서 낮빛 가림(ecDim)도 정한다 */
  drawEclipseSky(f: any) {
    const c: C2 = f.c, T = this.time || 0, dt = this.paused ? 0 : 1 / 60;
    let want = 0;
    for (const e of this.ents) {
      if (!isEc(e)) continue;
      const im = Sprites.want('pursuer'), pim = Sprites.want('pursuer_parts');
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), sr = hzOf(this, e, 'estare'), tot = hzOf(this, e, 'etotal'), hd = hzOf(this, e, 'ehand');
      want = Math.max(want, tot && tot.t > tot.tele * 0.5 ? 0.97 : sr ? 0.8 : 0.42 + 0.08 * st);
      const W = this.W, H = this.H;
      const sx = W / 2 + clamp(((e.hx ?? e.cx) - f.camX - W / 2) * 0.18, -W * 0.28, W * 0.28) + Math.sin(T * 0.37) * 10;
      const sy = H * 0.24 + Math.sin(T * 0.53) * 6;
      e.ecScr = [sx, sy];
      const S = 1.25 * (1 + Math.sin(T * 1.1) * 0.012);
      /* 빛무리 — 원판 뒤에서 숨 쉬듯 */
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(sx, sy, EC.R * EC.K * S * 0.9, sx, sy, EC.R * EC.K * S * (2.4 + 0.15 * Math.sin(T * 1.7)));
      g.addColorStop(0, 'rgba(200,170,255,.35)'); g.addColorStop(0.4, 'rgba(150,110,240,.12)'); g.addColorStop(1, 'rgba(120,80,220,0)');
      c.fillStyle = g; c.fillRect(sx - W, sy - H, W * 2, H * 2); c.restore();
      if (!im) continue;
      const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1);
      c.save(); c.translate(sx, sy); c.rotate(T * 0.04 + Math.sin(T * 0.3) * 0.05); c.scale(S, S);
      c.imageSmoothingEnabled = false;
      c.drawImage(im, fr * BW, 0, BW, BW, -BW / 2, -BW / 2, BW, BW);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.4, e.flash * 3); c.drawImage(im, fr * BW, 0, BW, BW, -BW / 2, -BW / 2, BW, BW); }
      c.restore();
      /* 외눈 — 플레이어 쪽을 보고, 응시 · 개기일식엔 크게 뜨고, 손을 뻗을 땐 반쯤, 쉴 땐 가끔 떴다 감는다 */
      if (pim) {
        const E = e.ecEye || (e.ecEye = { o: 0, lx: 0, ly: 0 });
        const blink = (T % 7) < 1.6 ? Math.sin((T % 7) / 1.6 * Math.PI) * 0.6 : 0;
        const goal = sr || (tot && tot.t > 0.4) ? 1 : hd && hd.t < hd.tele ? 0.5 : blink;
        E.o = ease(E.o, goal, dt, 5);
        const px = this.player.cx - f.camX - sx, py = this.player.cy - f.camY - sy, d = Math.hypot(px, py) || 1;
        E.lx = ease(E.lx, px / d * 26, dt, 3); E.ly = ease(E.ly, py / d * 20, dt, 3);
        const ef = E.o < 0.22 ? 0 : E.o < 0.7 ? 1 : 2, k = 1.5 + (sr ? 0.25 * Math.sin(T * 12) * 0.2 : 0);
        c.save(); c.translate(sx + E.lx, sy + E.ly); c.scale(k, k); c.imageSmoothingEnabled = false;
        c.drawImage(pim, ef * PW, 0, PW, PW, -PW / 2, -PW / 2, PW, PW); c.restore();
        if (E.o > 0.5) hzGlow(c, sx + E.lx, sy + E.ly, 60 + 40 * E.o, PALE, 0.25 * E.o);
      }
    }
    this.ecDim = ease(this.ecDim || 0, want, dt, want > (this.ecDim || 0) ? 0.8 : 0.4);
  },
  /** 그림자 손(actors 단계 · drawBossLit) — 화면 위에서 팔뚝이 이어져 내려와 땅을 짚는다 */
  drawEclipseHands(c: C2) {
    const pim = Sprites.want('pursuer_parts'); if (!pim) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, T = this.time || 0;
    for (const h of this.bhz || []) {
      if (h.k !== 'ehand') continue;
      const [ht, st] = handStage(h), s = 1.3, top = cy0 - 280;
      const wristY = top + (h.fy - 196 * s - top) * ht, x = h.tx + (st === 0 ? Math.sin(T * 2.3 + h.sd) * 8 * (1 - ht) : 0);
      c.save(); c.translate(-cx0, -cy0); c.imageSmoothingEnabled = false;
      c.save(); c.globalCompositeOperation = 'lighter'; hzGlow(c, x, wristY + 90 * s, 120 * s, CORONA, 0.22); c.restore();
      for (let y = wristY - PW * s * 0.95; y > cy0 - PW * s * 1.2; y -= PW * s * 0.95) c.drawImage(pim, 5 * PW, 0, PW, PW, x - PW * s / 2, y, PW * s, PW * s);   // 팔뚝 — 화면 위 끝까지
      const fr = st === 2 ? 4 : 3;
      if (st === 1) for (let g2 = 3; g2 >= 1; g2--) { c.save(); c.globalAlpha = 0.25 / g2; c.drawImage(pim, fr * PW, 0, PW, PW, x - 96 * s, wristY - 16 * s - g2 * 30, PW * s, PW * s); c.restore(); }
      c.drawImage(pim, fr * PW, 0, PW, PW, x - 96 * s, wristY - 16 * s, PW * s, PW * s);
      const b = this.hzBoss(h);
      if (b && b.flash > 0 && st === 2) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, b.flash * 4); c.drawImage(pim, fr * PW, 0, PW, PW, x - 96 * s, wristY - 16 * s, PW * s, PW * s); }
      c.restore();
    }
  },
  /** 기술 예고(fx · drawSig 에서) — 길게 눕는 그림자 · 손이 짚을 자리 · 빛기둥 */
  eclipseTell(c: C2, h: Bag, cx0: number, cy0: number) {
    const T = this.time || 0;
    switch (h.k) {
      case 'estare': case 'etotal': return true;
      case 'ehand': {
        if (h.t > h.tele + 0.2) return true;
        const k = Math.min(1, h.t / h.tele), fy = h.fy - cy0, q = this.hzNear(h.tx, h.fy) || this.player;
        /* 그림자 — 발밑에서 손이 짚을 자리까지 길어진다(원판 반대쪽) */
        const x0 = q.cx - cx0, x1 = x0 + (h.tx - cx0 - x0) * Math.min(1, k * 1.4);
        c.save(); c.globalAlpha = 0.55 * Math.min(1, k * 2);
        const gr = c.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(8,4,16,.85)'); gr.addColorStop(1, 'rgba(30,14,50,.35)');
        c.fillStyle = gr; c.beginPath(); c.moveTo(x0, fy - 3); c.lineTo(x1, fy - 1); c.lineTo(x1, fy + 1); c.lineTo(x0, fy + 3); c.closePath(); c.fill();
        c.beginPath(); c.ellipse(x1, fy, 18 + 60 * k, 6 + 4 * k, 0, 0, TAU); c.fill(); c.restore();
        groundZone(c, h.tx - cx0, fy, 96, '#6a3aa8', k, T);
      } return true;
      case 'elight': {                                               // 빛기둥 — 화면 위에서 땅까지 따뜻한 햇빛 한 줄기
        const a = h.t < h.tele ? h.t / h.tele * 0.35 : Math.min(1, (h.life - h.t) / 0.4), x = h.x - cx0, fy = h.fy - cy0, w = h.t < h.tele ? h.w * 0.25 : h.w;
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
        const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
        g.addColorStop(0, 'rgba(255,230,170,0)'); g.addColorStop(0.5, 'rgba(255,236,190,.45)'); g.addColorStop(1, 'rgba(255,230,170,0)');
        c.fillStyle = g; c.fillRect(x - w / 2, -40, w, fy + 40);
        c.fillStyle = 'rgba(255,248,220,.5)'; c.fillRect(x - 2 + Math.sin(T * 3 + h.sd) * 6, -40, 3, fy + 40);
        c.restore();
        if (h.t >= h.tele) groundZone(c, x, fy, h.w / 2, '#ffe6a0', 0.6, T);
      } return true;
    }
    return false;
  },
  /** 빛(fx 단계) — 응시의 박동 · 개기일식의 어둠(제 빛 안만 트인다) */
  drawEclipseGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isEc(e)) continue;
      const sr = hzOf(this, e, 'estare');
      if (sr && sr.t < sr.tele) {                                    // 응시를 모은다 — 화면 가장자리가 보랏빛으로 조여 온다
        const k = sr.t / sr.tele, W = this.W, H = this.H;
        const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.6 - 0.25 * k), W / 2, H / 2, Math.max(W, H) * 0.75);
        g.addColorStop(0, 'rgba(40,10,70,0)'); g.addColorStop(1, `rgba(40,10,70,${0.45 * k})`);
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
      const tot = hzOf(this, e, 'etotal'); if (!tot) continue;
      const k = tot.t < tot.tele ? tot.t / tot.tele : Math.min(1, (tot.life - tot.t) / 0.5);
      const W = this.W, H = this.H;
      if (!DARK) DARK = document.createElement('canvas');
      if (DARK.width !== W || DARK.height !== H) { DARK.width = W; DARK.height = H; }
      const d = DARK.getContext('2d')!;
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
      d.fillStyle = `rgba(4,2,10,${0.93 * k})`; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'destination-out';
      const hole = (x: number, y: number, r: number) => { const g = d.createRadialGradient(x, y, r * 0.3, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const q of this.players) if (!q.dead) hole(q.cx - f.camX, q.cy - f.camY, ecLit(q, this.world) ? 190 + Math.sin(T * 9) * 6 : 60);
      const w = this.world;
      for (let ty = f.ty0; ty <= f.ty1; ty++) for (let tx = f.tx0; tx <= f.tx1; tx++) {
        const df = TILE_DEF[w.get(tx, ty)]; if (df && (df.light || 0) >= 5) hole(tx * TS + TS / 2 - f.camX, ty * TS + TS / 2 - f.camY, 130);
      }
      c.drawImage(DARK, 0, 0);
      /* 다 가려진 해 — 어둠 위로 코로나 고리만 타오른다(개기일식의 그 모양) · 테의 한 점이 다이아몬드처럼 빛난다 */
      const [sx, sy] = e.ecScr || [W / 2, H * 0.24], R0 = EC.R * EC.K * 1.25;
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = k;
      const g = c.createRadialGradient(sx, sy, R0 * 0.95, sx, sy, R0 * 1.9);
      g.addColorStop(0, 'rgba(240,224,255,.55)'); g.addColorStop(0.25, 'rgba(180,138,255,.25)'); g.addColorStop(1, 'rgba(120,80,220,0)');
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, R0 * 1.9, 0, TAU); c.arc(sx, sy, R0 * 0.97, 0, TAU, true); c.fill();
      c.strokeStyle = 'rgba(255,246,230,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, R0, 0, TAU); c.stroke();
      for (let i = 0; i < 9; i++) {                                    // 코로나 줄기 — 천천히 돌며 휘어 나간다
        const a0 = i / 9 * TAU + T * 0.05, L = R0 * (0.35 + 0.25 * Math.sin(T * 0.7 + i * 1.7));
        c.strokeStyle = `rgba(220,200,255,${0.25 + 0.15 * Math.sin(T + i)})`; c.lineWidth = 2;
        c.beginPath(); c.moveTo(sx + Math.cos(a0) * R0, sy + Math.sin(a0) * R0);
        c.quadraticCurveTo(sx + Math.cos(a0 + 0.12) * (R0 + L * 0.6), sy + Math.sin(a0 + 0.12) * (R0 + L * 0.6), sx + Math.cos(a0 + 0.2) * (R0 + L), sy + Math.sin(a0 + 0.2) * (R0 + L)); c.stroke();
      }
      hzGlow(c, sx + Math.cos(2.6) * R0, sy + Math.sin(2.6) * R0, 30 + 6 * Math.sin(T * 5), '#ffffff', 0.9);
      c.restore();
    }
  },
};
mixin(Game.prototype, BossEclipseArt, true);

/* ===== game/boss-organ-art.ts — 뼈 오르간의 그림 — 뒷벽의 몸(인물 뒤) · 뼈 팔(인물 앞) · 혼불과 관의 빛(빛 뒤) ===== */
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { ORGAN, organAt, organFloor, restHand, sweepBand, sweepHand } from '../entity/boss-organ.js';
import { Game } from '../game.js';
import { flowBand, groundZone, hs, hzGlow } from './boss-hazard-art.js';
/* ★ 몸은 objects 단계(인물 뒤 · 빛 앞)에 그린다 — 뒷벽에 박힌 것이라 플레이어가 그 앞을 지나간다. 팔은 바닥을 쓸어 플레이어를 치므로
   actors 단계(인물 앞 · 빛 앞), 혼불 · 관 입의 빛은 fx 단계(빛 뒤 — 어두운 무덤에서도 보여야 박자를 읽는다). drawEnemy 는 이 보스를 건너뛴다. */

type C2 = CanvasRenderingContext2D;
const BW = 320, BH = 384, PW = 256, PH = 96, SOUL = '#9ff0d0';

/** 이 보스에 걸린 위험 지대 하나(갈래 k) */
function hzOf(g: Bag, e: Enemy, k: string) {
  for (const h of g.bhz || []) if (h.k === k && g.hzBoss(h) === e) return h;
  return null;
}
const isOrgan = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_organ';
/** 두 뼈 팔의 팔꿈치 — 어깨에서 손까지, 팔꿈치는 바깥 위로 꺾인다 */
function elbow(sx: number, sy: number, hx: number, hy: number, s: number): [number, number] {
  const L1 = ORGAN.L1, L2 = ORGAN.L2, dx = hx - sx, dy = hy - sy;
  const d = Math.max(20, Math.min(L1 + L2 - 2, Math.hypot(dx, dy))), a = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const c1: [number, number] = [sx + Math.cos(a - al) * L1, sy + Math.sin(a - al) * L1];
  const c2: [number, number] = [sx + Math.cos(a + al) * L1, sy + Math.sin(a + al) * L1];
  void s; return c1[1] < c2[1] ? c1 : c2;
}
/** 뼈 한 마디 — 조각(가로로 누운 뼈)을 관절에서 다음 관절로 */
function bone(c: C2, im: HTMLImageElement | null, fr: number, x0: number, y0: number, x1: number, y1: number, off: number) {
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  if (!im) { c.strokeStyle = '#e2d8bc'; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); return; }
  c.save(); c.translate(x0, y0); c.rotate(a);
  if (Math.cos(a) < 0) c.scale(1, -1);
  const k = L / (PW - off - 24);
  c.drawImage(im, fr * PW, 0, PW, PH, -off * k, -PH / 2, PW * k, PH);
  c.restore();
}

export const BossOrganArt: Bag = {
  /** 몸(objects 단계) — 손상 단계 · 풀무 열림에 맞는 장, 흩어지는 동안은 흐려지며 떨린다 */
  drawOrgans(f: any) {
    const c: C2 = f.c, im = Sprites.want('bone_lord');
    for (const e of this.ents) {
      if (!isOrgan(e)) continue;
      const br = hzOf(this, e, 'obreath'), sc = hzOf(this, e, 'oscatter');
      const open = br && br.t >= br.open0 ? 1 : 0, st = Math.min(2, Math.round((e.pf || 0) * 2));
      const fr = st * 2 + open;
      let x = e.cx - ORGAN.CORE[0] * ORGAN.K - f.camX, y = e.cy - ORGAN.CORE[1] * ORGAN.K - f.camY;
      let a = 1;
      if (sc) { const k = Math.sin(Math.min(1, sc.t / sc.life) * Math.PI); a = 1 - k * 0.55; x += (Math.random() - 0.5) * 6 * k; y += (Math.random() - 0.5) * 4 * k; }
      const breathe = br && br.t < br.open0 ? Math.sin(br.t / br.open0 * Math.PI) * 0.02 : 0;    // 숨을 들이켜며 부풀다 열린다
      if (!this.paused) this.organAmbient(e);
      if (!im) continue;
      c.save();
      /* 뒷벽에 박힌 몸 — 빈 칸에만 보인다(앞의 바위 · 천장 칸이 몸을 가린다) */
      const w = this.world, TSZ = TS, tx0 = Math.floor((x + f.camX) / TSZ), ty0 = Math.floor((y + f.camY) / TSZ);
      c.beginPath();
      for (let ty = ty0; ty <= ty0 + Math.ceil(BH / TSZ); ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(BW / TSZ); tx++)
        if (!w.solid(tx, ty)) c.rect(tx * TSZ - f.camX, ty * TSZ - f.camY, TSZ, TSZ);
      c.clip();
      c.globalAlpha = a; c.imageSmoothingEnabled = false;
      c.translate(x + BW / 2, y + BH); c.scale(1 + breathe, 1 + breathe); c.translate(-BW / 2, -BH);
      c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, 0, 0, BW, BH); }
      c.restore();
    }
  },
  /** 팔(actors 단계) — 쉴 땐 바닥을 짚고, 쓸기 중엔 치켜들었다 바닥을 쓴다 */
  drawOrganArms(c: C2) {
    const im = Sprites.want('bone_lord_parts'), cx0 = this.cam.x, cy0 = this.cam.y, T = this.time || 0;
    for (const e of this.ents) {
      if (!isOrgan(e)) continue;
      const sweeps: Bag = {};
      for (const h of this.bhz || []) if (h.k === 'osweep' && this.hzBoss(h) === e) sweeps[h.s] = h;
      for (const s of [-1, 1]) {
        const [sx, sy] = organAt(e, 40 + s * ORGAN.SHOULDER, ORGAN.SHOULDER_Y);
        const h = sweeps[s];
        const [hx, hy, ph] = h ? sweepHand(h, e) : [...restHand(e, s, T), -1];
        const [ex, ey] = elbow(sx, sy, hx, hy, s);
        c.save(); c.translate(-cx0, -cy0);
        if (ph === 1 && im) for (let g = 3; g >= 1; g--) {      // 잔상 — 쓰는 손이 지나온 자리에 흐리게 셋(빠르기가 손에 남는다)
          const [gx, gy] = sweepHand(Object.assign({}, h, { t: h.t - g * 0.035 }), e);
          c.save(); c.globalAlpha = 0.32 / g; c.translate(gx, gy); if (s < 0) { c.rotate(Math.PI); c.scale(1, -1); }
          c.drawImage(im, 2 * PW, 0, PW, PH, -10, -PH * 0.36, PW * 0.72, PH * 0.72); c.restore();
        }
        bone(c, im, 0, sx, sy, ex, ey, 20);
        bone(c, im, 1, ex, ey, hx, hy, 20);
        /* 손 — 쉴 때 · 쓸 때는 손바닥을 바닥에 눕히고(손가락이 바깥을 향한다), 치켜든 동안만 아래팔을 따라 뻗는다 */
        const fa = Math.atan2(hy - ey, hx - ex), flat = s > 0 ? 0 : Math.PI;
        const up = h && h.t < h.tele ? Math.min(1, h.t / (h.tele * 0.5)) : 0;
        const a = flat + Math.atan2(Math.sin(fa - flat), Math.cos(fa - flat)) * up;
        c.translate(hx, hy); c.rotate(a);
        if (Math.cos(a) < 0) c.scale(1, -1);
        if (im) c.drawImage(im, 2 * PW, 0, PW, PH, -10, -PH * 0.36, PW * 0.72, PH * 0.72);
        c.restore();
      }
    }
  },
  /** 빛(fx 단계) — 혼불(풀무가 열리면 맥박치며 밝다) · 눈 · 관 입의 빛(차례 · 박자) · 팔 쓸기 띠 예고 */
  drawOrganGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isOrgan(e)) continue;
      const cx = e.cx - f.camX, cy = e.cy - f.camY;
      const br = hzOf(this, e, 'obreath'), open = br && br.t >= br.open0;
      hzGlow(c, cx, cy, open ? 90 + Math.sin(T * 9) * 10 : 46, SOUL, open ? 0.55 : 0.2);
      for (const s of [-1, 1]) { const [x, y] = organAt(e, 40 + s * 3.6, 36.8); hzGlow(c, x - f.camX, y - f.camY, 14, SOUL, 0.5); }
      const pp = hzOf(this, e, 'opipes'), rq = hzOf(this, e, 'oreq');
      ORGAN.PIPES.forEach((px, i) => {
        let k = 0;
        if (pp) {
          const idx = pp.order.indexOf(i), lit = pp.tele * (idx + 1) / pp.order.length, fire = pp.tele + idx * pp.gap;
          if (pp.t >= lit * 0.9) k = 0.45;
          if (pp.t >= fire && pp.t < fire + 0.25) k = 1;
        }
        if (rq) { const b = Math.floor(rq.t / rq.beat), kk = b % 12, pi = kk < 7 ? kk : 12 - kk; if (pi === i) k = Math.max(k, 1 - (rq.t % rq.beat) / rq.beat); else k = Math.max(k, 0.2); }
        if (k <= 0) return;
        const [x, y] = organAt(e, 40 + px, ORGAN.MOUTH);
        hzGlow(c, x - f.camX, y - f.camY, 18 + 22 * k, SOUL, 0.3 + 0.5 * k);
        c.fillStyle = `rgba(230,255,244,${0.4 + 0.6 * k})`; c.fillRect(x - f.camX - 4, y - f.camY - 3, 8, 6);
      });
    }
  },
  /** 팔 쓸기 예고(fx · drawSig 에서) — 쓸 띠에 바람결이 바깥으로 흐르고(다가올수록 빨라짐), 낮으면 바닥이 빛나며 뼛가루가 들썩인다.
     높으면 띠가 머리 높이에 떠 바닥은 비어 있다 — 서 있으면 지나간다는 것이 그림으로 읽힌다 */
  drawSweepTell(c: C2, h: Bag, cx0: number, cy0: number) {
    const b = this.hzBoss(h); if (!b || h.t >= h.tele + h.dur) return;
    const [x0, x1, top, bot] = sweepBand(h, b), T = T0(this);
    const k = Math.min(1, h.t / h.tele), fade = h.t > h.tele ? 1 - (h.t - h.tele) / h.dur : 1;
    c.save(); c.globalAlpha = fade;
    flowBand(c, (h.id || 0) * 0.37, x0 - cx0, x1 - cx0, top - cy0, bot - cy0, h.s, h.c, h.t > h.tele ? 1 : k, T);
    if (h.low) {
      const fy = organFloor(b) - cy0, n = Math.floor((x1 - x0) / 18);
      groundZone(c, (x0 + x1) / 2 - cx0, fy, (x1 - x0) / 2, h.c, k, T);
      c.fillStyle = '#e8dcbc';                              // 뼛가루가 바닥에서 들썩인다 — 쓸 때가 다가올수록 높이
      for (let i = 0; i < n; i++) {
        const px = x0 + (i + hs(h.id || 1, i)) * (x1 - x0) / n - cx0, hop = Math.abs(Math.sin(T * (9 + hs(h.id || 1, i + 7) * 6) + i)) * (1 + k * 5);
        c.globalAlpha = fade * (0.3 + 0.5 * k); c.fillRect(px, fy - 2 - hop, 2, 2);
      }
    } else groundZone(c, (x0 + x1) / 2 - cx0, (top + bot) / 2 - cy0, (x1 - x0) / 2, h.c, k * 0.6, T);
    c.restore();
  },
};
function T0(g: Bag) { return g.time || 0; }

mixin(Game.prototype, BossOrganArt, true);

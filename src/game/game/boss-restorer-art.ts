/* ===== game/boss-restorer-art.ts — 환원기 그림 — 시계 눈 핵 · 저마다 다른 축으로 도는 고리 셋(짐벌) · 시곗바늘 · 위성 둘 · 되감기 때 뒤집히는 화면 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 계획 §3: 하늘의 고리 장치 — 고리가 따로 돈다, 되감기 때 화면이 거꾸로. 폭풍의 수호자 고리(몸을 가로로 감싼 납작한 궤도)와 달리
   이것은 짐벌이다 — 고리마다 제 축(기울기)을 두고 그 축을 돌아 핵을 가둔 구처럼 보이고, 뒤 반쪽은 핵 뒤 · 앞 반쪽은 핵 앞에 그린다.
   되감기(rewind 기술 · 원점 회귀)는 `flip` 위험 지대를 놓고, 그동안 화면이 위아래로 뒤집혔다 돌아온다(render 의 flipBegin/flipEnd) · 고리와 바늘이 거꾸로 빨리 돈다.
   설계 좌표는 tools/mkbossrig.py restorer_*(핵 48×48 · 고리 64×64 의 반지름 30 · 26 · 22). 사연: docs/code-history.md#h241 */

type C2 = CanvasRenderingContext2D;
const K = 4, CW = 48 * K, PW = 64 * K, GLOW = '#bcd8f4';
/** 고리 셋 — [축 기울기, 축 돌기 빠르기, 제 돌기 빠르기, 배율] */
const RINGS: [number, number, number, number][] = [[0.35, 0.55, 0.25, 1.6], [-0.9, -0.8, -0.4, 1.6], [1.4, 1.1, 0.6, 1.6]];

export const BossRestorerArt: Bag = {
  /** 고리 반쪽 — back 이면 핵 뒤 반쪽 */
  drawRestorerRing(c: C2, pim: HTMLImageElement, i: number, X: number, Y: number, tilt: number, th: number, spin: number, k: number, back: boolean) {
    const front = Math.sin(th) > 0 ? -1 : 1;                                   // 앞으로 온 반쪽(위 · 아래)
    const half = back ? -front : front;
    c.save(); c.translate(X, Y); c.rotate(tilt);
    c.beginPath(); c.rect(-PW * k, half < 0 ? -PW * k : 0, PW * 2 * k, PW * k); c.clip();
    c.scale(k, k * Math.max(0.04, Math.abs(Math.cos(th)))); c.rotate(spin);
    c.drawImage(pim, i * PW, 0, PW, PW, -PW / 2, -PW / 2, PW, PW);
    c.restore();
  },
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawRestorer(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('restorer'), pim = Sprites.want('restorer_parts'); if (!im || !pim) return false;
    const T = this.time || 0, st = Math.min(2, Math.round((e.pf || 0) * 2));
    const rew = (this.bhz || []).some((h: Bag) => h.k === 'flip' && h.t < h.life);
    const A = e.rsA || (e.rsA = { t0: T, th: [0, 1.2, 2.4], sp: [0, 0, 0], hand: 0 });
    const dt = this.paused ? 0 : Math.max(0, Math.min(0.1, T - A.t0)); A.t0 = T;
    const rate = rew ? -6 : 1 + (e.pf || 0) * 0.6;                            // 되감기 — 거꾸로 빨리
    RINGS.forEach(([, w, s], i) => { A.th[i] += w * rate * dt; A.sp[i] += s * rate * dt; });
    A.hand += rate * dt;
    const X = sx + e.w / 2, Y = sy + e.h / 2 + Math.sin(T * 0.9) * 8;
    c.save(); c.imageSmoothingEnabled = false;
    /* 위성 둘 — 바깥 고리를 따라 돈다(깊이로 앞뒤를 가른다) */
    const sats = [0, Math.PI].map(o => {
      const [tilt, , , k] = RINGS[0], a = A.sp[0] * 2 + o, R = 29 * K * k, th = A.th[0];
      const lx = Math.cos(a) * R, ly = Math.sin(a) * R * Math.cos(th), z = Math.sin(a) * Math.sin(th);
      return { x: X + lx * Math.cos(tilt) - ly * Math.sin(tilt), y: Y + lx * Math.sin(tilt) + ly * Math.cos(tilt), z };
    });
    const sat = (q: Bag) => c.drawImage(pim, 5 * PW, 0, PW, PW, q.x - PW * 0.5, q.y - PW * 0.5, PW, PW);
    sats.filter(q => q.z > 0).forEach(sat);
    RINGS.forEach(([tilt, , , k], i) => this.drawRestorerRing(c, pim, i, X, Y, tilt + Math.sin(T * 0.2 + i) * 0.1, A.th[i], A.sp[i], k, true));
    /* 핵 — 시계 눈 · 바늘 */
    const fr = st * 2 + ((T % 1.6) < 0.8 ? 0 : 1), ck = 1.3;
    c.save(); c.translate(X, Y); c.scale(ck, ck);
    c.drawImage(im, fr * CW, 0, CW, CW, -CW / 2, -CW / 2, CW, CW);
    if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * CW, 0, CW, CW, -CW / 2, -CW / 2, CW, CW); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    for (const [fi, sp] of [[4, 0.12], [3, 1.0]] as [number, number][]) {
      c.save(); c.rotate(A.hand * sp); c.scale(0.55, 0.55); c.drawImage(pim, fi * PW, 0, PW, PW, -PW / 2, -PW / 2, PW, PW); c.restore();
    }
    c.restore();
    RINGS.forEach(([tilt, , , k], i) => this.drawRestorerRing(c, pim, i, X, Y, tilt + Math.sin(T * 0.2 + i) * 0.1, A.th[i], A.sp[i], k, false));
    sats.filter(q => q.z <= 0).forEach(sat);
    c.restore();
    e.rsEye = [X + this.cam.x, Y + this.cam.y];
    return true;
  },
  /** 빛(fx 단계) — 눈 · 되감기 땐 더 밝게 */
  drawRestorerGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_restorer' || !e.rsEye) continue;
      const rew = (this.bhz || []).some((h: Bag) => h.k === 'flip' && h.t < h.life);
      c.save(); c.globalCompositeOperation = 'lighter';
      hzGlow(c, e.rsEye[0] - f.camX, e.rsEye[1] - f.camY, (rew ? 70 : 34) + Math.sin(T * 3) * 4, GLOW, rew ? 0.8 : 0.5);
      c.restore();
    }
  },
  /** 되감기 — 화면이 위아래로 뒤집혔다 돌아온다(sky 단계 맨 앞에서 건다 · screen 단계 맨 앞에서 푼다) */
  flipBegin(f: any) {
    const h = (this.bhz || []).find((q: Bag) => q.k === 'flip' && q.t < q.life); if (!h || this.fxScale() < 0.3) return;   // 화면 효과를 줄였으면 뒤집지 않는다(어지럼)
    const E = 0.35, v = h.t < E ? Math.cos(Math.PI * h.t / E) : h.t > h.life - E ? Math.cos(Math.PI * (h.life - h.t) / E) : -1;
    const c: C2 = f.c;
    c.fillStyle = '#05060a'; c.fillRect(0, 0, this.W, this.H);
    c.save(); c.translate(0, this.H / 2); c.scale(1, Math.abs(v) < 0.03 ? 0.03 * Math.sign(v || 1) : v); c.translate(0, -this.H / 2);
    f.flipped = 1;
  },
  flipEnd(f: any) {
    if (!f.flipped) return;
    const c: C2 = f.c; c.restore(); f.flipped = 0;
    c.save(); c.globalAlpha = 0.18; c.fillStyle = GLOW;                       // 되감기 결 — 옅은 푸른 막 · 가로 줄
    c.fillRect(0, 0, this.W, this.H); c.globalAlpha = 0.25;
    for (let y = ((this.time || 0) * 400) % 24; y < this.H; y += 24) c.fillRect(0, y, this.W, 2);
    c.restore();
  },
};
mixin(Game.prototype, BossRestorerArt, true);

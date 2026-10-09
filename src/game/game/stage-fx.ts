/* ===== game/stage-fx.js — 스킬 무대 연출 — 화면 섬광 · 시전자 둘레만 남기는 어둠 · 집중선 · 몸을 도는 빛 · 칼 자국 · 베인 자국 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { SKILL_STAGE } from '../data/values.js';
import { Sprites } from '../sprites.js';
import { Game } from '../game.js';

/* 근접 연타 자국 차례 — 같은 그림이 되풀이되면 손맛이 죽는다. 넷째 타는 무거운 마무리 */
const SWIPE_SEQ = ['swipe0', 'swipe2', 'swipe1', 'swipe3'];
const CUT_ART = ['cut0', 'cut2', 'cut0', 'cut1'];

export const StageFxPart: Bag = {

  /** 스킬 시전 순간의 무대 — SKILL_STAGE[id] 를 화면 · 시전자 둘레에 편다. who: 시전자(없으면 이 화면 플레이어) */
  stageFx(id: string, who?: any) {
    const S = SKILL_STAGE[id], p = who || this.me; if (!S || !p) return;
    const fs = this.fxScale(), st = this.stage || (this.stage = { fl: null, dim: null, ln: null });
    const at = () => (p.dead ? null : [p.cx, p.cy] as [number, number]);
    if (fs > 0 && p === this.me) {               // 화면을 덮는 것은 내 시전만 — 남의 스킬이 내 화면을 가리지 않게
      if (S.fl) st.fl = { rgb: S.fl[0], a: S.fl[1] * fs, t: S.fl[2], max: S.fl[2] };
      if (S.dim) st.dim = { a: S.dim[0] * fs, t: S.dim[1], max: S.dim[1], p };
      if (S.ln) st.ln = { rgb: S.ln[0], t: S.ln[1], max: S.ln[1], n: S.ln[2], p, seed: 0, dir: S.ln[3] ? (p.facing > 0 ? 0 : Math.PI) : null };
      if (S.edge) this.edgeFx(S.edge[0], S.edge[1]);
    }
    const v = this.vfx;
    if (S.ob) v.orbit(at, S.ob[2], S.ob[1], S.ob[0], S.ob[3], 7, 5.5, 0.38);
    if (S.cv) v.converge(p.cx, p.cy - 2, 70, 14, S.cv, 0.28);
    if (S.lens) v.mark(p.cx + p.facing * 14, p.cy - 4, 170, 14, 0, S.lens, 0.28, 'lens');
  },

  /** 근접 휘두르기 자국 — 연타 차례에 따라 자국 그림을 바꾸고, 올려 베기 · 내려 베기를 번갈아 뒤집는다 */
  swingFx(p: any) {
    const n = p.combo || 0;
    const col = p.d.fire ? '#ffb070' : p.d.frost ? '#bfefff' : p.d.poison ? '#bff07a' : '#fff2c8';
    const sweep = p.swingDir * (p.swingSide || 1);      // 무기 그림이 도는 쪽(+ = 각이 줄어든다 · 올려 벤다)
    const ang = p.swingAng + (Math.random() - 0.5) * 0.25, heavy = n % 4 === 3;
    this.vfx.swipe(p.cx, p.cy - 2, p.swingReach * (heavy ? 0.95 : 0.82) * (0.94 + Math.random() * 0.12), ang, -sweep, col, heavy ? 0.26 : 0.2, SWIPE_SEQ[n % 4]);
    if (heavy) {                                         // 마무리 — 칼끝으로 튀는 불티 한 줌
      this.vfx.sparks(p.cx + Math.cos(ang) * p.swingReach * 0.8, p.cy + Math.sin(ang) * p.swingReach * 0.8, 6, col, 420, ang, 1.2, 0.22, 300);
    }
  },

  /** 맞은 자리의 베인 자국 — 휘두르는 방향(둘레의 접선)으로 눕히고, 갈래를 섞는다(치명은 X 자) */
  cutFx(e: any, p: any, crit: boolean, fam: string | null) {
    if (fam !== 'slash') { this.vfx.flare(e.cx, e.cy - 2, crit ? 44 : 30, '#fff0d0', 0.16, 'impact'); return; }   // 둔기 · 찌르기는 베인 자국 대신 충격 별
    const dx = e.cx - p.cx, dy = e.cy - p.cy, sweep = p.swingDir * (p.swingSide || 1);
    const ang = Math.atan2(dy, dx) - sweep * Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const art = crit ? 'cut1' : CUT_ART[((p.combo || 0) + (Math.random() * 2 | 0)) % 4], s = crit ? 62 : 46;
    this.vfx.mark(e.cx + (Math.random() - 0.5) * 8, e.cy - 2 + (Math.random() - 0.5) * 8, s, s, ang, crit ? '#ffe08a' : '#fff6e0', 0.22, art);
  },

  /** 무대 — 어둠 깔기(빛 다음 · 연출 앞 — 스킬 빛은 어둠 위에서 빛난다) */
  drawStageDim(f: any) {
    const st = this.stage, d = st && st.dim; if (!d) return;
    d.t -= 1 / 60; if (d.t <= 0) { st.dim = null; return; }
    const { c, camX, camY } = f, k = d.t / d.max, a = d.a * Math.min(1, (1 - k) * 8, k * 2.5);
    const x = d.p.cx - camX, y = d.p.cy - camY, R = Math.max(this.W, this.H);
    const g = c.createRadialGradient(x, y, 90, x, y, R * 0.75);
    g.addColorStop(0, 'rgba(6,4,10,0)'); g.addColorStop(0.35, 'rgba(6,4,10,.75)'); g.addColorStop(1, 'rgba(6,4,10,1)');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, 0, this.W, this.H); c.globalAlpha = 1;
  },

  /** 무대 — 집중선 · 화면 섬광(화면 맨 위 · UI 아래) */
  drawStage(f: any) {
    const st = this.stage; if (!st) return;
    const { c, camX, camY } = f, W = this.W, H = this.H;
    if (st.ln) {
      const L = st.ln; L.t -= 1 / 60;
      if (L.t <= 0) st.ln = null;
      else {
        const k = L.t / L.max, x = L.p.cx - camX, y = L.p.cy - camY, R = Math.hypot(W, H) * 0.6, im = Sprites.vfxArt('spark', `rgb(${L.rgb})`);
        if (Math.floor(this.time * 30) !== L.f) L.f = Math.floor(this.time * 30), L.seed = (Math.random() * 1e6) | 0;      // 두 장마다 선을 새로 뽑아 일렁인다
        let s = L.seed;
        const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
        c.save(); c.globalCompositeOperation = 'lighter';
        if (L.dir !== null) {                         // 달리는 스킬 — 집중선 대신 움직임과 나란한 속도선(뒤로 흘러간다)
          for (let i = 0; i < L.n; i++) {
            const off = (rnd() - 0.5) * H * 1.1, along = (rnd() - 0.5) * W * 1.2, len = 80 + rnd() * 220, wdt = 1 + rnd() * 2.5;
            if (Math.abs(off) < 40) continue;            // 몸 앞뒤 줄은 비운다
            c.globalAlpha = Math.min(1, k * 2.2) * (0.2 + rnd() * 0.35);
            c.save(); c.translate(x + Math.cos(L.dir) * along - Math.sin(L.dir) * off, y + Math.sin(L.dir) * along + Math.cos(L.dir) * off); c.rotate(L.dir + Math.PI);
            if (im) c.drawImage(im, -len, -wdt / 2, len, wdt * 1.6);
            c.restore();
          }
          c.restore();
          return this.drawStageFlash(c, W, H);
        }
        for (let i = 0; i < L.n; i++) {
          const a = rnd() * TAU, r0 = R * (0.42 + rnd() * 0.25) * (0.9 + 0.1 * k), len = R * (0.25 + rnd() * 0.35), wdt = 1.5 + rnd() * 3;
          c.globalAlpha = Math.min(1, k * 2.2) * (0.25 + rnd() * 0.35);
          c.save(); c.translate(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.rotate(a + Math.PI);   // 머리가 시전자 쪽
          if (im) c.drawImage(im, -len, -wdt / 2, len, wdt * 1.6);
          else { c.strokeStyle = `rgb(${L.rgb})`; c.lineWidth = wdt * 0.5; c.beginPath(); c.moveTo(-len, 0); c.lineTo(0, 0); c.stroke(); }
          c.restore();
        }
        c.restore();
      }
    }
    this.drawStageFlash(c, W, H);
  },
  drawStageFlash(c: CanvasRenderingContext2D, W: number, H: number) {
    const st = this.stage, F = st && st.fl; if (!F) return;
    F.t -= 1 / 60;
    if (F.t <= 0) { st.fl = null; return; }
    const k = F.t / F.max;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = F.a * k * k;
    c.fillStyle = `rgb(${F.rgb})`; c.fillRect(0, 0, W, H); c.restore();
  },
};

mixin(Game.prototype, StageFxPart, true);

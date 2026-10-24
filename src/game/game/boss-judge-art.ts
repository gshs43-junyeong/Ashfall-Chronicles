/* ===== game/boss-judge-art.ts — 판결석 좌상의 그림 — 벽감의 몸 · 움직이는 머리 · 증언 석판(인물 뒤) · 저울 팔과 몸짓 손(인물 앞) · 눈 · 가슴 문장 · 광선(빛 뒤) ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { JD, eyeStage, jdAt, verdictTilt } from '../entity/boss-judge.js';
import { Game } from '../game.js';
import { bodyCrack, groundZone, hzGlow, rgba } from './boss-hazard-art.js';
/* ★ 몸 · 머리 · 석판은 objects 단계(인물 뒤 — 플레이어가 그 앞을 지난다), 팔 · 저울은 drawBossLit(인물 앞 · 빛 앞), 눈 · 문장 · 광선은 fx(빛 뒤).
   멈춘 석상으로 보이지 않게(사용자) 머리는 늘 플레이어를 보고 숨에 맞춰 오르내리며, 저울 접시는 줄에 매달려 흔들리고, 빈손은 쉬지 않고 몸짓한다. */

type C2 = CanvasRenderingContext2D;
const BW = 384, BH = 448, PW = 160, PH = 176, RUNE = '#fff0b0', GILT = '#d8b04a';

function hzOf(g: Bag, e: Enemy, k: string) {
  for (const h of g.bhz || []) if (h.k === k && g.hzBoss(h) === e) return h;
  return null;
}
const isJd = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_judge';
const sm = (u: number) => { const v = u < 0 ? 0 : u > 1 ? 1 : u; return v * v * (3 - 2 * v); };
function stepDt(g: Bag, e: Bag, key: string) {
  const T = g.time || 0, dt = g.paused ? 0 : Math.max(0, Math.min(0.1, T - (e[key] ?? T)));
  e[key] = T; return dt;
}
const ease = (cur: number, to: number, dt: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));
function elbow(sx: number, sy: number, hx: number, hy: number, s: number): [number, number] {
  const L1 = JD.L1, L2 = JD.L2, dx = hx - sx, dy = hy - sy;
  const d = Math.max(20, Math.min(L1 + L2 - 2, Math.hypot(dx, dy))), a = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const c1: [number, number] = [sx + Math.cos(a - al) * L1, sy + Math.sin(a - al) * L1];
  const c2: [number, number] = [sx + Math.cos(a + al) * L1, sy + Math.sin(a + al) * L1];
  return (c1[0] - sx) * s + (sy - c1[1]) * 0.3 > (c2[0] - sx) * s + (sy - c2[1]) * 0.3 ? c1 : c2;
}
/** 소매 한 마디 — 조각(가로로 누운 소매 · 설계 8→32칸)을 관절에서 다음 관절로 */
function seg(c: C2, im: HTMLImageElement, fr: number, x0: number, y0: number, x1: number, y1: number) {
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), k = L / 96;
  c.save(); c.translate(x0, y0); c.rotate(a);
  if (Math.cos(a) < 0) c.scale(1, -1);
  c.drawImage(im, fr * PW, 0, PW, PH, -32 * k, -88, PW * k, PH);
  c.restore();
}
/** 손 — 손목(설계 8, 22)을 (x, y) 에 두고 손끝이 a 쪽 */
function hand(c: C2, im: HTMLImageElement, fr: number, x: number, y: number, a: number) {
  c.save(); c.translate(x, y); c.rotate(a); if (Math.cos(a) < 0) c.scale(1, -1);
  c.drawImage(im, fr * PW, 0, PW, PH, -32, -88, PW, PH); c.restore();
}

/** 머리의 자세 [기울기, 옆 · 아래로 민 px] — 늘 누군가를 보고, 기술마다 다르게 움직인다 */
function headGoal(g: Bag, e: Enemy, T: number): [number, number, number] {
  const q = g.hzNear(e.cx, e.cy), look = q ? Math.max(-1, Math.min(1, (q.cx - e.cx) / 520)) : 0;
  let a = look * 0.12 + Math.sin(T * 0.9) * 0.03, dx = look * 8, dy = Math.sin(T * 1.7) * 2.5;
  const v = hzOf(g, e, 'jverdict'), ey = hzOf(g, e, 'jeye'), gv = hzOf(g, e, 'jgavel'), tb = hzOf(g, e, 'jtab');
  if (v && !v.doom) { const t = verdictTilt(v); a = t * 0.1 + Math.sin(T * 2.2) * 0.02; dy += 7; dx = t * 6; }        // 고개를 숙이고 저울을 본다
  else if (v && v.doom) { const u = v.t - v.tele; a = v.doom * 0.16 * Math.max(0, 1 - u * 0.8); dy -= 8 * Math.max(0, 1 - u); }   // 판결 — 고개를 쳐든다
  if (ey) { const l = Math.max(-1, Math.min(1, (ey.lx - e.cx) / 360)); a = l * 0.26; dx = l * 12; dy += Math.max(-6, Math.min(8, (ey.ly - e.cy) / 60)); }
  if (gv && gv.t < gv.tele + 0.6) { const s = gv.s; a = s * 0.2; dx = s * 10; dy += 6; }
  if (tb && tb.t < tb.tele) dy -= 5;
  if (e.gapT > 0 && e.gapK === 'stagger') { a = Math.sin(T * 3) * 0.16; dy += 12; }
  return [a, dx, dy];
}
/** 빈손(오른쪽)의 자리와 손 모양 [x, y(몸 기준 px), 손 장, 손끝 각(없으면 아래팔 방향)] */
function freeGoal(g: Bag, e: Enemy, T: number): [number, number, number, number | null] {
  const s = 1, [rx, ry] = jdAt({ cx: 0, cy: 0 }, 48 + 17, 64);
  const u = (T % 7.5) / 7.5;
  let x = rx + Math.sin(T * 1.3) * 3, y = ry + Math.sin(T * 1.7) * 3, fr = 5, ang: number | null = 0.25;
  if (u > 0.55 && u < 0.75) { const k = Math.sin((u - 0.55) / 0.2 * Math.PI); const [ax, ay] = jdAt({ cx: 0, cy: 0 }, 48 + 38, 40); x += (ax - x) * k; y += (ay - y) * k; ang = -1.2 * k + 0.25 * (1 - k); }   // 이따금 손바닥을 들어 '조용히'
  const ey = hzOf(g, e, 'jeye'), tb = hzOf(g, e, 'jtab'), sen = hzOf(g, e, 'jverdict');
  if (ey) {                                                          // 겨눈 자리를 가리킨다
    const [sx, sy] = jdAt({ cx: 0, cy: 0 }, 48 + s * JD.SH, JD.SH_Y), dxl = ey.lx - e.cx - sx, dyl = ey.ly - e.cy - sy, d = Math.hypot(dxl, dyl) || 1, r = JD.L1 + JD.L2 - 30;
    x = sx + dxl / d * r; y = sy + dyl / d * r; fr = 6; ang = Math.atan2(dyl, dxl);
  } else if (tb && tb.t < tb.tele + 0.4) { const [ax, ay] = jdAt({ cx: 0, cy: 0 }, 48 + 30, 14); x = ax; y = ay + Math.sin(T * 9) * 3; fr = 5; ang = -1.45; }   // 손바닥을 하늘로 — 석판을 부른다
  else if (sen && sen.fixed) { const [ax, ay] = jdAt({ cx: 0, cy: 0 }, 48 + 34, 22); x = ax; y = ay; fr = 7; ang = -1.3; }   // 선고 — 주먹을 치켜든다
  if (e.gapT > 0 && e.gapK === 'stagger') { y += 18; ang = 1.2; }
  return [x, y, fr, ang];
}

export const BossJudgeArt: Bag = {
  /** 몸 · 머리 · 석판(objects 단계) */
  drawJudgeBody(f: any) {
    const c: C2 = f.c, im = Sprites.want('first_keeper'), pim = Sprites.want('first_keeper_parts'), T = this.time || 0;
    for (const e of this.ents) {
      if (!isJd(e)) continue;
      if (!this.paused) this.judgeAmbient(e);
      if (pim) for (const h of this.bhz || []) if (h.k === 'jtab' && this.hzBoss(h) === e) this.drawTablet(c, pim, h, f.camX, f.camY);
      if (!im) continue;
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), v = hzOf(this, e, 'jverdict');
      const fr = st * 2 + ((T % 2.4) < 1.2 ? 0 : 1);
      const [x0, y0] = jdAt(e, 0, 0), x = x0 - f.camX, y = y0 - f.camY;
      c.save();
      const w = this.world, tx0 = Math.floor(x0 / TS), ty0 = Math.floor(y0 / TS);   // 방이 좁으면 벽에 묻힌다 — 빈 칸에만
      c.beginPath();
      for (let ty = ty0; ty <= ty0 + Math.ceil(BH / TS); ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(BW / TS); tx++)
        if (!w.solid(tx, ty)) c.rect(tx * TS - f.camX, ty * TS - f.camY, TS, TS);
      c.clip();
      c.imageSmoothingEnabled = false;
      const breath = Math.sin(T * 1.7) * 0.005, quake = v && v.doom && v.t - v.tele < 0.3 ? (Math.random() - 0.5) * 4 : 0;
      c.drawImage(im, fr * BW, 0, BW, BH, x + quake - BW * breath / 2, y - BH * breath, BW * (1 + breath), BH * (1 + breath));
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, x, y, BW, BH); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      /* 머리 — 목 축(설계 48, 34) 둘레로 돈다 */
      if (pim) {
        const dt = stepDt(this, e, 'jdT0'), [ga, gdx, gdy] = headGoal(this, e, T), H = e.jdHd || (e.jdHd = { a: 0, dx: 0, dy: 0 });
        H.a = ease(H.a, ga, dt, 5); H.dx = ease(H.dx, gdx, dt, 5); H.dy = ease(H.dy, gdy, dt, 7);
        const [nx, ny] = jdAt(e, JD.NECK[0], JD.NECK[1]), hx = nx + H.dx, hy = ny + H.dy;
        c.save(); c.translate(hx - f.camX, hy - f.camY + Math.sin(T * 1.7) * BH * breath * 0.5); c.rotate(H.a);
        c.drawImage(pim, st * PW, 0, PW, PH, -80, -136, PW, PH);
        if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(pim, st * PW, 0, PW, PH, -80, -136, PW, PH); }
        c.restore();
        const ca = Math.cos(H.a), sa = Math.sin(H.a), at = (ox: number, oy: number): [number, number] => [hx + ox * ca - oy * sa, hy + ox * sa + oy * ca];
        e.jdHead = at(0, -56); e.jdEye = at(0, -62); e.jdEyes = st < 2 ? [at(-16, -62), at(16, -62)] : [at(0, -62)];
      }
      c.restore();
    }
  },
  /** 증언 석판 — 위에서 떨어져 바닥에 꽂힌다 · 막은 광선만큼 금이 간다 · 끝에 무너진다 */
  drawTablet(c: C2, pim: HTMLImageElement, h: Bag, cx0: number, cy0: number) {
    const fall = h.t < h.tele ? 1 - (h.t / h.tele) ** 2 : 0, a = Math.min(1, (h.life - h.t) / 0.4, h.t * 6);
    const x = h.x - cx0, y = h.fy - cy0 - fall * 520 + (h.t > h.tele && h.t < h.tele + 0.15 ? 3 : 0);
    c.save(); c.globalAlpha = a; c.imageSmoothingEnabled = false;
    c.translate(x, y); if (fall > 0) c.rotate(Math.sin(h.sd + h.t * 9) * 0.08 * fall);
    c.drawImage(pim, 10 * PW, 0, PW, PH, -80, -164, PW, PH);
    if (h.cr) {                                                       // 막은 광선 자국 — 금
      for (let i = 0; i < Math.min(4, h.cr); i++) { const ox = ((h.sd * (i + 3)) % 30) - 15, oy = -40 - ((h.sd * (i + 7)) % 80); bodyCrack(c, Math.floor(h.sd * 10) + i, ox, oy, 1.1 + (i % 2) * 0.9, 30, 'rgba(40,30,20,.85)', 2.2); }
    }
    c.restore();
  },
  /** 팔 · 저울(actors 단계 · drawBossLit) — 왼손은 저울을 들고, 오른손은 몸짓 */
  drawJudgeArms(c: C2) {
    const im = Sprites.want('first_keeper_parts'); if (!im) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, T = this.time || 0;
    for (const e of this.ents) {
      if (!isJd(e)) continue;
      const A = e.jdArm || (e.jdArm = { sx: 0, sy: 0, fx: 0, fy: 0, tilt: 0, p: [0, 0], pv: [0, 0], fa: 0.25 }), dt = stepDt(this, A, 't');
      c.save(); c.translate(-cx0, -cy0); c.imageSmoothingEnabled = false;
      /* 저울 팔 — 들어 올린 손에 저울대가 매달린다. 판결 중엔 더 높이 들고 떤다 */
      const v = hzOf(this, e, 'jverdict');
      const [ssx, ssy] = jdAt(e, 48 - JD.SH, JD.SH_Y);
      let [gx, gy] = jdAt({ cx: 0, cy: 0 }, 48 - 47, 34);                 // 몸 옆으로 들어 얼굴을 가리지 않게 gy += Math.sin(T * 1.7) * 4; gx += Math.sin(T * 0.8) * 3;
      if (v && !v.doom) { gy -= 16; gx += Math.sin(T * 24) * 1.5; }
      if (v && v.doom && v.t - v.tele < 0.25) gy += 10;
      if (e.gapT > 0 && e.gapK === 'stagger') gy += 26;
      A.sx = ease(A.sx || gx, gx, dt, 4); A.sy = ease(A.sy || gy, gy, dt, 4);
      const hx = e.cx + A.sx, hy = e.cy + A.sy, [ex, ey] = elbow(ssx, ssy, hx, hy, -1);
      seg(c, im, 3, ssx, ssy, ex, ey); seg(c, im, 4, ex, ey, hx, hy);
      /* 저울대 기울기 — 판결 중엔 무게를 따르고, 쉴 땐 가까운 쪽으로 슬쩍 */
      const q = this.hzNear(e.cx, e.cy), lean = q ? Math.max(-1, Math.min(1, (q.cx - e.cx) / 700)) * 0.25 : 0;
      const tgt = v ? verdictTilt(v) : lean + Math.sin(T * 0.7) * 0.08, old = A.tilt;
      A.tilt = ease(A.tilt, tgt, dt, v && v.doom ? 14 : 3);
      const ang = A.tilt * 0.36, dang = dt > 0 ? (A.tilt - old) * 0.36 / dt : 0;
      const bx = hx, by = hy + 36, half = 17 * 4 * 0.95;                 // 저울대 갈고리(설계 ±17)
      c.strokeStyle = GILT; c.lineWidth = 3; c.beginPath(); c.moveTo(hx, hy + 6); c.lineTo(bx, by); c.stroke();
      c.save(); c.translate(bx, by); c.rotate(ang); c.drawImage(im, 8 * PW, 0, PW, PH, -80 * 0.95, -88 * 0.95, PW * 0.95, PH * 0.95); c.restore();
      /* 접시 — 줄에 매달려 흔들리는 진자(저울대가 흔들리면 같이 출렁인다) */
      for (const k of [0, 1]) {
        const sd = k ? 1 : -1, endX = bx + Math.cos(ang) * half * sd, endY = by + Math.sin(ang) * half * sd + 4;
        A.pv[k] += (-A.p[k] * 18 - A.pv[k] * 1.6 - dang * 6) * dt; A.p[k] += A.pv[k] * dt;
        const th = A.p[k] + Math.sin(T * 1.9 + k * 1.3) * 0.04, L = 64, px = endX + Math.sin(th) * L, py = endY + Math.cos(th) * L;
        c.strokeStyle = 'rgba(216,176,74,.9)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(endX, endY); c.lineTo(px - 17, py - 3); c.moveTo(endX, endY); c.lineTo(px + 17, py - 3); c.moveTo(endX, endY); c.lineTo(px, py - 4); c.stroke();
        c.save(); c.translate(px, py); c.rotate(th * 0.6); c.drawImage(im, 9 * PW, 0, PW, PH, -80 * 0.7, -84 * 0.7, PW * 0.7, PH * 0.7); c.restore();
        if (v && v.doom === sd) { c.save(); c.globalCompositeOperation = 'lighter'; hzGlow(c, px, py, 28, '#ffb060', 0.4 * Math.min(1, v.t - v.tele + 0.3)); c.restore(); }
      }
      hand(c, im, 7, hx, hy, -Math.PI / 2 - 0.2);
      /* 빈손 — 쉴 땐 무릎 위, 이따금 손바닥을 든다 · 가리킨다 · 내리친다 */
      const gv = hzOf(this, e, 'jgavel'), [fsx, fsy] = jdAt(e, 48 + JD.SH, JD.SH_Y);
      let fx: number, fy: number, fr: number, fa: number | null;
      if (gv) {
        const up: [number, number] = [gv.tx, gv.fy - 300], hit: [number, number] = [gv.tx, gv.fy - 26], rest: [number, number] = jdAt(e, 48 + 17, 64);
        if (gv.t < gv.tele) { const k = sm(gv.t / gv.tele); fx = rest[0] + (up[0] - rest[0]) * k; fy = rest[1] + (up[1] - rest[1]) * k; }
        else if (gv.t < gv.tele + 0.12) { const k = ((gv.t - gv.tele) / 0.12) ** 2; fx = up[0] + (hit[0] - up[0]) * k; fy = up[1] + (hit[1] - up[1]) * k; }
        else if (gv.t < gv.tele + 0.7) { fx = hit[0]; fy = hit[1]; }
        else { const k = sm((gv.t - gv.tele - 0.7) / 0.55); fx = hit[0] + (rest[0] - hit[0]) * k; fy = hit[1] + (rest[1] - hit[1]) * k; }
        A.fx = fx - e.cx; A.fy = fy - e.cy; fr = 5; fa = gv.t < gv.tele + 0.7 ? Math.PI / 2 : null;
      } else {
        const [gx2, gy2, fr2, a2] = freeGoal(this, e, T);
        A.fx = ease(A.fx || gx2, gx2, dt, 4.5); A.fy = ease(A.fy || gy2, gy2, dt, 4.5);
        fx = e.cx + A.fx; fy = e.cy + A.fy; fr = fr2; fa = a2;
      }
      const [fex, fey] = elbow(fsx, fsy, fx, fy, 1);
      seg(c, im, 3, fsx, fsy, fex, fey); seg(c, im, 4, fex, fey, fx, fy);
      const fang = fa ?? Math.atan2(fy - fey, fx - fex);
      A.fa = ease(A.fa, fang, dt, 8);
      hand(c, im, fr, fx, fy, A.fa);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.35, e.flash * 3); hand(c, im, fr, fx, fy, A.fa); hand(c, im, 7, hx, hy, -Math.PI / 2 - 0.2); }
      c.restore();
    }
  },
  /** 빛(fx 단계) — 눈 · 가슴 문장 · 단죄의 눈 겨눔과 광선 · 석판의 룬 */
  drawJudgeGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isJd(e)) continue;
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), v = hzOf(this, e, 'jverdict'), ey = hzOf(this, e, 'jeye');
      const blink = ((T + e.cx * 0.01) % 5.1) < 0.12 ? 0.1 : 1;
      for (const [x, y] of e.jdEyes || []) hzGlow(c, x - f.camX, y - f.camY, st >= 2 ? 26 : 12, RUNE, (st >= 2 ? 0.6 : 0.3) * blink * (ey ? 1.6 : 1));
      const [chx, chy] = jdAt(e, 48, 51), beat = v ? 0.5 + 0.5 * Math.sin(T * 9) : 0.5 + 0.5 * Math.sin(T * 1.7);
      hzGlow(c, chx - f.camX, chy - f.camY, 40 + beat * 14, RUNE, 0.18 + 0.2 * beat);
      for (const h of this.bhz || []) if (h.k === 'jtab' && this.hzBoss(h) === e && h.t >= h.tele) hzGlow(c, h.x - f.camX, h.fy - 72 - f.camY, 34, RUNE, 0.2 + 0.08 * Math.sin(T * 3 + h.sd));
      if (ey) {
        const [i, sg, u] = eyeStage(ey), [ex, eyy] = e.jdEye || jdAt(e, 48, JD.EYE_Y);
        const lx = ey.lx - f.camX, ly = ey.ly - f.camY;
        if (sg <= 1) {                                               // 겨눔 — 쫓는 동안 돌고, 멈추면 조이며 붉어진다
          const r = sg === 0 ? 46 - 10 * u : 36 - 18 * u, col = sg === 0 ? RUNE : '#ff8a5a';
          c.save(); c.translate(lx, ly); c.rotate(T * (sg === 0 ? 2 : 6)); c.strokeStyle = rgba(col, 0.85); c.lineWidth = 2;
          for (let k = 0; k < 4; k++) { c.rotate(TAU / 4); c.beginPath(); c.arc(0, 0, r, -0.4, 0.4); c.stroke(); c.beginPath(); c.moveTo(r + 4, 0); c.lineTo(r + 12, 0); c.stroke(); }
          c.restore();
          c.save(); c.globalAlpha = sg === 0 ? 0.18 : 0.35 + 0.3 * u; c.strokeStyle = col; c.setLineDash([8, 8]); c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(ex - f.camX, eyy - f.camY); c.lineTo(lx, ly); c.stroke(); c.setLineDash([]); c.restore();
          hzGlow(c, ex - f.camX, eyy - f.camY, 30 + 30 * (sg === 1 ? u : 0), RUNE, 0.5);
        } else if (sg === 2 && ey.fk === i && ey.bx !== undefined) {  // 광선 — 눈에서 끝(바닥 · 석판)까지
          const a = 1 - u, x1 = ey.bx - f.camX, y1 = ey.by - f.camY, x0 = ex - f.camX, y0 = eyy - f.camY;
          c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
          c.strokeStyle = `rgba(255,200,120,${0.35 * a})`; c.lineWidth = 26; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
          c.strokeStyle = `rgba(255,240,190,${0.8 * a})`; c.lineWidth = 9; c.stroke();
          c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 3; c.stroke(); c.restore();
          hzGlow(c, x1, y1, 50, '#ffd890', 0.7 * a);
        }
      }
    }
  },
  /** 기술 예고(fx · drawSig 에서) — 판결이 내릴 절반 · 석판이 떨어질 자리 · 손이 칠 자리 */
  judgeTell(c: C2, h: Bag, cx0: number, cy0: number) {
    const T = this.time || 0;
    switch (h.k) {
      case 'jeye': return true;
      case 'jverdict': {                                             // 저울이 기운 만큼 그쪽 바닥이 달아오르고, 판결 뒤엔 그 절반이 다 탄다
        const t = verdictTilt(h), fy = h.fy - cy0, x = h.x - cx0, w = h.half / 2;
        if (!h.doom) for (const s of [-1, 1]) { const k = Math.max(0, t * s); if (k > 0.05) groundZone(c, x + s * w, fy, w, h.c, k * 0.7, T); }
        else if (h.t < h.tele + h.gap + 0.4) {
          const k = Math.min(1, (h.t - h.tele) / h.gap);
          groundZone(c, x + h.doom * w, fy, w, '#ffb060', 0.6 + 0.4 * k, T);
          c.save(); c.globalAlpha = 0.18 * (1 - k * 0.5); c.fillStyle = '#ffd890'; c.fillRect(h.doom > 0 ? x : x - h.half, fy - 320, h.half, 320); c.restore();
        }
      } return true;
      case 'jtab': if (h.t < h.tele) { const k = h.t / h.tele; groundZone(c, h.x - cx0, h.fy - cy0, 40, h.c, k, T); c.save(); c.globalAlpha = 0.35 * k; c.fillStyle = '#000'; c.beginPath(); c.ellipse(h.x - cx0, h.fy - cy0 - 2, 34 * k, 6, 0, 0, TAU); c.fill(); c.restore(); } return true;
      case 'jgavel': if (h.t < h.tele + 0.14) groundZone(c, h.tx - cx0, h.fy - cy0, 80, h.c, Math.min(1, h.t / h.tele), T); return true;
    }
    return false;
  },
};
mixin(Game.prototype, BossJudgeArt, true);

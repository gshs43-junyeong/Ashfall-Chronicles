/* ===== game/boss-pool-art.ts — 잿물 군체의 그림 — 웅덩이 · 몸에서 돋는 팔 · 잿물 기둥(범람) ===== */
import { TAU } from '../../engine/core/math.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { poolHalf } from '../entity/boss-pool.js';
import { STRIKE_ART, glob, hs } from './boss-hazard-art.js';
/* ★ 팔 · 기둥은 빛 단계 **앞**(actors)에서 칠한다(boss-hazards `drawBossLit`) — fx 단계에 두면 어둠을 안 받아 몸만 어둡고
   팔은 밝고 납작하게 떠 '꺼진 그림'처럼 보였다. 예고 그림자만 fx 에 남긴다(어두워도 보여야 피한다).
   재질은 몸과 같은 붓으로 구운 결(조각 시트 6번)을 무늬로 깔고, 원통 명암 · 박힌 잡동사니를 그 위에 얹는다. 사연: docs/code-history.md#h213 */

type C2 = CanvasRenderingContext2D;
type P = [number, number];
const SL = '#4a4541', SL_D = '#2f2b29', SL_L = '#7a716a', EMB = '#ff8a40';
const PART = 120, SWATCH = 6, JUNK = [7, 8, 9];
const clamp01 = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;
const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
const smooth = (u: number) => u * u * (3 - 2 * u);

/** 잿물 결 무늬 — 캔버스마다 하나(무늬는 만든 문맥에 묶인다) */
const pats = new WeakMap<C2, { src: any; pat: CanvasPattern | null }>();
function sludgePat(c: C2) {
  const im = Sprites.want('king_slime_parts'); if (!im) return null;
  const got = pats.get(c);
  if (got && got.src === im) return got.pat;
  const cv = document.createElement('canvas'); cv.width = cv.height = PART;
  cv.getContext('2d')!.drawImage(im, SWATCH * PART, 0, PART, PART, 0, 0, PART, PART);
  const pat = c.createPattern(cv, 'repeat');
  pats.set(c, { src: im, pat });
  return pat;
}
/** 조각 한 장을 가운데 맞춰 · 돌려 그린다 */
function part(c: C2, im: HTMLImageElement | null, fr: number, x: number, y: number, size: number, a: number, flipY = false, sy = 1) {
  if (!im) { glob(c, x, y, size * 0.36, SL, SL_D); return; }
  c.save(); c.translate(x, y); c.rotate(a); c.scale(1, (flipY ? -1 : 1) * sy);
  c.drawImage(im, fr * PART, 0, PART, PART, -size / 2, -size / 2, size, size);
  c.restore();
}

/** 웅덩이 — 발밑 바닥을 칸마다 따라 깔린다. 두께는 렌즈꼴(가운데 두껍고 끝이 둥글게 얇아진다) · 턱이 높으면 거기서 끝난다 */
export function drawPool(c: C2, e: Enemy, sx: number, sy: number, T: number, world: World) {
  if (e.dead) return;
  const half = poolHalf(e), feet = e.y + e.h, ox = sx - e.x, oy = sy - e.y;
  const floorAt = (x: number) => {
    const tx = Math.floor(x / TS), t0 = Math.floor((feet - 2) / TS) - 2;
    for (let ty = t0; ty < t0 + 6; ty++) if (world.solid(tx, ty) && !world.solid(tx, ty - 1)) return ty * TS;
    return null;
  };
  /* 양쪽으로 어디까지 깔리나 — 바닥이 끊기거나 한 칸 넘게 튀면 멈춘다 */
  const side = (s: number) => {
    const out: P[] = []; let prev = floorAt(e.cx);
    if (prev === null) return out;
    for (let d = 0; d <= half; d += 4) {
      const f = floorAt(e.cx + s * d);
      if (f === null || Math.abs(f - prev) > TS * 1.2) break;
      out.push([d, f]); prev = f;
    }
    return out;
  };
  const R = side(1), L = side(-1);
  if (!R.length || !L.length) return;
  const reachR = R[R.length - 1][0] + 4, reachL = L[L.length - 1][0] + 4;
  const thick = (d: number, reach: number) => (6 + 8 * Math.exp(-((d / (e.w * 0.45)) ** 2))) * Math.sqrt(clamp01(1 - (d / reach) ** 2));
  const top: P[] = [], bot: P[] = [];
  for (let i = L.length - 1; i > 0; i--) { const [d, f] = L[i]; top.push([e.cx - d, f - thick(d, reachL) + Math.sin(d * 0.08 + T * 3) * 0.8]); bot.push([e.cx - d, f + 1]); }
  for (const [d, f] of R) { top.push([e.cx + d, f - thick(d, reachR) + Math.sin(d * 0.08 - T * 3) * 0.8]); bot.push([e.cx + d, f + 1]); }
  top.unshift([e.cx - reachL, L[L.length - 1][1]]); top.push([e.cx + reachR, R[R.length - 1][1]]);
  c.save();
  c.translate(ox, oy);
  c.beginPath(); c.moveTo(top[0][0], top[0][1]);
  for (const q of top) c.lineTo(q[0], q[1]);
  for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
  c.closePath();
  const pat = sludgePat(c);
  c.fillStyle = pat || SL; c.fill();
  const g = c.createLinearGradient(0, feet - 16, 0, feet + 2);
  g.addColorStop(0, 'rgba(255,236,210,.06)'); g.addColorStop(1, 'rgba(10,8,8,.45)');
  c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(176,166,156,.55)'; c.lineWidth = 1.5; c.beginPath();      // 젖은 수면 빛
  top.forEach((q, i) => i ? c.lineTo(q[0], q[1] + 0.8) : c.moveTo(q[0], q[1] + 0.8)); c.stroke();
  /* 물결 · 거품 — 수면 높이를 따라 */
  const boil = e.burrowT > 0 ? 3 : 1, all = top;
  for (let i = 0; i < 6 * boil; i++) {
    const per = 1.3 + hs(i, 1) * 1.2, u = ((T + hs(i, 2) * 9) / per) % 1;
    const q = all[Math.floor(hs(i, 3) * (all.length - 2)) + 1]; if (!q) continue;
    const bx = boil > 1 && i % 2 ? e.cx + (hs(i, 6) - 0.5) * 60 : q[0], by = boil > 1 && i % 2 ? feet - 10 : q[1];
    if (u < 0.8) {
      const r = 1.5 + u * (3 + hs(i, 5) * 4) * (boil > 1 ? 1.6 : 1);
      c.fillStyle = SL; c.strokeStyle = SL_L; c.lineWidth = 1;
      c.beginPath(); c.arc(bx, by - r * 0.4, r, Math.PI, TAU); c.fill(); c.stroke();
      c.fillStyle = 'rgba(220,210,200,.55)'; c.fillRect(bx - r * 0.4, by - r * 0.9, 1.5, 1.5);
    } else {
      c.strokeStyle = `rgba(170,160,150,${(1 - u) * 3})`; c.lineWidth = 1;
      c.beginPath(); c.ellipse(bx, by, 4 + (u - 0.8) * 30, 1.6, 0, 0, TAU); c.stroke();
    }
  }
  for (let i = 0; i < 6; i++) {                           // 묻힌 불씨
    const q = all[Math.floor(hs(i, 7) * (all.length - 2)) + 1]; if (!q) continue;
    c.globalAlpha = 0.4 + 0.4 * Math.sin(T * 2 + i); c.fillStyle = EMB; c.fillRect(q[0], q[1] + 3, 2, 2);
  }
  c.restore();
}

/* ---------- 팔 ---------- */
type Pose = [P, P, P];                                    // 베지어 P1 · P2 · P3(P0 은 뿌리)
const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const lerpPose = (a: Pose, b: Pose, k: number): Pose => [lerpP(a[0], b[0], k), lerpP(a[1], b[1], k), lerpP(a[2], b[2], k)];

/** 팔의 모양 — 부풀기 → 밀려 나오며 뒤로 감기 → 채찍처럼 내리침 → 눌려 퍼짐 → 몸으로 빨려 들어감 */
function armShape(h: Bag, b: Enemy | null, T: number) {
  const s0 = Math.sign(h.ox) || 1;
  const rx = b ? b.cx + s0 * b.w * 0.42 : h.x, ry = b ? b.y + b.h - 50 : h.y - 50;   // 뿌리 — 투구 챙 밑 잿물 몸통 옆구리
  const tx = h.tx, ty = h.ty - 8, dir = Math.sign(tx - rx) || s0, D = Math.abs(tx - rx), H = 235;
  const U: Pose = [[rx + s0 * 30, ry - 70], [rx + s0 * 26, ry - H * 0.66], [rx + s0 * 16, ry - H]];
  const W: Pose = [[rx + s0 * 34 - dir * 8, ry - 85], [rx + s0 * 8 - dir * 46, ry - H * 0.95], [rx - dir * 92, ry - H * 0.7]];
  const S: Pose = [[rx + s0 * 28 + dir * 34, ry - 150], [tx - dir * D * 0.3, ty - 110], [tx, ty]];
  const t = h.t, r = t / h.rise;
  let pose: Pose, lam = 1, grow = 1, sq = 0;
  if (t < h.rise) {
    if (r < 0.2) { lam = 0.12 * (r / 0.2); grow = 0.65 + 0.35 * (r / 0.2); pose = U; }
    else {
      const q = (r - 0.2) / 0.8;
      lam = Math.min(1, 0.12 + 0.88 * easeOut(Math.min(1, q / 0.65)));
      pose = lerpPose(U, W, smooth(q));
      if (q > 0.75) { const tr = Math.sin(T * 40 + h.sd) * 2.5; pose = [pose[0], pose[1], [pose[2][0] + tr, pose[2][1] - tr * 0.5]]; }   // 내리치기 직전 떨림
    }
  } else if (t < h.slam) {
    const e = (t - h.rise) / (h.slam - h.rise), w = Math.pow(e, 1.6);
    pose = lerpPose(W, S, w);
    pose[1] = [pose[1][0], pose[1][1] - Math.sin(e * Math.PI) * 90];
  } else {
    const settle = clamp01((t - h.slam) / 0.25);
    sq = 1 - clamp01((t - h.slam) / 0.3);
    pose = [S[0], [S[1][0], S[1][1] + 16 * settle], S[2]];
    const k = clamp01((t - (h.life - h.back)) / h.back);
    if (k > 0) { lam = 1 - Math.pow(k, 1.5) * 0.98; pose = [pose[0], lerpP(pose[1], [rx + dir * 40, ry - 30], k * 0.5), pose[2]]; }
  }
  return { P0: [rx, ry] as P, pose, lam, grow, sq };
}
const bez = (P0: P, [P1, P2, P3]: Pose, u: number): P => {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0], a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1]];
};

let tube: HTMLCanvasElement | null = null;
/** 이어진 굵기 줄(마디마다 굵기가 다른 둥근 선분) — dx · dy 는 굵기에 곱해 옮기는 몫(명암을 한쪽으로 민다) */
function seg(g: C2, pts: P[], rr: number[], dx: number, dy: number, wmul: number, style: string) {
  g.strokeStyle = style; g.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    g.lineWidth = Math.max(1, (rr[i] + rr[i + 1]) * wmul);
    g.beginPath(); g.moveTo(pts[i][0] + dx * rr[i], pts[i][1] + dy * rr[i]); g.lineTo(pts[i + 1][0] + dx * rr[i + 1], pts[i + 1][1] + dy * rr[i + 1]); g.stroke();
  }
}

/** 팔 몸(빛 앞 단계) — 결 무늬 위에 원통 명암(빛은 몸 그림과 같이 왼쪽 위) · 박힌 잡동사니 · 흘러내리는 방울 · 발톱 손 */
export function drawArm(c: C2, h: Bag, b: Enemy | null, cx0: number, cy0: number, T: number) {
  const A = armShape(h, b, T); if (A.lam <= 0.01) return;
  const N = 34, pts: P[] = [], rr: number[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N * A.lam;
    pts.push(bez(A.P0, A.pose, u));
    rr.push(((40 - 24 * u) + 16 * Math.max(0, 1 - u / 0.12)) * A.grow * (1 + Math.sin(u * 10 - T * 5 + h.sd) * 0.06));
  }
  const tip = pts[N], tipR = rr[N];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  pts.forEach((q, i) => { const r = rr[i] + 34; x0 = Math.min(x0, q[0] - r); y0 = Math.min(y0, q[1] - r); x1 = Math.max(x1, q[0] + r); y1 = Math.max(y1, q[1] + r); });
  x0 = Math.floor(x0); y0 = Math.floor(y0);
  const W = Math.ceil(x1 - x0), H = Math.ceil(y1 - y0);
  if (!tube) tube = document.createElement('canvas');
  if (tube.width < W || tube.height < H) { tube.width = Math.max(tube.width, W); tube.height = Math.max(tube.height, H); }
  const o = tube.getContext('2d')!;
  o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H); o.translate(-x0, -y0);
  /* 실루엣 — 몸통 옆구리에 붙는 뿌리 덩이 · 내리친 자리에 눌려 퍼진 끝 */
  o.globalCompositeOperation = 'source-over';
  seg(o, pts, rr, 0, 0, 1, SL);
  o.fillStyle = SL;
  o.beginPath(); o.ellipse(A.P0[0], A.P0[1] + 8, rr[0] + 14, rr[0] * 0.85, 0, 0, TAU); o.fill();
  const splat = A.lam > 0.97 && h.t >= h.slam;
  if (splat) { o.beginPath(); o.ellipse(tip[0], tip[1] + 6, tipR * (1.6 + A.sq * 0.8), tipR * (0.7 - A.sq * 0.15), 0, 0, TAU); o.fill(); }
  /* 결 · 명암 — 실루엣 안에만 */
  o.globalCompositeOperation = 'source-atop';
  const pat = sludgePat(o);
  if (pat) { if (pat.setTransform) pat.setTransform(new DOMMatrix([1, 0, 0, 1, A.P0[0], A.P0[1]])); o.fillStyle = pat; o.fillRect(x0, y0, W, H); }
  o.fillStyle = 'rgba(12,10,9,.55)'; o.fillRect(x0, y0, W, H);
  seg(o, pts, rr, -0.22, -0.3, 0.78, 'rgba(110,100,92,.34)');
  seg(o, pts, rr, -0.42, -0.5, 0.26, 'rgba(214,204,190,.34)');
  seg(o, pts, rr, 0.55, 0.6, 0.12, 'rgba(255,140,60,.08)');          // 아래쪽 — 웅덩이 불씨가 비친 빛
  const im = Sprites.want('king_slime_parts');
  if (im) [0.3, 0.55, 0.78].forEach((q, k) => {                    // 반쯤 묻힌 잡동사니 — 실루엣에 잘린다
    if (q > A.lam) return;
    const i = Math.min(N - 1, Math.round(q / A.lam * N)), p = pts[i], p2 = pts[i + 1];
    part(o, im, JUNK[k], p[0] + Math.sin(k * 2.3) * rr[i] * 0.3, p[1], rr[i] * 1.5, Math.atan2(p2[1] - p[1], p2[0] - p[0]) + k);
  });
  for (let i = 3; i < N; i += 5) { const q = pts[i]; o.fillStyle = EMB; o.globalAlpha = 0.5 + 0.4 * Math.sin(T * 3 + i); o.fillRect(q[0] + Math.sin(i * 7.3) * rr[i] * 0.4, q[1] + Math.cos(i * 3.1) * rr[i] * 0.3, 3, 3); }
  o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
  /* 화면에 — 윤곽 먼저, 그 위에 칠한 팔 */
  c.save();
  c.translate(-cx0, -cy0);
  seg(c, pts, rr.map(r => r + 1.5), 0, 0, 1, '#15110e');
  if (splat) { c.fillStyle = '#15110e'; c.beginPath(); c.ellipse(tip[0], tip[1] + 6, tipR * (1.6 + A.sq * 0.8) + 1.5, tipR * (0.7 - A.sq * 0.15) + 1.5, 0, 0, TAU); c.fill(); }
  c.drawImage(tube, 0, 0, W, H, x0, y0, W, H);
  for (const q of [0.22, 0.46, 0.68]) {                           // 흘러내리는 방울 — 팔 아랫면에서 떨어진다
    if (q > A.lam) continue;
    const i = Math.round(q / A.lam * N), p = pts[i], u = (T * 1.3 + q * 3.7) % 1;
    c.globalAlpha = 1 - u; glob(c, p[0] + rr[i] * 0.2, p[1] + rr[i] * 0.85 + u * 46, 3 + (1 - u) * 1.5, SL, SL_D);
  }
  c.globalAlpha = 1;
  if (A.lam > 0.85) {                                              // 손 — 곡괭이 머리 발톱(조각 3번) · 다 나온 뒤에만
    const p = pts[N - 1], a = Math.atan2(tip[1] - p[1], tip[0] - p[0]);
    c.globalAlpha = clamp01((A.lam - 0.85) / 0.15);
    part(c, im, 3, tip[0], tip[1], PART * 0.9 * A.grow, a, Math.cos(a) < 0, 1 - A.sq * 0.25);
    c.globalAlpha = 1;
  }
  if (h.t >= h.slam && h.t < h.slam + 0.35) {                      // 내리친 순간 — 물보라
    const f = (h.t - h.slam) / 0.35;
    c.globalAlpha = 1 - f; part(c, im, 5, h.tx, h.ty - 16 - f * 8, PART * (1.1 + f * 0.6), 0); c.globalAlpha = 1;
  }
  c.restore();
}

/** 팔 예고(빛 뒤 단계) — 내리칠 자리에 그림자가 짙어진다. 어두운 굴에서도 보여야 피한다 */
export function drawArmTell(c: C2, h: Bag, cx0: number, cy0: number) {
  if (h.t >= h.slam) return;
  const tx = h.tx - cx0, ty = h.ty - cy0, u = easeOut(clamp01(h.t / h.slam));
  c.fillStyle = `rgba(20,16,14,${0.2 + 0.5 * u})`; c.beginPath(); c.ellipse(tx, ty + 1, 40 + 30 * u, 8, 0, 0, TAU); c.fill();
  c.strokeStyle = h.c; c.globalAlpha = 0.35 + 0.4 * u; c.setLineDash([6, 5]); c.lineWidth = 1.5;
  c.beginPath(); c.ellipse(tx, ty + 1, 62, 12, 0, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
}

/* 잿물 기둥 · 범람 — 바닥이 끓다가(예고, 빛 뒤) 솟는다(빛 앞 — lit). 폭이 넓으면 둑 넘는 물결(범람) */
STRIKE_ART.sludge = {
  lit: true,
  tell(c, h, x, y, k, T) {
    const w = h.shape === 'col' ? h.w : h.r * 2, n = Math.max(3, Math.floor(w / 22));
    c.fillStyle = `rgba(30,26,24,${0.25 + 0.45 * k})`; c.fillRect(x - w / 2, y - 4, w, 4);
    for (let i = 0; i < n; i++) {
      const bx = x - w / 2 + (i + 0.5) / n * w + (hs(h.sd, i) - 0.5) * 10, ph = (T * (2 + k * 4) + hs(h.sd, i + 9)) % 1;
      const r = (1.5 + ph * (2 + k * 5)) * (0.6 + hs(h.sd, i + 3) * 0.6);
      c.fillStyle = SL; c.strokeStyle = SL_L; c.lineWidth = 1;
      c.beginPath(); c.arc(bx, y - 3 - ph * 3 * k, r, Math.PI, TAU); c.fill(); c.stroke();
    }
  },
  hit(c, h, x, y, f, T) {
    const wide = h.shape === 'col' && h.w > 160, w = h.shape === 'col' ? h.w : h.r * 1.6;
    const tall = h.shape === 'col' ? h.hh : h.r * 1.8;
    const up = Math.min(1, f * 5) * (f > 0.6 ? 1 - (f - 0.6) / 0.4 : 1), hh = tall * up;
    if (hh < 2) return;
    c.beginPath();
    if (wide) {                                             // 범람 — 둑을 넘는 물결
      c.moveTo(x - w / 2, y);
      const steps = Math.floor(w / 10);
      for (let i = 0; i <= steps; i++) { const xx = x - w / 2 + i / steps * w; c.lineTo(xx, y - hh * (0.8 + 0.2 * Math.sin(xx * 0.05 + T * 9))); }
      c.lineTo(x + w / 2, y);
    } else {                                                // 기둥 — 밑동이 넓고 위로 좁아지며 옆이 출렁인다
      const n = 14, side = (sg: number) => { for (let i = 0; i <= n; i++) {
        const q = sg < 0 ? i / n : 1 - i / n, yy = y - q * hh, ww = w * (0.5 - 0.22 * q) * (1 + 0.1 * Math.sin(yy * 0.09 + T * 14 * sg));
        c.lineTo(x + sg * ww, yy);
      } };
      c.moveTo(x - w * 0.62, y); side(-1); side(1); c.lineTo(x + w * 0.62, y);
    }
    c.closePath();
    const pat = sludgePat(c);
    c.fillStyle = pat || SL; c.fill();
    const g = wide ? c.createLinearGradient(0, y - hh, 0, y) : c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);   // 범람 — 위가 젖어 빛나고 밑이 어둡다 · 기둥 — 원통 명암
    if (wide) { g.addColorStop(0, 'rgba(160,150,140,.12)'); g.addColorStop(0.3, 'rgba(12,10,9,.38)'); g.addColorStop(1, 'rgba(12,10,9,.6)'); }
    else { g.addColorStop(0, 'rgba(12,10,9,.35)'); g.addColorStop(0.3, 'rgba(200,190,176,.16)'); g.addColorStop(0.75, 'rgba(12,10,9,.3)'); g.addColorStop(1, 'rgba(12,10,9,.55)'); }
    c.fillStyle = g; c.fill();
    c.strokeStyle = '#15110e'; c.lineWidth = 1.5; c.stroke();
    if (!wide) {
      const im = Sprites.want('king_slime_parts');                  // 꼭대기 — 왕관 물보라(조각 5번)
      if (im) c.drawImage(im, 5 * PART, 0, PART, PART, x - w * 0.6, y - hh - w * 0.75, w * 1.2, w * 1.2);
    } else {
      c.strokeStyle = 'rgba(190,180,170,.55)'; c.lineWidth = 2; c.beginPath();
      for (let xx = x - w / 2; xx < x + w / 2; xx += 6) { const yy = y - hh * (0.8 + 0.2 * Math.sin(xx * 0.05 + T * 9)) + 3; if (xx === x - w / 2) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
      c.stroke();
    }
    for (let i = 0; i < (wide ? 12 : 5); i++) {             // 튀는 덩이
      const q = hs(h.sd, i), bx = x + (q - 0.5) * w * 1.1, by = y - hh - 6 - Math.sin(f * Math.PI) * (20 + 30 * hs(h.sd, i + 5));
      glob(c, bx, by, 3 + hs(h.sd, i + 2) * 3, SL, SL_D);
    }
    for (let i = 0; i < 4; i++) { c.fillStyle = EMB; c.fillRect(x + (hs(h.sd, i + 11) - 0.5) * w * 0.6, y - hh * hs(h.sd, i + 13), 2, 2); }
  }
};

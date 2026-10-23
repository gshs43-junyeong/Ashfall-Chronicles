/* ===== game/boss-hourglass-art.ts — 모래시계 거상의 그림 — 왕좌의 몸 · 모래시계와 그 속 모래 · 쏟은 둔덕(인물 뒤) · 팔과 주먹(인물 앞) · 눈과 마감의 빛(빛 뒤) ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { HG, duneH, fistAt, hgAt, hgFloor, hgSand, smooth } from '../entity/boss-hourglass.js';
import { Game } from '../game.js';
import { groundZone, hs, hzGlow, rgba } from './boss-hazard-art.js';
import { VORTEX_ART } from './boss-field-art.js';
/* ★ 몸 · 모래시계 · 둔덕은 objects 단계(인물 뒤 — 플레이어가 그 앞을 지나고 둔덕 위에 선다), 팔은 drawBossLit(인물 앞 · 빛 앞),
   눈 · 유리의 빛은 fx 단계(빛 뒤). drawEnemy 는 이 보스를 건너뛴다. 모래시계 속 모래는 그림에 없다 — 남은 체력 · 마감 시간을 여기서 칠한다. */

type C2 = CanvasRenderingContext2D;
const BW = 336, BH = 416, PW = 160, PH = 176, SAND = '#e8c070', SAND_D = '#a8803e', AMBER = '#ffc85a';

function hzOf(g: Bag, e: Enemy, k: string) {
  for (const h of g.bhz || []) if (h.k === k && g.hzBoss(h) === e) return h;
  return null;
}
const isHg = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_hourglass';
/** 팔꿈치 — 바깥(s 쪽)으로 꺾인다 */
function elbow(sx: number, sy: number, hx: number, hy: number, s: number): [number, number] {
  const L1 = HG.L1, L2 = HG.L2, dx = hx - sx, dy = hy - sy;
  const d = Math.max(20, Math.min(L1 + L2 - 2, Math.hypot(dx, dy))), a = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const c1: [number, number] = [sx + Math.cos(a - al) * L1, sy + Math.sin(a - al) * L1];
  const c2: [number, number] = [sx + Math.cos(a + al) * L1, sy + Math.sin(a + al) * L1];
  return (c1[0] - sx) * s > (c2[0] - sx) * s ? c1 : c2;
}
/** 팔 한 마디 — 조각(가로로 누운 팔 · 설계 8→32칸)을 관절에서 다음 관절로(길이만 늘인다) */
function seg(c: C2, im: HTMLImageElement, fr: number, x0: number, y0: number, x1: number, y1: number) {
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), k = L / 96;
  c.save(); c.translate(x0, y0); c.rotate(a);
  if (Math.cos(a) < 0) c.scale(1, -1);
  c.drawImage(im, fr * PW, 0, PW, PH, -32 * k, -88, PW * k, PH);
  c.restore();
}
/** 모래시계 속 모래 — 유리 좌표(가운데 0 · 위아래 ±64 · 목 0)에서. top 윗칸 몫 · bot 아랫칸 몫 · flow 목을 지나는 줄기 */
function glassSand(c: C2, top: number, bot: number, flow: boolean, T: number) {
  const half = (y: number) => (1.2 + 9 * Math.pow(Math.min(1, Math.abs(y) / 64), 0.8)) * 4 - 3;
  const fillB = (y0: number, y1: number, dip: number) => {            // y0 < y1 — 벽을 따라 채우고 윗면은 dip 만큼 오목(+) · 볼록(−)
    if (y1 - y0 < 1) return;
    c.beginPath(); c.moveTo(-half(y0), y0); c.quadraticCurveTo(0, y0 + dip, half(y0), y0);
    for (let y = y0; y <= y1; y += 4) c.lineTo(half(y), y);
    c.lineTo(half(y1), y1);
    for (let y = y1; y >= y0; y -= 4) c.lineTo(-half(y), y);
    c.closePath();
    const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, SAND); g.addColorStop(1, SAND_D);
    c.fillStyle = g; c.fill();
  };
  if (top > 0.01) fillB(-2 - 60 * top, -2, Math.min(10, 18 * (1 - top)));
  if (bot > 0.01) fillB(62 - 58 * bot, 62, -Math.min(14, 30 * bot));  // 아랫칸 — 가운데가 솟은 무더기
  if (flow && top > 0.01) {                                           // 목을 지나는 줄기 — 반짝이는 낱알
    const y1 = bot > 0.01 ? 62 - 58 * bot - Math.min(14, 30 * bot) : 62;
    c.fillStyle = SAND; c.fillRect(-1.2, -2, 2.4, y1 + 2);
    c.fillStyle = '#fff0c8';
    for (let i = 0; i < 5; i++) c.fillRect(-1, ((T * 160 + i * 13) % (y1 + 2)) - 2, 2, 2);
  }
}

export const BossHourglassArt: Bag = {
  /** 몸 · 모래시계 · 둔덕(objects 단계) */
  drawHourglassBody(f: any) {
    const c: C2 = f.c, im = Sprites.want('sand_guardian'), pim = Sprites.want('sand_guardian_parts'), T = this.time || 0;
    for (const e of this.ents) {
      if (!isHg(e)) continue;
      if (!this.paused) this.hourglassAmbient(e);
      for (const h of this.bhz || []) if (h.k === 'hsand' && this.hzBoss(h) === e) this.drawDune(c, h, f.camX, f.camY, T);   // 쏟은 모래 둔덕 — 인물이 그 위에 선다
      if (!im) continue;
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), br = Math.floor(T / 1.3) % 2, fr = st * 2 + br;
      const [x0, y0] = hgAt(e, 0, 0), x = x0 - f.camX, y = y0 - f.camY;
      c.save();
      /* 방이 좁으면 몸이 벽에 묻힌다 — 빈 칸에만 보이게 */
      const w = this.world, tx0 = Math.floor(x0 / TS), ty0 = Math.floor(y0 / TS);
      c.beginPath();
      for (let ty = ty0; ty <= ty0 + Math.ceil(BH / TS); ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(BW / TS); tx++)
        if (!w.solid(tx, ty)) c.rect(tx * TS - f.camX, ty * TS - f.camY, TS, TS);
      c.clip();
      c.imageSmoothingEnabled = false;
      c.drawImage(im, fr * BW, 0, BW, BH, x, y, BW, BH);
      if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, x, y, BW, BH); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      /* 모래시계 — 뒤집는 동안 돈다. 속 모래: 평소엔 이 막의 남은 몫, 마감 중엔 남은 시간 */
      const [gx, gy] = hgAt(e, 42, HG.GLASS_Y), fl = hzOf(this, e, 'hflip'), dl = hzOf(this, e, 'hdead');
      let top = hgSand(e), rot = 0, flow = true;
      if (fl && fl.t < 1.2) { rot = Math.PI * smooth(fl.t / 1.2) * (fl.dir || 1); top = 1 - top; flow = false; }
      if (dl && !dl.done) top = Math.max(0, 1 - dl.t / dl.dur);
      const broke = dl && dl.done && dl.ok;
      c.translate(gx - f.camX, gy - f.camY); c.rotate(rot); c.scale(HG.GLASS, HG.GLASS);
      if (!broke) glassSand(c, top, 1 - top, flow, T);
      if (pim) c.drawImage(pim, 0, 0, PW, PH, -80, -88, PW, PH);
      if (broke) {                                                   // 깨진 유리 — 목에서 퍼지는 금
        c.strokeStyle = 'rgba(255,240,200,.85)'; c.lineWidth = 2;
        for (let i = 0; i < 7; i++) { const a = hs(dl.id || 1, i) * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 34, Math.sin(a) * 50); c.stroke(); }
      }
      c.restore();
    }
  },
  /** 쏟은 둔덕 — 왕좌 옆에서 높고 바깥으로 낮다 · 결을 따라 낱알이 흘러내린다 */
  drawDune(c: C2, h: Bag, cx0: number, cy0: number, T: number) {
    const x0 = h.x - h.half, x1 = h.x + h.half, fy = h.fy - cy0, step = 8;
    c.beginPath(); c.moveTo(x0 - cx0, fy);
    for (let x = x0; x <= x1; x += step) c.lineTo(x - cx0, fy - duneH(h, x));
    c.lineTo(x1 - cx0, fy); c.closePath();
    const g = c.createLinearGradient(0, fy - h.maxH, 0, fy); g.addColorStop(0, '#f0d090'); g.addColorStop(1, '#a8803e');
    c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,240,200,.7)'; c.lineWidth = 1.5;          // 마루 — 빛 받는 윗선
    c.beginPath(); let on = false;
    for (let x = x0; x <= x1; x += step) { const ht = duneH(h, x); if (ht > 1) { if (on) c.lineTo(x - cx0, fy - ht); else { c.moveTo(x - cx0, fy - ht); on = true; } } else on = false; }
    c.stroke();
    c.strokeStyle = 'rgba(120,88,40,.45)'; c.lineWidth = 1;            // 바람 물결 — 둔덕 면에 가로 결
    for (let i = 0; i < 14; i++) {
      const u = hs(h.sd, i), x = x0 + u * (x1 - x0), ht = duneH(h, x); if (ht < 12) continue;
      const yy = fy - ht * (0.3 + hs(h.sd, i + 20) * 0.5);
      c.beginPath(); c.moveTo(x - 10 - cx0, yy); c.quadraticCurveTo(x - cx0, yy - 3, x + 10 - cx0, yy); c.stroke();
    }
    c.fillStyle = '#fff0c8';                                            // 비탈을 굴러 내려가는 낱알
    for (let i = 0; i < 24; i++) {
      const s = i % 2 ? 1 : -1, u = (T * 0.35 + hs(h.sd, i)) % 1, x = h.x + s * (h.in + u * (h.half - h.in)), ht = duneH(h, x);
      if (ht > 3) c.fillRect(x - cx0, fy - ht - 1, 2, 2);
    }
  },
  /** 팔 · 주먹(actors 단계 · drawBossLit) — 쉴 땐 무릎에 얹고, 주먹 기술 중엔 치켜들었다 내리친다 */
  drawHourglassArms(c: C2) {
    const im = Sprites.want('sand_guardian_parts'); if (!im) return;
    const cx0 = this.cam.x, cy0 = this.cam.y, T = this.time || 0;
    for (const e of this.ents) {
      if (!isHg(e)) continue;
      const fists: Bag = {};
      for (const h of this.bhz || []) if (h.k === 'hfist' && this.hzBoss(h) === e) fists[h.s] = h;
      for (const s of [-1, 1]) {
        const [sx, sy] = hgAt(e, 42 + s * HG.SH, HG.SH_Y), h = fists[s];
        const rest = hgAt(e, 42 + s * (HG.KNEE + 6), HG.KNEE_Y - 6 + Math.sin(T * 1.6 + s) * 0.4);
        const [hx, hy, ph] = h ? fistAt(h, e) : [rest[0], rest[1], -1];
        /* 쉴 땐 팔꿈치가 팔걸이에 놓이고 아래팔은 허벅지를 따라 앞으로(짧아 보인다) — 치켜드는 동안만 두 마디를 다 편다 */
        const w = !h ? 0 : ph === 0 ? smooth(h.t / h.tele) : ph === 3 ? 1 - smooth((h.t - h.tele - 0.7) / 0.6) : 1;
        const [rx, ry] = hgAt(e, 42 + s * 31, 61), [ix, iy] = elbow(sx, sy, hx, hy, s);
        const ex = rx + (ix - rx) * w, ey = ry + (iy - ry) * w;
        c.save(); c.translate(-cx0, -cy0); c.imageSmoothingEnabled = false;
        if (ph === 1) for (let g = 3; g >= 1; g--) {                 // 잔상 — 내리치는 주먹이 지나온 자리
          const [gx, gy] = fistAt(Object.assign({}, h, { t: h.t - g * 0.03 }), e);
          c.save(); c.globalAlpha = 0.3 / g; this.hgFist(c, im, gx, gy, Math.PI / 2, s); c.restore();
        }
        seg(c, im, 1, sx, sy, ex, ey);
        seg(c, im, 2, ex, ey, hx, hy);
        this.hgFist(c, im, hx, hy, Math.atan2(hy - ey, hx - ex), s);
        if (e.flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.4, e.flash * 3); this.hgFist(c, im, hx, hy, Math.atan2(hy - ey, hx - ex), s); }
        c.restore();
      }
    }
  },
  /** 주먹 — 마디(조각 윗면)가 아래팔 방향을 향한다 */
  hgFist(c: C2, im: HTMLImageElement, x: number, y: number, a: number, s: number) {
    c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2); if (s < 0) c.scale(-1, 1);
    const k = 0.9;
    c.drawImage(im, 3 * PW, 0, PW, PH, -76 * k, -92 * k, PW * k, PH * k);
    c.restore();
  },
  /** 빛(fx 단계) — 눈 · 모래시계 목 · 시간 마감 */
  drawHourglassGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isHg(e)) continue;
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), eye = ['#ffb040', '#ff9a30', '#ff7020'][st];
      for (const s of [-1, 1]) { const [x, y] = hgAt(e, 42 + s * 4.6, 21); hzGlow(c, x - f.camX, y - f.camY, 16 + st * 3, eye, 0.45); }
      const [gx, gy] = hgAt(e, 42, HG.GLASS_Y), dl = hzOf(this, e, 'hdead');
      hzGlow(c, gx - f.camX, gy - f.camY, 44, AMBER, 0.18 + 0.06 * Math.sin(T * 2));
      if (dl && !dl.done) {                                         // 마감 — 목이 맥박치며 밝고, 둘레에 남은 시간이 고리로 준다
        const k = Math.min(1, dl.t / dl.dur), beat = 0.5 + 0.5 * Math.sin(T * (6 + k * 14));
        hzGlow(c, gx - f.camX, gy - f.camY, 90 + beat * 30, AMBER, 0.35 + 0.3 * beat);
        c.save(); c.strokeStyle = rgba(AMBER, 0.85); c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.arc(gx - f.camX, gy - f.camY, 72, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k)); c.stroke();
        c.strokeStyle = rgba('#fff0c0', 0.5); c.lineWidth = 1.5;
        c.beginPath(); c.arc(gx - f.camX, gy - f.camY, 78, 0, TAU); c.stroke(); c.restore();
      }
    }
  },
  /** 기술 예고(fx · drawSig 에서) — 주먹 떨어질 바닥 · 꺼질 늪 */
  hourglassTell(c: C2, h: Bag, cx0: number, cy0: number) {
    const T = this.time || 0, b = this.hzBoss(h);
    switch (h.k) {
      case 'hsand': case 'hdead': case 'hflip': return true;
      case 'hfist': {                                               // 주먹이 떨어질 바닥이 달아오르고, 위로 모래가 쏟아진다
        if (!b || h.t > h.tele + 0.14) return true;
        const k = Math.min(1, h.t / h.tele), fy = hgFloor(b) - cy0;
        groundZone(c, h.tx - cx0, fy, 84, h.c, k, T);
        c.fillStyle = rgba(SAND, 0.5 + 0.3 * k);
        for (let i = 0; i < 10; i++) { const u = (T * 1.6 + hs(h.id || 1, i)) % 1; c.fillRect(h.tx - cx0 + (hs(h.id || 1, i + 9) - 0.5) * 120, fy - 6 - (1 - u) * 60 * k, 2, 3); }
      } return true;
      case 'hpit': {                                                // 꺼질 자리 — 예고 동안 바닥이 달아오르고, 열리면 늪
        const k = Math.min(1, h.t / h.tele), f = h.t < h.tele ? k * 0.6 : Math.min(1, (h.life - h.t) * 2);
        if (h.t < h.tele) groundZone(c, h.x - cx0, h.y - cy0, h.r, h.c, k, T);
        VORTEX_ART.sand(c, Object.assign({}, h, { r: h.r * (h.t < h.tele ? 0.6 + 0.4 * k : 1.15) }), h.x - cx0, h.y - cy0, f, T);
      } return true;
    }
    return false;
  },
};
mixin(Game.prototype, BossHourglassArt, true);

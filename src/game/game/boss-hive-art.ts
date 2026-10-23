/* ===== game/boss-hive-art.ts — 곪은 벌집 어미의 그림 — 뒷벽 벌집 · 밀랍 뚜껑 · 내미는 머리 · 기어 나오는 애벌레(인물 뒤) · 담즙 줄기와 웅덩이 · 눈빛(빛 뒤) ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { BROOD, bileState, cellAt, hiveAt, moveStage } from '../entity/boss-hive.js';
import { Game } from '../game.js';
import { groundZone, hs, hzGlow, rgba } from './boss-hazard-art.js';
/* ★ 벌집 · 뚜껑 · 머리는 objects 단계(뒷벽 — 플레이어가 앞을 지난다), 담즙 줄기 · 웅덩이는 기술 예고(fx — 어두운 둥지에서도 보여야 피한다),
   눈 · 부푼 방의 빛은 fx. drawEnemy 는 이 보스를 건너뛴다. */

type C2 = CanvasRenderingContext2D;
const BW = 480, BH = 360, PW = 160, PH = 144, BILE = '#b8c83a', EYE = '#d8f060';

function hzOf(g: Bag, e: Enemy, k: string) {
  for (const h of g.bhz || []) if (h.k === k && g.hzBoss(h) === e) return h;
  return null;
}
const isHive = (e: any) => e && !e.dead && e.def && e.def.ai === 'b_hive' && e.anchored;

/** 머리 하나 — out 0(방 안) ~ 1(다 나옴): 작고 어두운 데서 커지며 앞으로 */
function head(c: C2, im: HTMLImageElement, x: number, y: number, out: number, open: boolean, T: number, flash: number) {
  if (out <= 0.02) return;
  const k = 0.45 + 0.55 * out, bob = Math.sin(T * 3.1) * 1.5 * out;
  c.save(); c.translate(x, y + bob + (1 - out) * 6); c.scale(k, k); c.rotate(Math.sin(T * 1.7) * 0.05 * out);
  c.globalAlpha = Math.min(1, out * 1.6);
  c.drawImage(im, (open ? 1 : 0) * PW, 0, PW, PH, -PW / 2, -PH / 2, PW, PH);
  if (out < 1) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(10,4,10,${0.7 * (1 - out)})`; c.fillRect(-PW / 2, -PH / 2, PW, PH); }
  if (flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, flash * 4); c.drawImage(im, (open ? 1 : 0) * PW, 0, PW, PH, -PW / 2, -PH / 2, PW, PH); }
  c.restore();
}

export const BossHiveArt: Bag = {
  /** 벌집 몸 · 뚜껑 · 머리 · 애벌레(objects 단계) */
  drawHiveBody(f: any) {
    const c: C2 = f.c, im = Sprites.want('blight_maw'), pim = Sprites.want('blight_maw_parts'), T = this.time || 0;
    for (const e of this.ents) {
      if (!isHive(e)) continue;
      if (!this.paused) this.hiveAmbient(e);
      if (!im || !pim) continue;
      const st = Math.min(2, Math.round((e.pf || 0) * 2)), fr = st * 2 + (Math.floor(T / 1.4) % 2);
      const [x0, y0] = hiveAt(e, 0, 0), x = x0 - f.camX, y = y0 - f.camY;
      c.save();
      const w = this.world, tx0 = Math.floor(x0 / TS), ty0 = Math.floor(y0 / TS);   // 방이 좁으면 벽에 묻힌다 — 빈 칸에만
      c.beginPath();
      for (let ty = ty0; ty <= ty0 + Math.ceil(BH / TS); ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(BW / TS); tx++)
        if (!w.solid(tx, ty)) c.rect(tx * TS - f.camX, ty * TS - f.camY, TS, TS);
      c.clip();
      c.imageSmoothingEnabled = false;
      const bl = hzOf(this, e, 'hvbloom'), quake = bl && bl.t < bl.tele ? (Math.random() - 0.5) * 3 : 0;
      c.drawImage(im, fr * BW, 0, BW, BH, x + quake, y, BW, BH);
      /* 뚜껑 — 닫힌 애벌레 방. 깨질 방은 부풀고 떨리다 금이 간다 */
      const br = hzOf(this, e, 'hvbrood'), open = e.hvOpen || 0;
      for (const i of BROOD) {
        if (open & (1 << i)) continue;
        const [cx, cy] = cellAt(e, i);
        let s = 0.92, sh = 0, cr = false;
        if (br && br.cells.includes(i) && br.t < br.tele) { const u = br.t / br.tele; s += 0.1 * u + Math.sin(T * 30) * 0.02 * u; sh = (Math.random() - 0.5) * 2 * u; cr = u > 0.45; }
        if (bl && bl.t < bl.tele) { const u = bl.t / bl.tele; s += 0.08 * u; sh = (Math.random() - 0.5) * 2 * u; cr = u > 0.5; }
        c.drawImage(pim, (cr ? 3 : 2) * PW, 0, PW, PH, cx - f.camX + sh - PW * s / 2, cy - f.camY - PH * s / 2, PW * s, PH * s);
      }
      /* 애벌레 — 깨진 방에서 기어 나와 떨어진다(그 끝에 몹이 태어난다) */
      if (br && br.t >= br.tele) for (const i of br.cells) {
        const u = Math.min(1, (br.t - br.tele) / 0.6), [cx, cy] = cellAt(e, i);
        if (u < 1) { c.save(); c.globalAlpha = Math.min(1, u * 3); c.drawImage(pim, 4 * PW, 0, PW, PH, cx - f.camX - PW * 0.35, cy - f.camY - PH * 0.35 + u * 26, PW * 0.7, PH * 0.7); c.restore(); }
      }
      /* 어미 머리 — 옮기는 중이면 떠나는 방에서 숨고 다른 방에서 내민다 */
      const mv = hzOf(this, e, 'hvmove'), sp = hzOf(this, e, 'hvspit'), mouth = !!(sp && sp.t < sp.life) || !!(bl && bl.t > bl.tele && bl.t < bl.tele + 1.4);
      const stagger = e.gapT > 0 && e.gapK === 'stagger';
      if (mv) {
        const [hideK, , outK] = moveStage(mv);
        const [ax, ay] = cellAt(e, mv.from), [bx, by] = cellAt(e, mv.to);
        head(c, pim, ax - f.camX, ay - f.camY, 1 - hideK, false, T, 0);
        head(c, pim, bx - f.camX, by - f.camY, outK, mouth, T, e.flash || 0);
      } else {
        const [hx, hy] = cellAt(e, e.hvCell ?? 9);
        head(c, pim, hx - f.camX + (stagger ? Math.sin(T * 9) * 3 : 0), hy - f.camY + (stagger ? 6 : 0), 1, mouth, T, e.flash || 0);
      }
      c.restore();
    }
  },
  /** 빛(fx 단계) — 머리 눈 · 머리가 나올 방의 빛 · 개화 직전 모든 방 */
  drawHiveGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!isHive(e)) continue;
      const mv = hzOf(this, e, 'hvmove');
      let cell = e.hvCell ?? 9, out = 1;
      if (mv) { const [hideK, hid, outK] = moveStage(mv); if (mv.t < mv.hide) { cell = mv.from; out = 1 - hideK; } else { cell = mv.to; out = hid ? 0 : outK; } }
      const [hx, hy] = cellAt(e, cell);
      if (out > 0.1) for (const [dx, dy] of [[-6, -3], [6, -3], [-9.5, 0], [9.5, 0]]) hzGlow(c, hx + dx * 4 * (0.45 + 0.55 * out) - f.camX, hy + dy * 4 * (0.45 + 0.55 * out) - f.camY, 9, EYE, 0.35 * out);
      if (mv && mv.t >= mv.hide && mv.t < mv.hide + mv.gap) {                 // 갈 방이 먼저 부푼다 — 어디를 노릴지 보인다
        const [tx, ty] = cellAt(e, mv.to), k = (mv.t - mv.hide) / mv.gap;
        hzGlow(c, tx - f.camX, ty - f.camY, 40 + 14 * Math.sin(T * 20), EYE, 0.25 + 0.35 * k);
      }
      const bl = hzOf(this, e, 'hvbloom');
      if (bl && bl.t < bl.tele) for (const i of BROOD) { const [x, y] = cellAt(e, i); hzGlow(c, x - f.camX, y - f.camY, 30, BILE, 0.25 + 0.3 * (bl.t / bl.tele)); }
    }
  },
  /** 기술 예고 · 담즙(fx · drawSig 에서) */
  hiveTell(c: C2, h: Bag, cx0: number, cy0: number) {
    const T = this.time || 0;
    switch (h.k) {
      case 'hvmove': case 'hvbrood': case 'hvspit': case 'hvbloom': return true;
      case 'hvbile': {                                             // 방 밑 방울이 맺히고(예고 · 바닥이 달아오른다) → 벽을 타는 줄기 → 바닥에 퍼지는 웅덩이
        const [flow, pr] = bileState(h), x = h.x - cx0, top = h.top - cy0, fy = h.fy - cy0;
        if (h.t < h.tele) {
          const k = h.t / h.tele;
          groundZone(c, x, fy, h.r * 0.8, BILE, k, T);
          c.fillStyle = BILE; c.beginPath(); c.ellipse(x, top + 3 * k, 3 + 3 * k, 2 + 4 * k, 0, 0, TAU); c.fill();
          return true;
        }
        if (pr > 2) {                                                // 웅덩이 — 짙은 가운데 · 거품
          c.save(); c.translate(x, fy); c.scale(1, 0.22);
          const g = c.createRadialGradient(0, 0, 2, 0, 0, pr); g.addColorStop(0, rgba('#8a9a28', 0.85)); g.addColorStop(0.75, rgba(BILE, 0.6)); g.addColorStop(1, rgba(BILE, 0));
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, pr, 0, TAU); c.fill(); c.restore();
          c.fillStyle = 'rgba(230,240,160,.8)';
          for (let i = 0; i < 6; i++) { const u = (T * 0.8 + hs(h.sd, i)) % 1; if (u < 0.85) { c.beginPath(); c.arc(x + (hs(h.sd, i + 3) - 0.5) * pr * 1.4, fy - 2 - u * 3, 1.2 + u * 1.4, 0, TAU); c.fill(); } }
        }
        if (flow > 0) {                                              // 줄기 — 굽이치며 흘러내리는 띠 · 가운데 빛줄
          c.save(); c.globalAlpha = flow;
          const wv = (y: number) => Math.sin(y * 0.08 + T * 6 + h.sd) * 3;
          c.fillStyle = rgba(BILE, 0.85); c.beginPath();
          for (let y = top; y <= fy; y += 6) c.lineTo(x - h.w / 2 + wv(y), y);
          for (let y = fy; y >= top; y -= 6) c.lineTo(x + h.w / 2 * 0.7 + wv(y), y);
          c.closePath(); c.fill();
          c.fillStyle = 'rgba(240,250,180,.7)';
          for (let y = top; y < fy; y += 4) c.fillRect(x - 2 + wv(y), y, 2, 3);
          for (let i = 0; i < 4; i++) { const u = (T * 1.6 + i / 4) % 1; c.fillRect(x - 4 + wv(top + u * (fy - top)), top + u * (fy - top), 3, 5); }
          c.restore();
        }
      } return true;
    }
    return false;
  },
};
mixin(Game.prototype, BossHiveArt, true);

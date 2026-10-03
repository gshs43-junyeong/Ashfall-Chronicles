/* ===== factory/render.js — 공장 그리기 — 벨트 · 기계 몸체 · 일하는 모습 ===== */
import { app as G } from '../ctx.js';
import { shade } from '../../engine/core/color.js';
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tileHash } from '../../engine/core/rng.js';
import { dimsOf } from '../size.js';
import { MACHINE, MRECIPES } from '../data/recipes.js';
import { TS } from '../world.js';
import { TileArt } from '../tileart.js';
import { Art } from '../itemart.js';
import { DIR4, FAC_TICK, Factory } from '../factory.js';
/* factory.ts 의 Factory 에서 나눈 조각 — 읽히는 순간 Factory 에 붙는다(main.js 가 factory.ts 다음에 읽는다). */

export const FactoryRenderPart: Bag = {

  /* ================= 렌더 ================= */
  render(c: any, w: any, camX: any, camY: any, tx0: any, ty0: any, tx1: any, ty1: any, time: any) { const { WW, WH } = dimsOf(w);
    if (!w.machines.size) return;
    c.save();
    c.imageSmoothingEnabled = false;
    const y0 = Math.max(0, ty0), y1 = Math.min(WH - 1, ty1);
    const x0 = Math.max(0, tx0), x1 = Math.min(WW - 1, tx1);

    // 전주 사이의 전선 — 이걸 안 그리면 공중에 뜬 전주가 그냥 떠 있는 기둥으로 보인다.
    if (w.wires && w.wires.length) {
      c.strokeStyle = 'rgba(28,26,22,.85)'; c.lineWidth = 1.4;
      c.beginPath();
      for (const [ax, ay, bx, by] of w.wires) {
        if (Math.max(ax, bx) < x0 - 2 || Math.min(ax, bx) > x1 + 2) continue;
        if (Math.max(ay, by) < y0 - 2 || Math.min(ay, by) > y1 + 2) continue;
        const sx1 = ax * TS - camX + TS / 2, sy1 = ay * TS - camY + 5;
        const sx2 = bx * TS - camX + TS / 2, sy2 = by * TS - camY + 5;
        c.moveTo(sx1, sy1);
        // 살짝 늘어지게 — 팽팽한 직선보다 전선처럼 보인다
        c.quadraticCurveTo((sx1 + sx2) / 2, (sy1 + sy2) / 2 + Math.abs(sx2 - sx1) * 0.06 + 2, sx2, sy2);
      }
      c.stroke();
    }
    const items = [];                        // 벨트 위 물건은 **맨 나중에** — 칸마다 그리면 다음 칸 벨트가 넘어가는 물건을 덮어 잘려 보였다
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const m = w.machines.get(ty * WW + tx);
        if (!m) continue;
        const sx = tx * TS - camX, sy = ty * TS - camY;
        const s = MACHINE[m.t];
        if (m.t !== 'belt' && m.t !== 'belt_fast') {                  // 몸체(타일 그리기는 기계 칸을 건너뛴다) + 일하는 모습
          const busy = m.on && m.act && this.SHAKE[m.t];
          const jx = busy ? Math.round(Math.sin(time * 53 + tx) * this.SHAKE[m.t]) : 0;
          const jy = busy && m.hitT !== undefined && time - m.hitT < 0.09 ? 1 : 0;   // 드릴이 한 번 캘 때마다 쿵
          if (m.t === 'turret') this.drawTurret(c, m, sx, sy, (tileHash(tx, ty) * TileArt.V) | 0);
          else TileArt.draw(c, s.tile, (tileHash(tx, ty) * TileArt.V) | 0, sx + jx, sy + jy);
          this.drawWork(c, w, m, sx, sy, time, camX, camY);
        }

        /* 전주 몸통 — 타일이 아니라 **그림**이다 — 사연: docs/code-history.md#h39 */
        if (m.t === 'pole') {
          let by = ty + 1;
          while (by < WH && !w.solid(tx, by) && by - ty < 40) by++;
          /* 기둥 밑끝은 **바닥 칸의 윗면**에 딱 맞춰야 한다. */
          const h = (by - ty) * TS - (TS - 1);
          if (h > 0) {
            const px = sx + TS / 2 - 2, py = sy + TS - 1;
            c.fillStyle = '#7a6a4a'; c.fillRect(px, py, 4, h);
            c.fillStyle = shade('#7a6a4a', 1.35); c.fillRect(px, py, 1.5, h);
            c.fillStyle = shade('#7a6a4a', .62);
            for (let k = 1; k * TS * 2 < h; k++) c.fillRect(px - 1, py + k * TS * 2, 6, 1.5);   // 이음매
          }
          /* 가로대에서 지지직 — 3프레임으로 끊어 튄다. */
          const fr = ((time * 9) + tx * 2 + ty) | 0;
          if (fr % 4 !== 3) {                                  // 4틱 중 3틱만 — 끊겨야 지지직거린다
            const q = fr % 3, ax = sx + 3 + q * 6, ay = sy + 3;
            c.strokeStyle = '#bfe8ff'; c.lineWidth = 1;
            c.globalAlpha = .55 + (q & 1) * .35;
            c.beginPath();
            c.moveTo(ax, ay);
            c.lineTo(ax + 3, ay + 2 - (q & 1) * 3);
            c.lineTo(ax + 6, ay + 1 + (q & 1) * 2);
            c.stroke();
            c.fillStyle = '#8fd8ff';
            c.fillRect(sx + TS / 2 - 4 + (q - 1), sy + 9, 2, 2);
            c.globalAlpha = 1;
          }
        }

        /* 타일은 그대로 두고(설치·전력 판정은 1칸) **그림만 제 칸 위로 키워** 얹는다. */
        if (m.t === 'windmill') {
          const R = 26;                                   // 날개 반지름 (타일의 약 2.4배)
          const hx = sx + TS / 2, hy = sy - 10;           // 회전축 — 날개 아래끝이 지붕에 닿지 않을 만큼 올린다
          c.save();
          c.strokeStyle = '#3a3026'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, sy + TS); c.stroke();   // 기둥
          c.translate(hx, hy);
          c.rotate((time * 0.9) % TAU);
          for (let k = 0; k < 4; k++) {
            c.rotate(TAU / 4);
            c.fillStyle = '#e8dcc0'; c.fillRect(-1.5, -R, 3, R);
            c.fillStyle = '#cfc2a4'; c.fillRect(-5, -R, 5, R * 0.62);
          }
          c.restore();
          c.fillStyle = '#5a4a3a';
          c.beginPath(); c.arc(hx, hy, 3, 0, TAU); c.fill();
        }

        if (m.t === 'belt' || m.t === 'belt_fast') {
          this.drawBelt(c, sx, sy, m.t, m.dir, m.on ? (time / this.DWELL[m.t]) % 1 : 0);
        } else if (s.rot) {                                          // 나머지는 배출구 삼각형
          const [dx, dy] = DIR4[m.dir & 3];
          c.fillStyle = 'rgba(255,214,120,.85)';
          c.fillRect(sx + TS / 2 + dx * 8 - 2, sy + TS / 2 + dy * 8 - 2, 4, 4);
        }

        // 벨트/분류기가 물고 있는 아이템 — 들어온 칸에서 지금 칸까지 DWELL 에 걸쳐 미끄러진다(pushTo).
        // 높이(itemOff)도 같이 옮긴다 — 가로 벨트는 띠 위, 세로 벨트는 가운데라 모퉁이에서 튀지 않게
        if (m.it) {
          const off = this.itemOff(m);
          let ix = sx, iy = sy + off;
          if (m.it.t0 !== undefined) {
            const k = clamp((time - m.it.t0) / (this.DWELL[m.t] || FAC_TICK), 0, 1);
            const fo = m.it.fo !== undefined ? m.it.fo : off;
            ix = (m.it.fx + (m.x - m.it.fx) * k) * TS - camX;
            iy = (m.it.fy + (m.y - m.it.fy) * k) * TS - camY + fo + (off - fo) * k;
          }
          items.push([m.it.id, Math.round(ix) + 4, Math.round(iy)]);
        }

        // 연료 막대 (왼쪽 세로)
        if (m.fmax && m.fuel > 0) {
          const h = Math.round((m.fuel / m.fmax) * (TS - 6));
          c.fillStyle = '#e8842a';
          c.fillRect(sx + 1, sy + TS - 3 - h, 2, h);
        }
        // 진행 막대 (아래 가로)
        if (m.rec >= 0 && MRECIPES[m.rec]) {
          const p = clamp(m.prog / MRECIPES[m.rec].t, 0, 1);
          c.fillStyle = '#2a2a32'; c.fillRect(sx + 3, sy + TS - 3, TS - 6, 2);
          c.fillStyle = '#5fc45f'; c.fillRect(sx + 3, sy + TS - 3, Math.round((TS - 6) * p), 2);
        }
        // 축전 잔량
        if (s.store) {
          const p = clamp(m.e / s.store, 0, 1);
          c.fillStyle = '#1e2a28'; c.fillRect(sx + 4, sy + 4, TS - 8, 4);
          c.fillStyle = '#6fe0c0'; c.fillRect(sx + 4, sy + 4, Math.round((TS - 8) * p), 4);
        }
        // 수집 상자 적재량
        if (m.items) {
          const used = m.items.filter(Boolean).length;
          if (used) {
            c.fillStyle = '#d8b06a';
            c.fillRect(sx + 3, sy + TS - 4, Math.round((TS - 6) * used / m.items.length), 2);
          }
        }
        // 상태 점 — 벨트·전주는 빼고(줄지어 깔려 흐르는 물건처럼 보였다)
        if (m.t !== 'belt' && m.t !== 'belt_fast' && m.t !== 'pole') {
          c.fillStyle = this.statusColor(m);
          c.fillRect(sx + TS - 4, sy + 2, 2, 2);
        }

        // 순간 이펙트 (포탑 발사 / 함정 방전)
        if (m.fx > 0) {
          m.fx -= m.t === 'turret' ? 0.2 : 0.35;             // 포탑 섬광은 조금 더 남긴다(3프레임이면 거의 안 보였다)
          c.globalAlpha = clamp(m.fx / 3, 0, 1) * 0.8;
          c.fillStyle = m.t === 'trap' ? '#9fd8ff' : '#ffd86a';
          if (m.t === 'turret' && m.aimV !== undefined) {           // 총구 섬광 — 앞으로 길게, 옆으로 짧게 뻗는 별
            const k = clamp(m.fx / 3, 0, 1);
            c.save(); c.translate(sx + TS / 2 + Math.cos(m.aimV) * 15, sy + 11 + Math.sin(m.aimV) * 15); c.rotate(m.aimV);
            c.globalAlpha = k; c.fillStyle = '#ffb040';
            c.beginPath(); c.moveTo(0, -3); c.lineTo(10 * k + 4, 0); c.lineTo(0, 3); c.lineTo(-2, 0); c.closePath(); c.fill();
            c.beginPath(); c.moveTo(1, -6 * k - 1); c.lineTo(3, 0); c.lineTo(1, 6 * k + 1); c.lineTo(-1, 0); c.closePath(); c.fill();
            c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(1, 0, 2.2, 0, TAU); c.fill();
            c.globalCompositeOperation = 'lighter'; c.globalAlpha = k * 0.5;
            const gl = c.createRadialGradient(0, 0, 0, 0, 0, 14); gl.addColorStop(0, '#ffcf70'); gl.addColorStop(1, 'rgba(255,160,60,0)');
            c.fillStyle = gl; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill();
            c.restore();
          } else c.fillRect(sx - 2, sy - 2, TS + 4, TS + 4);
          c.globalAlpha = 1;
        }
      }
    }
    for (const [id, ix, iy] of items) Art.drawItem(c, id, ix, iy, 14);
    c.restore();
  }
};
mixin(Factory, FactoryRenderPart);

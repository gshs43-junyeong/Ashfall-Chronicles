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
  /** 고장 — 빨간 경고등 · 피어오르는 연기 · 이따금 튀는 불똥. 막 고친 기계는 렌치가 한 바퀴 돈다 */
  drawBroken(c: any, m: any, sx: number, sy: number, time: number) {
    c.save();
    if (m.broke) {
      const seed = m.x * 7 + m.y * 13;
      for (let i = 0; i < 3; i++) {                                     // 연기 — 세 줄기가 차례로 오른다
        const ph = ((time * 0.45 + i / 3 + seed * 0.01) % 1);
        c.globalAlpha = (1 - ph) * 0.45; c.fillStyle = '#5a5a60';
        c.beginPath(); c.arc(sx + TS / 2 + Math.sin(ph * 6 + i) * 4, sy + 4 - ph * 22, 3 + ph * 5, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      const on = ((time * 3 + seed) | 0) % 2 === 0;
      c.fillStyle = on ? '#ff3a2a' : '#5a1810'; c.fillRect(sx + TS - 6, sy + 2, 4, 4);   // 경고등
      if (on) { c.globalAlpha = 0.35; c.fillStyle = '#ff5a3a'; c.beginPath(); c.arc(sx + TS - 4, sy + 4, 6, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
      if (((time * 7 + seed) | 0) % 9 === 0) {                           // 불똥
        c.strokeStyle = '#ffe08a'; c.lineWidth = 1.2; c.beginPath();
        const bx = sx + 4 + (seed % 13), by = sy + 8;
        c.moveTo(bx, by); c.lineTo(bx + 3, by - 4); c.lineTo(bx + 1, by - 6); c.lineTo(bx + 5, by - 10); c.stroke();
      }
    } else {
      const k = (time - m.fixT) / 0.7;                                   // 렌치가 한 바퀴 돌며 사라진다
      c.translate(sx + TS / 2, sy - 6 - k * 8); c.rotate(k * Math.PI * 2); c.globalAlpha = 1 - k;
      c.fillStyle = '#c8d0da'; c.fillRect(-1.5, -7, 3, 12); c.fillRect(-4, -9, 8, 3); c.fillStyle = '#3a4048'; c.fillRect(-1, -9, 2, 2);
    }
    c.restore();
  },
  /** 고장 난 몸의 덜컹임(px) — 늘 떠는 게 아니라 몇 초마다 털털거리다 멎는다(멀쩡히 일하는 떨림과 다르게 읽히게) */
  brokeJolt(m: any, time: number) {
    if (!m.broke) return [0, 0];
    const seed = m.x * 7 + m.y * 13, ph = (time * 0.55 + seed * 0.071) % 1;
    if (ph < 0.3) {                                                      // 털털 — 크게 흔들리고 주저앉는다
      const a = 1 - ph / 0.3;
      return [Math.round(Math.sin(time * 61 + seed) * 2.2 * a), Math.round(Math.abs(Math.sin(time * 37 + seed)) * 1.6 * a)];
    }
    return [((time * 11 + seed) | 0) % 13 === 0 ? 1 : 0, 0];            // 쉬는 동안에도 가끔 한 번 꿈틀
  },
  /** 고장 표시 — 기계 한 칸 위에 통통 뛰는 느낌표 풍선. 빛 **뒤에** 그려 어두운 굴에서도 보인다(rFx) */
  drawBrokeMarks(c: any, w: any, camX: number, camY: number, time: number, tx0: number, ty0: number, tx1: number, ty1: number) {
    for (const m of w.machines.values()) {
      if (!m.broke) continue;
      const [bx, by, bw] = this.boxOf(m);
      if (bx + bw < tx0 - 1 || bx > tx1 + 1 || by < ty0 - 1 || by > ty1 + 2) continue;
      const cx = (bx + bw / 2) * TS - camX, cy = by * TS - camY - 12;
      const seed = m.x * 7 + m.y * 13, bob = Math.abs(Math.sin(time * 4 + seed)) * 3, hot = ((time * 2.5 + seed) | 0) % 2 === 0;
      const y = Math.round(cy - bob), x = Math.round(cx);
      c.save();
      c.fillStyle = 'rgba(20,10,8,.85)';                                 // 윤곽 + 꼬리
      c.beginPath(); c.arc(x, y, 7.5, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(x - 3, y + 5); c.lineTo(x + 3, y + 5); c.lineTo(x, y + 11); c.closePath(); c.fill();
      c.fillStyle = hot ? '#ff5a3a' : '#ffc23a';
      c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(x - 2, y + 4); c.lineTo(x + 2, y + 4); c.lineTo(x, y + 9); c.closePath(); c.fill();
      c.fillStyle = '#2a120c'; c.fillRect(x - 1, y - 4, 2, 5); c.fillRect(x - 1, y + 2, 2, 2);
      if (hot) {                                                         // 깜빡일 때 번지는 빛
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35; c.fillStyle = '#ff6a3a';
        c.beginPath(); c.arc(x, y, 11, 0, TAU); c.fill();
      }
      c.restore();
    }
  },
  render(c: any, w: any, camX: any, camY: any, tx0: any, ty0: any, tx1: any, ty1: any, time: any) { const { WW, WH } = dimsOf(w);
    if (!w.machines.size) return;
    c.save();
    c.imageSmoothingEnabled = false;
    /* 닻은 여러 칸 기계의 왼쪽 아래 — 화면 왼쪽 · 아래 밖에 있어도 몸이 보이면 그린다(가장 큰 것 2칸) */
    /* 한 칸씩 더 — 화면 밖 칸의 물건도 화면 안 칸에서 미끄러져 나가는 중이면 보여야 가장자리에서 안 끊긴다 */
    const y0 = Math.max(0, ty0 - 1), y1 = Math.min(WH - 1, ty1 + 2);
    const x0 = Math.max(0, tx0 - 2), x1 = Math.min(WW - 1, tx1 + 1);

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
        let sx = tx * TS - camX, sy = ty * TS - camY;
        const s = MACHINE[m.t];
        if (this.isBig(m)) { this.renderBig(c, w, m, sx, sy, time, camX, camY); continue; }
        if (m.t !== 'belt' && m.t !== 'belt_fast') {                  // 몸체(타일 그리기는 기계 칸을 건너뛴다) + 일하는 모습
          const busy = m.on && m.act && this.SHAKE[m.t];
          const [bx, by] = this.brokeJolt(m, time);
          const jx = (busy ? Math.round(Math.sin(time * 53 + tx) * this.SHAKE[m.t]) : 0) + bx;
          const jy = (busy && m.hitT !== undefined && time - m.hitT < 0.09 ? 1 : 0) + by;   // 드릴이 한 번 캘 때마다 쿵
          if (m.t === 'turret') this.drawTurret(c, m, sx, sy, (tileHash(tx, ty) * TileArt.V) | 0);
          else TileArt.draw(c, s.tile, (tileHash(tx, ty) * TileArt.V) | 0, sx + jx, sy + jy);
          this.drawWork(c, w, m, sx, sy, time, camX, camY);
          if (m.broke || (m.fixT !== undefined && time - m.fixT < 0.7)) this.drawBroken(c, m, sx, sy, time);
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
          if (s.gate) {                                              // 분기기 — ELSE(거짓) 쪽 출구는 주황 작은 점
            const [ex, ey] = DIR4[(m.dir + (m.els || 1)) & 3];
            c.fillStyle = 'rgba(232,140,60,.9)'; c.fillRect(sx + TS / 2 + ex * 8 - 1.5, sy + TS / 2 + ey * 8 - 1.5, 3, 3);
          }
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
          items.push([m.it.id, Math.round(ix) + 4, Math.round(iy), m.it.src]);
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
    /* 버퍼 기계로 들어가는 물건 — 받는 칸까지 한 칸 더 가며 몸체 가장자리에서 잘린다(pushTo · feedFx) */
    const fd = this.feeds;
    if (fd && fd.length) {
      let n = 0;
      for (const f of fd) {
        const k = (time - f.t0) / f.d;
        if (k >= 1 || k < 0) continue;
        fd[n++] = f;
        const ix = (f.fx + (f.tx - f.fx) * k) * TS - camX, iy = (f.fy + (f.ty - f.fy) * k) * TS - camY + f.fo + (4 - f.fo) * k;
        items.push([f.id, Math.round(ix) + 4, Math.round(iy), f.box]);
      }
      fd.length = n;
    }
    for (const [id, ix, iy, box] of items) {
      if (!box) { Art.drawItem(c, id, ix, iy, 14); continue; }
      /* 기계 몸체 안쪽은 지우고 그린다 — 나오는 물건은 배출구에서 돋고, 들어가는 물건은 투입구로 빨려 든다 */
      const bx = box[0] * TS - camX, by = box[1] * TS - camY, bw = box[2] * TS, bh = box[3] * TS;
      if (ix >= bx && ix + 14 <= bx + bw && iy >= by && iy + 14 <= by + bh) continue;
      c.save(); c.beginPath(); c.rect(ix - 1, iy - 1, 16, 16); c.rect(bx, by, bw, bh); c.clip('evenodd');
      Art.drawItem(c, id, ix, iy, 14); c.restore();
    }
    c.restore();
  },
  /** 여러 칸 기계 — 몸체 · 움직임(factory/big) 다음에 고장 표시 · 배출구 · 연료 · 진행 · 상태 점을 발자국 가장자리에 */
  renderBig(c: any, w: World, m: any, ax: number, ay: number, time: number, camX: number, camY: number) {
    const s = MACHINE[m.t], busy = m.on && m.act && this.SHAKE[m.t], [bx, by] = this.brokeJolt(m, time);
    const jx = (busy ? Math.round(Math.sin(time * 53 + m.x) * this.SHAKE[m.t] * 0.6) : 0) + bx;
    const [X, Y, PW, PH] = this.drawBig(c, m, ax + jx, ay + by, time);
    if (m.t === 'drill_x') this.drawWork(c, w, m, ax, ay, time, camX, camY);   // 비트 · 광맥 점선은 닻 칸에서
    if (m.broke || (m.fixT !== undefined && time - m.fixT < 0.7)) this.drawBroken(c, m, X + PW - TS, Y, time);
    if (s.rot) {
      const [dx, dy] = DIR4[m.dir & 3];
      const ex = dx > 0 ? X + PW : dx < 0 ? X : X + TS / 2, ey = dy < 0 ? Y : dy > 0 ? Y + PH : Y + PH - TS / 2;
      c.fillStyle = 'rgba(255,214,120,.9)'; c.fillRect(ex + dx * 2 - 2 - (dx > 0 ? 2 : 0), ey + dy * 2 - 2 - (dy > 0 ? 2 : 0), 4, 4);
    }
    if (m.fmax && m.fuel > 0) { const h = Math.round((m.fuel / m.fmax) * (PH - 8)); c.fillStyle = '#e8842a'; c.fillRect(X + 1, Y + PH - 4 - h, 2, h); }
    if (m.rec >= 0 && MRECIPES[m.rec]) {
      const p = clamp(m.prog / MRECIPES[m.rec].t, 0, 1);
      c.fillStyle = '#2a2a32'; c.fillRect(X + 4, Y + PH - 3, PW - 8, 2);
      c.fillStyle = '#5fc45f'; c.fillRect(X + 4, Y + PH - 3, Math.round((PW - 8) * p), 2);
    }
    c.fillStyle = this.statusColor(m); c.fillRect(X + PW - 4, Y + 2, 2, 2);
  }
};
mixin(Factory, FactoryRenderPart);

/* ===== game/boss-form-fx.js — 보스 막 · 결계 · 치유 · 날아오른 몸(분사구 · 날개 · 물기둥)의 그림. 판정은 entity/boss-forms ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { BOSS_MOVES } from '../data/bossmoves.js';
import { Enemy } from '../entity.js';
import { Game } from '../game.js';
/* 뒤 겹(drops 단계 — 몸 뒤)에 날개 · 분사 불꽃 · 물기둥, 앞 겹(fx 단계)에 막 · 결계 · 치유 빛. 손님도 net 이 준 값으로 똑같이 그린다. */

type C2 = CanvasRenderingContext2D;
const hs = (s: number, i: number) => { const v = Math.sin(s * 127.1 + i * 311.7) * 43758.5453; return v - Math.floor(v); };

export const BossFormFx: Bag = {
  bossesOnScreen() { return this.ents.filter((e: any) => e instanceof Enemy && e.boss && !e.dead && (e.airborne || e.shield > 0 || e.ward > 0 || e.healRun)); },

  /** 몸 뒤 — 날아오른 보스를 받치는 것 */
  drawFormBack(c: C2) {
    const T = this.time, cx0 = this.cam.x, cy0 = this.cam.y;
    for (const e of this.bossesOnScreen()) {
      if (!e.airborne) continue;
      const x = e.cx - cx0, y = e.cy - cy0, foot = e.y + e.h - cy0, W = e.w, H = e.h;
      c.save();
      if (e.airK === 'jets') {                                 // 분사구 둘 — 아래로 뿜는 불꽃(떨리는 길이)
        for (const s of [-1, 1]) {
          const nx = x + s * W * 0.28, L = 46 + Math.sin(T * 40 + s) * 8 + hs(Math.floor(T * 30), s + 2) * 10;
          c.fillStyle = '#3a3430'; c.fillRect(nx - 9, foot - 14, 18, 14);
          c.fillStyle = '#6a5a48'; c.fillRect(nx - 7, foot - 2, 14, 4);
          const g = c.createLinearGradient(0, foot, 0, foot + L);
          g.addColorStop(0, 'rgba(255,250,220,.95)'); g.addColorStop(0.35, 'rgba(255,170,60,.85)'); g.addColorStop(1, 'rgba(255,80,20,0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(nx - 7, foot + 2); c.quadraticCurveTo(nx, foot + L * 1.1, nx + 7, foot + 2); c.fill();
        }
      } else if (e.airK === 'wings') {                         // 설계선 날개 — 빛으로 그은 깃 골격이 천천히 펄럭인다
        const flap = Math.sin(T * 3) * 0.25;
        for (const s of [-1, 1]) {
          c.save(); c.translate(x + s * W * 0.18, y - H * 0.18); c.scale(s, 1); c.rotate(-0.35 + flap);
          c.shadowColor = 'rgba(170,210,255,.9)'; c.shadowBlur = 10;
          c.strokeStyle = 'rgba(250,244,224,.95)'; c.lineWidth = 3; c.fillStyle = 'rgba(170,210,255,.34)';
          c.beginPath(); c.moveTo(0, 0);
          for (let i = 0; i <= 5; i++) { const a = -0.9 + i * 0.32, L = W * (0.9 - Math.abs(i - 2) * 0.08); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); }
          c.closePath(); c.fill(); c.stroke();
          c.lineWidth = 1; c.strokeStyle = 'rgba(160,210,255,.7)';
          for (let i = 0; i <= 5; i++) { const a = -0.9 + i * 0.32, L = W * (0.9 - Math.abs(i - 2) * 0.08); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.stroke(); }
          c.restore();
        }
      } else {                                                 // 물기둥 — 발밑에서 아래로 굽이치는 물줄기
        const by = Math.min(foot + 260, (e.floorY ? e.floorY(e.cx, e.y + e.h) : e.y + e.h + 200) - cy0);
        for (let i = 0; i < 3; i++) {
          const w = W * (0.42 - i * 0.1);
          c.fillStyle = ['rgba(60,140,200,.55)', 'rgba(120,190,235,.6)', 'rgba(220,245,255,.7)'][i];
          c.beginPath(); c.moveTo(x - w, foot - 6);
          for (let yy = foot; yy <= by; yy += 10) c.lineTo(x - w * (1 + (yy - foot) / 300) + Math.sin(yy * 0.05 - T * 8 + i) * 5, yy);
          for (let yy = by; yy >= foot; yy -= 10) c.lineTo(x + w * (1 + (yy - foot) / 300) + Math.sin(yy * 0.05 - T * 8 + i + 2) * 5, yy);
          c.closePath(); c.fill();
        }
        c.fillStyle = 'rgba(230,250,255,.8)';
        for (let i = 0; i < 6; i++) { const u = (T * 1.4 + hs(e.nid || 1, i)) % 1; c.beginPath(); c.arc(x + (hs(3, i) - 0.5) * W * 0.8, foot + u * (by - foot), 2.5, 0, TAU); c.fill(); }
      }
      c.restore();
    }
  },

  /** 몸 앞 — 방어막(푸른 육각 껍질) · 결계(금빛 룬 고리, 남은 칸만큼) · 치유(초록 숨) */
  drawFormFront(c: C2) {
    const T = this.time, cx0 = this.cam.x, cy0 = this.cam.y;
    for (const e of this.bossesOnScreen()) {
      const x = e.cx - cx0, y = e.cy - cy0, R = Math.max(e.w, e.h) * 0.62 + 14;
      c.save();
      if (e.shield > 0) {
        const g = c.createRadialGradient(x, y, R * 0.6, x, y, R);
        g.addColorStop(0, 'rgba(120,190,255,0)'); g.addColorStop(1, 'rgba(140,210,255,.32)');
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y, R, R * 1.05, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(190,230,255,.75)'; c.lineWidth = 1.2;
        const n = 14;
        for (let i = 0; i < n; i++) {                            // 겉을 도는 육각 판 — 천천히 돌며 반짝인다
          const a = i / n * TAU + T * 0.4, px = x + Math.cos(a) * R * 0.94, py = y + Math.sin(a) * R * 0.98, r = 9;
          c.globalAlpha = 0.4 + 0.5 * Math.max(0, Math.sin(T * 3 + i * 1.3));
          c.beginPath(); for (let j = 0; j < 6; j++) { const b = j * TAU / 6 + a; c[j ? 'lineTo' : 'moveTo'](px + Math.cos(b) * r, py + Math.sin(b) * r); } c.closePath(); c.stroke();
        }
        c.globalAlpha = 1;
      }
      if (e.ward > 0) {
        const wm = e.wardMax || 12, col = (BOSS_MOVES[e.type] || {}).c || '#ffe08a';
        c.strokeStyle = 'rgba(255,224,138,.25)'; c.lineWidth = 10; c.beginPath(); c.arc(x, y, R + 6, 0, TAU); c.stroke();
        for (let i = 0; i < wm; i++) {                           // 남은 칸만 빛나는 고리 — 칠 때마다 한 칸씩 꺼진다
          const a0 = -Math.PI / 2 + i / wm * TAU + T * 0.3, a1 = a0 + TAU / wm * 0.8, on = i < e.ward;
          c.strokeStyle = on ? '#ffe08a' : 'rgba(120,100,60,.5)'; c.lineWidth = on ? 5 : 3;
          c.beginPath(); c.arc(x, y, R + 6, a0, a1); c.stroke();
        }
        c.globalAlpha = 0.15 + 0.1 * Math.sin(T * 5); c.fillStyle = col;
        c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill(); c.globalAlpha = 1;
      }
      if (e.healRun) {
        const g = c.createRadialGradient(x, y, 0, x, y, R * 1.2);
        g.addColorStop(0, 'rgba(140,255,160,.35)'); g.addColorStop(1, 'rgba(140,255,160,0)');
        c.globalAlpha = 0.6 + 0.4 * Math.sin(T * 8); c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 1.2, 0, TAU); c.fill();
        c.globalAlpha = 1; c.strokeStyle = '#b0ffbe'; c.lineWidth = 3;
        for (let i = 0; i < 4; i++) { const u = (T * 0.8 + i / 4) % 1, px = x + (hs(i, 9) - 0.5) * e.w, py = y + e.h * 0.4 - u * e.h; c.globalAlpha = Math.sin(u * Math.PI);
          c.beginPath(); c.moveTo(px - 5, py); c.lineTo(px + 5, py); c.moveTo(px, py - 5); c.lineTo(px, py + 5); c.stroke(); }
      }
      c.restore();
    }
  },
};
mixin(Game.prototype, BossFormFx, true);

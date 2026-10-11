/* ===== game/boss-gap-fx.js — 보스의 틈 · 방어 자세를 몸에 보이게 — 글 알림 없이 몸과 체력 막대로만(사용자 결정) ===== */
/* 비틀거림 = 머리 위를 도는 별 셋 · 과열 = 달아오른 빛 + 김 · 균열 = 몸에 번진 금 + 떨어지는 조각 · 방어 자세 = 앞을 덮는 막.
   ★ 손님 화면도 같은 그림 — 값은 호스트가 보낸 gapK · gapT · braceV(game/net.ts). 사연: docs/code-history.md#h181 */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { BOSS_MOVES, GAP_KIND } from '../data/bossmoves.js';
import { Sprites } from '../sprites.js';
import { Enemy } from '../entity.js';
import { Game } from '../game.js';

export const BossGapFxPart: Bag = {

  /** 틈이 열리는 순간 — 갈래 빛깔의 고리 · 흔들림, 헛손질이면 한 겹 더 */
  gapBurst(e: any) {
    const K = GAP_KIND[e.gapK]; if (!K) return;
    this.ringFx(e.cx, e.cy, Math.max(e.w, e.h) * 0.8, K.c, 0.45);
    if (e.gapMiss) this.ringFx(e.cx, e.y + e.h, Math.max(e.w, e.h) * 1.2, '#ffffff', 0.6);
    this.shake = Math.max(this.shake || 0, e.gapMiss ? 9 : 5);
    this.sfxAt && this.sfxAt(e.gapK === 'stagger' ? 'sk_quake' : e.gapK === 'heat' ? 'sk_fire' : 'hit_crit', e.cx / 22, e.cy / 22);
  },

  /** 몸 위의 틈 · 방어 자세 — drawMobFx 다음(같은 카메라) */
  drawBossGaps(c: CanvasRenderingContext2D, camX: number, camY: number) {
    const t = this.time;
    for (const e of this.ents || []) {
      if (!(e instanceof Enemy) || e.dead || !e.boss) continue;
      if (e.ghost && e.gapT > 0) e.gapT -= 1 / 60;                    // 손님 — 받은 남은 시간을 그림 박자로 줄인다
      const x = e.cx - camX, y = e.cy - camY, R = Math.max(e.w, e.h) * 0.62;
      if (x < -R * 2 || y < -R * 2 || x > this.W + R * 2 || y > this.H + R * 2) continue;
      const col = (BOSS_MOVES[e.type] || {}).c || '#bcd8f4';
      c.save();
      if (e.bracing()) {                                              // 방어 자세 — 앞을 덮는 막(보스 빛깔) · 테두리가 고동친다
        const art = Sprites.vfxArt('ward_shell', col), a = 0.32 + Math.sin(t * 9) * 0.08;
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
        if (art) c.drawImage(art, x - R, y - R, R * 2, R * 2);
        c.strokeStyle = col; c.lineWidth = 3; c.globalAlpha = a + 0.25;
        const f = e.facing || 1;
        c.beginPath(); c.arc(x, y, R * 1.02, f > 0 ? -1.1 : Math.PI - 1.1, f > 0 ? 1.1 : Math.PI + 1.1); c.stroke();
      }
      if (e.gapT > 0) {
        const K = GAP_KIND[e.gapK], k = Math.min(1, e.gapT / Math.max(0.3, e.gapMax || 1)), fade = Math.min(1, e.gapT * 3);
        if (e.gapK === 'stagger') {                                   // 별 셋이 머리 위를 돈다 — 기울어진 타원
          const hy = e.y - camY - 10;
          for (let i = 0; i < 3; i++) {
            const a = t * 5 + i * TAU / 3, sx = x + Math.cos(a) * e.w * 0.42, sy = hy + Math.sin(a) * 7;
            c.globalAlpha = fade * (Math.sin(a) > 0 ? 1 : 0.55); c.fillStyle = i ? '#ffe8a0' : '#ffffff';
            c.beginPath();
            for (let j = 0; j < 10; j++) { const r = j % 2 ? 3.2 : 8, b = j * Math.PI / 5 + t * 3; c.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); }
            c.closePath(); c.fill();
          }
        } else if (e.gapK === 'heat') {                               // 달아오른 빛 — 몸 안쪽이 붉게 · 김이 오른다
          c.globalCompositeOperation = 'lighter';
          const g = c.createRadialGradient(x, y, 2, x, y, R * 1.1);
          g.addColorStop(0, 'rgba(255,150,70,' + (0.45 * fade) + ')'); g.addColorStop(1, 'rgba(255,90,30,0)');
          c.fillStyle = g; c.fillRect(x - R * 1.1, y - R * 1.1, R * 2.2, R * 2.2);
          if (Math.random() < 0.5) this.mfxAdd({ k: 'smoke', x: e.cx + (Math.random() - 0.5) * e.w * 0.7, y: e.y + e.h * 0.2, vx: (Math.random() - 0.5) * 20, vy: -60, life: 0.9, r: 5, c: '200,190,185', c2: '240,235,230' });
          if (Math.random() < 0.4) this.mfxAdd({ k: 'ember', x: e.cx + (Math.random() - 0.5) * e.w, y: e.cy, vx: (Math.random() - 0.5) * 60, vy: -90, life: 0.6, r: 2, c: '255,130,50', c2: '255,226,150' });
        } else if (e.gapK === 'crack') {                              // 몸에 번진 금 — 흰 금 그림, 남은 시간만큼 짙게
          const art = Sprites.vfxArt('ward_crack', K.c);
          c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 + 0.4 * k;
          if (art) c.drawImage(art, x - R * 0.9, y - R * 0.9, R * 1.8, R * 1.8);
          if (Math.random() < 0.25) this.mfxAdd({ k: 'mote', x: e.cx + (Math.random() - 0.5) * e.w, y: e.cy, vx: (Math.random() - 0.5) * 80, vy: -40, life: 0.7, r: 2.2, c: '200,230,255', c2: '255,255,255' });
        }
        if (e.gapMiss) {                                              // 헛손질 — 발밑 먼지 고리가 한 번 더 번진다
          c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.25 * fade; c.strokeStyle = '#fff4d0'; c.lineWidth = 2;
          c.beginPath(); c.ellipse(x, e.y + e.h - camY, e.w * (0.6 + (1 - k) * 0.4), 6, 0, 0, TAU); c.stroke();
        }
      }
      c.restore();
    }
  }
};
mixin(Game.prototype, BossGapFxPart, true);

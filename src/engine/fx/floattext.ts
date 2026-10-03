/* ===== engine/fx/floattext.ts — 떠오르는 글자(피해 · 회복 · 알림 숫자) ===== */
/* 맞은 자리에서 솟았다가 중력에 꺾여 떨어지며 흐려진다. 나오는 순간 튀어 커졌다 가라앉아(pop) 큰 타격이 눈에 걸린다.
   글꼴 · 치명타 표시 글은 게임이 정한다. */
import { pop } from '../core/tween.js';

export class FloatText {
  declare c: string; declare crit: boolean; declare life: number; declare max: number; declare v: number | string; declare vy: number; declare x: number; declare y: number;
  constructor(x: number, y: number, v: number | string, c: string, crit: unknown, life = 0.85) {
    this.x = x + (Math.random() - 0.5) * 8; this.y = y; this.v = v; this.c = c; this.crit = !!crit; this.life = life; this.max = life; this.vy = -70;
  }
  update(dt: number): boolean { this.life -= dt; this.y += this.vy * dt; this.vy += 110 * dt; return this.life > 0; }
}

export interface FloatTextStyle {
  font(crit: boolean): string;       // 글꼴(크기 포함)
  critLabel?: string; critFont?: string; critColor?: string;   // 치명타 위에 붙는 작은 글
  outline?: string;                  // 그림자 색(1px 아래 오른쪽)
}

/** 묶음 그리기 — (camX, camY) 를 뺀 화면 자리에 */
export function drawFloatTexts(c: CanvasRenderingContext2D, list: Iterable<FloatText>, camX: number, camY: number, st: FloatTextStyle): void {
  for (const t of list) {
    c.globalAlpha = Math.max(0, Math.min(1, t.life / t.max));
    const k = pop(1 - t.life / t.max, t.crit ? 1.7 : 1.35, 0.12);
    c.save(); c.translate(t.x - camX, t.y - camY); c.scale(k, k);
    c.font = st.font(t.crit);
    c.fillStyle = st.outline || '#000'; c.fillText(String(t.v), 1, 1);
    c.fillStyle = t.c; c.fillText(String(t.v), 0, 0);
    if (t.crit && st.critLabel) { c.font = st.critFont || c.font; c.fillStyle = st.critColor || '#ffd24a'; c.fillText(st.critLabel, 0, -15); }
    c.restore();
  }
  c.globalAlpha = 1;
}

/* ===== engine/render/outline.ts — 그림 둘레에 윤곽 두르기(물속 · 어둠 속에서 몸이 배경에 묻히지 않게) ===== */
/* 발광으로 띄우면 물속·어둠이 밝아 보여 분위기가 깨진다. 실제로 물속에서 보이는 식으로 — 아래·옆으로 어두운 그림자 윤곽,
   위에는 수면에서 내려오는 빛이 등에 맺힌 한 줄. draw(ox, oy) 는 그 자리만큼 비켜 그림을 한 번 그리는 함수다.
   둘 다 조명 밑에 그리므로 어둠에서는 같이 어둡다. */

export interface OutlineOpts {
  dark?: number;                       // 어두운 윤곽의 짙기(0~1)
  rim?: number;                        // 위쪽 빛 한 줄의 짙기(0 이면 없음)
  offsets?: [number, number][];        // 어두운 윤곽을 찍을 자리들
  light?: boolean;                     // true 면 어두운 윤곽 대신 밝은 윤곽(아주 어두운 몸 · 어두운 물)
}

const AROUND: [number, number][] = [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]];

export function drawOutlined(c: CanvasRenderingContext2D, draw: (ox: number, oy: number) => unknown, o: OutlineOpts = {}): void {
  const a0 = c.globalAlpha;
  c.save();
  c.filter = o.light ? 'brightness(0) invert(1)' : 'brightness(0)';
  c.globalAlpha = a0 * (o.dark ?? 0.55);
  for (const [ox, oy] of o.offsets || AROUND) draw(ox, oy);
  if ((o.rim ?? 0.32) > 0 && !o.light) {
    c.filter = 'brightness(0) invert(1)';
    c.globalAlpha = a0 * (o.rim ?? 0.32);
    draw(0, -1);
  }
  c.restore();
  c.filter = 'none';
}

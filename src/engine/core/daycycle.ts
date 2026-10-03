/* ===== engine/core/daycycle.ts — 하루: 밝기 · 해와 달의 길 · 해가 비추는 방향 ===== */
/* 시각은 하루 안의 분(0 ~ len). 해는 rise 에 떠 set 에 지고 하늘에서는 동(오른쪽)에서 서(왼쪽)로 반원을 그린다.
   밝기는 새벽·저녁 구간에서만 오르내린다(낮 1 · 밤 0). 그림자 방향(sunDir)이 그린 해 자리(arc)와 같은 식을 써야
   해가 오른쪽에 떠 있는데 그늘도 오른쪽으로 눕는 일이 없다. */

export interface DayCycleConfig {
  len?: number;                  // 하루 길이(분)
  rise?: number; set?: number;   // 해 뜨고 지는 시각
  dawn?: [number, number];       // 밝아지는 구간
  dusk?: [number, number];       // 어두워지는 구간
}

export class DayCycle {
  declare len: number; declare rise: number; declare set: number;
  declare dawn: [number, number]; declare dusk: [number, number];

  constructor(c: DayCycleConfig = {}) {
    this.len = c.len || 1440; this.rise = c.rise ?? 330; this.set = c.set ?? 1110;
    this.dawn = c.dawn || [240, 420]; this.dusk = c.dusk || [1020, 1200];
  }

  /** 낮의 밝기 0~1 */
  light(t: number): number {
    const [a0, a1] = this.dawn, [b0, b1] = this.dusk;
    if (t >= a1 && t <= b0) return 1;
    if (t > b0 && t < b1) return 1 - (t - b0) / (b1 - b0);
    if (t >= b1 || t < a0) return 0;
    return (t - a0) / (a1 - a0);
  }

  /** 해(sun) 또는 달이 하늘 반원 위 어디쯤인가 — 0 = 동쪽 지평선(뜸) · 0.5 = 한가운데 · 1 = 서쪽(짐), 범위 밖은 지평선 아래 */
  arc(t: number, sun: boolean): number {
    const t0 = sun ? this.rise : this.set, dur = sun ? this.set - this.rise : this.len - this.set + this.rise, off = (this.len - dur) / 2;
    return ((((t - t0 + off) % this.len) + this.len) % this.len - off) / dur;
  }

  /** 지평선 위 높이 0~1(sin) — 음수면 지평선 아래 */
  height(t: number, sun = true): number { return Math.sin(Math.PI * this.arc(t, sun)); }

  /** 칸에서 해를 향하는 방향(x: + 오른쪽 · y: − 위)과 세기 k(0~1) — 해가 지평선 아래면 null.
      cloud 0~1 은 구름이 가린 정도(그림자가 옅어진다) · minUp 은 가장 낮은 해의 높이(너무 누운 그림자가 화면을 다 덮지 않게) */
  sunDir(t: number, cloud = 0, minUp = 0.3): { x: number; y: number; k: number } | null {
    const u = this.arc(t, true), up = Math.sin(Math.PI * u);
    if (up <= 0.02) return null;
    const k = Math.max(0, Math.min(1, up * 3)) * (1 - 0.75 * Math.max(0, Math.min(1, cloud)));
    return { x: Math.cos(Math.PI * u), y: -Math.max(minUp, up), k };
  }

  /** 밤인가(어두운 시간) — from~to 시각(분)을 밤으로 친다 */
  isNight(t: number, from = 19 * 60, to = 5 * 60): boolean { return t < to || t > from; }
}

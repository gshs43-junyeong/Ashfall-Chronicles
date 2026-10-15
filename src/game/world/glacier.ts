/* ===== world/glacier.js — 빙하 지대와 서리 지대를 가른다 — 빙하: 나무 없는 맨얼음 · 얼음 탑 · 크레바스 · 압력 능선 / 서리: 눈 둔덕 · 눈 덮인 바위 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { T, TILE_DEF } from '../data.js';
import { TS, World, inSeaZone } from '../world.js';
/* world.js 의 World 에서 나눈 조각 — 읽히는 순간 World.prototype 에 붙는다(main.js 가 world.js 다음에 읽는다).
   ★ 둘 다 눈 덮인 계단 땅에 소나무라 한 지역처럼 보였다(사용자 지적 2026-10-15). 제 난수(seed+'_glacier')만 쓴다 —
   본 난수를 뽑으면 뒤따르는 생성이 씨앗마다 바뀐다. 구조물(유적 · 상자 · 마을) 둘레와 바이옴 경계 띠는 건드리지 않는다. */

export const WorldGlacier: Bag & ThisType<World> = {
  /** 이 열을 깎거나 쌓아도 되나 — 바다 · 물가 · 유적 · 물건 둘레 · 하늘 섬 밑은 피한다 */
  _coldFree(x: number, pad = 3) { const { WW } = this.dims;
    if (x < 2 || x >= WW - 2 || inSeaZone(x, this.dims.SEA_X1)) return false;
    if (this.beach && x >= this.beach.x0 - 4 && x <= this.beach.x1 + 4) return false;
    const s = this.surface[x];
    for (let dy = -12; dy <= 10; dy++) if (this.inRuin && this.inRuin(x, s + dy)) return false;
    for (const o of this.objects) {
      const ox = o.x / TS, oy = o.y / TS;
      if (Math.abs(ox - x) < pad + (o.w || 22) / TS && Math.abs(oy - s) < 14) return false;
    }
    for (let y = s - 1; y >= s - 3; y--) {                          // 위에 뭔가 놓인 자리(건물 · 다리)는 그대로
      const t = this.get(x, y);
      if (t !== T.AIR && t !== T.SNOW && t !== T.MUSHROOM && t !== T.PINELEAF && t !== T.WOOD) return false;
    }
    return this.get(x, s) === T.SNOW || this.get(x, s) === T.ICE;
  },
  /** 열의 지표를 다시 잰다(쌓거나 판 뒤) — 햇빛 · 지도가 이 값을 본다 */
  _resurf(x: number) { const { SKY_Y, WH } = this.dims;
    let y = Math.max(SKY_Y, this.surface[x] - 14);
    while (y < WH - 1 && !TILE_DEF[this.get(x, y)].solid) y++;
    this.surface[x] = y;
  },

  sculptGlacier() { const { SEA_X1, GLACIER_X1 } = this.dims;
    const r = new RNG(this.seed + '_glacier');
    const x0 = SEA_X1 + 6, x1 = GLACIER_X1 - 14;                    // 서리 지대와 맞물리는 띠(경계 섞임)는 남긴다
    // ① 나무 없는 땅 — 밑동이 빙하 안인 소나무 · 버섯은 걷는다(잎은 밑동에서 이어진 것만)
    for (let x = x0; x < x1; x++) {
      const s = this.surface[x];
      if (this.get(x, s - 1) === T.MUSHROOM) this.set(x, s - 1, T.AIR);
      if (this.get(x, s - 1) !== T.WOOD) continue;
      const q: number[][] = [[x, s - 1]], seen = new Set<number>();
      while (q.length) {
        const [qx, qy] = q.pop()!, k = qy * 100000 + qx;
        if (seen.has(k) || Math.abs(qx - x) > 6 || qy < s - 20 || qy >= s) continue;
        const t = this.get(qx, qy);
        if (t !== T.WOOD && t !== T.PINELEAF) continue;
        seen.add(k); this.set(qx, qy, T.AIR);
        q.push([qx + 1, qy], [qx - 1, qy], [qx, qy - 1], [qx, qy + 1]);
      }
    }
    // ② 바람에 쓸린 맨얼음 — 눈 덮개가 군데군데 벗겨져 푸른 얼음이 드러난다
    let ph = r.range(0, 100);
    for (let x = x0; x < x1; x++) {
      const s = this.surface[x];
      const v = Math.sin(x * 0.07 + ph) + Math.sin(x * 0.161 + ph * 1.7) * 0.6;
      if (v > 0.55 && this.get(x, s) === T.SNOW && this._coldFree(x, 1)) this.set(x, s, T.ICE);
    }
    // ③ 압력 능선 · 얼음 탑(세락) · 크레바스 — 차례로 흩뿌린다(넓이 배수)
    let x = x0 + r.int(6, 14);
    while (x < x1 - 8) {
      const roll = r.next();
      if (roll < 0.38) {                                              // 얼음 탑 — 1~3개가 무리로, 위가 좁고 살짝 기운다
        const n = r.int(1, 3);
        let cx = x;
        for (let i = 0; i < n; i++) {
          const w = r.int(1, 3), h = w === 1 ? r.int(3, 5) : r.int(2, 5), lean = r.pick([-1, 0, 0, 1]);
          if ([0, 1, 2].every(d => this._coldFree(cx + d))) {
            const base = Math.min(...Array.from({ length: w }, (_, d) => this.surface[cx + d]));
            for (let j = 0; j < h; j++) {
              const ww = Math.max(1, w - Math.floor(j * w / h)), sh = j >= h / 2 ? lean : 0;
              for (let d = 0; d < ww; d++) {
                const tx = cx + d + sh, ty = base - 1 - j;
                if (this.get(tx, ty) === T.AIR) this.set(tx, ty, T.ICE);
              }
              for (let d = 0; d < w; d++) for (let fy = base; fy < this.surface[cx + d]; fy++) this.set(cx + d, fy, T.ICE);   // 계단 밑을 메운다
            }
            for (let d = -1; d <= w + 1; d++) this._resurf(cx + d);
          }
          cx += w + r.int(2, 4);
        }
        x = cx + r.int(10, 20);
      } else if (roll < 0.68) {                                       // 크레바스 — 위 2칸 · 밑으로 좁아지는 틈, 한쪽은 디딜 턱
        const d = r.int(4, 6);
        if ([-1, 0, 1, 2].every(k => this._coldFree(x + k, 2))) {
          const s = Math.max(this.surface[x], this.surface[x + 1]);
          for (let j = 0; j < d; j++) {
            this.set(x, s + j, T.AIR);
            if (j < d - 2) this.set(x + 1, s + j, T.AIR);
            this.walls[this.i(x, s + j)] = 5; this.walls[this.i(x + 1, s + j)] = 5;
          }
          for (let j = d; j < d + 2; j++) { this.set(x, s + j, T.ICE); this.set(x + 1, s + j, T.ICE); }
          if (r.chance(0.35)) this.set(x, s, T.SNOW);                  // 눈다리 — 반쯤 덮인 틈
          this._resurf(x); this._resurf(x + 1);
        }
        x += r.int(14, 26);
      } else {                                                        // 압력 능선 — 낮고 긴 얼음 둔덕
        const L = r.int(4, 8);
        if (Array.from({ length: L }, (_, k) => k).every(k => this._coldFree(x + k))) {
          for (let k = 0; k < L; k++) {
            const hh = k === 0 || k === L - 1 ? 1 : r.chance(0.5) ? 2 : 1;
            const s = this.surface[x + k];
            for (let j = 1; j <= hh; j++) if (this.get(x + k, s - j) === T.AIR) this.set(x + k, s - j, T.ICE);
            this._resurf(x + k);
          }
        }
        x += L + r.int(8, 16);
      }
    }
  },

  softenFrost() { const { GLACIER_X1, BIOMES } = this.dims;
    const ice = BIOMES.find((b: any) => b.id === 'ice'), r = new RNG(this.seed + '_frost');
    if (!ice) return;
    const x0 = GLACIER_X1 + 14, x1 = ice.x1 - 14;
    // 눈 둔덕 — 바람 그늘에 쌓인 둥근 눈더미(계단을 부드럽게)
    let x = x0 + r.int(4, 10);
    while (x < x1 - 10) {
      const L = r.int(5, 11), top = r.chance(0.4) ? 2 : 1;
      if (Array.from({ length: L }, (_, k) => k).every(k => this._coldFree(x + k) && this.get(x + k, this.surface[x + k] - 1) === T.AIR)) {
        for (let k = 0; k < L; k++) {
          const t = k / (L - 1), hh = Math.round(Math.sin(t * Math.PI) * top + 0.2);
          const s = this.surface[x + k];
          for (let j = 1; j <= hh; j++) if (this.get(x + k, s - j) === T.AIR) this.set(x + k, s - j, T.SNOW);
          this._resurf(x + k);
        }
      }
      x += L + r.int(10, 22);
    }
    // 눈 덮인 바위 — 2~3칸 돌덩이에 눈 모자
    x = x0 + r.int(6, 16);
    while (x < x1 - 6) {
      const w = r.int(2, 3);
      if ([0, 1, 2].slice(0, w).every(k => this._coldFree(x + k) && this.get(x + k, this.surface[x + k] - 1) === T.AIR)) {
        const base = Math.min(...[0, 1, 2].slice(0, w).map(k => this.surface[x + k]));
        for (let k = 0; k < w; k++) {
          for (let fy = base; fy < this.surface[x + k]; fy++) this.set(x + k, fy, T.STONE);
          this.set(x + k, base - 1, T.STONE);
          if (this.get(x + k, base - 2) === T.AIR) this.set(x + k, base - 2, k === 0 || k === w - 1 ? T.SNOW : T.STONE);
          if (w === 3 && k === 1 && this.get(x + k, base - 3) === T.AIR) this.set(x + k, base - 3, T.SNOW);
        }
        for (let k = 0; k < w; k++) this._resurf(x + k);
      }
      x += r.int(26, 48);
    }
  },
};

mixin(World.prototype, WorldGlacier, true);

/* ===== game/farm.js — 밭 · 물 주기 · 물줄기 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { SPRINKLE_R, T, TILE_DEF } from '../data.js';
import { DRAWABLE, FLUID_KIND } from '../data/materials.js';
import { TS } from '../world.js';
import { makeItem } from '../items.js';
import { Drop, Part } from '../entity.js';
import { Factory } from '../factory.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const FarmPart: Bag = {

  /* ================= 밭은 아침에 자란다 ================= */
  growCropsDaily() { const { WW } = dimsOf(this.world);
    const w = this.world; if (!w || !w.crops || !w.crops.size) return;
    const lv = this.player.profLv('farm'), day = this.dayCount;
    if (this.event && this.event.id === 'rain') this.rainWater(w, day);   // 비는 하늘이 트인 밭을 적신다
    Factory.sprinkle(w, day);                                             // 스프링클러가 제 둘레 밭에 물을 준다
    let grew = 0, ripe = 0;
    const dry = new Set();
    const steps = 1 + (this.rng.chance((lv - 1) * 0.07) ? 1 : 0);
    for (let i = 0; i < steps; i++) {
      const g = w.growCrops(this.rng, 1, 99, day);   // 아침에는 반드시 한 단계 (확률 굴림 없음) · 젖은 밭만
      grew += g.grew.length; ripe += g.ripe.length;
      for (const k of g.dry) dry.add(k);
    }
    if (dry.size && this.everPlanted)
      this.toast(tr('밭이 말라 {n}칸이 자라지 않았다 — 물뿌리개로 물을 주자', { n: dry.size }), 'bad');
    if (grew + ripe > 0 && this.everPlanted) {
      this.toast(tr('밤새 밭이 자랐다 — {n}칸{v}', { n: grew + ripe, v: ripe ? ` ${tr('· {ripe}칸은 다 여물었다', { ripe })}` : '' }), 'good');
      // 화면 안에 밭이 있으면 티를 낸다
      for (const k of w.crops) {
        const x = k % WW, y = (k / WW) | 0;
        if (Math.abs(x * TS - this.cam.x - this.W / 2) > this.W / 2 + TS) continue;
        if (Math.abs(y * TS - this.cam.y - this.H / 2) > this.H / 2 + TS) continue;
        const d = TILE_DEF[w.get(x, y)];
        if (!d || !d.crop) continue;
        for (let i = 0; i < 2; i++)
          this.parts.push(new Part((x + .5) * TS, (y + .6) * TS, d.crop.ripe ? '#ffe08a' : '#8fc85a', -22, .5));
      }
    }
  },

  /** 물뿌리개 — 물 칸이면 가득 채우고, 밭(또는 작물 밑 밭)이면 물을 한 번 준다. */
  useWateringCan(w, hi, hd, tx, ty) {
    const t = w.get(tx, ty), p = this.player;
    if (FLUID_KIND[t] === 1 || FLUID_KIND[t] === 2) {
      if ((hi.w | 0) >= hd.water) { this.toast(tr('물뿌리개가 이미 가득하다'), 'bad'); return; }
      hi.w = hd.water;
      this.splashStreaks((tx + .5) * TS, ty * TS, 8); this.sfx('splash');
      this.toast(tr('물뿌리개를 채웠다 — {n}번', { n: hd.water }));
      UI.refreshBag(); return;
    }
    const fy = TILE_DEF[t].farm ? ty : TILE_DEF[w.get(tx, ty + 1)].farm && TILE_DEF[t].crop ? ty + 1 : -1;
    if (fy < 0) { this.toast(tr('밭이나 작물에 물을 준다 — 물가를 우클릭하면 채운다'), 'bad'); return; }
    if (!(hi.w > 0)) { this.toast(tr('물뿌리개가 비었다 — 물가를 우클릭해 채우자'), 'bad'); return; }
    w.waterFarm(tx, fy, this.dayCount);
    hi.w--;
    this.pourStreaks((tx + .5) * TS, (fy - 1.4) * TS, 10); this.sfx('splash');
    UI.refreshBag();
  },

  /** 양동이 — 빈 것은 물 칸을 통째로 떠 담고(그 칸의 물이 사라진다), 물 양동이는 빈 칸에 도로 붓는다. */
  useBucket(w, hi, tx, ty) {
    const t = w.get(tx, ty), p = this.player, full = hi.id === 'water_bucket';
    if (!full && !DRAWABLE[t]) { this.toast(tr('물 칸을 우클릭해 떠 담는다'), 'bad'); return; }
    if (full && t !== T.AIR) { this.toast(tr('빈 칸에만 부을 수 있다'), 'bad'); return; }
    w.set(tx, ty, full ? T.WATER : T.AIR);
    hi.c--; if (hi.c <= 0) p.bag[p.sel] = null;
    const got = makeItem(full ? 'bucket' : 'water_bucket', 1);
    if (!p.addItem(got)) this.drops.push(new Drop((tx + .5) * TS, (ty + .5) * TS, got));
    this.splashStreaks((tx + .5) * TS, ty * TS, 8);
    this.sfx('splash');
    UI.refreshBag();
  },

  /** 비 오는 아침 — 위로 막힌 것 없이 하늘이 트인 밭만 적신다(지붕 밑·굴 속 밭은 그대로). */
  rainWater(w, day) { const { WW } = dimsOf(this.world);
    for (const k of w.crops) {
      const x = k % WW, fy = ((k / WW) | 0) + 1;
      let open = true;
      for (let y = fy - 2; y >= 0; y--) if (TILE_DEF[w.get(x, y)].solid === 1) { open = false; break; }
      if (open) w.waterFarm(x, fy, day);
    }
  },

  /* ================= 물줄기 — 점이 아니라 가는 선(분수대 물줄기처럼). 인물 뒤(objects 단계)에 반투명으로 ================= */
  streak(x, y, vx, vy, life) {
    const a = this.streaks || (this.streaks = []);
    if (a.length < 260) a.push({ x, y, vx, vy, t: life, life });
  },
  /** 물뿌리개로 줄 때 — 주둥이 높이에서 앞으로 흘러 떨어진다. */
  pourStreaks(x, y, n) {
    for (let i = 0; i < n; i++) this.streak(x + (Math.random() - .5) * 10, y, (Math.random() - .5) * 30, 40 + Math.random() * 50, .45);
  },
  /** 물을 뜰 때 — 짧게 튀어 오른다. */
  splashStreaks(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - .5) * 1.4;
      this.streak(x, y, Math.cos(a) * 90, Math.sin(a) * (110 + Math.random() * 60), .5);
    }
  },
  /** 렌더 단계 — 물줄기. 아침(5~9시)에 전력과 물이 있는 스프링클러는 꼭지에서 양옆으로 뿜는다.
   *  ★ 떨어지는 거리를 1~SPRINKLE_R[0] 칸에서 고르고 속도를 거꾸로 잰다 — 물줄기가 닿는 곳이 실제로 적시는 범위다. */
  rStreaks(f) {
    const { c, w, camX, camY, tx0, ty0, tx1, ty1 } = f;
    const dt = Math.min(0.05, Math.max(0, this.time - (this._stT || this.time))); this._stT = this.time;
    const hour = this.dayT / 60, RX = SPRINKLE_R[0], RY = SPRINKLE_R[1];
    if (hour >= 5 && hour < 9 && w.machines.size) {
      for (const m of w.machines.values()) {
        if (m.t !== 'sprinkler' || !m.on || !m.act || m.x < tx0 - RX || m.x > tx1 + RX || m.y < ty0 - RY || m.y > ty1 + RY) continue;
        if (Factory.sat(w, m) <= 0) continue;
        m.sprT = (m.sprT || 0) + dt * 26;                 // 한 대에 초당 26줄
        for (; m.sprT >= 1; m.sprT--) {
          const side = Math.random() < .5 ? -1 : 1, a = 0.35 + Math.random() * 0.3;   // 낮은 호 — 꼭대기가 4칸 안(비처럼 안 보이게)
          const d = (1 + Math.sqrt(Math.random()) * (RX - 1)) * TS;   // 먼 곳일수록 넓어 줄을 더 보낸다
          const sp = Math.sqrt(d * 420 / Math.sin(2 * a)), fl = 2 * sp * Math.sin(a) / 420;
          this.streak((m.x + .5) * TS + side * 5, m.y * TS + 1, side * Math.cos(a) * sp, -Math.sin(a) * sp, fl + .35);
        }
      }
    }
    const a = this.streaks;
    if (!a || !a.length) return;
    c.lineCap = 'round'; c.lineWidth = 1.4;
    for (let i = a.length - 1; i >= 0; i--) {
      const s = a[i];
      s.t -= dt; s.vy += 420 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const tx = Math.floor(s.x / TS), ty = Math.floor(s.y / TS);
      if (s.t <= 0 || TILE_DEF[w.get(tx, ty)].solid === 1) { a[i] = a[a.length - 1]; a.pop(); continue; }
      const k = 0.035, al = 0.7 * Math.min(1, s.t / s.life * 2);
      c.strokeStyle = `rgba(185,222,250,${al.toFixed(2)})`;
      c.beginPath(); c.moveTo(s.x - camX, s.y - camY); c.lineTo(s.x - s.vx * k - camX, s.y - s.vy * k - camY); c.stroke();
    }
  },

  /** 렌더 단계 — 젖은 밭은 흙이 짙고 윗면에 물기가 번들거린다. 물가 판정은 칸마다 2초 캐시(121칸을 매 프레임 훑지 않게). */
  rFarmWet(f) { const { WW, WH } = dimsOf(this.world);
    const { c, w, camX, camY, tx0, ty0, tx1, ty1 } = f;
    const day = this.dayCount + 1;                     // 다음 아침에도 젖어 있는가 = 지금 젖어 있다
    const nw = this._nearWet || (this._nearWet = new Map());
    for (let ty = Math.max(0, ty0); ty <= Math.min(WH - 1, ty1); ty++)
      for (let tx = Math.max(0, tx0); tx <= Math.min(WW - 1, tx1); tx++) {
        const k = ty * WW + tx;
        if (w.tiles[k] !== T.FARMLAND) continue;
        let wet = (w.wet[k] | 0) >= day;
        if (!wet) {
          let e = nw.get(k);
          if (!e || this.time - e[0] > 2) nw.set(k, e = [this.time, w.nearWater(tx, ty)]);
          wet = e[1];
        }
        if (!wet) continue;
        const sx = tx * TS - camX, sy = ty * TS - camY;
        c.fillStyle = 'rgba(24,18,34,0.34)'; c.fillRect(sx, sy, TS, TS);
        c.fillStyle = 'rgba(150,190,230,0.35)'; c.fillRect(sx + 2, sy + 1, TS - 4, 1);
      }
  },

  /** 다 여문 작물에 얹는 반짝임. */
  drawRipeCrops(c, camX, camY) { const { WW } = dimsOf(this.world);
    const w = this.world;
    if (!w.crops || !w.crops.size) return;
    c.save();
    c.fillStyle = '#ffe9a8';
    for (const k of w.crops) {
      const def = TILE_DEF[w.tiles[k]];
      if (!def || !def.crop || !def.crop.ripe) continue;
      const x = k % WW, y = (k / WW) | 0;
      const sx = x * TS - camX, sy = y * TS - camY;
      if (sx < -TS || sy < -TS || sx > this.W || sy > this.H) continue;
      // 칸마다 위상을 어긋나게 — 밭 전체가 한꺼번에 깜빡이면 경고등처럼 보인다
      const ph = (this.time * 0.8 + (x * 7 + y * 13) * 0.19) % 1;
      if (ph > 0.34) continue;
      c.globalAlpha = Math.sin(ph / 0.34 * Math.PI);
      const gx = sx + 4 + ((x * 5 + y * 3) % 3) * 5;
      const gy = sy + 4 + ((x * 3 + y * 7) % 3) * 4;
      c.fillRect(gx, gy - 3, 1, 7);
      c.fillRect(gx - 3, gy, 7, 1);
      c.fillRect(gx - 1, gy - 1, 3, 3);
    }
    c.restore();
  },
};

mixin(G, FarmPart);

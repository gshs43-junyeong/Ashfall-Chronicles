/* ===== game/weather.js — 날씨 · 구름 · 잎 지는 장 ===== */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tileHash } from '../../engine/core/rng.js';
import { T } from '../data.js';
import { CHAPTERS } from '../data/story.js';
import { TS } from '../world.js';
import { LEAF_TWIG, TileArt } from '../tileart.js';
import { Sprites } from '../sprites.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const WeatherPart: Bag = {

  /** 빗줄기 페이드 인/아웃 + 화면 좌표계 낙하 갱신. */
  updateWeather(dt) {
    /* ★ 비 이벤트의 zones 에는 village·camp 가 없다(안전 지대 몹까지 비로 강해지면 안 되니까). */
    const isRain = this.event && this.event.id === 'rain';
    const p = this.player, w = this.world;
    const zone = (isRain && p && w) ? w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS)) : null;
    const inSafeZone = zone === 'village' || zone === 'camp';
    const raining = isRain && (this.eventActive() || inSafeZone);
    // 얼음 지형에서는 같은 비 이벤트가 눈으로 보여야 자연스럽다
    const snowing = !!(raining && zone === 'ice');     // ★ !! — 비가 그치면 null 이 되어 '눈↔비 바뀜'으로 읽혀 빗줄기가 한꺼번에 지워졌다
    if (snowing !== !!this.snowMode) { this.snowMode = snowing; this.rainDrops = null; }
    this.rainT = clamp((this.rainT || 0) + (raining ? 1 : -1) * dt / 2.5, 0, 1);
    /* ★ 빗줄기는 세계에 붙어 있다 — 카메라가 움직인 만큼 반대로 민다. 화면에 붙여 두면 떨어지거나 뛸 때
       세계에 비해 비가 갑자기 빨라졌다 느려졌다 했다. 켜고 끄기는 **위에서 새로 날 때만**(d.on) 바꿔
       비가 위에서부터 들어오고 빠져나간다 — 한꺼번에 깔고 투명도만 올리면 화면 전체에 쫘르륵 쏟아졌다. */
    const cam = this.cam, pc = this._rainCam;
    let mx = pc ? cam.x - pc.x : 0, my = pc ? cam.y - pc.y : 0;
    if (Math.abs(mx) > this.W || Math.abs(my) > this.H) mx = my = 0;       // 순간이동 · 불러오기
    this._rainCam = { x: cam.x, y: cam.y };
    if (this.rainT <= 0 && (!this.rainDrops || !this.rainDrops.some(d => d.on))) { this.rainDrops = null; return; }
    const W = this.W || 1280, H = this.H || 720;
    if (!this.rainDrops) {
      this.rainDrops = [];
      const n = this.snowMode ? 110 : 160;
      for (let i = 0; i < n; i++) this.rainDrops.push(this.snowMode ? {
        x: Math.random() * W, y: Math.random() * H, k: i / n, on: false,
        r: 1.5 + Math.random() * 2, spd: 40 + Math.random() * 50,
        drift: Math.random() * TAU, sway: 20 + Math.random() * 30
      } : {
        x: Math.random() * W, y: Math.random() * H, k: i / n, on: false,
        len: 10 + Math.random() * 14, spd: 480 + Math.random() * 260
      });
    }
    const top = d => { d.y -= H + 40; d.x = Math.random() * W; d.on = d.k < this.rainT; };
    for (const d of this.rainDrops) {
      if (this.snowMode) {
        d.y += d.spd * dt - my; d.drift += dt * 1.4;
        d.x += Math.sin(d.drift) * d.sway * dt - mx;
      } else {
        d.y += d.spd * dt - my; d.x -= d.spd * 0.15 * dt + mx;
      }
      if (d.y > H) top(d);
      else if (d.y < -40) d.y += H + 40;
      if (d.x < -20) d.x += W + 40; else if (d.x > W + 20) d.x -= W + 40;
    }
  },
  /** 빗줄기. */
  drawRain(c) {
    if (!this.rainDrops) return;
    if (this.snowMode) {
      c.globalAlpha = 0.85;
      c.fillStyle = '#f0f6ff';
      for (const d of this.rainDrops) if (d.on) { c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      return;
    }
    c.globalAlpha = 0.55;
    c.strokeStyle = '#bcd0e0';
    c.lineWidth = 1.4;
    c.beginPath();
    for (const d of this.rainDrops) if (d.on) { c.moveTo(d.x, d.y); c.lineTo(d.x - 5, d.y + d.len); }
    c.stroke();
    c.globalAlpha = 1;
  },
  /** 하늘에 늘 몇 점씩 흘러가는 구름. */
  drawClouds(c, camX, camY, rainT) {
    // 맑을 때는 16개가 옅게 흘러가고, 비가 짙어질수록 개수·범위·불투명도가 함께 올라 폭우일 때는 하늘 대부분이 구름으로 덮인다.
    const n = Math.round(16 + 90 * rainT);
    const wrapW = 2600;
    // 뒷 배경(원경 언덕·나무)과 안 겹치게, 비가 와도 화면 위쪽 띠 안에서만 빽빽해진다
    const bandH = this.H * 0.22;
    for (let i = 0; i < n; i++) {
      const seed = i * 91.7 + 13.1;
      const speed = 4 + (i % 7) * 2.1;
      const cy = 6 + ((i * 53 + (i * i * 7) % 211) % Math.round(bandH)) - camY * 0.03;
      if (cy < -70 || cy > this.H * 0.3) continue;
      const cx = ((seed + this.time * speed - camX * 0.1) % wrapW + wrapW) % wrapW - 260;
      const sc = 0.65 + (i % 5) * 0.24;
      const alpha = (0.14 + rainT * 0.62) * (0.65 + (i % 3) * 0.18);
      c.globalAlpha = Math.min(1, alpha);
      /* 손그림 구름 — 1~3 은 맑은 날, 4~7 은 먹구름 — 사연: docs/code-history.md#h63 */
      const dark = rainT > 0.02 + (i % 7) * 0.025;
      const im = this.spritesOn &&
        Sprites.img['cloud_' + (dark ? 4 + (i % 4) : 1 + (i % 3))];
      if (im && im.width) {
        const w2 = 128 * sc, h2 = 64 * sc;
        c.drawImage(im, cx - w2 / 2, cy - h2 / 2, w2, h2);
        continue;
      }
      // 그림이 없을 때의 대체 — 손그림 쪽과 같은 규칙으로 갈린다(섞지 않고 둘 중 하나)
      c.fillStyle = dark ? '#2e343c' : '#ffffff';
      for (const [dx, dy, r] of [[0, 0, 22], [18, -4, 17], [-16, -2, 16], [8, 6, 15], [-8, 7, 14]]) {
        c.beginPath(); c.arc(cx + dx * sc, cy + dy * sc, r * sc, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  },
  /* ================= 잿빛이 숲을 먹는다 ================= */
  /* 잿빛에 먹히는 칸과 그 세기 — 사연: docs/code-history.md#h48 */
  ASH_TILE: {
    [T.LEAF]: { shed: 0.82, fade: 1 },
    [T.FLOWER]: { shed: 0.95, fade: 1 },
    [T.WEED]: { shed: 0.70, fade: 1 },
    [T.GRASS]: { shed: 0, fade: 1 },
    [T.JUNGLELEAF]: { shed: 0.22, fade: 0.62, thin: 0.35 },
    [T.FERN]: { shed: 0.30, fade: 0.62 },
    [T.ORCHID]: { shed: 0.35, fade: 0.62 },
    [T.JUNGLEGRASS]: { shed: 0, fade: 0.62 }
  },
  ASH_BURNT: 0.30,          // 진 잎자리 중 타다 만 잎이 남는 비율
  /* 풀 갓이 바래는 규칙 (drawAshTile 의 !shed 갈래). */
  ASH_GRASS_EDGE: 0.16,
  ASH_GRASS_MIN: 0.40,

  /** 잎 칸의 변형(=가지 방향)을 줄기 쪽을 보고 고른다. */
  pickLeafV(w, tx, ty) {
    /* ★ **바로 옆 칸만** 본다. */
    if (w.get(tx - 1, ty) === T.WOOD) return 0;
    if (w.get(tx + 1, ty) === T.WOOD) return 1;
    if (w.get(tx, ty + 1) === T.WOOD) return 2;
    return 3;
  },

  /** 잿빛에 먹히는 칸 한 장. */
  drawAshTile(c, id, v, sx, sy, tx, ty, ashF0) {
    const spec = this.ASH_TILE[id];
    const ashF = ashF0 * spec.fade;      // 지형마다 드는 세기가 다르다 (정글은 절반)
    const solid = ashF > 0.98;
    const pair = (a) => {     // 같은 그림의 성한 판·잿빛 판을 a 만큼 겹쳐 그린다
      if (!solid) { c.globalAlpha = (1 - ashF) * a; TileArt.draw(c, id, v, sx, sy); }
      c.globalAlpha = ashF * a; TileArt.drawAsh(c, id, v, sx, sy);
    };

    if (!spec.shed) {
      /* 풀 칸 — **흙은 건드리지 않고 초록 갓만** 바랜다(tileart.js buildCapAsh). */
      TileArt.draw(c, id, v, sx, sy);                     // 흙까지 성한 판이 늘 바닥
      const on = clamp((ashF - tileHash(tx + 31337, ty + 6151)) / this.ASH_GRASS_EDGE, 0, 1);
      if (on > 0) {
        c.globalAlpha = on * (this.ASH_GRASS_MIN + (1 - this.ASH_GRASS_MIN) * ashF);
        TileArt.drawCapAsh(c, id, v, sx, sy);
      }
      c.globalAlpha = 1;
      return;
    }

    const gone = clamp((ashF * spec.shed - tileHash(tx + 7919, ty + 104729)) / 0.2, 0, 1);
    if (gone < 1) {
      /* 칸째로 지는 것만으로는 수관이 성글어지는 게 잘 안 보인다 — 남은 칸은 끝까지 처음처럼 빽빽하기 때문이다. */
      const keep = 1 - gone;
      /* ★ 밀도 세 단계 — 빽빽 → 성근1 → 성근2(거의 앙상). */
      const canThin = TileArt.thinAtlas && LEAF_TWIG[id];
      if (canThin) {
        const d = clamp((ashF - 0.10) / 0.80, 0, 1) * (spec.thin || 1);
        const t1 = clamp(d * 2, 0, 1), t2 = clamp(d * 2 - 1, 0, 1);
        const plate = (lv, a) => {
          if (a <= 0) return;
          if (!solid) { c.globalAlpha = (1 - ashF) * a; TileArt.drawThin(c, id, v, sx, sy, 0, lv); }
          c.globalAlpha = ashF * a; TileArt.drawThin(c, id, v, sx, sy, 1, lv);
        };
        plate(1, keep);                       // 바탕 — 가장 성근 판
        plate(0, keep * (1 - t2));            // 그 위에 성근1
        if (t1 < 1) pair(keep * (1 - t1));    // 그 위에 빽빽한 본판
      } else pair(keep);
    }
    /* 진 잎자리의 30%에는 타다 만 잎이 남는다. */
    if (gone > 0 && id === T.LEAF && tileHash(tx + 104729, ty + 7919) < this.ASH_BURNT) {
      c.globalAlpha = gone; TileArt.drawBurnt(c, v, sx, sy);
    }
    c.globalAlpha = 1;
  },

  /** 지금 잿빛이 얼마나 깊은가 (0 = 아직 색이 있다, 1 = 다 빠졌다) */
  /** 숲 원경의 잿빛 깊이(0=푸른 숲 · 1=죽은 나무만) — 사연: docs/code-history.md#h49 */
  ashF() {
    const last = Math.max(1, CHAPTERS.length - 1);
    const ch = clamp(this.chapter || 0, 0, last);
    return clamp(0.10 + (ch / last) * 0.78, 0.10, 0.88);
  },
};

mixin(G, WeatherPart);

// @ts-nocheck — 타입은 표 모양부터 차례로 입힌다(계획서 §7-1 3단계)
/* ===== game/render-far.js — 원경 · 문 그리기 ===== */
import { mixHex, shade } from '../../engine/core/color.js';
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tileHash } from '../../engine/core/rng.js';
import { BIOMES, HELL_Y, SURF_BASE, WH, WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { ENEMIES } from '../data/enemies.js';
import { FLUID_FLOW, FLUID_KIND } from '../data/materials.js';
import { TS, doorEdge } from '../world.js';
import { ART, TileArt } from '../tileart.js';
import { Art } from '../itemart.js';
import { Sprites } from '../sprites.js';
import { Part } from '../entity.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RenderFarPart = {

  /** 손그림 원경 — 두 겹으로 무한 스크롤. */
  /* ================= 원경을 불투명하게 ================= */
  tintBg(src, slot, ck, haze, hazeAmt, darkAmt) {
    if (hazeAmt <= 0 && darkAmt <= 0) return src;
    const q = v => Math.round(v * 12) / 12;
    /* 색도 **뭉뚱그려서** 열쇠에 넣는다. */
    const n = parseInt(haze.slice(1), 16);
    haze = '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map(v => (Math.round(v / 16) * 16 & 255).toString(16).padStart(2, '0')).join('');
    const key = ck + '|' + haze + '|' + q(hazeAmt) + '|' + q(darkAmt);
    this._bgT = this._bgT || [];
    const slotT = this._bgT[slot] = this._bgT[slot] || {};
    if (slotT.key === key && slotT.cv) return slotT.cv;
    const cv = slotT.cv || document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    const g = cv.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(src, 0, 0);
    /* source-atop — 그림이 있는 자리에만 색을 얹는다. */
    g.globalCompositeOperation = 'source-atop';
    if (hazeAmt > 0) { g.globalAlpha = q(hazeAmt); g.fillStyle = haze; g.fillRect(0, 0, cv.width, cv.height); }
    if (darkAmt > 0) { g.globalAlpha = q(darkAmt); g.fillStyle = '#0a0c14'; g.fillRect(0, 0, cv.width, cv.height); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    slotT.key = key; slotT.cv = cv;
    return cv;
  },

  /** 바이옴 → 원경 그림 열쇠. */
  bgKeyFor(b) {
    return b === 'ice' ? 'parallax_snow' : b === 'corrupt' ? 'parallax_corrupt' : b === 'desert' ? 'parallax_desert'
      // jungle·glowfen 전용 배경(parallax_jungle·parallax_glowfen)은 아직 그림이 없다.
      : (b === 'jungle' && Sprites.img.parallax_jungle && Sprites.img.parallax_jungle.width) ? 'parallax_jungle'
      : (b === 'glowfen' && Sprites.img.parallax_glowfen && Sprites.img.parallax_glowfen.width) ? 'parallax_glowfen'
      /* 세션 3(바다·빙하)이 이 사슬에 빠져 있어서 **바다 위에 잿빛 숲 원경**이 떴다. */
      : (b === 'sea' && Sprites.img.parallax_sea && Sprites.img.parallax_sea.width) ? 'parallax_sea'
      : (b === 'glacier' && Sprites.img.parallax_glacier && Sprites.img.parallax_glacier.width) ? 'parallax_glacier'
      : (b === 'sea' || b === 'glacier') ? 'parallax_snow'
      : 'parallax_forest';
  },

  drawParallaxArt(c, camX, camY, f) {
    const p = this.player;
    const zone = this.world.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    let key;
    // 하늘 섬은 지하 깊이와 무관하게 전용 배경을 쓴다
    if (zone === 'sky') key = 'parallax_sky';
    /* ★ 땅속에서는 원경이 **한 픽셀도** 안 보인다 — 재서 확인한 것이다. */
    else if (camY > SURF_BASE * TS + 500) return true;
    /* 여명 마을·베이스캠프 둘 다 **숲 원경**을 쓴다. */
    else if (zone === 'village' || zone === 'camp') key = 'parallax_forest';
    /* 섞는 비중은 경계에서 0.5 — 어느 쪽에서 넘어도 같다. */
    let layers;
    if (key) layers = [[key, 1]];
    else {
      const w = this.world, tx = clamp(Math.floor((camX + this.W / 2) / TS), 0, WW - 1);
      const i = w.biomeIndexAt(tx), bi = BIOMES[i], BG_BAND = 48;
      let j = i, wt = 0;                                   // 이웃 바이옴과 그 비중
      if (i > 0 && tx - bi.x0 < BG_BAND) { j = i - 1; wt = 0.5 - (tx - bi.x0) / (2 * BG_BAND); }
      else if (i < BIOMES.length - 1 && bi.x1 - tx <= BG_BAND) { j = i + 1; wt = 0.5 - (bi.x1 - tx) / (2 * BG_BAND); }
      const ka = this.bgKeyFor(bi.id), kb = this.bgKeyFor(BIOMES[j].id);
      layers = (kb === ka || wt <= 0.01) ? [[ka, 1]] : [[ka, 1 - wt], [kb, wt]];
    }
    const parts = [];
    for (const [k, a] of layers) {
      const im = Sprites.img[k];
      if (!im || !im.width) continue;
      /* 잿빛 숲 원경만 장에 따라 색이 빠진다. */
      parts.push({ key: k, a, im, src: k === 'parallax_forest' ? this.forestBg(im) : im });
    }
    if (!parts.length) return false;
    const af = '|' + Math.round(this.ashF() * 20);   // 숲 원경은 장마다 그림이 달라진다

    // 배경의 세로 위치는 camY(카메라의 실제 세계 y좌표) 하나로만 정한다.
    const ref = SURF_BASE * TS;
    const restY = TS * 7 + this.H / 2;    // camY가 기준 고도와 같을 때 배경이 놓일 화면 위치
    const refCamY = ref - this.H / 2;
    c.save();
    c.imageSmoothingEnabled = false;
    const haze = this.skyHaze || '#a8c8e0';
    const dark = (1 - f) * 0.58;          // 밤에는 어두워진다 — 옅어지는 게 아니라
    /* ★ 먼 층은 지평선 하늘색(낮 #a8c8e0)으로 55% 씻기는데, 숲 원경은 그림 자체가 옅은 회색이라 씻고 나면 흰 종이처럼 떴다. */
    /* 먼 층은 느리고 흐리게, 가까운 층은 빠르고 진하게. */
    for (const [slot, spd, dy, sc] of [[0, 0.16, -54, 1.15], [1, 0.34, 0, 1]]) {
      parts.forEach((pt, n) => {
        const forest = pt.key === 'parallax_forest';
        const hz = slot === 0 ? (forest ? .40 : .55) : 0;
        const tint = slot === 0 && forest ? mixHex(haze, '#4f7a6a', 0.5) : haze;
        const IW = pt.im.width, IH = pt.im.height, w = IW * sc, h = IH * sc;
        const baseY = restY + (refCamY - camY) * spd;
        const img = this.tintBg(pt.src, slot + 2 * n, pt.key + af, tint, hz, dark);
        let ox = -((camX * spd) % w);
        if (ox > 0) ox -= w;
        c.globalAlpha = pt.a;
        for (let x = ox; x < this.W; x += w) c.drawImage(img, x, baseY - h + dy, w, h);
        // 사막 분지 같은 저지대에서는 카메라가 내려가면서 근경 이미지의 바닥이 화면 바닥보다 위로 올라와, 그 아래로 빈 캔버스가 그대로 드러나는 틈이 생긴다.
        if (slot === 1 && baseY + dy < this.H) {
          for (let x = ox; x < this.W; x += w) c.drawImage(img, 0, IH - 1, IW, 1, x, baseY + dy, w, this.H - baseY - dy);
        }
      });
    }
    c.globalAlpha = 1;
    c.restore();
    return true;
  },

  /** 타일 광원값을 저해상도 알파맵으로 만들어 확대 — 계단 없는 부드러운 명암 */
  /** 바다 수면 한 칸 — 사연: docs/code-history.md#h65 */
  /* 날아가는 폭탄 그림. */
  drawBomb(c, b, sx, sy) {
    const sp = b.spec, look = sp.look || 'iron';
    const t = clamp(b.life / (sp.fuse || 1.6), 0, 1);        // 1 → 0 으로 탄다
    const lit = Math.sin(this.time * (10 + (1 - t) * 44)) > -0.2;
    const top = look === 'keg' ? 8 : look === 'stick' ? 8 : 6;   // 몸통 윗면
    const fl = look === 'keg' ? 9 : 7;                           // 심지 길이
    c.save();
    c.translate(sx, sy);
    c.rotate(b.spin);
    if (look === 'stick') {
      // 막대 다발 — 세 개를 나란히, 가운데를 띠로 묶었다
      for (let i = -1; i <= 1; i++) {
        c.fillStyle = i === 0 ? '#c8a058' : '#a8843f';
        c.fillRect(i * 5 - 2, -8, 4, 16);
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(i * 5 + 1, -8, 1, 16);
      }
      c.fillStyle = '#5a4a2a'; c.fillRect(-8, -2, 16, 3);
    } else {
      const r = look === 'keg' ? 8 : 6;
      c.fillStyle = look === 'keg' ? '#4a3a30' : '#2e2c28';
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
      // 어두운 굴 벽 앞에서 검은 공은 그냥 사라진다 — 얇은 테두리로 윤곽을 남긴다
      c.strokeStyle = 'rgba(220,210,190,.45)'; c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, r - 0.5, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.20)';                 // 윗쪽 반사 — 돌면 같이 돈다
      c.beginPath(); c.arc(-r * .32, -r * .34, r * .30, 0, TAU); c.fill();
      if (look === 'keg') {                                  // 붉은 쇠테 두 줄
        c.fillStyle = '#a83a2a';
        c.fillRect(-r, -r * .55, r * 2, 2); c.fillRect(-r, r * .18, r * 2, 2);
      }
    }
    // 심지와 불티 — 같은 회전 안에서 그려야 불이 심지 끝에 붙어 있다
    c.strokeStyle = '#8a7a5a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -top); c.lineTo(2, -top - fl); c.stroke();
    c.lineWidth = 1;
    if (lit) {
      const r = look === 'keg' ? 2.6 : 2.0;
      c.fillStyle = '#ffd24a';
      c.globalAlpha = .28; c.beginPath(); c.arc(2, -top - fl, r * 2.2, 0, TAU); c.fill();
      c.globalAlpha = 1;  c.beginPath(); c.arc(2, -top - fl, r, 0, TAU); c.fill();
    }
    c.restore();
  },

  /** 바다 수면 칸에서 물이 차 있는 높이(0~1, 칸 아래에서부터). */
  waveFrac(tx) {
    const t = this.time;
    const K = 0.34, W = 1.15;                             // 물결의 공간 주파수 · 진행 속도
    const main = Math.sin(tx * K - t * W);                // 지나가는 큰 물결
    const sub = Math.sin(tx * K * 2.7 - t * W * 1.6) * 0.32;   // 잔물결
    const jit = (tileHash(Math.floor(tx), 0) - 0.5) * 0.12;    // 칸마다 아주 약한 흔들림
    return clamp(0.66 + (main * 0.68 + sub + jit) * 0.32, 0.34, 1);
  },
  /** 이 열의 수면이 화면(세계) 몇 px 에 있나 — 수면 칸 ty 를 알 때. */
  surfacePx(tx, ty) {
    const w = this.world, t = w.get(Math.floor(tx), ty);
    if (t === T.SEAWATER) return (ty + 1) * TS - this.waveFrac(tx) * TS;
    if (FLUID_FLOW[t] && w.flv) return (ty + 1) * TS - (w.flv[ty * WW + Math.floor(tx)] || 8) / 8 * TS;
    return ty * TS;
  },

  drawWave(c, tx, ty, sx, sy, wl) {
    const t = this.time;
    const hFrac = this.waveFrac(tx);
    const h = Math.max(3, Math.round(hFrac * TS));
    const top = sy + TS - h;
    // 물 타일 그림을 파도 높이만큼만 잘라 그린다 (색·결이 아래 물과 같아진다)
    const an = TileArt.ANIM[T.SEAWATER];
    const v = an ? ((((t * an.fps) + tx * 0.7 + ty * 0.4) | 0) % an.fr) : 0;
    c.save();
    c.beginPath(); c.rect(sx, top, TS, h); c.clip();
    /* 물 타일은 반투명(a:1)이라 **뒤에 벽을 먼저 깔아야** 아래 물칸과 같은 색이 된다. */
    if (wl) { TileArt.drawWall(c, wl, v, sx, sy); TileArt.drawWall(c, wl, v, sx, sy + TS); }
    TileArt.draw(c, T.SEAWATER, v, sx, sy);
    // 타일 한 칸보다 파도가 낮으면 아래가 비므로, 잘라낸 만큼 한 칸 더 아래에서 끌어온다
    TileArt.draw(c, T.SEAWATER, v, sx, sy + TS);
    c.restore();
    // 마루 — 밝은 선 한 줄.
    c.globalAlpha = 0.26; c.fillStyle = shade(ART[T.SEAWATER].c, 1.8);
    c.fillRect(sx, top, TS, 1.5);
    c.globalAlpha = 1;
  },

  /** 흐르는 액체 한 칸 — 고인 것과 **같은 그림**을 수위만큼 잘라 그린다. */
  drawFlow(c, w, id, k, tx, ty, sx, sy) {
    const kind = FLUID_KIND[id], lv = w.flv ? (w.flv[k] || 7) : 7;
    const full = lv >= 8 || FLUID_KIND[w.tiles[k - WW]] === kind;
    const src = kind === 1 ? T.WATER : kind === 2 ? T.SEAWATER : T.LAVA;
    /* 떨어지는 물도 고인 물 그림 그대로 — 물줄기 그림은 폭포(FALLS)만 쓴다(world._fallsCol 의 ★) */
    const art = src;
    const an = TileArt.ANIM[art];
    const v = an ? ((((this.time * an.fps) + tx * 0.7 + ty * 0.4) | 0) % an.fr) : 0;
    const h = full ? TS : Math.max(3, Math.round(TS * lv / 8));
    c.save();
    c.beginPath(); c.rect(sx, sy + TS - h, TS, h); c.clip();
    TileArt.draw(c, art, v, sx, sy);
    c.restore();
    if (!full) {                                          // 얇은 수면 — 흐르는 결이 보이게 한 줄
      c.globalAlpha = 0.28; c.fillStyle = kind === 3 ? '#ffd27a' : '#dff2ff';
      c.fillRect(sx, sy + TS - h, TS, 1);
      c.globalAlpha = 1;
    }
  },

  /** 폭포 한 칸 — 물줄기를 세계 y 에 걸고 시간만큼 **아래로** 민다(칸 경계에서 이어진다).
      ★ 아틀라스 프레임을 돌리면 안 된다 — 프레임마다 줄기가 제멋대로라 위상(ty*0.4)과 겹쳐 물이 거슬러 오르는 듯 보였다. */
  drawFallsTile(c, tx, ty, sx, sy) {
    const t = this.time, top = ty * TS;
    c.globalAlpha = 0.5; c.fillStyle = ART[T.FALLS].c; c.fillRect(sx, sy, TS, TS);
    for (let i = 0; i < 7; i++) {
      const h1 = tileHash(tx, i * 131 + 7), h2 = tileHash(tx, i * 131 + 8), h3 = tileHash(tx, i * 131 + 9);
      const drop = i >= 5;                                  // 뒤 둘은 빠르고 짧은 물방울
      const x = Math.round(h1 * (TS - 2)), wd = drop ? 1 : 1 + ((h2 * 2) | 0);
      const P = drop ? 22 + h3 * 14 : 26 + h2 * 18, L = drop ? 3 + h3 * 2 : 9 + h3 * 12;
      const off = ((t * (drop ? 190 : 120 + h3 * 50) + h2 * P) % P + P) % P;
      c.globalAlpha = drop ? 0.55 : 0.28 + h2 * 0.3;
      c.fillStyle = drop ? '#eaf6ff' : '#bfe3fa';
      for (let y = off + Math.floor((top - L - off) / P) * P; y < top + TS; y += P) {
        const y0 = Math.max(y, top), y1 = Math.min(y + L, top + TS);
        if (y1 > y0) c.fillRect(sx + x, sy + y0 - top, wd, y1 - y0);
      }
    }
    c.globalAlpha = 1;
  },

  /** 폭포 밑 물보라 — 물줄기가 수면·바닥에 닿는 칸에서 물방울이 튄다. */
  updateFalls(dt) {
    this._fallsT = (this._fallsT || 0) - dt;
    if (this._fallsT > 0) return;
    this._fallsT = 0.08;
    const w = this.world, cam = this.cam;
    const tx0 = Math.max(1, Math.floor(cam.x / TS)), tx1 = Math.min(WW - 2, Math.ceil((cam.x + this.W) / TS));
    const ty0 = Math.max(1, Math.floor(cam.y / TS)), ty1 = Math.min(WH - 2, Math.ceil((cam.y + this.H) / TS));
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++) {
        const k = ty * WW + tx, t = w.tiles[k];
        if (t !== T.FALLS) continue;                       // 폭포 판정(world._fallsCol)을 받은 줄기만
        const b = w.tiles[k + WW];
        if (b === T.FALLS || (FLUID_FLOW[b] && w.flv[k + WW] >= 8)) continue;   // 아직 떨어지는 중
        if (Math.random() > 0.55) continue;
        const px = (tx + Math.random()) * TS, py = (ty + 1) * TS - 2;
        this.parts.push(new Part(px, py, Math.random() < 0.5 ? '#dff2ff' : '#9fd0f0', -150, 0.45, { g: 0.9, sq: 0, r: 0.7, spd: 0.8 }));
        if (Math.random() < 0.3)                             // 물안개 — 느리게 떠오른다
          this.parts.push(new Part(px, py - 4, 'rgba(220,240,255,.5)', -30, 1.0, { g: -0.15, sq: 0, r: 1.8, spd: 0.25, drag: 0.9 }));
      }
  },

  /** 빛 색 — 빛나는 타일(data.js LIGHT_SPEC) 둘레에 제 색의 번짐을 **더하기**로 얹는다. */
  /** 둥지 빛 — 어둠 **위에** 더한다(둥지 그림은 조명보다 먼저 그려져 어두운 방에서 거의 안 보였다). 비운 둥지는 없다. */
  drawLairGlow(c, camX, camY) {
    const w = this.world; if (!w) return;
    const beat = 0.5 + Math.sin(this.time * 2.1) * 0.5;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const o of w.objects) {
      if (o.type !== 'lair' || (this.lairs && this.lairs[o.ruin])) continue;
      const x = o.x + o.w / 2 - camX, y = o.y + (o.ruin >= 10 ? 20 : 24) - camY;
      if (x < -60 || y < -60 || x > this.W + 60 || y > this.H + 60) continue;
      const col = this.lairCol(o);
      const g = c.createRadialGradient(x, y, 2, x, y, 34);
      g.addColorStop(0, col); g.addColorStop(0.35, col + '66'); g.addColorStop(1, col + '00');
      c.globalAlpha = 0.45 + beat * 0.35;
      c.fillStyle = g; c.fillRect(x - 34, y - 34, 68, 68);
    }
    c.restore();
  },
  /** 둥지 빛 색 — 주인 색을 쓰되 너무 어두우면 밝힌다(물에 잠긴 파수꾼처럼 짙은 색은 알이 검게 보였다). */
  lairCol(o) {
    const c0 = (ENEMIES[o.boss] && ENEMIES[o.boss].c) || '#e0563c';
    const n = parseInt(c0.slice(1), 16), l = ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3;
    return l < 120 ? shade(c0, 120 / Math.max(30, l)) : c0;
  },
  drawGlow(c, camX, camY, tx0, ty0, tx1, ty1) {
    const w = this.world;
    this._glowC = this._glowC || {};
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let ty = Math.max(0, ty0 - 2); ty <= Math.min(WH - 1, ty1 + 2); ty++)
      for (let tx = Math.max(0, tx0 - 2); tx <= Math.min(WW - 1, tx1 + 2); tx++) {
        const d = TILE_DEF[w.tiles[ty * WW + tx]];
        if (!d.lc) continue;
        const r = Math.round(10 + d.light * 5);
        const key = d.lc + r;
        let g = this._glowC[key];
        if (!g) {
          g = document.createElement('canvas'); g.width = g.height = r * 2;
          const gc = g.getContext('2d'), gr = gc.createRadialGradient(r, r, 0, r, r, r);
          gr.addColorStop(0, d.lc + '66'); gr.addColorStop(0.45, d.lc + '22'); gr.addColorStop(1, d.lc + '00');
          gc.fillStyle = gr; gc.fillRect(0, 0, r * 2, r * 2);
          this._glowC[key] = g;
        }
        c.globalAlpha = Math.min(1, 0.4 + d.light * 0.03);
        c.drawImage(g, tx * TS + TS / 2 - camX - r, ty * TS + TS / 2 - camY - r);
      }
    c.restore();
  },
  drawLightOverlay(c, camX, camY, tx0, ty0, tx1, ty1) {
    const w = this.world;
    const x0 = tx0 - 1, y0 = ty0 - 1, x1 = tx1 + 1, y1 = ty1 + 1;
    const lw = x1 - x0 + 1, lh = y1 - y0 + 1;
    if (!this.lightCv || this.lightCv.width !== lw || this.lightCv.height !== lh) {
      this.lightCv = document.createElement('canvas');
      this.lightCv.width = lw; this.lightCv.height = lh;
      this.lightCx = this.lightCv.getContext('2d');
      this.lightImg = this.lightCx.createImageData(lw, lh);
    }
    // 깊이에 따른 색조: 지하는 푸른 기운, 지옥은 붉은 기운
    const mid = (ty0 + ty1) / 2;
    let tr = 0, tg = 0, tb = 0;
    if (mid > HELL_Y - 24) { tr = 44; tg = 8; tb = 2; }
    else if (mid > SURF_BASE + 24) { tr = 4; tg = 7; tb = 18; }
    const d = this.lightImg.data;
    let i = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        // 하한을 조금 남겨 완전한 암흑에서도 블록 실루엣은 읽히게
        const f = Math.pow(clamp(w.lightAt(x, y) / 15, 0.022, 1), 0.72);
        d[i] = tr; d[i + 1] = tg; d[i + 2] = tb; d[i + 3] = 255 * (1 - f);
        i += 4;
      }
    }
    this.lightCx.putImageData(this.lightImg, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(this.lightCv, x0 * TS - camX, y0 * TS - camY, lw * TS, lh * TS);
    c.imageSmoothingEnabled = false;
  },

  /* ---- 프레임 선택 (우리 엔티티 필드 기준) ---- */
  /** 걸을 때 발밑 흙먼지 — 그림만(Part 는 충돌·판정이 없다). 걷기 프레임(9fps)의 발 딛는 두 칸에 맞춰
      절반쯤만 한 톨씩 — 매 프레임 뿌리면 달리기 내내 연기처럼 깔린다. */
  walkDust(p) {
    const st = Math.floor(this.time * 9) % 4;
    const step = st !== this._dustSt && (st === 0 || st === 2);
    this._dustSt = st;
    if (!step || !p.onGround || p.swimming || Math.abs(p.vx) < 60) return;
    const w = this.world, fy = p.y + p.h + 1;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(fy / TS);
    this.sfx('step', 0.9 + Math.random() * 0.2);          // 발소리는 딛는 칸마다(파일이 있을 때만 울린다)
    if (w.liquid(tx, ty - 1) || Math.random() > 0.55) return;   // 얕은 물을 걸을 땐 먼지가 안 인다
    const d = TILE_DEF[w.get(tx, ty)];
    if (!d || !d.solid || !d.c) return;
    const n = Math.random() < 0.3 ? 2 : 1;
    for (let i = 0; i < n; i++)
      this.parts.push(new Part(p.cx - Math.sign(p.vx) * 5, fy - 2, mixHex(d.c, '#d2c6a8', 0.75), -22, 0.38,
        { spd: 0.2, r: 1, g: 0.2, drag: 0.9 }));
  },
  playerFrame(p) {
    if (p.flash > 0.12) return 12;                                  // 피격
    if (p.dashV > 0) return 8;                                      // 대시
    if (p.swing > 0) return 9 + Math.min(2, Math.floor((0.24 - p.swing) / 0.08));
    if (!p.onGround) return p.vy < 0 ? 6 : 7;                       // 점프 / 낙하
    if (Math.abs(p.vx) > 20) return 2 + (Math.floor(this.time * 9) % 4);
    return Math.floor(this.time * 2) % 2;
  },
  enemyFrame(e) {
    if (e.boss) {
      /* ★ 체력 문턱(66%/33%)을 여기서 다시 계산하면 안 된다. */
      const m = Sprites.meta && Sprites.meta.bosses.sheets[e.type];
      /* ★ 시트 끝의 **쓰러지는 칸**(death)은 마디가 아니다. */
      const idle = m ? m.count - (m.death || 0) : 6;
      const pairs = m ? Math.max(1, Math.floor(idle / 2)) : 3;   // 시트에 든 페이즈 그림 벌 수
      /* 비율로 나누므로 2페이즈는 **첫 벌과 마지막 벌**을 쓴다(가운데를 쓰면 두 마디 차이가 가장 작은 두 그림이 된다). */
      const sp = Math.min(pairs - 1, Math.round((e.pf || 0) * (pairs - 1)));
      return sp * 2 + (Math.floor(this.time * 2.5) % 2);
    }
    /* ★ 공격 직후는 atkPose 로 본다. */
    if (e.atkPose > 0) return 4;
    /* 말랑한 몹(ENEMIES squish)은 공중에서 걷기 두 장을 번갈아 돌리면 떨어뜨린 상자처럼 보였다 — 오를 땐 늘어난 장, 내릴 땐 둥근 장. */
    if (e.def.squish && !e.onGround) return e.vy < 0 ? 2 : 0;
    if (Math.abs(e.vx) > 6) return 2 + (Math.floor(this.time * 7) % 2);
    return Math.floor(this.time * 2.4) % 2;
  },

  /** 소환 제단 — 새긴 받침 위 세 갈래 발톱이 구슬을 받친다. 구슬은 빛이 안에서 도는 유리알:
      가장자리는 어둡고 속은 밝고, 왼쪽 위에 창빛 한 점. 결전 중이면 붉게 물든다. */
  /** 둥지 — 제단처럼 손으로 다듬은 한 장. 바이옴 유적은 흙·뼈 둔덕에 갈비가 휘어 감싼 알, 공창 격실(ruin 10+)은
      강철 요람에 박힌 노심. 빛은 주인(보스) 색으로 맥박친다. 비우면 알은 깨진 껍데기, 노심은 꺼진 유리. */
  drawLair(c, o, sx, sy, f) {
    const t = this.time, w = o.w, h = o.h, cx = sx + w / 2;
    const done = !!(this.lairs && this.lairs[o.ruin]);
    const col = this.lairCol(o);
    const beat = done ? 0 : 0.5 + Math.sin(t * 2.1) * 0.5;
    const S = (hex, k) => shade(hex, f * (k || 1));
    c.save();
    if (o.ruin >= 10) {
      // 강철 요람 — 받침 · 양옆 집게 · 가운데 노심 · 받침관
      c.fillStyle = S('#2a2c32'); c.fillRect(sx - 4, sy + h - 6, w + 8, 6);
      c.fillStyle = S('#3c4048'); c.fillRect(sx - 1, sy + h - 12, w + 2, 6);
      c.fillStyle = S('#5a606a'); c.fillRect(sx - 1, sy + h - 12, w + 2, 1);
      for (const k of [-1, 1]) {
        c.fillStyle = S('#4a505a');
        c.beginPath(); c.moveTo(cx + k * 16, sy + h - 12); c.lineTo(cx + k * 19, sy + 10); c.lineTo(cx + k * 11, sy + 2);
        c.lineTo(cx + k * 9, sy + 6); c.lineTo(cx + k * 13, sy + 12); c.lineTo(cx + k * 10, sy + h - 12); c.closePath(); c.fill();
        c.fillStyle = S('#7a808a'); c.fillRect(cx + k * 18 - (k > 0 ? 1 : 0), sy + 10, 1, h - 22);
        c.fillStyle = S('#2a2c32'); for (let y = sy + 16; y < sy + h - 14; y += 6) c.fillRect(cx + k * 15 - 1, y, 2, 2);   // 리벳
      }
      const oy = sy + 20, R = 9;
      c.fillStyle = S('#3c4048'); c.fillRect(cx - 3, oy + R - 1, 6, sy + h - 12 - (oy + R - 1));
      if (!done) {
        c.globalAlpha = 0.18 + beat * 0.15;
        const halo = c.createRadialGradient(cx, oy, R * .5, cx, oy, R * 3);
        halo.addColorStop(0, col); halo.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = halo; c.beginPath(); c.arc(cx, oy, R * 3, 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
      const g = c.createRadialGradient(cx - 2, oy - 3, 1, cx, oy, R);
      g.addColorStop(0, done ? '#6a6e76' : '#ffffff'); g.addColorStop(.4, done ? '#3a3e46' : col); g.addColorStop(1, done ? '#1a1c20' : shade(col, .35));
      c.fillStyle = g; c.beginPath(); c.arc(cx, oy, R, 0, TAU); c.fill();
      c.strokeStyle = S('#1a1c20'); c.lineWidth = 1.5; c.beginPath(); c.arc(cx, oy, R, 0, TAU); c.stroke();
      if (done) {                                                 // 금 간 유리
        c.strokeStyle = '#8a8e96'; c.lineWidth = 1; c.beginPath();
        c.moveTo(cx - 5, oy - 4); c.lineTo(cx, oy); c.lineTo(cx + 4, oy - 6); c.moveTo(cx, oy); c.lineTo(cx + 1, oy + 7); c.stroke();
      } else {                                                    // 속에서 도는 고리
        c.strokeStyle = '#ffffff'; c.globalAlpha = .5; c.lineWidth = 1;
        c.beginPath(); c.ellipse(cx, oy, R * .7, R * .25, t * 1.7, 0, TAU); c.stroke(); c.globalAlpha = 1;
      }
      c.restore();
      return;
    }
    // 둔덕 — 흙과 재가 쌓인 낮은 언덕, 앞쪽에 뼈 부스러기
    c.fillStyle = S('#241e18');
    c.beginPath(); c.ellipse(cx, sy + h - 3, w * 0.62, 9, 0, Math.PI, TAU); c.fill();
    c.fillRect(sx - 5, sy + h - 4, w + 10, 4);
    c.fillStyle = S('#3a3026'); c.beginPath(); c.ellipse(cx, sy + h - 4, w * 0.5, 6, 0, Math.PI, TAU); c.fill();
    c.fillStyle = S('#cfc4a8', .8);
    for (const [dx, dy, l] of [[-15, -4, 5], [-9, -2, 3], [8, -3, 4], [14, -2, 5], [2, -1, 3]]) c.fillRect(cx + dx, sy + h + dy, l, 1.5);
    // 갈비 — 양쪽에서 휘어 올라 알을 감싼다(뒤쪽 셋은 어둡게)
    const rib = (k, i, back) => {
      const bx = cx + k * (7 + i * 5), top = sy + 8 + i * 5;
      c.strokeStyle = back ? S('#6a6250') : S('#d8ccb0'); c.lineWidth = back ? 2 : 2.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(bx, sy + h - 7); c.quadraticCurveTo(bx + k * 6, top + 12, cx + k * (3 + i * 2), top); c.stroke();
    };
    for (let i = 0; i < 3; i++) { rib(-1, i, true); rib(1, i, true); }
    // 알 — 주인 색으로 맥박친다
    const oy = sy + 24, rx = 8, ry = 11;
    if (!done) {
      c.globalAlpha = 0.2 + beat * 0.18;
      const halo = c.createRadialGradient(cx, oy, 4, cx, oy, 30);
      halo.addColorStop(0, col); halo.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = halo; c.beginPath(); c.arc(cx, oy, 30, 0, TAU); c.fill();
      c.globalAlpha = 1;
      const g = c.createRadialGradient(cx - 3, oy - 4, 1, cx, oy, ry);
      g.addColorStop(0, '#fff4e0'); g.addColorStop(.45, col); g.addColorStop(1, shade(col, .3));
      c.fillStyle = g; c.beginPath(); c.ellipse(cx, oy, rx, ry, 0, 0, TAU); c.fill();
      c.globalAlpha = .35 + beat * .4; c.strokeStyle = shade(col, 1.6); c.lineWidth = 1;   // 핏줄
      c.beginPath(); c.moveTo(cx - 4, oy + 6); c.quadraticCurveTo(cx - 1, oy, cx - 3, oy - 7);
      c.moveTo(cx + 3, oy + 7); c.quadraticCurveTo(cx + 5, oy, cx + 2, oy - 6); c.stroke();
      c.globalAlpha = .8; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(cx - 3, oy - 5, 1.8, 2.6, -.4, 0, TAU); c.fill();
      c.globalAlpha = 1;
    } else {                                                      // 깨진 껍데기 — 아래 반쪽만 남는다
      c.fillStyle = S('#8a8070');
      c.beginPath(); c.moveTo(cx - rx, oy + 2);
      for (let i = 0; i <= 6; i++) c.lineTo(cx - rx + i * (rx * 2 / 6), oy + 2 - (i % 2 ? 4 : 0));
      c.ellipse(cx, oy + 2, rx, ry - 2, 0, 0, Math.PI); c.closePath(); c.fill();
      c.fillStyle = S('#4a4238'); c.beginPath(); c.ellipse(cx, oy + 3, rx - 2, 3, 0, 0, TAU); c.fill();
    }
    for (let i = 0; i < 3; i++) { rib(-1, i, false); rib(1, i, false); }   // 앞쪽 갈비는 알 위로
    c.restore();
  },
  drawAltar(c, o, sx, sy, f) {
    const t = this.time, cx = sx + o.w / 2, w = o.w, h = o.h;
    const hot = !!this.boss;
    const [c0, c1, c2] = hot ? ['#ffe0d0', '#e05050', '#4a0d14'] : ['#f2e6ff', '#a06fff', '#1e0f3a'];
    const S = (hex, k) => shade(hex, f * (k || 1));
    c.save();
    // 받침 — 계단 두 단 · 기둥 · 윗판
    c.fillStyle = S('#241c2e'); c.fillRect(sx - 4, sy + h - 5, w + 8, 5);
    c.fillStyle = S('#33283f'); c.fillRect(sx - 1, sy + h - 10, w + 2, 5);
    c.fillStyle = S('#2e2438'); c.fillRect(sx + 5, sy + 14, w - 10, h - 24);
    c.fillStyle = S('#3d3149');                                  // 기둥 빛 받는 면
    c.fillRect(sx + 5, sy + 14, 3, h - 24);
    c.fillStyle = S('#1c1524');                                  // 세로 홈 둘
    c.fillRect(sx + w / 2 - 7, sy + 17, 2, h - 30); c.fillRect(sx + w / 2 + 5, sy + 17, 2, h - 30);
    c.fillStyle = S('#463a55'); c.fillRect(sx - 3, sy + 8, w + 6, 7);
    c.fillStyle = S('#5a4b6b'); c.fillRect(sx - 3, sy + 8, w + 6, 2);   // 윗판 모서리
    c.fillStyle = S('#241c2e'); c.fillRect(sx - 3, sy + 14, w + 6, 1);
    // 기둥의 룬 — 구슬 박자에 맞춰 숨 쉰다
    const beat = 0.5 + Math.sin(t * 2) * 0.5;
    c.globalAlpha = 0.35 + beat * 0.45; c.fillStyle = c1;
    c.fillRect(cx - 1, sy + 19, 2, 7); c.fillRect(cx - 3, sy + 21, 6, 2);
    c.fillRect(cx - 1, sy + 30, 2, 2);
    c.globalAlpha = 1;
    // 발톱 셋 — 윗판에서 올라와 구슬 아래쪽을 감싼다
    const oy = sy - 8 + Math.sin(t * 1.6) * 1.2, R = 11;
    for (const k of [-1, 1]) {
      c.fillStyle = S('#6a5a7e');
      c.beginPath();
      c.moveTo(cx + k * 7, sy + 8); c.lineTo(cx + k * 13, sy + 1); c.lineTo(cx + k * 12, oy - 4);
      c.lineTo(cx + k * 9, oy); c.lineTo(cx + k * 3, sy + 8); c.closePath(); c.fill();
      c.fillStyle = S('#8a7aa0');                                 // 발톱 끝 · 바깥 모서리
      c.fillRect(cx + k * 12 - (k > 0 ? 1 : 0), oy - 5, 1, 3);
      c.fillRect(cx + k * 13 - (k > 0 ? 1 : 0), sy - 2, 1, 4);
    }
    c.fillStyle = S('#6a5a7e'); c.fillRect(cx - 2, sy + 1, 4, 7);
    // 둘레 빛무리 — 옅게
    c.globalAlpha = 0.16 + beat * 0.1;
    const halo = c.createRadialGradient(cx, oy, R * 0.6, cx, oy, R * 2.8);
    halo.addColorStop(0, c1); halo.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = halo; c.beginPath(); c.arc(cx, oy, R * 2.8, 0, TAU); c.fill();
    c.globalAlpha = 1;
    // 구슬 몸 — 빛은 왼쪽 위에서, 가장자리로 갈수록 짙다
    const g = c.createRadialGradient(cx - 3, oy - 3, 1, cx, oy, R);
    g.addColorStop(0, c0); g.addColorStop(0.35, c1); g.addColorStop(1, c2);
    c.fillStyle = g; c.beginPath(); c.arc(cx, oy, R, 0, TAU); c.fill();
    // 속에서 도는 빛줄기 두 가닥
    c.save();
    c.beginPath(); c.arc(cx, oy, R - 1, 0, TAU); c.clip();
    c.strokeStyle = c0; c.lineWidth = 1.4;
    for (let k = 0; k < 2; k++) {
      const a = t * (1.3 + k * 0.6) + k * Math.PI;
      c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 3 + k);
      c.beginPath(); c.ellipse(cx, oy, R * 0.75, R * 0.28, a, 0.2, Math.PI * 1.1); c.stroke();
    }
    c.restore();
    // 테두리 · 창빛 · 아래쪽 되비침
    c.strokeStyle = c2; c.lineWidth = 1; c.globalAlpha = 0.9;
    c.beginPath(); c.arc(cx, oy, R - 0.5, 0, TAU); c.stroke();
    c.globalAlpha = 0.85; c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(cx - 4, oy - 5, 2.6, 1.6, -0.6, 0, TAU); c.fill();
    c.fillRect(cx - 1, oy - 7, 1, 1);
    c.globalAlpha = 0.35; c.fillStyle = c0;
    c.beginPath(); c.ellipse(cx + 1, oy + R - 3, 4, 1.4, 0, 0, TAU); c.fill();
    // 떠도는 티끌 셋
    for (let k = 0; k < 3; k++) {
      const a = t * 0.9 + k * TAU / 3, rr = R + 5 + Math.sin(t * 2 + k) * 1.5;
      const mx = cx + Math.cos(a) * rr, my = oy + Math.sin(a) * rr * 0.45;
      c.globalAlpha = 0.45 + 0.35 * Math.sin(a); c.fillStyle = c0;
      c.fillRect(Math.round(mx), Math.round(my), 1.5, 1.5);
    }
    c.restore();
  },

  /* ================= 문 그리기 ================= */
  drawDoor(c, o, sx, sy, f) {
    // 성문(gate)은 세로 3칸이라 집 문 그림을 쓰면 늘어난다 — 각자 제 그림이 있다
    const im = this.spritesOn && Sprites.img[o.gate ? 'obj_gate' : 'obj_door'];
    const sw = o.sw === undefined ? (o.closed ? 0 : 1) : o.sw;   // 0 닫힘 → 1 열림
    const hinge = o.dir === -1 ? -1 : 1;          // 경첩이 선 가장자리 (-1 왼쪽 / +1 오른쪽)
    c.save();
    c.imageSmoothingEnabled = false;
    /* ★ 닫힌 문은 **옆모습**(경첩 쪽 얇은 판 = 판정 world.doorEdge), 열린 문은 칸을 채운 **앞면**이다.
       판정과 그림의 폭이 같아야 닫힌 문 옆 빈자리에 서도 몸이 문에 파묻혀 보이지 않는다. 사연: docs/code-history.md#h66 */
    const flat = doorEdge(o).w;
    const alpha = 1;
    /* 옆모습에서 앞면으로 도는 판의 보이는 폭은 sin(각) — 처음엔 빨리, 다 열릴 즈음 천천히 넓어진다. */
    const ang = sw * Math.PI / 2;
    const wN = flat + (o.w - flat) * Math.sin(ang);
    // 문짝은 어느 상태에서도 제 칸(o.w) 밖으로 그리지 않는다 — 경첩 쪽 가장자리에 붙어 있다
    const x = hinge < 0 ? sx : sx + o.w - wN;
    c.globalAlpha = alpha;
    if (im && im.width) {
      /* 그림은 경첩이 **왼쪽**에 있는 문이다(손잡이가 오른쪽). */
      c.save();
      if (hinge > 0) { c.translate(x + wN, sy); c.scale(-1, 1); } else c.translate(x, sy);
      c.drawImage(im, 0, 0, im.width, im.height, 0, 0, wN, o.h);
      c.restore();
    } else {
      c.fillStyle = shade('#3a2610', f); c.fillRect(x, sy, wN, o.h);
      c.fillStyle = shade('#5a3c22', f);
      c.fillRect(x + 1, sy + 1, Math.max(1, wN - 2), o.h - 2);
      c.fillStyle = shade('#6f4c2c', f);
      for (let i = 1; i < 4; i++) c.fillRect(x + 1, sy + i * o.h / 4, Math.max(1, wN - 2), 1.6);
      /* 손잡이 — 경첩 반대쪽. */
      const hw = Math.min(2.6, Math.max(0, wN - 3));
      if (hw > 0.4) {
        const hx = hinge < 0 ? x + wN - 1.4 - hw : x + 1.4;
        const hy = sy + o.h * (o.gate ? 0.56 : 0.5) - 2.2;
        c.globalAlpha = alpha * Math.min(1, hw / 1.6);
        c.fillStyle = shade('#d8a94b', f); c.fillRect(hx, hy, hw, 4.4);
        if (hw > 1.8) {
          c.fillStyle = shade('#3a2610', f);
          c.fillRect(hx + hw * .27, hy + 1.3, hw * .46, 1.8);
        }
        c.globalAlpha = alpha;
      }
    }
    // 비스듬할수록 빛을 덜 받는다 — 옆모습(닫힘)은 판의 모서리라 가장 어둡다
    if (sw < 0.98) {
      c.globalAlpha = 0.34 * Math.cos(ang);
      c.fillStyle = '#000'; c.fillRect(x, sy, wN, o.h);
    }
    // 문짝의 바깥 모서리 — 두께가 보이는 자리라 한 줄 어둡게 닫는다
    if (sw < 0.95) {
      c.globalAlpha = alpha * 0.55;
      c.fillStyle = '#140e08';
      c.fillRect(hinge < 0 ? x + wN - 1.2 : x, sy, 1.2, o.h);
    }
    c.restore();
  },

  /** 여명 마을 시설물 — 손그림 애셋이 있으면 그것으로, 없으면 절차 렌더로 폴백 */
  drawFacility(c, o, sx, sy, f) {
    const t = this.time;
    if (o.type === 'door') { this.drawDoor(c, o, sx, sy, f); return; }
    if (o.type === 'furniture') {
      // 집이 실제로 들어갈 수 있는 방이 아니라 벽지(setWall) 위에 얹힌 얇은 장식이다 — 그래도 아무것도 없으면 벽지만 밋밋하게 보여서, 문·창 옆에 살림살이 실루엣을 둔다.
      if (o.kind === 'shelf' && this.spritesOn && Sprites.drawObj(c, 'obj_shelf', sx, sy, o.w, o.h)) return;
      if (o.kind === 'shelf') {
        c.fillStyle = shade('#5a3c22', f); c.fillRect(sx, sy, o.w, o.h);
        c.fillStyle = shade('#3a2610', f);
        for (let k = 1; k < 4; k++) c.fillRect(sx + 1, sy + k * (o.h - 2) / 4, o.w - 2, 2);
        const cols = ['#b03a3a', '#3a6a8a', '#c8a03a', '#4a7a4a'];
        for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++) {
          c.fillStyle = shade(cols[(row * 3 + k) % cols.length], f);
          c.fillRect(sx + 2 + k * 4, sy + 2 + row * (o.h - 2) / 4, 3, (o.h - 2) / 4 - 3);
        }
      } else {   // table
        c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + o.h - 5, o.w, 5);
        c.fillStyle = shade('#5a3c22', f); c.fillRect(sx + 2, sy + o.h - 3, 3, 3); c.fillRect(sx + o.w - 5, sy + o.h - 3, 3, 3);
        c.fillStyle = shade('#8a8a96', f); c.fillRect(sx + o.w / 2 - 3, sy + o.h - 10, 6, 5);
      }
      return;
    }
    if (o.type === 'fountain') {
      /* 분수대는 세로 3칸(66px) 중 맨 아래 1칸이 실제 solid 물받이고, 위 2칸은 통과 가능한 물기둥이다 */
      /* 손그림은 1프레임(정지)과 2프레임(움직임) 둘 다 받는다. */
      const im = this.spritesOn && Sprites.img.obj_fountain;
      if (im && im.width) {
        // 장 수는 가로세로 비로 잰다 — tools/mkfountain.py 는 물방울이 길 따라 흐르는 8장(12fps)을 굽는다
        const want = o.w / o.h, n = Math.max(1, Math.round(im.width / im.height / want));
        const frames = Math.abs(im.width / n / im.height - want) < 0.03 ? n : 0;
        if (frames) {
          const fw = im.width / frames;
          const fr = frames > 1 ? (((this.time * (frames > 2 ? 12 : 3.5)) | 0) % frames) : 0;
          c.save(); c.imageSmoothingEnabled = false;
          c.drawImage(im, fr * fw, 0, fw, im.height, Math.round(sx), Math.round(sy), o.w, o.h);
          c.restore();
          if (frames === 1) this.drawFountainWater(c, o, sx, sy);
          return;
        }
      }
      // 좌우 대칭은 중심(mx)에서 재서 애초에 대칭으로 그린다 — 사연: docs/code-history.md#h67
      const mx = sx + o.w / 2, base = sy + o.h - TS;
      c.fillStyle = shade('#6d6d7c', f); c.fillRect(sx, base, o.w, TS);          // 물받이
      c.fillStyle = shade('#8a8a98', f); c.fillRect(sx, base, o.w, 4);           // 테두리 윗면
      c.fillStyle = shade('#4a4a56', f); c.fillRect(sx, base + TS - 3, o.w, 3);
      c.globalAlpha = .85; c.fillStyle = '#4a9ec8';
      c.fillRect(sx + 4, base + 4, o.w - 8, 7);                                  // 고인 물
      c.globalAlpha = 1;
      c.fillStyle = shade('#7a7a88', f); c.fillRect(mx - 6, sy + 12, 12, base - sy - 12);
      c.fillStyle = shade('#9a9aa8', f); c.fillRect(mx - 6, sy + 12, 3, base - sy - 12);
      c.fillStyle = shade('#8a8a98', f); c.fillRect(mx - 11, sy + 7, 22, 6);     // 물동이
      this.drawFountainWater(c, o, sx, sy);
      return;
    }
    if (this.spritesOn) {
      // workbench/forge는 render()의 상자 오브젝트 루프에서 먼저 걸려 이 함수까지 오지 않는다 — 그 둘의 레벨별 스프라이트 우선순위는 거기 있다.
      const variant = o.type === 'waystone' ? (this.villageUnlocked ? '' : '_off')
        : o.type === 'terminal' ? (this.termsRead && this.termsRead[o.term] ? '_read' : '')
        : '';
      if (Sprites.drawObj(c, 'obj_' + o.type + variant, sx, sy, o.w, o.h)) return;
    }
    if (o.type === 'vault') {
      c.fillStyle = shade('#4a4a56', f); c.fillRect(sx, sy, o.w, o.h);
      c.fillStyle = shade('#6d6d7c', f); c.fillRect(sx + 2, sy + 2, o.w - 4, o.h - 4);
      c.fillStyle = shade('#d8a94b', f); c.fillRect(sx + o.w / 2 - 6, sy + o.h / 2 - 6, 12, 12);
      c.fillStyle = shade('#2e2e36', f); c.fillRect(sx + o.w / 2 - 2, sy + o.h / 2 - 2, 4, 4);
    } else if (o.type === 'board') {
      c.fillStyle = shade('#5a3c22', f);
      c.fillRect(sx + 4, sy + 18, 5, o.h - 18); c.fillRect(sx + o.w - 9, sy + 18, 5, o.h - 18);
      c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy, o.w, 24);
      c.fillStyle = shade('#e8dcc0', f);
      c.fillRect(sx + 4, sy + 4, 9, 11); c.fillRect(sx + 16, sy + 5, 9, 10); c.fillRect(sx + 26, sy + 4, 6, 12);
    } else if (o.type === 'reforge') {
      c.fillStyle = shade('#3a3a44', f); c.fillRect(sx, sy + o.h - 16, o.w, 16);
      c.fillStyle = shade('#5d5d68', f); c.fillRect(sx + 4, sy + 10, o.w - 8, o.h - 24);
      const gl = 0.5 + Math.sin(t * 3) * 0.3;
      c.globalAlpha = gl; c.fillStyle = '#ff8a3a';
      c.fillRect(sx + 8, sy + 14, o.w - 16, 7);
      c.globalAlpha = 1;
      c.fillStyle = shade('#8a8a96', f); c.fillRect(sx + o.w / 2 - 3, sy, 6, 12);
    } else if (o.type === 'anvil') {
      /* 강화 모루 — 재련대(붉게 달아오른 화덕)와 한눈에 구분되어야 한다 — 사연: docs/code-history.md#h68 */
      if (Sprites.drawObj(c, 'obj_anvil', sx, sy, o.w, o.h)) return;
      const W = o.w, H = o.h;
      const hb = Math.abs(Math.sin(t * 3.4));                     // 망치질 — 위아래로
      c.fillStyle = shade('#4a3a26', f);                          // 나무 그루터기
      c.fillRect(sx + W * 0.16, sy + H * 0.78, W * 0.68, H * 0.22);
      c.fillStyle = shade('#3a2c1c', f);
      c.fillRect(sx + W * 0.16, sy + H * 0.78, W * 0.68, 2);
      c.fillStyle = shade('#2e2e36', f);                          // 모루 허리
      c.fillRect(sx + W * 0.32, sy + H * 0.66, W * 0.36, H * 0.13);
      c.fillStyle = shade('#5d5d68', f);                          // 모루 상판
      c.fillRect(sx + W * 0.16, sy + H * 0.55, W * 0.68, H * 0.12);
      c.beginPath();                                              // 한쪽 뿔
      c.moveTo(sx + W * 0.16, sy + H * 0.55);
      c.lineTo(sx + W * 0.02, sy + H * 0.605);
      c.lineTo(sx + W * 0.16, sy + H * 0.67); c.fill();
      c.fillStyle = shade('#7a7a88', f);                          // 상판 윗면 빛
      c.fillRect(sx + W * 0.16, sy + H * 0.55, W * 0.68, 2);
      // 망치 — 상판 **바로 위**에서 오르내린다.
      const hy = sy + H * 0.24 + hb * H * 0.14;
      c.fillStyle = shade('#8a7a5a', f);
      c.fillRect(sx + W * 0.50 - 1, hy + H * 0.08, 3, H * 0.17);  // 자루
      c.fillStyle = shade('#9a9aa6', f);
      c.fillRect(sx + W * 0.38, hy, W * 0.26, H * 0.08);          // 머리
      if (hb > 0.9) {                                             // 내리친 순간에만 불똥
        c.globalAlpha = 0.85; c.fillStyle = '#ffd24a';
        c.fillRect(sx + W * 0.30, sy + H * 0.52, 2, 2);
        c.fillRect(sx + W * 0.64, sy + H * 0.50, 2, 2);
        c.globalAlpha = 1;
      }
    } else if (o.type === 'waystone') {
      const gl = 0.45 + Math.sin(t * 1.8) * 0.25;
      c.fillStyle = shade('#6b5a34', f);
      c.beginPath(); c.moveTo(sx + 4, sy + o.h); c.lineTo(sx + o.w - 4, sy + o.h);
      c.lineTo(sx + o.w - 7, sy + 6); c.lineTo(sx + o.w / 2, sy); c.lineTo(sx + 7, sy + 6);
      c.closePath(); c.fill();
      c.globalAlpha = this.villageUnlocked ? gl : gl * 0.25;
      c.fillStyle = '#9fe8dc';
      c.beginPath(); c.arc(sx + o.w / 2, sy + o.h * 0.42, 7, 0, TAU); c.fill();
      c.globalAlpha = 1;
    } else if (o.type === 'inn') {
      /* 침대 — 다리 밑면이 항상 sy+o.h(바닥선)에 닿는다. */
      const legH = 4;
      c.fillStyle = shade('#3a2610', f);
      c.fillRect(sx + 2, sy + o.h - legH, 4, legH); c.fillRect(sx + o.w - 6, sy + o.h - legH, 4, legH);
      c.fillStyle = shade('#5a3c22', f); c.fillRect(sx, sy + o.h - legH - 6, o.w, 6);   // 프레임
      c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + 4, 6, o.h - legH - 4);      // 머리판
      c.fillStyle = shade('#e8dcc0', f); c.fillRect(sx + 6, sy + o.h - legH - 14, o.w - 8, 8);   // 매트리스
      c.fillStyle = shade('#8a6a4a', f); c.fillRect(sx + 6, sy + o.h - legH - 14, (o.w - 8) * 0.6, 8);   // 이불
      c.fillStyle = shade('#f0ece0', f); c.fillRect(sx + 8, sy + o.h - legH - 20, 12, 7);   // 베개
    } else if (o.type === 'terminal') {
      const read = this.termsRead && this.termsRead[o.term];
      c.fillStyle = shade('#4a4a52', f); c.fillRect(sx, sy + 6, o.w, o.h - 6);
      c.fillStyle = shade('#6a6a74', f); c.fillRect(sx + 2, sy, o.w - 4, 22);
      c.globalAlpha = read ? 0.3 : 0.55 + Math.sin(t * 4) * 0.25;
      c.fillStyle = read ? '#4a5f7a' : '#e8a53a';
      c.fillRect(sx + 5, sy + 4, o.w - 10, 14);
      c.globalAlpha = 1;
      c.fillStyle = shade('#8a6a3a', f); c.fillRect(sx + o.w / 2 - 2, sy + 26, 4, o.h - 26);
    } else if (o.type === 'lair') {
      this.drawLair(c, o, sx, sy, Math.max(f, .5));
    } else if (o.type === 'townhall') {
      // 마을 설계도가 펼쳐진 판 — 등급이 오를수록 판에 못이 하나씩 더 박힌다
      const lv = this.villageLv();
      c.fillStyle = shade('#5a3f28', f); c.fillRect(sx + 3, sy + 18, 4, o.h - 18);
      c.fillRect(sx + o.w - 7, sy + 18, 4, o.h - 18);
      c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + 4, o.w, 24);
      c.fillStyle = shade('#e8dcc0', f); c.fillRect(sx + 3, sy + 7, o.w - 6, 18);
      c.fillStyle = shade('#8a7a5a', f);
      for (let k = 0; k < 4; k++) c.fillRect(sx + 6, sy + 10 + k * 4, o.w - 12 - (k % 2) * 6, 1.6);
      c.fillStyle = shade('#4a6a8a', f); c.fillRect(sx + 7, sy + 12, 8, 8);
      for (let k = 0; k < 3; k++) {
        c.fillStyle = k < lv ? '#d8a94b' : '#3a3527';
        c.beginPath(); c.arc(sx + o.w / 2 - 8 + k * 8, sy + 32, 2.2, 0, TAU); c.fill();
      }
      c.fillStyle = shade('#b03a3a', f); c.fillRect(sx + o.w - 10, sy - 2, 7, 12);
    } else if (o.type === 'fountain') {
      c.fillStyle = shade('#6d6d7c', f); c.fillRect(sx, sy + o.h - 14, o.w, 14);
      c.fillStyle = shade('#8a8a98', f); c.fillRect(sx + 3, sy + o.h - 17, o.w - 6, 4);
      c.fillStyle = shade('#7a7a88', f); c.fillRect(sx + o.w / 2 - 5, sy + 10, 10, o.h - 27);
      c.globalAlpha = 0.55 + Math.sin(t * 2.6) * 0.14;
      c.fillStyle = '#7fc8e8';
      c.fillRect(sx + 5, sy + o.h - 13, o.w - 10, 5);
      c.beginPath(); c.arc(sx + o.w / 2, sy + 8, 7, 0, TAU); c.fill();
      c.globalAlpha = 1;
    }
  },

  /** 장착한 펫을 플레이어 뒤에 둥실둥실 띄워 그린다 (별도 물리 없이 위치만 따라감) */
  /** 펫 — 손그림 시트가 있으면 그것으로, 없으면 itemart 의 절차 생성 아이콘으로. */
  drawPet(c, pet, camX, camY) {
    const sx = Math.round(pet.x - camX), sy = Math.round(pet.y - camY);
    const S = 20;
    c.save();
    c.imageSmoothingEnabled = false;
    // 공격 직후 잠깐 밝게 — 뭘 하고 있는지 눈에 보이게
    if (pet.flash > 0) { c.shadowColor = pet.def.c; c.shadowBlur = 10; }
    /* 손그림 시트가 있으면 그쪽을 쓴다. */
    const sheet = this.spritesOn && Sprites.meta && Sprites.meta.characters.sheets['pet_' + pet.id];
    if (sheet) {
      const fr = pet.flash > 0 ? 2 : (Math.floor(this.time * 3 + pet.slot) % 2);
      if (Sprites.draw(c, 'pet_' + pet.id, fr, sx - sheet.frameW / 2, sy - sheet.frameH / 2, pet.facing < 0)) {
        c.restore(); return;
      }
    }
    if (pet.facing < 0) { c.translate(sx * 2, 0); c.scale(-1, 1); }
    Art.draw(c, 'p:' + pet.id, sx - S / 2, sy - S / 2, S);
    c.restore();
  },
};
mixin(G, RenderFarPart);

/* ===== game/render-sky.js — 하늘 · 해와 달 · 원경 ===== */
import { mixHex } from '../../engine/core/color.js';
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { dimsOf } from '../size.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { DAY_CYCLE, Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RenderSkyPart: Bag = {

  dayFactor() { return DAY_CYCLE.light(this.dayT); },
  drawSky(c: CanvasRenderingContext2D, f: any, camX: number, camY: number) { const { SURF_BASE, HELL_Y } = dimsOf(this.world);
    const surfPx = SURF_BASE * TS;
    let top = mixHex('#0a0d1c', '#4a86c8', f);
    let bot = mixHex('#141020', '#a8c8e0', f);
    // 이벤트 중에는 하늘 자체가 물든다 — 붉은 달이 떴다는 걸 UI 없이 알 수 있게.
    let ev = this.eventActive() ? this.eventSpec() : null;
    if (!ev && this.event && this.event.id === 'rain') {
      const p = this.player, w = this.world;
      const zone = p && w ? w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS)) : null;
      if (zone === 'village' || zone === 'camp') ev = this.eventSpec();
    }
    /* ---- 노을 ---- */
    /* 땅 위에 설 때 0 — camY 그대로 쓰면 지표 깊이(수천 px)만큼 해가 화면 밖으로 밀려 한낮 해가 잘렸다 */
    const skyDy = clamp((camY + this.H / 2 - surfPx) * .05, -this.H * .3, this.H * .3);
    const sunU = this.skyArc(1), sunUp = Math.sin(Math.PI * sunU), sunX = this.skyX(sunU), sunY = this.skyY(sunU, skyDy);
    const gold = clamp(1 - Math.abs(sunUp - 0.02) / 0.32, 0, 1) * (ev ? 0.4 : 1) * (1 - 0.7 * clamp((this.rainT || 0) * 1.4, 0, 1));
    if (ev) { top = mixHex(top, ev.tint, ev.tintAmt); bot = mixHex(bot, ev.tint, ev.tintAmt * 0.7); }
    let mid = mixHex(top, bot, 0.55);
    if (gold > 0) {
      top = mixHex(top, '#3a3a78', gold * 0.5);
      mid = mixHex(mid, '#d8849a', gold * 0.6);
      bot = mixHex(bot, '#f3a45a', gold * 0.85);
    }
    /* 원경이 "멀어 보이는" 색으로 쓸 지금의 하늘색. */
    this.skyHaze = bot;
    /* 하늘을 그릴지 — 화면에 걸친 칸 중 **가장 낮은 지표**보다 카메라 위가 높으면 어딘가에 하늘이 보인다.
       ★ SURF_BASE 만 보면 골짜기·바닷가에서 하늘이 보이는데도 해가 뚝 끊겼다(계획서 §9-1 #10). */
    let skyLow = surfPx + 400;
    if (this.world) {
      const sf = this.world.surface, x0 = Math.max(0, Math.floor(camX / TS)), x1 = Math.min(sf.length - 1, Math.ceil((camX + this.W) / TS));
      for (let x = x0; x <= x1; x++) if (sf[x] * TS + 60 > skyLow) skyLow = sf[x] * TS + 60;
    }
    if (camY < skyLow) {
      const g = c.createLinearGradient(0, 0, 0, this.H);
      // 가장 따뜻한 띠(bot)가 원경 능선 높이(화면 0.5~0.8)에 오게 — 화면 맨 아래는 어차피 땅이다
      g.addColorStop(0, top); g.addColorStop(0.42, mid); g.addColorStop(0.78, bot); g.addColorStop(1, bot);
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
      // 해 쪽 지평선이 더 달아오른다 — 노을은 하늘 전체가 아니라 해가 있는 쪽이 짙다
      if (gold > 0.02) {
        /* 달아오른 자리는 해와 같은 자리에서 — 따로 적으면 해가 오를 때 노을 빛이 해 밑에 떨어져 남았다(§9-1 #9) */
        const hy = sunY;
        const hg = c.createRadialGradient(sunX, hy, 0, sunX, hy, this.W * .8);
        hg.addColorStop(0, `rgba(255,176,96,${0.6 * gold})`);
        hg.addColorStop(0.4, `rgba(240,130,110,${0.25 * gold})`);
        hg.addColorStop(1, 'rgba(240,130,110,0)');
        c.fillStyle = hg; c.fillRect(0, 0, this.W, this.H);
      }
      // 별
      if (f < 0.55) {
        c.fillStyle = `rgba(255,255,255,${(1 - f / .55) * .8})`;
        for (let i = 0; i < 90; i++) {
          const sx = (i * 137.5) % this.W, sy = ((i * 73.3) % (this.H * .6));
          const tw = 0.5 + Math.sin(this.time * 2 + i) * 0.5;
          c.globalAlpha = (1 - f / .55) * (0.25 + tw * 0.55);
          c.fillRect(sx, sy - camY * 0.02, 2, 2);
        }
        c.globalAlpha = 1;
      }
      /* ---- 해와 달 ---- */
      /* 비·폭풍에는 먹구름이 해·달을 가린다 — 비가 오는데 해가 쨍했다(§9-1 #11) */
      const veil = 1 - 0.92 * clamp((this.rainT || 0) * 1.4, 0, 1);
      for (const sun of [1, 0]) {
        const u = sun ? sunU : this.skyArc(0), up = Math.sin(Math.PI * u);
        const al = clamp((up + 0.04) / 0.16, 0, 1) * veil;   // 지평선 조금 아래까지 — 원경 뒤로 넘어간다
        if (al <= 0.01) continue;
        const bx = this.skyX(u), by = this.skyY(u, skyDy);
        if (sun) this.drawSun(c, bx, by, al, gold);
        else this.drawMoon(c, bx, by, al);
      }
      c.globalAlpha = 1;
      // 구름 — 비가 오는 동안은 짙고 빽빽하게, 평소엔 옅게 흘러간다
      this.drawClouds(c, camX, camY, this.rainT || 0);
      this.drawMeteorSky(c, camY);                     // 운석 — 구름 앞, 원경 능선 뒤
    } else {
      const deep = camY > HELL_Y * TS - 400;
      const g = c.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, deep ? '#2a0d08' : '#0a0a10');
      g.addColorStop(1, deep ? '#4a1408' : '#06060a');
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
      /* 땅속에서는 원경이 씻길 색도 땅속 색이다 — 하늘색을 그대로 두면 지옥의 먼 바위가 파랗게 물든다 */
      this.skyHaze = deep ? '#4a1408' : '#06060a';
    }
  },
  /** 해(1)·달(0)이 하늘을 건넌 몫 — 0 = 동쪽 지평선(화면 오른쪽), 1 = 서쪽 지평선. 밖이면 지평선 밑(sin 이 음수).
      ★ 뜨고 지는 시각은 dayFactor 가 밝아지고(4~7시) 어두워지는(17~20시) 한가운데여야 한다 — 어긋나면
      밝은 하늘에 해가 없거나, 해가 중천 가까이에서 갑자기 나타나 제멋대로 떠 보인다. */
  skyArc(sun: any) { return DAY_CYCLE.arc(this.dayT, !!sun); },
  /** 해·달의 화면 자리 — u 0 = 오른쪽(동) → 1 = 왼쪽(서). 노을 빛도 같은 값을 쓴다. */
  skyX(u: any) { return this.W / 2 + Math.cos(Math.PI * u) * this.W * .42; },
  /* 높이는 √up — 선형이면 아침·저녁 내내 숲 원경(화면 0.15~0.5) 뒤에 숨어 한낮에만 보였다 */
  skyY(u: any, skyDy: any) { const up = Math.sin(Math.PI * u); return this.H * .52 - (up > 0 ? Math.sqrt(up) : up) * this.H * .40 - skyDy; },
  /** 해 — 넓은 햇무리 · 안쪽 광채 · 원반. */
  drawSun(c: CanvasRenderingContext2D, x: number, y: number, al: any, gold: number) {
    const r = 22 * (1 + gold * 0.35);
    const core = mixHex('#fff6d8', '#ffd08a', gold), rim = mixHex('#ffd66a', '#ff7a3a', gold);
    const halo = mixHex('#fff0b8', '#ff9a50', gold);
    const rgba = (hex: string, a: any) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    c.save();
    c.globalAlpha = al;
    // 넓은 햇무리 — 하늘에 녹아드는 빛.
    c.translate(x, y); c.scale(1 + gold * 0.6, 1);
    let g = c.createRadialGradient(0, 0, 0, 0, 0, r * 7);
    g.addColorStop(0, rgba(halo, 0.34)); g.addColorStop(0.35, rgba(halo, 0.12)); g.addColorStop(1, rgba(halo, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 7, 0, TAU); c.fill();
    c.setTransform(1, 0, 0, 1, 0, 0);
    // 안쪽 광채
    g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 2.4);
    g.addColorStop(0, rgba(core, 0.55)); g.addColorStop(1, rgba(core, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.4, 0, TAU); c.fill();
    /* 원반 — 구운 그림(tools/mksky.py: 주변 감광 · 쌀알 무늬 · 코로나). */
    const day = Sprites.img.sky_sun, set = Sprites.img.sky_sun_set;
    if (day && day.width) {
      const S = r / 38.4 * 128, sq = 1 - 0.12 * gold;
      c.drawImage(day, x - S / 2, y - S * sq / 2, S, S * sq);
      if (gold > 0.01 && set && set.width) {
        c.globalAlpha = al * gold;
        c.drawImage(set, x - S / 2, y - S * sq / 2, S, S * sq);
      }
    } else {
      g = c.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, core); g.addColorStop(1, rim);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.restore();
  },
  /** 달 — 차가운 원반에 옅은 얼룩 셋, 푸른 달무리 */
  drawMoon(c: CanvasRenderingContext2D, x: number, y: number, al: any) {
    const r = 18;
    c.save();
    c.globalAlpha = al;
    let g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 5);
    g.addColorStop(0, 'rgba(190,210,255,0.22)'); g.addColorStop(1, 'rgba(190,210,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 5, 0, TAU); c.fill();
    g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, '#fbfcff'); g.addColorStop(1, '#c4cce0');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(120,130,160,0.22)';
    for (const [dx, dy, rr] of [[-5, -3, 4.5], [6, 4, 3.2], [-2, 8, 2.4]]) { c.beginPath(); c.arc(x + dx, y + dy, rr, 0, TAU); c.fill(); }
    c.restore();
  },
  drawParallax(c: CanvasRenderingContext2D, camX: number, camY: number, f: any) { const { SURF_BASE } = dimsOf(this.world);
    // 손그림 원경이 있으면 그것으로
    if (this.spritesOn && this.drawParallaxArt(c, camX, camY, f)) return;
    if (camY > SURF_BASE * TS + 500) return;
    c.save();
    const layers: [number, string, number][] = [[0.22, '#2b3a4a', 150], [0.38, '#25313f', 90]];
    const groundCamY = SURF_BASE * TS - this.H / 2;
    for (const [sp, col, off] of layers) {
      c.fillStyle = mixHex('#0d1018', col, 0.3 + f * 0.7);
      // 수직도 X축과 같은 sp 비율로만 반응(멀리 있는 배경일수록 카메라 이동에 덜 흔들려야 한다)
      const ox = -camX * sp, base = SURF_BASE * TS - groundCamY + off + (groundCamY - camY) * sp;
      c.beginPath(); c.moveTo(0, this.H);
      for (let x = -100; x < this.W + 100; x += 40) {
        const wx = x - (ox % 400);
        const h = Math.sin((x + ox) * 0.004) * 70 + Math.sin((x + ox) * 0.011) * 34;
        c.lineTo(x, base - h);
      }
      c.lineTo(this.W, this.H); c.closePath(); c.fill();
    }
    c.restore();
  },
  /* 초록색 앙상한 장대는 살아 있는 숲으로 안 읽힌다 — 색이 아니라 **모양**이 바뀌어야 한다 — 사연: docs/code-history.md#h64 */
  FOREST_STAGE: [
    [0.10, 'parallax_forest_lush'],   // 1장 — 잎이 가장 우거진 것
    [0.38, 'parallax_forest_mid'],    // 3~4장 — 성글어진 것
    [0.66, 'parallax_forest_thin'],   // 5~7장 — 가지 끝에만
    [0.99, 'parallax_forest']         // 8장 — 죽은 나무만 (원본)
  ],

  /** 숲 원경을 지금 잿빛 깊이에 맞춰 섞어 둔다. */
  forestBg(im: any) {
    const af = this.ashF();
    const S = this.FOREST_STAGE;
    /* 지금 잿빛 깊이가 어느 두 단계 사이인가. */
    let a = 0;
    while (a < S.length - 2 && af > S[a + 1][0]) a++;
    const dense = Sprites.img[S[a][1]], sparse = Sprites.img[S[a + 1][1]];
    const t = clamp((af - S[a][0]) / (S[a + 1][0] - S[a][0]), 0, 1);
    const ok = dense && dense.width && sparse && sparse.width;
    const key = ok ? S[a][1] + '|' + t.toFixed(2) : 'plain';
    if (af > 0.98 && !ok) return im;              // 다 빠졌다 — 원본이 곧 그 상태다
    if (this._fbg && this._fbg.key === key && Math.abs(this._fbg.f - af) < 0.004) return this._fbg.cv;
    const cv = this._fbg ? this._fbg.cv : document.createElement('canvas');
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    if (ok) {
      g.drawImage(sparse, 0, 0);
      g.globalAlpha = 1 - t; g.drawImage(dense, 0, 0); g.globalAlpha = 1;
    } else {
      g.drawImage(im, 0, 0);
    }
    /* ★ zip 을 file:// 로 열면 크롬은 PNG 를 다른 출처로 보고 캔버스를 더럽힌다 — getImageData 가 매 프레임 SecurityError 를
       던져 숲 원경이 안 그려졌다(20초에 740번). 그때는 픽셀을 못 읽으니 filter 로 채도만 빼서 비슷하게 만든다. */
    let d = null;
    if (!this._fbgTaint) { try { d = g.getImageData(0, 0, cv.width, cv.height); } catch (e) { this._fbgTaint = true; } }
    if (!d) {
      g.clearRect(0, 0, cv.width, cv.height);
      g.filter = `saturate(${Math.max(0.25, af).toFixed(2)}) hue-rotate(${Math.round((1 - af) * 18)}deg) brightness(${(1 + af * 0.06).toFixed(2)})`;
      g.drawImage(ok ? sparse : im, 0, 0);
      if (ok) { g.globalAlpha = 1 - t; g.drawImage(dense, 0, 0); g.globalAlpha = 1; }
      g.filter = 'none';
      this._fbg = { key, cv, f: af };
      return cv;
    }
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      /* 밝기는 그대로 두고 색만 숲으로 되돌린다. */
      const l = px[i] * 0.30 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      /* 잿빛이 짙을수록 아주 조금 **들어 올린다.** */
      const haze = af * 14;
      px[i] = Math.min(255, px[i] * af + (l * 0.60 + 4) * (1 - af) + haze);
      px[i + 1] = Math.min(255, px[i + 1] * af + (l * 1.10 + 8) * (1 - af) + haze);
      px[i + 2] = Math.min(255, px[i + 2] * af + (l * 0.78 + 9) * (1 - af) + haze);
    }
    g.putImageData(d, 0, 0);
    this._fbg = { key, cv, f: af };
    return cv;
  },

  /** 손그림 원경 — 두 겹으로 무한 스크롤. */
  /* ================= 원경을 불투명하게 ================= */
  tintBg(src: any, slot: any, ck: any, haze: any, hazeAmt: any, darkAmt: any) {
    if (hazeAmt <= 0 && darkAmt <= 0) return src;
    const q = (v: number) => Math.round(v * 12) / 12;
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
  bgKeyFor(b: any) {
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

  drawParallaxArt(c: CanvasRenderingContext2D, camX: number, camY: number, f: any) { const { WW, SURF_BASE, BIOMES } = dimsOf(this.world);
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
};

mixin(Game.prototype, RenderSkyPart, true);

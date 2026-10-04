/* ===== game/status-fx.ts — 걸린 것의 연출: 몸에 붙는 불 · 얼음 껍질 · 독 거품 · 북돋움 기운 · 시전 예고 · 화면 가장자리 ===== */
/* 색만 바꿔 칠하면(빨갛게 · 파랗게) "무엇에 걸렸는지"가 안 읽힌다 — 불은 타오르고, 얼음은 몸에 얼어붙고, 독은 끓어오른다.
   ★ 몸에 붙는 연출은 처음 걸리는 순간 한 번 터지고(statusOnset) 이후엔 몸 위에서만 돈다 — 다시 걸려도 겹치지 않는다.
   화면 가장자리는 플레이어 디버프 갈래마다 한 겹이고 세기가 서서히 차오르고 빠진다(edgeA). '화면 효과' 설정(fxScale)을 따른다. */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tileHash } from '../../engine/core/rng.js';
import { DEBUFF_EDGE, MOB_SKILLS } from '../data/mobskills.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { Game } from '../game.js';

type Kinds = { burn: boolean; poison: boolean; chill: boolean; empower: boolean; weak: boolean; cast: Bag | null };

export const StatusFxPart: Bag = {
  edgeA: null, edgeT: 0, frostEdge: null,

  /** 무엇에 걸려 있나 — 몹은 지속 피해 · 냉기 · 북돋움, 플레이어는 디버프 버프 */
  statusKinds(e: any): Kinds {
    if (e.buffs) {
      const has = (id: string) => e.buffs.some((b: any) => b.id === id);
      return { burn: has('burn'), poison: has('poison'), chill: has('frostbite'), empower: false, weak: has('weak'), cast: null };
    }
    const dots = e.dots || [];
    return { burn: dots.some((d: any) => d.kind === 'burn' || d.kind === 'fire'),   // 'fire' = 스킬 불(유성우 따위)
      poison: dots.some((d: any) => d.kind === 'poison'),
      chill: e.chillT > 0, empower: e.empT > 0, weak: false, cast: e.cast || null };
  },

  /** 처음 걸리는 순간 — 확 붙는 불 · 얼어붙으며 튀는 조각 · 퍼지는 독 */
  statusOnset(e: any, kind: string) {
    const v = this.vfx, x = e.cx, y = e.cy, tx = x / TS, ty = y / TS;
    if (kind === 'burn' || kind === 'fire') {
      v.flare(x, y, 30, '#ff9a3a', 0.22); v.sparks(x, y + e.h * 0.3, 12, '#ffb050', 260, -Math.PI / 2, 1.4, 0.5, -300);
      v.puffs(x, y - 4, 3, 10, 'rgba(70,60,55,.8)', 0.7, 8);
      this.sfxAt('mat_ember', tx, ty, 1.1, 0.5);
    } else if (kind === 'chill' || kind === 'frostbite') {
      v.shards(x, y, 10, '#d8f4ff', 260, 0.45, 6); v.flare(x, y, 26, '#bfefff', 0.2); v.shock(x, y, e.w * 0.9 + 10, '#bfefff', 0.3, 4);
      this.sfxAt('mat_glass', tx, ty, 1.25, 0.45);
    } else if (kind === 'poison') {
      v.puffs(x, y, 5, 12, 'rgba(120,190,80,.75)', 0.9, 12); v.sparks(x, y, 8, '#a8e070', 160, -Math.PI / 2, 2, 0.5, 200);
      this.sfxAt('mat_plant', tx, ty, 0.9, 0.5);
    } else if (kind === 'empower') {
      v.flare(x, y, 30, '#ff6a4a', 0.22); if (e.onGround !== false) v.column(x, e.y + e.h, e.w + 10, e.h * 1.6, '#ff5a3a', 0.45); else v.shock(x, y, e.w + 16, '#ff5a3a', 0.4, 6);   // 떠 있으면 기둥 대신 고리
    } else if (kind === 'weak') {
      v.puffs(x, y - 6, 8, 12, 'rgba(110,70,160,.8)', 1.0, 18); v.flare(x, y, 24, '#b07aff', 0.2);
    }
  },

  mobSkillDef(id: string) { return MOB_SKILLS[id]; },

  /** 몸 위의 연출 — 판정 상자(sx, sy, w, h) 기준. 불 · 독은 몸 위로, 얼음은 몸에 붙어, 북돋움은 몸 둘레로 */
  drawStatus(c: CanvasRenderingContext2D, e: any, sx: number, sy: number) {
    const k = this.statusKinds(e);
    if (!k.burn && !k.poison && !k.chill && !k.empower && !k.weak && !k.cast) return;
    const t = this.time, w = e.w, h = e.h;
    const id = (e._sfxId = e._sfxId || Math.floor(Math.random() * 1e6));
    /* ★ 떠 있는 몸(박쥐 · 점프 중)은 판정 상자 밑줄이 땅이 아니다 — 거기 고리 · 불길 밑동 · 서리를 세우면 허공에 바닥 선이 그어졌다.
       떠 있으면 발밑 연출을 몸 둘레(가운데 기준)로 옮긴다 */
    const air = e.onGround === false;
    c.save();
    c.globalCompositeOperation = 'lighter';
    if (k.empower) {          // 붉은 기운 — 발밑 고리가 맥박치고 몸 둘레로 붉은 불길이 옅게
      const pul = 0.5 + 0.5 * Math.sin(t * 6 + id);
      if (air) this.bodyGlow(c, sx, sy, w, h, '#ff5a3a', 0.25 + 0.2 * pul);
      else {
        c.globalAlpha = 0.35 + 0.25 * pul; c.strokeStyle = '#ff5a3a'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(sx + w / 2, sy + h, w * 0.7 + 4 * pul, 5, 0, 0, TAU); c.stroke();
      }
      this.flames(c, sx - 3, sy + h * 0.2, w + 6, h * 0.8, t + id, 'rgba(255,60,40,', 0.35, 4);
    }
    if (k.burn) {             // 몸을 휘감고 타오르는 불길(구운 불길 장 · tools/mkvfx.py) + 위로 날리는 불티
      if (!this.fireSprites(c, sx, sy, w, h, t, id, air))
        this.flames(c, sx - 2, sy + h * 0.15, w + 4, h * 0.85, t + id, 'rgba(255,110,30,', 0.85, Math.max(3, Math.round(w / 6)));
      for (let i = 0; i < 4; i++) {
        const ph = (t * 1.1 + i / 4 + tileHash(id, i + 20)) % 1;
        c.globalAlpha = 1 - ph; c.fillStyle = '#ffc060';
        c.fillRect(sx + w * tileHash(id + i, 21) + Math.sin(t * 6 + i) * 3, sy + h * 0.3 - ph * 26, 1.6, 1.6);
      }
    }
    if (k.poison) {           // 끓어오르는 거품 · 떨어지는 방울
      const n = Math.max(3, Math.round(w / 8));
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.9 + i / n + tileHash(id, i)) % 1, bx = sx + w * (0.15 + 0.7 * tileHash(id + i, 3)), by = sy + h * 0.85 - ph * h;
        c.globalAlpha = 0.85 * (1 - ph); c.strokeStyle = '#a8e070'; c.lineWidth = 1.4;
        c.beginPath(); c.arc(bx, by, 1.8 + ph * 2.6, 0, TAU); c.stroke();
      }
      const dp = (t * 1.3 + tileHash(id, 9)) % 1;
      c.globalAlpha = 0.8 * (1 - dp); c.fillStyle = '#8fd06a';
      c.beginPath(); c.ellipse(sx + w * 0.6, sy + h + dp * 10, 1.6, 2.6, 0, 0, TAU); c.fill();
    }
    if (k.weak) {             // 보랏빛 기운이 몸을 감고 돈다
      for (let i = 0; i < 3; i++) {
        const a = t * 2.2 + i * 2.1, r = w * 0.6 + 4;
        c.globalAlpha = 0.6; c.fillStyle = '#b07aff';
        c.beginPath(); c.arc(sx + w / 2 + Math.cos(a) * r, sy + h * 0.5 + Math.sin(a * 1.3) * h * 0.35, 2.2, 0, TAU); c.fill();
      }
    }
    if (k.cast) {             // 시전 예고 — 발밑에 빛이 차오르고 손에 빛 덩이가 커진다(모여드는 알갱이는 mob-fx)
      const S = this.mobSkillDef(k.cast.id), p = 1 - Math.max(0, k.cast.t) / k.cast.max, col = S ? S.c : '#ffffff';
      const fx = sx + w / 2, fy = sy + h, pr = w * 0.9 + 10;
      if (air) this.bodyGlow(c, sx, sy, w, h, col, 0.2 + 0.3 * p);   // 떠 있으면 발밑 대신 몸 둘레가 차오른다
      else {
        const pool = c.createRadialGradient(fx, fy, 0, fx, fy, pr);
        pool.addColorStop(0, col); pool.addColorStop(1, 'rgba(0,0,0,0)');
        c.save(); c.translate(fx, fy); c.scale(1, 0.28); c.translate(-fx, -fy);
        c.globalAlpha = 0.25 + 0.35 * p; c.fillStyle = pool; c.beginPath(); c.arc(fx, fy, pr, 0, TAU); c.fill(); c.restore();
      }
      const ox = sx + w / 2 + (e.facing || 1) * (w / 2 + 4), oy = sy + h * 0.35, r = 3 + p * 8 + Math.sin(t * 30) * 0.8;
      const g = c.createRadialGradient(ox, oy, 0, ox, oy, r * 2.4);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = 0.9; c.fillStyle = g; c.beginPath(); c.arc(ox, oy, r * 2.4, 0, TAU); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    if (k.chill) this.iceCrust(c, sx, sy, w, h, id, t, air);
    c.restore();
  },
  /** 몸 둘레에 번지는 빛(떠 있는 몸의 발밑 연출 대신) — 가운데가 짙고 둥글게 사라진다 */
  bodyGlow(c: CanvasRenderingContext2D, sx: number, sy: number, w: number, h: number, col: string, a: number) {
    const x = sx + w / 2, y = sy + h / 2, r = Math.max(w, h) * 0.75 + 8;
    const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  },
  /** 구운 불길 — 몸 폭에 혀 여럿을 엇갈려 세운다(장 · 키 · 흔들림이 혀마다 다르다). 가운데 혀가 가장 높다. 그림이 없으면 false */
  fireSprites(c: CanvasRenderingContext2D, sx: number, sy: number, w: number, h: number, t: number, id: number, air = false) {
    const im = this.spritesOn && Sprites.img.vfx_fire; if (!im || !im.width) return false;
    const F = 8, FW = im.width / F, FH = im.height, n = Math.max(2, Math.round(w / 8));
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1), mid = 1 - Math.abs(u - 0.5) * 1.2;
      const fh = h * (air ? 0.65 : 0.75 + 0.5 * mid) * (0.9 + 0.12 * Math.sin(t * 9 + i * 2.3 + id)) + (air ? h * 0.35 * mid : 0), fw = Math.max(fh, 16) * FW / FH * 1.25;
      const fx = sx + w * (0.08 + 0.84 * u) + Math.sin(t * 5 + i) * 1.5, fr = Math.floor(t * 14 + i * 3 + id) % F;
      const base = air ? sy + h * (0.8 + 0.12 * Math.sin(u * Math.PI)) : sy + h + 2;   // 떠 있으면 밑동을 몸 안에(둥근 배를 따라)
      const fh2 = Math.max(fh, 16);                                     // 작은 몸(박쥐)에도 불이 붙은 게 읽히게
      c.globalAlpha = 0.9; c.drawImage(im, fr * FW, 0, FW, FH, fx - fw / 2, base - fh2, fw, fh2);
    }
    return true;
  },
  /** 불길 — 바닥(x, y0+hh)에서 위로 일렁이는 혀 n 개. col 은 'rgba(r,g,b,' 꼴 */
  flames(c: CanvasRenderingContext2D, x: number, y0: number, ww: number, hh: number, t: number, col: string, a: number, n: number) {
    const base = y0 + hh;
    for (let i = 0; i < n; i++) {
      const fx = x + (i + 0.5) * ww / n + Math.sin(t * 7 + i * 1.9) * 2;
      const fh = hh * (0.45 + 0.3 * Math.sin(t * 13 + i * 2.1) * Math.sin(t * 5.3 + i)), fw = ww / n * 0.75;
      const tip = fx + Math.sin(t * 9 + i * 3) * 3;
      const g = c.createLinearGradient(0, base, 0, base - fh);
      g.addColorStop(0, col + a + ')'); g.addColorStop(0.55, col + a * 0.7 + ')'); g.addColorStop(1, 'rgba(255,230,140,0)');
      c.globalAlpha = 1; c.fillStyle = g;
      c.beginPath(); c.moveTo(fx - fw, base);
      c.quadraticCurveTo(fx - fw * 0.6, base - fh * 0.55, tip, base - fh);
      c.quadraticCurveTo(fx + fw * 0.6, base - fh * 0.55, fx + fw, base); c.closePath(); c.fill();
      c.globalAlpha = a * 0.7; c.fillStyle = 'rgba(255,236,170,1)';      // 속불
      c.beginPath(); c.moveTo(fx - fw * 0.35, base); c.quadraticCurveTo(fx, base - fh * 0.5, fx + fw * 0.35, base); c.fill();
    }
  },
  /** 얼음 껍질 — 발밑에서 돋은 서리 조각(자리는 개체마다 고정) + 반짝임. 몸 빛깔은 언 사본(Sprites.frostSheet)이 맡는다 —
      ★ 판정 상자에 칠하거나 상자 옆선에 조각을 박으면 네모 얼음 상자처럼 보인다. */
  iceCrust(c: CanvasRenderingContext2D, sx: number, sy: number, w: number, h: number, id: number, t: number, air = false) {
    const n = 4 + Math.round(w / 6);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.2 + 0.6 * tileHash(id, i * 3)) / n;               // 발 폭에 고르게
      /* 땅에선 발밑에서 위로 돋고, 떠 있으면 배 아래 둥근 선에 고드름처럼 매달린다 */
      const bx = sx + w * (0.1 + 0.8 * u), by = air ? sy + h * (0.78 + 0.2 * Math.sin(u * Math.PI)) : sy + h;
      const ang = air ? Math.PI / 2 + (u - 0.5) * 0.9 : -Math.PI / 2 + (u - 0.5) * 1.8;
      const L = 3 + tileHash(id, i * 3 + 1) * 5, hw = 1.2 + tileHash(id, i * 3 + 2) * 1.2;
      const tx = bx + Math.cos(ang) * L, ty = by + Math.sin(ang) * L, nx = -Math.sin(ang) * hw, ny = Math.cos(ang) * hw;
      c.globalAlpha = 0.85; c.fillStyle = '#d8f4ff';
      c.beginPath(); c.moveTo(bx + nx, by + ny); c.lineTo(tx, ty); c.lineTo(bx - nx, by - ny); c.closePath(); c.fill();
      c.globalAlpha = 0.9; c.strokeStyle = '#ffffff'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
    }
    const tw = (t * 1.5 + tileHash(id, 77)) % 1;                         // 반짝임 하나가 몸 위를 돈다
    c.globalAlpha = Math.sin(tw * Math.PI); c.fillStyle = '#ffffff';
    const px = sx + w * tileHash(id, Math.floor(t * 1.5)), py = sy + h * (0.3 + 0.6 * tileHash(Math.floor(t * 1.5), id));
    c.fillRect(px - 0.5, py - 2.5, 1, 5); c.fillRect(px - 2.5, py - 0.5, 5, 1);
  },

  /* ================= 화면 가장자리 — 플레이어 디버프 ================= */
  drawDebuffEdge(c: CanvasRenderingContext2D, W: number, H: number) {
    const me = this.me; if (!me) return;
    const fs = this.fxScale(); if (fs <= 0) return;
    const now = this.time, dt = Math.min(0.1, Math.max(0, now - (this.edgeT || now))); this.edgeT = now;
    const A = this.edgeA = this.edgeA || { frost: 0, burn: 0, poison: 0, weak: 0 };
    const on: Bag = {};
    for (const b of me.buffs || []) { const k = DEBUFF_EDGE[b.id]; if (k) on[k] = 1; }
    let any = false;
    for (const k in A) { A[k] += ((on[k] ? 1 : 0) - A[k]) * Math.min(1, dt * (on[k] ? 5 : 1.8)); if (A[k] > 0.01) any = true; else A[k] = 0; }
    if (!any) return;
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) / 2;
    const vign = (rgb: string, a: number, inner = 0.42) => {
      const g = c.createRadialGradient(cx, cy, Math.min(W, H) * inner, cx, cy, R);
      g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${a})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    };
    c.save();
    if (A.frost) {            // 서리가 가장자리부터 얼어 들어온다
      vign('185,228,255', 0.36 * A.frost * fs, 0.5);
      const key = W + 'x' + H;
      if (!this.frostEdge || this.frostEdge.key !== key) this.frostEdge = { key, lines: this.frostLines(W, H) };
      c.strokeStyle = '#eef9ff'; c.lineWidth = 1.4;
      c.globalAlpha = (0.55 + 0.1 * Math.sin(now * 2)) * A.frost * fs;
      c.beginPath();
      for (const L of this.frostEdge.lines) { c.moveTo(L[0], L[1]); for (let i = 2; i < L.length; i += 2) c.lineTo(L[i], L[i + 1]); }
      c.stroke();
    }
    if (A.burn) {             // 아래에서 일렁이는 열기
      const fl = 0.8 + 0.2 * Math.sin(now * 17) * Math.sin(now * 7.3);
      const g = c.createLinearGradient(0, H, 0, H * 0.62);
      g.addColorStop(0, `rgba(255,90,30,${0.38 * A.burn * fl * fs})`); g.addColorStop(1, 'rgba(255,90,30,0)');
      c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, H * 0.6, W, H * 0.4);
      vign('255,120,40', 0.28 * A.burn * fl * fs, 0.5);
    }
    if (A.poison) {           // 메스껍게 맥박치는 초록
      const pu = 0.7 + 0.3 * Math.sin(now * 3.1);
      vign('80,160,50', 0.45 * A.poison * pu * fs, 0.38);
    }
    if (A.weak) vign('50,25,80', 0.5 * A.weak * (0.85 + 0.15 * Math.sin(now * 1.7)) * fs, 0.4);
    c.restore();
  },
  /** 서리 결 — 가장자리에서 안으로 갈라져 들어오는 가지(화면 크기마다 한 번) */
  frostLines(W: number, H: number) {
    const out: number[][] = [];
    let s = 1;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const branch = (x: number, y: number, a: number, len: number, depth: number) => {
      const L = [x, y];
      let px = x, py = y;
      for (let d = 0; d < len; d += 7) { a += (rnd() - 0.5) * 0.5; px += Math.cos(a) * 7; py += Math.sin(a) * 7; L.push(px, py);
        if (depth < 2 && rnd() < 0.14) branch(px, py, a + (rnd() < 0.5 ? -0.9 : 0.9), len * 0.45, depth + 1); }
      out.push(L);
    };
    for (let i = 0; i < 46; i++) {
      const e = i % 4, u = rnd();
      const [x, y, a] = e === 0 ? [u * W, 0, Math.PI / 2] : e === 1 ? [u * W, H, -Math.PI / 2] : e === 2 ? [0, u * H, 0] : [W, u * H, Math.PI];
      branch(x, y, a + (rnd() - 0.5) * 0.8, 30 + rnd() * 70, 0);
    }
    return out;
  }
};

mixin(Game.prototype, StatusFxPart, true);

/* ===== game/fx.js — 전투 연출 — 터짐 · 범위 · 특성 효과 ===== */
import { TAU, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { SIG_FX } from '../data/values.js';
import { Enemy } from '../entity.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const FxPart: Bag = {

  /* ================= 광역 피해 ================= */
  /** 폭발/타격 이펙트 등록 (kind: hit / fire / void / stargain / starmerge) slow: 재생을 늘리는 배수(기본 1 = 여섯 프레임 0.24초). */
  burst(x, y, kind, size, slow) {
    if (!this.spritesOn) return;
    (this.bursts = this.bursts || []).push({ x, y, kind, s: size || 64, t: 0, sp: slow || 1 });
  },

  aoe(x, y, r, dmg, kb, color, effect) {
    for (const e of this.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      if (dist(x, y, e.cx, e.cy) > r + e.w / 2) continue;
      const crit = this.player.rollCrit();
      e.hurt(dmg * (crit ? 1 + this.player.d.critD / 100 : 1), crit, this.player, kb);
      if (effect === 'frost') e.slow(0.5, 3);
    }
    this.rings = this.rings || [];
    this.rings.push({ x, y, r, t: 0.3, c: color });
  },

  /** 퍼져 나가는 고리. */
  /** 세계를 s초만큼 멈춘다(겹치면 긴 쪽). */
  hitStop(s) { this.stopT = Math.min(0.12, Math.max(this.stopT || 0, s || 0)); },

  /* ★ 입력을 삼키면 안 된다. */
  skillDeny(slot, msg) {
    this.sfx('sk_deny');
    const el = document.querySelectorAll('#skillbar .sk')[slot];
    if (el) { el.classList.remove('deny'); void (el as HTMLElement).offsetWidth; el.classList.add('deny'); }
    if (msg) this.toast(msg, 'bad');
  },

  ringFx(x, y, r, c, life) {
    this.rings = this.rings || [];
    this.rings.push({ x, y, r, t: life || 0.3, max: life || 0.3, c });
  },
  /** 두 점을 잇는 번개. */
  boltFx(x0, y0, x1, y1, c) {
    this.bolts = this.bolts || [];
    const seg = 7, pts = [];
    for (let i = 0; i <= seg; i++) {
      const k = i / seg, j = i === 0 || i === seg ? 0 : (Math.random() - 0.5) * 26;
      const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
      pts.push([x0 + (x1 - x0) * k + nx / L * j, y0 + (y1 - y0) * k + ny / L * j]);
    }
    this.bolts.push({ pts, t: 0.22, max: 0.22, c });
  },
  /** 떨어질 자리 예고 — 차오르는 원. */
  warnFx(x, y, r, dur, c) {
    this.warns = this.warns || [];
    this.warns.push({ x, y, r, t: dur, max: dur, c });
  },

  /* ---- 특별한 스킬의 고유 연출 (SIG_FX) ---- */
  sigFx(o) { (this.sigs = this.sigs || []).push(o); },
  /** 유성 화살비가 떨어질 띠. */
  bandFx(x, y, hw, dur, c) { this.sigFx({ k: 'band', x, y, hw, t: dur, max: dur, c }); },
  /** 소환 문양 — 안으로 조여드는 고리. */
  sigilFx(x, y, r, c) { this.sigFx({ k: 'sigil', x, y, r, t: SIG_FX.wolf.t, max: SIG_FX.wolf.t, c }); },
  /** 하늘에서 떨어지는 별. */
  fallFx(x, y, dur, c) { this.sigFx({ k: 'fall', x, y, t: dur, max: dur, c }); },
  /** 착탄 섬광. */
  flashFx(x, y, r, c) { this.sigFx({ k: 'flash', x, y, r, t: SIG_FX.flash.t, max: SIG_FX.flash.t, c }); },
  /** 화면 테두리가 한 번 물든다. */
  edgeFx(rgb, dur) { this.edge = { rgb, t: dur, max: dur }; },

  /** '화면 효과' 설정(0~150%)을 1을 넘지 않게 돌려준다 — 0%면 화면을 덮는 연출이 없다 */
  fxScale() { return Math.min(1, (this.settings ? this.settings.shake : 100) / 100); },

  /* ================= 특별한 스킬의 고유 연출 ================= */
  drawSigGround(c, camX, camY) {
    if (!this.sigs || !this.sigs.length) return;
    const fs = this.fxScale();
    for (let i = this.sigs.length - 1; i >= 0; i--) {
      const s = this.sigs[i];
      s.t -= 1 / 60;
      if (s.t <= 0) { this.sigs.splice(i, 1); continue; }
      const k = s.t / s.max, x = s.x - camX, y = s.y - camY;
      if (s.k === 'band') {
        /* 유성 화살비가 떨어질 띠. */
        /* 처음에 가장 진하고 화살이 다 떨어질 때까지 옅어진다. */
        const a = SIG_FX.rain.a * Math.min(1, 0.35 + k);
        const line = () => {
          c.beginPath(); c.moveTo(x - s.hw, y); c.lineTo(x + s.hw, y); c.stroke();
          for (let j = -3; j <= 3; j++) {
            const tx = x + (s.hw / 3) * j;
            c.beginPath(); c.moveTo(tx, y - 16); c.lineTo(tx, y - 4); c.stroke();   // 내려오는 방향
            c.beginPath(); c.moveTo(tx - 3.5, y - 8); c.lineTo(tx, y - 4); c.lineTo(tx + 3.5, y - 8); c.stroke();
          }
        };
        c.lineJoin = 'round'; c.lineCap = 'round';
        c.globalAlpha = a * 0.8; c.strokeStyle = '#12100c'; c.lineWidth = 4.5; line();
        c.globalAlpha = a; c.strokeStyle = s.c; c.lineWidth = 2; line();
        c.lineCap = 'butt';
      } else if (s.k === 'sigil') {
        /* 소환 문양 — 안으로 **조여드는** 고리. */
        const a = SIG_FX.wolf.a * Math.min(1, k * 1.6);
        const rune = () => {
          c.beginPath(); c.arc(x, y, s.r * (0.25 + k * 0.75), 0, TAU); c.stroke();
          c.beginPath(); c.arc(x, y, s.r * 0.34, 0, TAU); c.stroke();
          c.beginPath();
          for (let j = 0; j < 6; j++) {                                      // 육각 룬
            const ang = -Math.PI / 2 + j * TAU / 6, rr = s.r * 0.34;
            j ? c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr)
              : c.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
          }
          c.closePath(); c.stroke();
        };
        c.lineJoin = 'round';
        c.globalAlpha = a * 0.75; c.strokeStyle = '#12100c'; c.lineWidth = 4; rune();   // 밑줄 — 밝은 바닥에서도 읽힌다
        c.globalAlpha = a; c.strokeStyle = s.c; c.lineWidth = 2; rune();
      } else if (s.k === 'flash') {
        /* 착탄 섬광. */
        const a = SIG_FX.flash.a * fs * k;
        if (a > 0.004) {
          const g = c.createRadialGradient(x, y, 0, x, y, s.r);
          g.addColorStop(0, s.c); g.addColorStop(1, 'transparent');
          c.globalAlpha = a; c.fillStyle = g;
          c.beginPath(); c.arc(x, y, s.r, 0, TAU); c.fill();
        }
      }
      c.globalAlpha = 1; c.lineWidth = 1;
    }
  },

  /** 떨어지는 별. */
  drawSigSky(c, camX, camY) {
    if (!this.sigs) return;
    for (const s of this.sigs) {
      if (s.k !== 'fall') continue;
      const k = 1 - s.t / s.max;                       // 0 -> 1 로 내려온다
      /* ★ 420 · k^1.5 면 0.25초쯤 화면에 들어와 나머지를 내려오는 것이 다 보인다. */
      const e = Math.pow(k, 1.5);
      const x = s.x - 150 * (1 - e) - camX, y = s.y - 420 * (1 - e) - camY;
      const a = SIG_FX.fall.a;
      c.save();
      c.globalAlpha = a * 0.5; c.strokeStyle = s.c; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x + 54, y - 150); c.lineTo(x, y); c.stroke();   // 꼬리 — 내려오는 각과 같게
      c.globalAlpha = a; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 22, y - 62); c.lineTo(x, y); c.stroke();    // 꼬리 심
      c.fillStyle = '#fff6dc'; c.globalAlpha = a;
      c.beginPath(); c.arc(x, y, 5 + k * 3, 0, TAU); c.fill();                // 머리 — 가까워지며 커진다
      c.restore();
      c.globalAlpha = 1; c.lineWidth = 1;
    }
  },

  /** 회오리 검무 — 도는 동안 칼선 둘. */
  drawWhirlArc(c, p, camX, camY) {
    const ch = p.channel;
    if (!ch || ch.id !== 's_whirl') return;
    const x = p.cx - camX, y = p.cy - camY, a = this.time * 13;
    const fade = Math.min(1, ch.t / 0.25);             // 끝맺을 때 사라진다
    c.save();
    c.lineCap = 'round';
    for (let j = 0; j < 2; j++) {
      const ang = a + j * Math.PI;
      c.globalAlpha = SIG_FX.whirl.a * fade;
      c.strokeStyle = '#ffcf6a'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, y, 96, ang, ang + 1.1); c.stroke();             // 96 = 실제 피해 반경
      c.globalAlpha = SIG_FX.whirl.a * fade * 0.45;
      c.lineWidth = 8;
      c.beginPath(); c.arc(x, y, 96, ang - 0.5, ang); c.stroke();             // 지나간 자취
    }
    c.restore();
    c.globalAlpha = 1; c.lineWidth = 1;
  },
};

mixin(Game.prototype, FxPart, true);

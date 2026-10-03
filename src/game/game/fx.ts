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
  burst(x: number, y: number, kind: string, size: any, slow: any) {
    if (!this.spritesOn) return;
    (this.bursts = this.bursts || []).push({ x, y, kind, s: size || 64, t: 0, sp: slow || 1 });
  },

  aoe(x: number, y: number, r: any, dmg: number, kb: number, color: string, effect: any) {
    for (const e of this.ents) {
      if (!(e instanceof Enemy) || e.dead) continue;
      if (dist(x, y, e.cx, e.cy) > r + e.w / 2) continue;
      const crit = this.player.rollCrit();
      e.hurt(dmg * (crit ? 1 + this.player.d.critD / 100 : 1), crit, this.player, kb);
      if (effect === 'frost') e.chill(3);          // 얼음 — 느려짐 + 얼음 껍질
      else if (effect === 'slow') e.slow(0.5, 3);   // 그냥 느려짐(대지 가르기)
    }
    this.shapes.ring(x, y, r, color, 0.3);
  },

  /** 퍼져 나가는 고리. */
  /** 세계를 s초만큼 멈춘다(겹치면 긴 쪽). */
  hitStop(s: any) { this.timeScale.hit(s, 0.12); },

  /* ★ 입력을 삼키면 안 된다. */
  skillDeny(slot: number, msg: string) {
    this.sfx('sk_deny');
    const el = document.querySelectorAll('#skillbar .sk')[slot];
    if (el) { el.classList.remove('deny'); void (el as HTMLElement).offsetWidth; el.classList.add('deny'); }
    if (msg) this.toast(msg, 'bad');
  },

  ringFx(x: number, y: number, r: any, c: any, life?: number) { this.shapes.ring(x, y, r, c, life || 0.3); },
  /** 두 점을 잇는 번개. */
  boltFx(x0: number, y0: number, x1: number, y1: number, c: any, life?: number) { this.shapes.bolt(x0, y0, x1, y1, c, life); },
  /** 떨어질 자리 예고 — 차오르는 원. */
  warnFx(x: number, y: number, r: any, dur: number, c: any) { this.shapes.warn(x, y, r, dur, c); },

  /** 스킬 연출 — 무엇을 했는지 한눈에 읽히게(칼선 · 갈라진 땅 · 마법진 · 빛기둥). 판정은 player-combat 이 하고 여기는 그림만.
      o: x·y(몸 가운데) · foot(발 높이) · ang(겨눈 각) · f(바라보는 쪽) · mx·my(겨눈 자리) */
  skillVfx(id: string, o: Bag) {
    const v = this.vfx, { x, y, foot, ang, f } = o;
    switch (id) {
      case 's_cleave':      // 몸을 한 바퀴 도는 두 겹 칼선 + 바깥 충격파 + 불티
        v.slash(x, y, 70, ang - Math.PI * 0.9 * f, ang + Math.PI * 1.1 * f, '#ffb24a', 0.3, 18);
        v.slash(x, y, 98, ang + Math.PI * f, ang - Math.PI * f, '#ffd88a', 0.34, 10);
        v.shock(x, y, 112, '#ffb24a', 0.36, 8);
        v.sparks(x, y, 18, '#ffd07a', 520, 0, TAU, 0.35, 400);
        break;
      case 's_charge':      // 뒤로 흙먼지 · 앞으로 바람 줄기
        v.puffs(x - f * 14, foot - 6, 5, 16, 'rgba(170,150,120,.8)', 0.6, 10);
        v.sparks(x, y, 10, '#ffe0a0', 600, ang + Math.PI, 0.5, 0.25, 0);
        v.flare(x + Math.cos(ang) * 14, y + Math.sin(ang) * 14, 26, '#ffd07a', 0.18);
        break;
      case 's_charge_hit':  // 부딪힌 순간
        v.flare(x, y, 40, '#ffd07a', 0.2);
        v.shock(x, y, 44, '#ffe0a0', 0.25, 6);
        v.sparks(x, y, 14, '#ffd07a', 560, ang, 1.4, 0.3, 500);
        break;
      case 's_whirl':       // 채널 박자마다 — 몸을 감는 칼선 둘
        v.slash(x, y, 62, o.a0, o.a0 + TAU * 0.8, '#ffcf6a', 0.24, 12);
        v.slash(x, y, 84, o.a0 + Math.PI, o.a0 + Math.PI + TAU * 0.6, '#fff0c0', 0.22, 7);
        v.sparks(x, y, 4, '#ffd07a', 380, o.a0, TAU, 0.25, 300);
        break;
      case 's_quake':       // 발밑에서 좌우로 갈라지는 땅 + 튀는 흙 + 눕힌 충격파
        v.crack(x, foot, -1, 200, '#ff9a4a', 0.9); v.crack(x, foot, 1, 200, '#ff9a4a', 0.9);
        v.crack(x, foot, -1, 120, '#ffc07a', 0.7); v.crack(x, foot, 1, 120, '#ffc07a', 0.7);
        v.shock(x, foot, 150, '#c8845a', 0.5, 12, 0.3);
        v.flare(x, foot, 46, '#ffb070', 0.22);
        v.puffs(x, foot - 8, 8, 20, 'rgba(150,120,90,.85)', 0.9, 60);
        break;
      case 's_quake_step':  // 퍼지는 충격파 한 마디
        v.sparks(o.x, foot, 5, '#d8a070', 380, -Math.PI / 2, 1.1, 0.45, 900);
        v.shock(o.x, foot - 4, 30, '#ffb070', 0.3, 5, 0.4);
        break;
      case 's_guard':       // 육각 방패진 + 쇳소리 불티
        v.sigil(x, y, 34, '#e8b86a', 0.55, 6, 0.5, 1.3);
        v.shock(x, y, 56, '#d8a05a', 0.35, 6);
        v.sparks(x, y, 10, '#fff0c0', 300, 0, TAU, 0.3, 200);
        break;
      case 's_warcry':      // 세 겹으로 번지는 함성 + 섬광
        v.flare(x, y - 6, 54, '#ffd88a', 0.28);
        v.shock(x, y, 200, '#e8a04a', 0.55, 12);
        this.after(0.08, () => v.shock(x, y, 150, '#ffd88a', 0.45, 8));
        this.after(0.16, () => v.shock(x, y, 100, '#fff0c0', 0.35, 5));
        v.sparks(x, y, 16, '#ffb24a', 600, 0, TAU, 0.35, 0);
        break;
      case 's_volley':      // 시위 섬광 + 부채꼴 불티
        v.flare(x + Math.cos(ang) * 16, y - 4 + Math.sin(ang) * 16, 30, '#bff09a', 0.16);
        v.sparks(x + Math.cos(ang) * 16, y - 4 + Math.sin(ang) * 16, 12, '#d8ffb0', 700, ang, 1.0, 0.22, 0);
        break;
      case 's_rain':        // 떨어질 자리에 마법진(누운) + 하늘의 섬광
        v.sigil(o.mx, o.my, 130, '#9fe07a', 1.0, 8, 0.6, 0.28);
        v.flare(o.mx, o.my - 430, 50, '#d8ffb0', 0.5);
        break;
      case 's_pierce':      // 겨눈 쪽 빛줄기 + 큰 시위 섬광
        v.beam(x, y - 4, x + Math.cos(ang) * 620, y - 4 + Math.sin(ang) * 620, '#bff09a', 0.28, 7);
        v.flare(x + Math.cos(ang) * 16, y - 4 + Math.sin(ang) * 16, 40, '#d8ffb0', 0.2);
        v.sparks(x, y - 4, 10, '#d8ffb0', 800, ang, 0.35, 0.25, 0);
        break;
      case 's_smoke':       // 부푸는 연기 덩이
        v.puffs(x, y, 16, 34, 'rgba(184,200,176,.9)', 1.4, 70);
        v.shock(x, y, 150, '#b8c8b0', 0.45, 6);
        break;
      case 's_mark':        // 과녁으로 조여 드는 조준 + 섬광
        v.reticle(o.at, o.r, '#ffe070', 0.9);
        v.flare(o.tx, o.ty, 34, '#ffe070', 0.25);
        break;
      case 's_fireball':    // 손끝 섬광 + 불티
        v.flare(x + Math.cos(ang) * 16, y - 4 + Math.sin(ang) * 16, 34, '#ffb060', 0.18);
        v.sparks(x + Math.cos(ang) * 16, y - 4 + Math.sin(ang) * 16, 10, '#ffc070', 360, ang, 1.2, 0.3, -200);
        break;
      case 's_nova':        // 발밑 마법진 + 바깥으로 튀는 얼음 조각 + 충격파
        v.sigil(x, foot - 2, 150, '#9fe0ff', 0.75, 6, 1, 0.3);
        v.shards(x, y, 18, '#bfefff', 420, 0.55, 8);
        v.shock(x, y, 165, '#9fe0ff', 0.45, 10);
        v.flare(x, y, 50, '#dff6ff', 0.24);
        break;
      case 's_heal':        // 빛기둥 + 발밑 마법진 + 오르는 빛 알갱이
        v.column(x, foot, 46, 150, '#9ff09f', 0.75);
        v.sigil(x, foot - 2, 44, '#9ff09f', 0.8, 5, 0.8, 0.3);
        v.sparks(x, foot - 10, 14, '#d8ffd0', 220, -Math.PI / 2, 1.2, 0.8, -60);
        break;
      case 's_barrier':     // 몸을 두른 육각 결계 + 조각
        v.sigil(x, y, 38, '#8fc8ff', 0.7, 6, 0.6, 1.35);
        v.shards(x, y, 10, '#bfe0ff', 220, 0.45, 6);
        v.flare(x, y, 40, '#bfe0ff', 0.22);
        break;
      case 's_wolf':        // 늘 서는 자리마다 빛기둥 · 마법진은 sigilFx 가 그린다
        v.column(o.wx, foot, 30, 110, '#e8d8a8', 0.6);
        v.flare(o.wx, foot - 14, 30, '#fff0c8', 0.25);
        break;
      case 's_chain_hop':   // 맞은 적마다 섬광과 불티
        v.flare(o.tx, o.ty, 32, '#fff0a0', 0.2);
        v.sparks(o.tx, o.ty, 8, '#ffe86a', 420, 0, TAU, 0.25, 0);
        break;
      case 's_blink':       // 떠난 자리 · 닿은 자리의 틈 + 빛줄기 + 조각
        v.beam(o.ox, o.oy, x, y, '#c08fff', 0.3, 10);
        v.flare(o.ox, o.oy, 44, '#d8b8ff', 0.25); v.flare(x, y, 36, '#d8b8ff', 0.22);
        v.shock(o.ox, o.oy, 80, '#c08fff', 0.35, 7);
        v.shards(o.ox, o.oy, 10, '#d8b8ff', 280, 0.45, 6);
        break;
      case 's_meteor':      // 떨어지는 순간 — 두 겹 충격파 · 사방 갈라짐 · 큰 섬광 · 불티 · 연기
        v.flare(o.tx, o.ty, 120, '#fff0c0', 0.35);
        v.shock(o.tx, o.ty, 170, '#ffb04a', 0.6, 16);
        this.after(0.1, () => v.shock(o.tx, o.ty, 110, '#fff0c0', 0.45, 9));
        for (let i = 0; i < 6; i++) v.crack(o.tx, o.ty + 10, i % 2 ? 1 : -1, 90 + i * 25, '#ff9a3a', 1.1);
        v.sparks(o.tx, o.ty, 34, '#ffc060', 760, -Math.PI / 2, 2.6, 0.7, 900);
        v.puffs(o.tx, o.ty - 10, 12, 40, 'rgba(110,90,80,.85)', 1.6, 110);
        break;
    }
  },

  /* ---- 특별한 스킬의 고유 연출 (SIG_FX) ---- */
  sigFx(o: Bag) { (this.sigs = this.sigs || []).push(o); },
  /** 유성 화살비가 떨어질 띠. */
  bandFx(x: number, y: number, hw: any, dur: number, c: any) { this.sigFx({ k: 'band', x, y, hw, t: dur, max: dur, c }); },
  /** 소환 문양 — 안으로 조여드는 고리. */
  sigilFx(x: number, y: number, r: any, c: any) { this.sigFx({ k: 'sigil', x, y, r, t: SIG_FX.wolf.t, max: SIG_FX.wolf.t, c }); },
  /** 하늘에서 떨어지는 별. */
  fallFx(x: number, y: number, dur: number, c: any) { this.sigFx({ k: 'fall', x, y, t: dur, max: dur, c }); },
  /** 착탄 섬광. */
  flashFx(x: number, y: number, r: any, c: any) { this.sigFx({ k: 'flash', x, y, r, t: SIG_FX.flash.t, max: SIG_FX.flash.t, c }); },
  /** 화면 테두리가 한 번 물든다. */
  edgeFx(rgb: any, dur: number) { this.edge = { rgb, t: dur, max: dur }; },

  /** '화면 효과' 설정(0~150%)을 1을 넘지 않게 돌려준다 — 0%면 화면을 덮는 연출이 없다 */
  fxScale() { return Math.min(1, (this.settings ? this.settings.shake : 100) / 100); },

  /* ================= 특별한 스킬의 고유 연출 ================= */
  drawSigGround(c: any, camX: number, camY: number) {
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
  drawSigSky(c: any, camX: number, camY: number) {
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
  drawWhirlArc(c: any, p: Player, camX: number, camY: number) {
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

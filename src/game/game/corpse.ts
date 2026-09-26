/* ===== game/corpse.js — 시체 · 그 밖의 연출 ===== */
import { shade } from '../../engine/core/color.js';
import { TAU, clamp, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { FONT, tr } from '../lang.js';
import { WH, WW } from '../size.js';
import { T, TILE_DEF } from '../data.js';
import { NPCS } from '../data/npcs.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { Enemy } from '../entity.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const CorpsePart: Bag = {

  /* ================= 시체 ================= */
  CORPSE_MAX: 24,
  addCorpse(e) {
    if (!this.spritesOn || !Sprites.meta) return;
    const key = (e.mech && Sprites.mechSheet && Sprites.mechSheet(e.type))
      ? 'mech_' + e.type : e.type;
    const bm = Sprites.meta.bosses.sheets[key];
    const m = bm || Sprites.meta.characters.sheets[key];
    if (!m) return;
    const last = bm ? m.count - 1 : 6;                 // 보스는 끝의 두 칸
    if (last < 1 || m.count <= last) return;
    this.corpses.push({
      key, x: e.x, y: e.y, w: e.w, h: e.h, facing: e.facing,
      f0: last - 1, f1: last, t: 0, dur: e.boss ? 1.15 : 0.42,
    });
    if (this.corpses.length > this.CORPSE_MAX) this.corpses.shift();
  },
  drawCorpses(c, camX, camY) {
    if (!this.corpses.length || !Sprites.meta) return;   // 그림을 끈 뒤에도 안전하게
    for (const q of this.corpses) {
      const sx = q.x - camX, sy = q.y - camY;
      if (sx < -200 || sx > this.W + 200 || sy < -200 || sy > this.H + 200) continue;
      const m = Sprites.meta.bosses.sheets[q.key] || Sprites.meta.characters.sheets[q.key];
      if (!m) continue;
      const r = q.t / q.dur;
      // 살아 있는 그림과 **같은 자리 계산**을 쓴다 — 죽는 순간 그림이 튀면 안 된다
      const dy = m.frameH - q.h - (Sprites.footInset[q.key] || 0);
      const side = (Sprites.sideInset[q.key] || 0) * (q.facing < 0 ? -1 : 1);
      const dx = (q.w - m.frameW) / 2 - side;
      c.save();
      c.globalAlpha = r > 0.7 ? 1 - (r - 0.7) / 0.3 : 1;
      Sprites.draw(c, q.key, r < 0.35 ? q.f0 : q.f1, sx + dx, sy - dy, q.facing < 0);
      c.restore();
    }
  },

  /** 손에 그려지는 낚싯대의 생김새. */
  rodLook(id) {
    return ({
      rod_basic: { len: 25, w: 2.2, c: '#a9855a', grip: '#5a4632', tip: '#d8c49a' },
      rod_adv:   { len: 32, w: 2.8, c: '#6d5a42', grip: '#3a3a44', tip: '#8fd0e8' }
    })[id] || { len: 28, w: 2.4, c: '#9a7a4a', grip: '#5a4632', tip: '#cfc2a4' };
  },
  /** 낚싯대 끝의 화면 좌표 — 막대기를 우리가 직접 그리므로 길이만 알면 된다. */
  rodTip(id, face, sx, sy) {
    const L = this.rodLook(id), A = -0.4;
    // 시트에 손 자리가 적혀 있으면(playerHand) 그 손이 곧 대 손잡이다 — drawHeldWeapon 이 적어 둔 것을 쓴다
    const h = this._rodHand || [sx + 10, sy + 20];
    return [h[0] + face * Math.cos(A) * L.len, h[1] + Math.sin(A) * L.len];
  },

  /* 낚싯줄과 찌 — 낚싯대 끝에서 물까지 줄을 잇고 찌를 띄운다. */
  drawFishLine(c, p, sx, sy, bob) {
    const f = p.fish;
    const face = p.facing > 0 ? 1 : -1;
    const tip = this.rodTip(f.rodId, face, sx, sy + bob);
    const rx = tip[0], ry = tip[1];
    const fx = (f.tx + 0.5) * TS - this.cam.x;
    const wy = f.ty * TS - this.cam.y;                       // 수면
    // 입질 중이면 찌가 잠겼다 떴다 한다 — 3프레임으로 끊어(타일 애니메이션과 같은 방식)
    const fr = ((this.time * 9) | 0) % 3;
    const dip = f.biting ? [0, 5, 2][fr] : Math.sin(this.time * 2) * 1.2;
    const by = wy + 3 + dip;

    c.save();
    /* 물고기 그림자 — 입질 1.2초 전부터 옆에서 찌 쪽으로 다가온다. */
    if (!f.biting && f.t < this.FISH_SHADOW_T) {
      const k = f.t / this.FISH_SHADOW_T;                    // 1 → 0 으로 다가온다
      const wet = dx => { let n = 0; for (let i = 1; i <= 3; i++) if (TILE_DEF[this.world.get(f.tx + dx * i, f.ty)].liquid) n++; return n; };
      const side = wet(1) >= wet(-1) ? 1 : -1;
      const sx2 = fx + side * (8 + k * 46) + Math.sin(this.time * 7) * 1.5;
      c.globalAlpha = 0.6 * (1 - k * 0.5);
      c.fillStyle = '#0b1a26';
      c.beginPath(); c.ellipse(sx2, wy + 12, 9, 3.2, 0, 0, TAU); c.fill();
      c.beginPath();                                          // 꼬리
      c.moveTo(sx2 + side * 8, wy + 12); c.lineTo(sx2 + side * 14, wy + 9); c.lineTo(sx2 + side * 14, wy + 15);
      c.fill();
      c.globalAlpha = 1;
    }
    // 줄 — 어두운 배경에서도 보이게 검은 심 위에 밝은 줄을 겹쳐 긋는다
    for (const [col, wdt] of [['rgba(0,0,0,.55)', 3], ['#eef6ff', 1.4]]) {
      c.strokeStyle = col; c.lineWidth = wdt;
      c.beginPath();
      c.moveTo(rx, ry);
      c.quadraticCurveTo((rx + fx) / 2, Math.max(ry, by) + 14, fx, by);   // 살짝 늘어지게
      c.stroke();
    }
    /* 물결 — 찌가 앉은 자리. */
    const rich = f.rareMul === undefined ? 1 : f.rareMul;
    c.strokeStyle = rich > 1 ? 'rgba(255,226,150,.85)' : rich < 1 ? 'rgba(170,186,196,.4)' : 'rgba(200,238,255,.7)';
    c.lineWidth = 1;
    // 가만히 있을 때 물결이 찌(폭 8px)보다 좁으면 찌에 가려 빛이 안 보인다 — 7px 로 숨 쉬게
    const rr = f.biting ? 5 + fr * 3 : 7 + Math.sin(this.time * 2);
    c.beginPath(); c.ellipse(fx, wy + 4, rr, rr * 0.35, 0, 0, TAU); c.stroke();
    if (rich > 1 && ((this.time * 3) | 0) % 3 === 0) {           // 좋은 물 — 물결 위 반짝임
      c.fillStyle = '#fff2c0';
      c.fillRect(fx + rr - 1, wy + 2, 2, 2); c.fillRect(fx - rr - 1, wy + 4, 2, 2);
    }
    // 찌 — 빨강/흰색 두 토막이라 물 위에서 눈에 띈다
    c.fillStyle = '#101018'; c.fillRect(fx - 4, by - 9, 8, 12);           // 테두리
    c.fillStyle = '#e8523c'; c.fillRect(fx - 3, by - 8, 6, 5);
    c.fillStyle = '#f2f2ee'; c.fillRect(fx - 3, by - 3, 6, 5);
    c.fillStyle = '#101018'; c.fillRect(fx - 1, by - 12, 2, 4);           // 고리
    c.restore();
  },
  FISH_SHADOW_T: 1.2,              // 입질 몇 초 전부터 그림자가 보이는가
  /** 입질 표시 — 느낌표와 **챔질 창 게이지**. 조명 **뒤에** 그린다 — 사연: docs/code-history.md#h77 */
  drawFishCue(c, camX, camY) {
    const p = this.player, f = p && p.fish;
    if (!f || !f.biting) return;
    const fx = (f.tx + 0.5) * TS - camX, wy = f.ty * TS - camY;
    const left = clamp(f.bite / (f.biteMax || 1), 0, 1);
    c.save();
    c.globalAlpha = 0.65 + 0.35 * Math.abs(Math.sin(this.time * 12));
    // 느낌표는 게이지 **옆**에 — 찌 바로 위에 세우면 낚싯줄과 겹쳐 줄이 빛나는 것으로 보였다
    c.fillStyle = '#ffe08a';
    c.fillRect(fx + 17, wy - 45, 3, 8); c.fillRect(fx + 17, wy - 35, 3, 3);
    c.globalAlpha = 1;
    // 게이지 — 줄어드는 막대.
    c.fillStyle = 'rgba(8,10,16,.75)'; c.fillRect(fx - 13, wy - 38, 26, 5);
    c.fillStyle = left > 0.5 ? '#ffd24a' : left > 0.25 ? '#ff9a3a' : '#ff5a4a';
    c.fillRect(fx - 12, wy - 37, 24 * left, 3);
    c.restore();
  },

  drawEnemy(c, e, sx, sy) {
    if (e.def.ai === 'flotsam') { this.drawFlotsam(c, e, sx, sy); return; }
    /* 손그림 스프라이트 우선. */
    /* 개조된 개체는 원래 시트를 강철로 눕힌 사본으로 그린다(Sprites.mechSheet). */
    const key = (e.mech && this.spritesOn && Sprites.mechSheet && Sprites.mechSheet(e.type))
      ? 'mech_' + e.type : e.type;
    const meta = this.spritesOn && Sprites.meta &&
      (Sprites.meta.characters.sheets[key] || Sprites.meta.bosses.sheets[key]);
    // Sprites.footInset가 실측한 여백이라 그만큼 덜 밀어 올린다.
    /* ★ max(0, …) 를 쓰면 안 된다. */
    const dy = meta ? meta.frameH - e.h - (Sprites.footInset[key] || 0) : 0;
    /* ★ 가로는 **프레임이 아니라 그림**을 가운데 맞춘다. */
    const side = meta ? (Sprites.sideInset[key] || 0) * (e.facing < 0 ? -1 : 1) : 0;
    const dx = meta ? (e.w - meta.frameW) / 2 - side : 0;

    /* 물속 몹은 어둡게 깔린 물 위에 제 색이 묻혀 안 보인다 — 웅덩이 뱀장어(#3a6a5a)는 어두운 물과 거의 같은 색이라 "보이지 않는 몬스터"가 됐다. */
    const wet = e.type === 'grotto_eel' && this.world.liquid(Math.floor(e.cx / TS), Math.floor(e.cy / TS));
    if (this.spritesOn && wet && meta) {
      c.save();
      c.filter = 'brightness(0) invert(1)';
      c.globalAlpha = 0.5;
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]])
        Sprites.draw(c, key, this.enemyFrame(e), sx + dx + ox, sy - dy + oy, e.facing < 0);
      c.restore();
      c.filter = 'none';
    } else if (this.spritesOn && meta && e.def.ai === 'swimmer'
      && this.world.liquid(Math.floor(e.cx / TS), Math.floor(e.cy / TS))) {
      /* 물속 몹은 물색과 명도가 비슷해(암초 상어 #5a6a78 : 바닷물 #12496e) 윤곽이 풀린다.
         발광 대신 물속에서 실제로 보이는 식으로 — 아래·옆은 어두운 그림자 윤곽,
         위는 수면에서 내려오는 빛이 등에 맺힌 한 줄. 둘 다 조명 아래라 어둠에선 같이 어둡다. */
      const fr = this.enemyFrame(e), fl = e.facing < 0, bx = sx + dx, by = sy - dy;
      c.save();
      c.filter = 'brightness(0)';
      c.globalAlpha = 0.55;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]])
        Sprites.draw(c, key, fr, bx + ox, by + oy, fl);
      c.filter = 'brightness(0) invert(1)';
      c.globalAlpha = 0.32;
      Sprites.draw(c, key, fr, bx, by - 1, fl);
      c.restore();
      c.filter = 'none';
    }

    /* 말랑한 몹 — 공중에선 속도만큼 세로로 늘고(최대 10%) 폭은 그만큼 준다. 부피가 같아 말랑하게 읽힌다. */
    if (e.def.squish && !e.onGround && this.spritesOn && meta) {
      const k = 1 + Math.min(0.1, Math.abs(e.vy) / 4000);
      c.save();
      c.translate(sx + e.w / 2, sy + e.h);
      c.scale(1 / k, k);
      c.translate(-(sx + e.w / 2), -(sy + e.h));
      const ok = Sprites.draw(c, key, this.enemyFrame(e), sx + dx, sy - dy, e.facing < 0);
      c.restore();
      if (ok) { this.drawEnemyOverlay(c, e, sx, sy, dy, meta, dx); return; }
    }

    /* 그림이 거의 안 움직이는 개체는(ENEMIES 의 stiff — 프레임 간 픽셀 차를 재서 골랐다) 렌더러가 대신 흔들어 준다. */
    const st = e.def.stiff;
    if (st && this.spritesOn) {
      const moving = Math.abs(e.vx) > 6;
      if (moving) {
        const ph = this.time * 7 * Math.PI;                 // 걸음 프레임과 같은 박자
        const bob = Math.abs(Math.sin(ph)) * 2.6 * st;
        const lean = Math.sin(ph * 0.5) * 0.035 * st * (e.facing < 0 ? -1 : 1);
        c.save();
        c.translate(sx + e.w / 2, sy + e.h);
        c.rotate(lean);
        c.translate(-(sx + e.w / 2), -(sy + e.h) - bob);
      } else {
        const br = Math.sin(this.time * 2.4 * Math.PI) * 1.1 * st;   // idle 박자
        c.save();
        c.translate(0, br);
      }
      const ok = Sprites.draw(c, key, this.enemyFrame(e), sx + dx, sy - dy, e.facing < 0);
      c.restore();
      if (ok) { this.drawEnemyOverlay(c, e, sx, sy, dy, meta, dx); return; }
    }

    if (this.spritesOn && Sprites.draw(c, key, this.enemyFrame(e), sx + dx, sy - dy, e.facing < 0)) {
      this.drawEnemyOverlay(c, e, sx, sy, dy, meta, dx);
      return;
    }
    const f = 1;
    // 그림이 없어 절차 생성으로 떨어지는 경로 — 개조된 것은 여기서도 강철색이라야 세기만 다르고 생김새는 같은 몹이 되는 일이 없다
    let col = e.mech ? '#79838f' : e.def.c;
    if (e.flash > 0) col = '#ffffff';
    c.save();
    const t = e.type;
    if (e.def.ai === 'jumper' || t === 'king_slime') {
      const sq = e.onGround ? 1 : 0.86;
      const hh = e.h * sq, ww = e.w * (2 - sq);
      c.fillStyle = col; c.globalAlpha = .88;
      c.beginPath(); c.roundRect(sx - (ww - e.w) / 2, sy + (e.h - hh), ww, hh, 8); c.fill();
      c.globalAlpha = 1; c.fillStyle = '#1a1a22';
      c.fillRect(sx + ww * .26, sy + e.h - hh * .62, 4, 5); c.fillRect(sx + ww * .62, sy + e.h - hh * .62, 4, 5);
      if (t === 'king_slime') { c.fillStyle = shade('#d8b13d', f); c.fillRect(sx + e.w * .3, sy + e.h - hh - 8, e.w * .4, 8); }
    } else if (e.def.ai === 'flyer') {
      c.fillStyle = col;
      const flap = Math.sin(this.time * 18) * 6;
      c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h / 2, e.w * .32, e.h * .42, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(sx + e.w / 2, sy + e.h / 2);
      c.lineTo(sx - 6, sy + e.h / 2 - flap); c.lineTo(sx + 4, sy + e.h / 2 + 6); c.fill();
      c.beginPath(); c.moveTo(sx + e.w / 2, sy + e.h / 2);
      c.lineTo(sx + e.w + 6, sy + e.h / 2 - flap); c.lineTo(sx + e.w - 4, sy + e.h / 2 + 6); c.fill();
      c.fillStyle = '#ff5a5a'; c.fillRect(sx + e.w * .34, sy + e.h * .38, 3, 3); c.fillRect(sx + e.w * .58, sy + e.h * .38, 3, 3);
    } else if (e.def.ai === 'swimmer') {
      // 물속 생물 — 몸통 하나에 꼬리지느러미.
      const wag = Math.sin(this.time * 9 + e.x * .05) * (e.h * .28);
      const fx = e.facing < 0 ? -1 : 1;
      const mx = sx + e.w / 2, my = sy + e.h / 2;
      c.fillStyle = col; c.globalAlpha = .95;
      c.beginPath(); c.ellipse(mx, my, e.w * .40, e.h * .42, 0, 0, TAU); c.fill();
      c.beginPath();                                   // 꼬리
      c.moveTo(mx - fx * e.w * .34, my);
      c.lineTo(mx - fx * (e.w * .62), my - e.h * .40 + wag);
      c.lineTo(mx - fx * (e.w * .62), my + e.h * .40 + wag);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = shade(col, 1.45);                  // 등지느러미
      c.fillRect(mx - e.w * .10, my - e.h * .56, e.w * .22, e.h * .18);
      c.fillStyle = e.def.passive ? '#e8f4ff' : '#ffcf5a';
      c.fillRect(mx + fx * e.w * .20, my - e.h * .10, 3, 3);
    } else if (e.def.ai === 'caster' || e.boss) {
      c.fillStyle = col; c.globalAlpha = .92;
      c.beginPath(); c.roundRect(sx, sy, e.w, e.h, 10); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = '#0e0e14'; c.fillRect(sx + e.w * .2, sy + e.h * .22, e.w * .6, e.h * .24);
      c.fillStyle = e.boss ? '#ff7a4a' : '#ffdd66';
      const ey = Math.sin(this.time * 3) * 1.5;
      c.fillRect(sx + e.w * .27, sy + e.h * .28 + ey, e.w * .16, e.h * .1);
      c.fillRect(sx + e.w * .57, sy + e.h * .28 + ey, e.w * .16, e.h * .1);
      if (e.boss) {
        c.globalAlpha = .2; c.fillStyle = e.def.c;
        c.beginPath(); c.arc(sx + e.w / 2, sy + e.h / 2, e.w * (0.9 + Math.sin(this.time * 3) * .08), 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
    } else {
      // 인간형
      c.fillStyle = col;
      c.fillRect(sx + 2, sy + e.h * .3, e.w - 4, e.h * .5);
      c.fillRect(sx + 3, sy + e.h * .8, 5, e.h * .2);
      c.fillRect(sx + e.w - 8, sy + e.h * .8, 5, e.h * .2);
      c.fillStyle = shade(e.def.c, f * 1.12);
      c.fillRect(sx + 3, sy + 2, e.w - 6, e.h * .28);
      c.fillStyle = '#1a1a22';
      c.fillRect(sx + (e.facing > 0 ? e.w - 9 : 5), sy + e.h * .12, 3, 3);
      if (e.type === 'archer') { c.strokeStyle = shade('#8a6a3a', f); c.beginPath(); c.arc(sx + e.w / 2 + e.facing * 10, sy + e.h * .45, 9, -1, 1); c.stroke(); }
    }
    c.restore();
    // 체력바
    if (e.hp < e.maxHp && !e.boss) {
      const bw = Math.max(22, e.w);
      c.fillStyle = '#000a'; c.fillRect(sx + (e.w - bw) / 2, sy - 8, bw, 4);
      c.fillStyle = '#d0564c'; c.fillRect(sx + (e.w - bw) / 2, sy - 8, bw * (e.hp / e.maxHp), 4);
    }
  },
  /** 마을 경비병 — 여명 마을의 남색 겉옷에 창과 활 */
  drawGuard(c, e, sx, sy) {
    const f = e.face || 1, t = this.time;
    // 손그림 시트가 있으면 그걸로 (일반 몹과 같은 7프레임 규격)
    if (this.spritesOn && Sprites.img.npc_guard) {
      c.fillStyle = '#00000038';
      c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h, 11, 3.5, 0, 0, TAU); c.fill();
      const fr = e.shootCd > 0.85 || e.atkCd > 0.5 ? 4
        : Math.abs(e.vx) > 6 ? 2 + (Math.floor(t * 7) % 2)
          : Math.floor(t * 2.4) % 2;
      if (Sprites.draw(c, 'npc_guard', fr, sx, sy, f < 0)) {
        if (e.hp < e.maxHp) {
          c.fillStyle = '#00000088'; c.fillRect(sx - 2, sy - 7, e.w + 4, 3);
          c.fillStyle = '#5fc45f'; c.fillRect(sx - 2, sy - 7, (e.w + 4) * clamp(e.hp / e.maxHp, 0, 1), 3);
        }
        return;
      }
    }
    const bob = e.onGround && Math.abs(e.vx) > 20 ? Math.sin(t * 11) * 1.4 : 0;
    c.save();
    c.fillStyle = '#00000038';
    c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h, 11, 3.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#2f3f5e'; c.fillRect(sx + 3, sy + 14 + bob, 14, 18);           // 겉옷
    c.fillStyle = '#3f5580'; c.fillRect(sx + 4, sy + 15 + bob, 12, 8);
    c.fillStyle = '#d8a94b'; c.fillRect(sx + 8, sy + 17 + bob, 4, 12);            // 문장 띠
    c.fillStyle = '#33333a'; c.fillRect(sx + 4, sy + 31, 5, 9);                   // 다리
    c.fillRect(sx + 11, sy + 31, 5, 9);
    c.fillStyle = '#c8a488'; c.fillRect(sx + 5, sy + 4 + bob, 10, 11);            // 얼굴
    c.fillStyle = '#6a7a8e'; c.fillRect(sx + 4, sy + 2 + bob, 12, 6);             // 투구
    c.fillRect(sx + (f > 0 ? 13 : 3), sy + 6 + bob, 3, 7);                        // 볼가리개
    c.fillStyle = '#8a6a3a';                                                       // 창
    c.fillRect(sx + (f > 0 ? 16 : 2), sy + 6 + bob, 2, 26);
    c.fillStyle = '#c8ccd4';
    c.fillRect(sx + (f > 0 ? 15.5 : 1.5), sy + 2 + bob, 3, 6);
    if (e.hp < e.maxHp) {                                                          // 체력
      c.fillStyle = '#00000088'; c.fillRect(sx - 2, sy - 7, e.w + 4, 3);
      c.fillStyle = '#5fc45f'; c.fillRect(sx - 2, sy - 7, (e.w + 4) * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
    c.restore();
  },
  drawWolf(c, e, sx, sy) {
    c.save();
    c.globalAlpha = .65 + Math.sin(this.time * 6) * .1;
    c.fillStyle = '#9fd8ff';
    c.beginPath(); c.roundRect(sx, sy + 4, e.w, e.h - 4, 5); c.fill();
    c.beginPath(); c.moveTo(sx + e.w - 4, sy + 4); c.lineTo(sx + e.w + 6, sy); c.lineTo(sx + e.w + 6, sy + 12); c.fill();
    c.fillStyle = '#fff'; c.fillRect(sx + e.w, sy + 4, 3, 3);
    c.restore();
  },
  drawNpc(c, o, sx, sy, f) {
    const d = NPCS[o.npc], p = this.player;
    /* 1순위 — 손그림 캐릭터 시트(char/npc_*.png, 매니페스트 키 npcw_*). */
    const flip = o.x + o.w / 2 > p.cx;                      // 늘 플레이어 쪽을 본다
    const fr = Math.floor(this.time * 1.6 + o.x * 0.05) % 2;
    // 시트 프레임(40px)이 판정 박스(44px)보다 짧아서, 위쪽을 맞춰 그리면 발이 바닥에서 4px 뜬다.
    const meta = this.spritesOn && Sprites.meta && Sprites.meta.characters.sheets['npcw_' + d.art];
    const dy = meta ? meta.frameH - o.h - (Sprites.footInset['npcw_' + d.art] || 0) : 0;
    // 적과 같은 정렬 — 그림 중심을 판정 박스 중심에.
    const nside = meta ? (Sprites.sideInset['npcw_' + d.art] || 0) * (flip ? -1 : 1) : 0;
    const dx = meta ? (o.w - meta.frameW) / 2 - nside : 0;
    if (!(this.spritesOn && Sprites.draw(c, 'npcw_' + d.art, fr, sx + dx, sy - dy, flip))) {
      c.fillStyle = shade(d.c, f);
      c.fillRect(sx + 3, sy + 14, 16, 20);
      c.fillRect(sx + 5, sy + 34, 5, 10); c.fillRect(sx + 13, sy + 34, 5, 10);
      const im = this.spritesOn && Sprites.img['npc_' + d.art];
      if (im && im.width) {
        c.save();
        c.imageSmoothingEnabled = false;
        c.drawImage(im, sx + o.w / 2 - 14, sy - 2, 28, 28);
        c.restore();
      } else {
        c.fillStyle = shade('#e8c39a', f); c.fillRect(sx + 5, sy + 3, 12, 12);
        c.fillStyle = shade('#2a2018', f); c.fillRect(sx + 4, sy + 2, 14, 4);
        c.fillStyle = '#1a1a22'; c.fillRect(sx + 8, sy + 8, 2, 2); c.fillRect(sx + 13, sy + 8, 2, 2);
      }
    }
    // 상호작용 표시 — 이모지 대신 나침반과 같은 손그림 말풍선 아이콘을 재사용
    if (dist(p.cx, p.cy, o.x + o.w / 2, o.y + o.h / 2) < TS * 7) {
      c.globalAlpha = .6 + Math.sin(this.time * 4) * .3;
      this.drawCompassGlyph(c, 'npc', sx + o.w / 2, sy - 9, '#e8c86a');
      c.globalAlpha = 1;
    }
  },
  /* 분수 물 — 손그림(정지)이든 절차 생성이든 그 위에 이것만 얹어 움직인다. */
  drawFountainWater(c, o, sx, sy) {
    const FR = 3, fr = ((this.time * 6) | 0) % FR;
    const mx = sx + o.w / 2;
    const topY = sy + 8;                       // 물동이 수면
    const surf = sy + o.h - TS + 5;            // 물받이 수면
    const fall = surf - topY;                  // 떨어지는 높이
    c.save();

    // 1) 물동이에서 솟았다가 곧바로 떨어지는 물기둥
    c.globalAlpha = .8; c.fillStyle = '#8fd4ef';
    c.fillRect(mx - 2, topY - 7 + [0, -2, -1][fr], 4, 9 + [0, 2, 1][fr]);

    // 2) 좌우 포물선 — 물방울이 프레임마다 궤적을 따라 나아가 물받이로 떨어진다.
    const N = 6, RX = 26;
    c.fillStyle = '#7fc8e8';
    for (const dir of [-1, 1])
      for (let k = 0; k < N; k++) {
        const u = (k + fr / FR) / N;
        const px = mx + dir * (4 + RX * u);
        const py = topY - 4 + fall * (u * u);
        if (py > surf) continue;
        c.globalAlpha = .8 - u * 0.25;
        c.fillRect(px - 1.5, py, 3, 3 + u * 3);            // 아래로 갈수록 길어진다 = 빨라 보인다
      }

    // 3) 물동이 테두리에서 흘러내리는 물 — 끊긴 세로줄이 프레임마다 내려간다
    c.globalAlpha = .45; c.fillStyle = '#bfe8ff';
    for (const dir of [-1, 1])
      for (let k = 0; k < 3; k++) {
        const py = topY + 4 + ((k * 9 + fr * 3) % (fall - 6));
        c.fillRect(mx + dir * 8 - 1, py, 2, 5);
      }

    // 4) 떨어진 자리의 물보라 + 수면 잔물결
    c.globalAlpha = .5; c.fillStyle = '#dff2ff';
    for (const dir of [-1, 1]) {
      const lx = mx + dir * (4 + RX);
      c.fillRect(lx - 4, surf - 1 - (fr === 1 ? 1 : 0), 8, 2);
      c.fillRect(lx - 6 - fr, surf - 3, 2, 2); c.fillRect(lx + 4 + fr, surf - 3, 2, 2);
    }
    c.globalAlpha = .38;
    for (let k = 0; k < 3; k++) {
      const rx = sx + 8 + ((k * 17 + fr * 6) % (o.w - 20));
      c.fillRect(rx, surf + 3, 6, 1);
    }
    c.restore();
  },
  drawCursor(c, camX, camY) {
    const p = this.player;
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    const near = dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) <= TS * 6;
    const held = p.held();
    const showTile = held && (idef(held).type === 'tool' || idef(held).type === 'block');
    if (showTile && near && !this.uiOpen) {
      c.strokeStyle = 'rgba(255,235,180,.55)'; c.lineWidth = 1.5;
      c.strokeRect(tx * TS - camX + .5, ty * TS - camY + .5, TS - 1, TS - 1);
      c.lineWidth = 1;
    }
    if (p.mineTx >= 0 && p.mineProg > 0) {
      c.fillStyle = `rgba(255,255,255,${0.12 + p.mineProg * 0.2})`;
      c.fillRect(p.mineTx * TS - camX, p.mineTy * TS - camY, TS, TS * p.mineProg);
    }
    if (this.hoverObj) {
      const o = this.hoverObj;
      if (dist(p.cx, p.cy, o.x + o.w / 2, o.y + o.h / 2) < TS * 7) {
        c.strokeStyle = 'rgba(216,169,75,.8)'; c.lineWidth = 1.5;
        c.strokeRect(o.x - camX - 2.5, o.y - camY - 2.5, o.w + 5, o.h + 5);
        c.lineWidth = 1;
        const label = o.type === 'door' ? (o.closed ? tr('문 열기') : tr('문 닫기')) : {
          chest: tr('상자 열기'), workbench: tr('작업대'), forge: tr('용광로'), npc: tr('대화'), altar: tr('제단'),
          vault: tr('보관고'), board: tr('의뢰 게시판'), reforge: tr('재련대'), waystone: tr('귀환 비석'), inn: tr('여관'),
          terminal: tr('단말 읽기'), lorestone: tr('비문 읽기'), tablet: tr('석판 읽기'), lair: tr('둥지'), seal: tr('봉인문'),
          ciphernote: tr('쪽지 읽기'), codedoor: tr('잠긴 홈')
        }[o.type];
        if (label) {
          c.fillStyle = '#e8dcc0'; c.font = '11px ' + FONT; c.textAlign = 'center';
          c.fillText(label + ` ${tr('(우클릭)')}`, o.x - camX + o.w / 2, o.y - camY - 12);
        }
      }
    }
    // 조준선 — 캔버스에는 시야 배율이 걸려 있어 화면 좌표를 배율로 나눈다(안 나누면 100% 가 아닐 때 커서와 따로 놀았다)
    const zv = this.viewZoom();
    c.strokeStyle = 'rgba(255,255,255,.35)';
    c.beginPath();
    c.arc(this.input.mx / zv, this.input.my / zv, 5 / zv, 0, TAU); c.stroke();
  },

  /* ---- 지도 색 (미니맵 · 전체 지도 공용) ---- */
  mapColorAt(tx, ty, id, wl) {
    const w = this.world, k = ty * WW + tx;
    if (id === undefined) { id = w.tiles[k]; wl = w.walls[k]; }
    if (id === T.AIR) return wl ? '#20202c' : '#141620';
    const d = TILE_DEF[id];
    return d.ore ? d.c : shade(d.c || '#333', 0.65);
  },
  /** 눈(ex, ey)에서 칸(tx, ty)이 보이는가 — 가는 길이 트여 있어야 하고, 과녁 앞 세 칸 안의 바위만 봐준다(벽 두께가 지도에 남게). */
  seesTile(ex, ey, tx, ty) {
    const w = this.world, dx = tx - ex, dy = ty - ey, n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 1; i < n - 3; i++) {
      const x = Math.round(ex + dx * i / n), y = Math.round(ey + dy * i / n);
      if (TILE_DEF[w.get(x, y)].solid === 1) return false;
    }
    return true;
  },
  /** 세이브를 막 불러왔을 때(또는 새 게임 시작 시) explored 비트로부터 축소 지도를 다시 칠한다. */
  /** 축소 지도 캔버스를 지금 세계 크기(WW×WH)에 맞춘다 — 세계 크기가 바뀌면 다시 만든다. */
  fitMapAtlas() {
    if (this.mapAtlas.width === WW && this.mapAtlas.height === WH) return;
    this.mapAtlas.width = WW; this.mapAtlas.height = WH;
    this.mapAtlasX = this.mapAtlas.getContext('2d');
  },
  buildMapAtlas() {
    const c = this.mapAtlasX, w = this.world;
    c.fillStyle = '#07080c'; c.fillRect(0, 0, WW, WH);
    const img = c.getImageData(0, 0, WW, WH), buf = img.data;
    for (let k = 0; k < WW * WH; k++) {
      if (!w.explored[k]) continue;
      const hex = this.mapColorAt(k % WW, (k / WW) | 0);
      const n = parseInt(hex.slice(1), 16), o = k * 4;
      buf[o] = (n >> 16) & 255; buf[o + 1] = (n >> 8) & 255; buf[o + 2] = n & 255; buf[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  },

  /* ---- 미니맵 ---- */
  /* 탐지기 소리 — 잡힌 것이 **없다가 생겼을 때만** 한 번 운다. */
  _detPrev: 0,
  detBeep(n) {
    if (n > 0 && this._detPrev === 0) this.sfx('detector');
    this._detPrev = n;
  },
  /** 유틸리티 칸에 낀 탐지기 종류 — 'ore' | 'mob'. 없으면 false */
  hasDetector(kind) {
    const eq = this.player && this.player.equip;
    if (!eq) return false;
    return (eq.util1 && idef(eq.util1).det === kind) || (eq.util2 && idef(eq.util2).det === kind);
  },
  DET_R: 30,                                   // 탐지 반경(칸)
  drawMinimap() {
    const c = this.mmx, w = this.world, p = this.player;
    const MW = this.mm.width, MH = this.mm.height, S = 2;
    /* 탐지기 — **안개를 뚫고** 보여 준다. */
    const detOre = this.hasDetector('ore'), detMob = this.hasDetector('mob');
    const DR = this.DET_R, DR2 = DR * DR;
    let detHit = 0;                                  // 이번 갱신에 잡힌 것 수 (소리용)
    c.fillStyle = '#07080c'; c.fillRect(0, 0, MW, MH);
    const px = Math.floor(p.cx / TS), py = Math.floor(p.cy / TS);
    const halfW = Math.floor(MW / S / 2), halfH = Math.floor(MH / S / 2);
    for (let y = 0; y < MH / S; y++) {
      for (let x = 0; x < MW / S; x++) {
        const tx = px - halfW + x, ty = py - halfH + y;
        if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) continue;
        const k = ty * WW + tx;
        const id = w.tiles[k];
        if (!w.explored[k]) {
          // 안개 — 눈으로 본 적 없는 칸은 그리지 않는다.
          if (!detOre || !TILE_DEF[id] || !TILE_DEF[id].ore) continue;
          const ddx = tx - px, ddy = ty - py;
          if (ddx * ddx + ddy * ddy > DR2) continue;
          c.fillStyle = TILE_DEF[id].c;
          c.fillRect(x * S, y * S, S, S);
          detHit++;
          continue;
        }
        if (id === T.AIR) {
          const wl = w.walls[k];
          if (wl) { c.fillStyle = '#181820'; c.fillRect(x * S, y * S, S, S); }
          continue;
        }
        const d = TILE_DEF[id];
        c.fillStyle = d.ore ? d.c : shade(d.c || '#333', 0.65);
        c.fillRect(x * S, y * S, S, S);
      }
    }
    // NPC·상자 — 빛을 받아 공개된 칸에 있을 때만 위치를 보여 준다.
    for (const o of w.objects) {
      if (o.type !== 'npc' && o.type !== 'chest') continue;
      const otx = Math.floor(o.x / TS), oty = Math.floor(o.y / TS);
      if (!w.explored[clamp(oty, 0, WH - 1) * WW + clamp(otx, 0, WW - 1)]) continue;
      const ox = otx - (px - halfW), oy = oty - (py - halfH);
      if (ox < 0 || oy < 0 || ox * S >= MW || oy * S >= MH) continue;
      c.fillStyle = o.type === 'npc' ? '#6fd8ff' : '#d8a94b';
      c.fillRect(ox * S - 1, oy * S - 1, S + 2, S + 2);
    }
    // 적도 미지의 어둠 속에서는 보이지 않는다.
    for (const e of this.ents) {
      if (!(e instanceof Enemy)) continue;
      const etx = clamp(Math.floor(e.cx / TS), 0, WW - 1), ety = clamp(Math.floor(e.cy / TS), 0, WH - 1);
      // 몬스터 탐지기가 있으면 반경 안은 안개 속이라도 잡아낸다
      const near = detMob && (etx - px) * (etx - px) + (ety - py) * (ety - py) <= DR2;
      if (near) detHit++;
      if (!near && !w.explored[ety * WW + etx]) continue;
      const ox = etx - (px - halfW), oy = ety - (py - halfH);
      if (ox < 0 || oy < 0 || ox * S >= MW || oy * S >= MH) continue;
      c.fillStyle = e.boss ? '#ff4a4a' : '#e07070';
      c.fillRect(ox * S - 1, oy * S - 1, S + 2, S + 2);
    }
    this.detBeep(detHit);
    // 쓰러진 자리 — 안개와 무관하게 늘 보인다(내가 죽은 자리는 내가 안다)
    if (this.deathMark) {
      const dx = Math.floor(this.deathMark.x / TS) - (px - halfW);
      const dy = Math.floor(this.deathMark.y / TS) - (py - halfH);
      if (dx >= 0 && dy >= 0 && dx * S < MW && dy * S < MH) {
        c.fillStyle = '#cfd8ff';
        c.fillRect(dx * S - 1, dy * S - 3, 3, 7);
        c.fillRect(dx * S - 3, dy * S - 1, 7, 3);
      }
    }
    // 플레이어
    c.fillStyle = '#fff';
    c.fillRect(halfW * S - 1, halfH * S - 1, 3, 3);
    c.strokeStyle = '#3b3527'; c.strokeRect(.5, .5, MW - 1, MH - 1);
  }
};
mixin(G, CorpsePart);

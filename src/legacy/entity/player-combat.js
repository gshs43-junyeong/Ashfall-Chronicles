/* ===== entity/player-combat.js — 플레이어 — 공격 · 스킬 ===== */
import { app as G, ui as UI } from '../ctx.js';
import { TAU, angleTo, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { BOW_TIP } from '../data/start.js';
import { SKILLS } from '../data/skills.js';
import { SIG_FX, SKILL_FX, SKILL_HIT, idef } from '../data/values.js';
import { TS } from '../world.js';
import { Enemy, PROJ_STYLE, Part, Player, Proj, Wolf, itemDamage, itemSpeed } from '../entity.js';
/* entity.js 의 Player 에서 나눈 조각 — 읽히는 순간 Player.prototype 에 붙는다(main.js 가 entity.js 다음에 읽는다). */

export const PlayerCombat = {

  /* ---- 공격 ---- */
  attackReady() { return this.atkTimer <= 0; },
  doAttack(mx, my) {
    const w = this.weapon();
    if (!w) return this.punch(mx, my);
    const d = idef(w);
    if (d.type === 'tool') return this.punch(mx, my);
    if (d.pw && !this.useCharge(d.pw)) {
      G.toast(tr('전하가 없다 — 충전된 배터리가 필요하다'), 'bad');
      this.atkTimer = 0.3; return;
    }
    const ang = angleTo(this.cx, this.cy, mx, my);
    this.facing = Math.cos(ang) >= 0 ? 1 : -1;
    this.atkTimer = 1 / itemSpeed(w) / (1 + this.d.spdP);
    const base = itemDamage(w);

    if (d.wc === 'melee') {
      this.swing = 0.24; this.swingDir = this.facing; this.swingAng = ang; this.swingHit = new Set();
      this.swingReach = (d.reach || 42) + this.w / 2;
      G.sfx('swing');
    } else if (d.wc === 'ranged') {
      const n = d.multi || 1;
      this.volley = (Player._vol = (Player._vol || 0) + 1);
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.09 : 0);
        this.fireProj(d.proj || 'arrow', a, base, 'dex', BOW_TIP);
      }
      /* 폭풍의 시위 — 가끔 한 발이 더 나간다. */
      if (this.skills.s_tempest && Math.random() < 0.3) {
        this.fireProj(d.proj || 'arrow', ang + (Math.random() - 0.5) * 0.12, base, 'dex', BOW_TIP);
        for (let k = 0; k < 4; k++) G.parts.push(new Part(this.cx, this.cy - 4, '#8fe0c8', -30, .3));
      }
      G.sfx('bow');
    } else if (d.wc === 'magic') {
      const cost = d.mana || 5;
      if (this.mp < cost) { G.toast(tr('마나가 부족하다'), 'bad'); this.atkTimer = 0.2; return; }
      this.mp -= cost;
      const n = d.multi || 1;
      this.volley = (Player._vol = (Player._vol || 0) + 1);
      const pt = d.proj || 'bolt';
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.07 : 0);
        this.fireProj(pt, a, base, 'int');
      }
      /* 지팡이 끝의 발화 — 사연: docs/code-history.md#h27 */
      {
        const st = PROJ_STYLE[pt] || PROJ_STYLE.bolt;
        const mx2 = this.cx + Math.cos(ang) * 16, my2 = this.cy - 4 + Math.sin(ang) * 16;
        G.ringFx(mx2, my2, 13, st.c, 0.18);
        for (let i = 0; i < 5; i++) G.parts.push(new Part(mx2, my2, st.c, -10, 0.3));
      }
      G.sfx('magic');
    }
  },
  punch(mx, my) {
    const w = this.weapon();
    const dmg = w ? itemDamage(w) : 4;
    const ang = angleTo(this.cx, this.cy, mx, my);
    this.facing = Math.cos(ang) >= 0 ? 1 : -1;
    this.atkTimer = 1 / (w ? itemSpeed(w) : 2.4);
    this.swing = 0.2; this.swingDir = this.facing; this.swingAng = ang; this.swingHit = new Set();
    this.swingReach = 34 + this.w / 2;
    this._punchDmg = dmg;
  },
  scaleDmg(base, kind) {
    const d = this.d;
    let m = 1 + d.dmgP;
    if (kind === 'str') m *= 1 + d.str * 0.021;
    else if (kind === 'dex') m *= 1 + d.dex * 0.021;
    else if (kind === 'int') m *= (1 + d.int * 0.023) * (1 + d.magicP / 100);
    return base * m;
  },
  rollCrit() {
    const c = this.d.crit / 100;
    return Math.random() < c;
  },
  fireProj(type, ang, base, kind, off) {
    const dmg = this.scaleDmg(base, kind);
    const crit = this.rollCrit();
    const spd = type === 'arrow' ? 760 : type === 'star' ? 900 : 560;
    /* off 가 있으면 그 거리만큼 겨눈 쪽으로 밀어 낸다 — 활 끝에서 화살이 나가게. */
    let ox = 0, oy = -4;
    if (off) {
      const cs = Math.cos(ang), sn = Math.sin(ang);
      let reach = 0;
      for (let t = TS / 2; t <= off; t += TS / 2) {
        if (G.world.solid(Math.floor((this.cx + cs * t) / TS), Math.floor((this.cy + sn * t) / TS))) break;
        reach = t;
      }
      if (reach >= off - TS / 2) reach = off;   // 끝까지 뚫려 있으면 활 끝 그대로
      if (reach > 0) { ox = cs * reach; oy = sn * reach; }
    }
    const p = new Proj(this.cx + ox, this.cy + oy, Math.cos(ang) * spd, Math.sin(ang) * spd, dmg * (crit ? 1 + this.d.critD / 100 : 1), 'player', type);
    p.crit = crit;
    /* 한 번의 발사에서 나간 것끼리 같은 표를 단다 — 같은 적에게 겹쳐 박히는 것을 가려내려는 것이다(data.js MULTI_FALLOFF). */
    p.vol = this.volley;
    if (this.d.fire) p.fire = this.d.fire;
    if (this.d.frost) p.frost = this.d.frost;
    if (this.d.poison) p.poison = this.d.poison;
    if (type === 'arrow' || type === 'star') p.grav = type === 'arrow' ? 170 : 60;
    if (type === 'void' || type === 'star') p.pierce = 2;
    G.projs.push(p);
  },

  /* ---- 스킬 ---- */
  useSkill(i, mx, my) {
    const id = this.slots[i]; if (!id) return;
    const sk = SKILLS[id], r = this.skills[id] || 0;
    if (!r || sk.type !== 'active') return;
    /* 못 쓰는 것을 눌렀을 때도 **대답은 한다.** — 사연: docs/code-history.md#h28 */
    if ((this.cd[id] || 0) > 0) { G.skillDeny(i); return; }
    if (this.mp < sk.mana) { G.skillDeny(i, tr('마나가 부족하다')); return; }
    this.mp -= sk.mana;
    this.cd[id] = sk.cd * (1 - this.d.cdr / 100);
    const w = this.weapon();
    const wdmg = w && idef(w).dmg ? itemDamage(w) : 10;
    const ang = angleTo(this.cx, this.cy, mx, my);

    switch (id) {
      case 's_cleave': {
        const dmg = this.scaleDmg(wdmg * sk.v(r) / 100, 'str');
        G.aoe(this.cx, this.cy, 108, dmg, 6, '#ffb24a');
        break;
      }
      case 's_charge': {
        this.vx = Math.cos(ang) * 900; this.vy = -180;
        this.iframe = Math.max(this.iframe, 0.35);
        this.chargeDmg = this.scaleDmg(wdmg * sk.v(r) / 100, 'str');
        this.chargeT = 0.35; this.chargeHit = new Set();
        break;
      }
      case 's_whirl': {
        this.channel = { id, t: 2.5, tick: 0, dmg: this.scaleDmg(wdmg * sk.v(r) / 100, 'str') };
        // 도는 칼선은 채널이 살아 있는 동안 G.drawWhirlArc 가 그린다(여기서 쌓지 않는다)
        break;
      }
      case 's_volley': {
        const n = sk.v(r);
        for (let i2 = 0; i2 < n; i2++) {
          const a = ang + (i2 - (n - 1) / 2) * 0.14;
          this.fireProj('arrow', a, wdmg * 0.7, 'dex');
        }
        break;
      }
      case 's_rain': {
        const n = sk.v(r);
        /* ★ 실제 퍼지는 폭 (±130)과 같은 띠를 깔아 둔다. */
        G.bandFx(mx, my, 130, n * 0.07 + 0.45, '#9fe07a');
        for (let i2 = 0; i2 < n; i2++) {
          G.pending.push({
            t: i2 * 0.07, fn: () => {
              const px = mx + (Math.random() - 0.5) * 260;
              const p = new Proj(px, my - 420 - Math.random() * 80, (Math.random() - 0.5) * 60, 820, this.scaleDmg(wdmg * 0.6, 'dex'), 'player', 'star');
              p.grav = 260; G.projs.push(p);
            }
          });
        }
        break;
      }
      case 's_fireball': {
        const p = new Proj(this.cx, this.cy - 4, Math.cos(ang) * 620, Math.sin(ang) * 620, this.scaleDmg(sk.v(r) + this.d.int * 1.6, 'int'), 'player', 'fire');
        p.explode = 70; p.fire = 2; G.projs.push(p); break;
      }
      case 's_heal': {
        this.heal(this.d.maxHp * sk.v(r) / 100);
        this.addBuff('well', 5);
        for (let k = 0; k < 18; k++) G.parts.push(new Part(this.cx + (Math.random() - 0.5) * 30, this.cy + (Math.random() - 0.5) * 40, '#9ff09f', -60));
        break;
      }
      case 's_nova': {
        G.aoe(this.cx, this.cy, 160, this.scaleDmg(sk.v(r) + this.d.int * 1.1, 'int'), 4, '#9fe0ff', 'frost');
        for (let k = 0; k < 26; k++) { const a = Math.random() * TAU; G.parts.push(new Part(this.cx + Math.cos(a) * 60, this.cy + Math.sin(a) * 60, '#9fe0ff')); }
        break;
      }
      case 's_wolf': {
        /* 마나 45에 재사용 30초인데 늑대가 소리 없이 **그냥 나타났다**(잰 입자 3개). */
        for (let k = 0; k < sk.v(r); k++) {
          const wx = this.cx + (k - 1) * 26;
          G.ents.push(new Wolf(wx, this.cy, this));
          G.sigilFx(wx, this.y + this.h - 6, 22, '#c8b88a');   // 22 — 늑대 간격이 26이라 30은 셋이 한 덩이로 뭉쳤다
          for (let j = 0; j < SIG_FX.wolf.n; j++)
            G.parts.push(new Part(wx + (Math.random() - .5) * 26, this.y + this.h - 8, '#c8b88a', -70, .8));
        }
        break;
      }

      /* ===== 특성 ===== */
      case 's_guard': {
        // 철벽 — 짧게 굳는다.
        this.addBuff('bulwark', sk.v(r));
        G.ringFx(this.cx, this.cy, 52, '#d8a05a', .45);
        for (let k = 0; k < 16; k++) {
          const a = Math.random() * TAU;
          G.parts.push(new Part(this.cx + Math.cos(a) * 22, this.cy + Math.sin(a) * 26, '#d8a05a', -30, .7));
        }
        break;
      }
      case 's_quake': {
        // 좌우로 퍼져 나가는 충격파 — 발밑을 따라 두 갈래로 나간다
        const dmg = this.scaleDmg(wdmg * sk.v(r) / 100, 'str');
        const foot = this.y + this.h;
        for (const dir of [-1, 1]) {
          for (let step = 0; step < 5; step++) {
            G.pending.push({
              t: step * 0.05, fn: () => {
                const x = this.cx + dir * (34 + step * 34);
                G.aoe(x, foot - 14, 40, dmg / 2, 5, '#c8845a', 'frost');
                for (let k = 0; k < 4; k++)
                  G.parts.push(new Part(x + (Math.random() - .5) * 24, foot - 4, '#c8845a', -180, .5));
              }
            });
          }
        }
        G.aoe(this.cx, foot - 14, 60, dmg, 7, '#c8845a', 'frost');
        break;
      }
      case 's_warcry': {
        const dur = sk.v(r);
        this.addBuff('warcry', dur);
        this.addBuff('iron', dur);
        // 함성 자체는 피해가 아니라 밀어내기다 — 붙어 있던 것들을 떼어 낸다
        for (const e of G.ents) {
          if (!(e instanceof Enemy) || e.dead) continue;
          if (dist(this.cx, this.cy, e.cx, e.cy) > 190) continue;
          if (!e.boss) { e.vx += Math.sign(e.cx - this.cx) * 320; e.vy = -180; }
          e.slow(0.3, 3);
        }
        G.ringFx(this.cx, this.cy, 190, '#e8a04a', .5);
        G.ringFx(this.cx, this.cy, 120, '#ffd88a', .35);
        break;
      }
      case 's_pierce': {
        const p = new Proj(this.cx, this.cy - 4, Math.cos(ang) * 900, Math.sin(ang) * 900,
          this.scaleDmg(wdmg * sk.v(r) / 100, 'dex') * (this.rollCrit() ? 1 + this.d.critD / 100 : 1), 'player', 'star');
        p.pierce = 6; p.grav = 0;
        G.projs.push(p);
        for (let k = 0; k < 8; k++) G.parts.push(new Part(this.cx, this.cy - 4, '#9fe07a', -20, .35));
        break;
      }
      case 's_smoke': {
        this.iframe = Math.max(this.iframe, 0.8 + r * 0.15);
        this.addBuff('smokescreen', sk.v(r));
        for (const e of G.ents) {
          if (!(e instanceof Enemy) || e.dead) continue;
          if (dist(this.cx, this.cy, e.cx, e.cy) < 150) e.slow(0.4, 4);
        }
        for (let k = 0; k < 34; k++) {
          const a = Math.random() * TAU, d2 = Math.random() * 60;
          G.parts.push(new Part(this.cx + Math.cos(a) * d2, this.cy + Math.sin(a) * d2, '#b8c8b0', -50, 1.1));
        }
        G.ringFx(this.cx, this.cy, 150, '#b8c8b0', .4);
        break;
      }
      case 's_mark': {
        // 겨눈 자리에서 가장 가까운 적 하나.
        let best = null, bd = 260;
        for (const e of G.ents) {
          if (!(e instanceof Enemy) || e.dead) continue;
          const d2 = dist(mx, my, e.cx, e.cy);
          if (d2 < bd) { bd = d2; best = e; }
        }
        if (!best) { this.cd[id] = 1; this.mp += sk.mana; G.toast(tr('겨눈 곳에 적이 없다'), 'bad'); return; }
        best.markT = 10; best.markAmt = sk.v(r) / 100;
        G.ringFx(best.cx, best.cy, best.w + 26, '#e8d05a', .5);
        for (let k = 0; k < 12; k++) G.parts.push(new Part(best.cx, best.y, '#e8d05a', -60, .7));
        break;
      }
      case 's_barrier': {
        this.shieldMax = this.shield = Math.round(sk.v(r) + this.d.int * 3.2);
        this.shieldT = 20;
        G.ringFx(this.cx, this.cy, 48, '#6fb8ff', .5);
        for (let k = 0; k < 20; k++) {
          const a = Math.random() * TAU;
          G.parts.push(new Part(this.cx + Math.cos(a) * 30, this.cy + Math.sin(a) * 34, '#6fb8ff', -40, .8));
        }
        G.toast(tr('방벽 {shield}', { shield: this.shield }), 'good');
        break;
      }
      case 's_chain': {
        // 첫 표적에서 시작해 가까운 적으로 옮겨 붙는다.
        const hops = sk.v(r);
        const base = this.scaleDmg(60 + this.d.int * 2.4, 'int');
        const hit = new Set();
        let fx = this.cx, fy = this.cy - 4, power = base;
        for (let h = 0; h < hops; h++) {
          let best = null, bd = h === 0 ? 420 : 200;
          for (const e of G.ents) {
            if (!(e instanceof Enemy) || e.dead || hit.has(e)) continue;
            const d2 = h === 0 ? dist(mx, my, e.cx, e.cy) : dist(fx, fy, e.cx, e.cy);
            if (d2 < bd) { bd = d2; best = e; }
          }
          if (!best) break;
          hit.add(best);
          G.boltFx(fx, fy, best.cx, best.cy, '#ffe86a');
          const crit = this.rollCrit();
          best.hurt(power * (crit ? 1 + this.d.critD / 100 : 1), crit, this, 2);
          best.slow(0.25, 1.5);
          fx = best.cx; fy = best.cy; power *= 0.75;
        }
        if (!hit.size) { G.boltFx(this.cx, this.cy - 4, mx, my, '#ffe86a'); }
        break;
      }
      case 's_blink': {
        // 겨눈 쪽으로 최대 190px.
        const maxD = 190, cs = Math.cos(ang), sn = Math.sin(ang);
        let reach = 0;
        for (let t = TS / 2; t <= maxD; t += TS / 2) {
          if (G.world.hitSolid(this.x + cs * t, this.y + sn * t, this.w, this.h)) break;
          reach = t;
        }
        if (reach < TS) { this.cd[id] = 1; this.mp += sk.mana; G.toast(tr('그쪽은 막혀 있다'), 'bad'); return; }
        const ox = this.cx, oy = this.cy;
        this.x += cs * reach; this.y += sn * reach;
        this.vy = Math.min(this.vy, 0);
        this.iframe = Math.max(this.iframe, 0.25);
        G.aoe(ox, oy, 78, this.scaleDmg(sk.v(r) + this.d.int * 1.4, 'int'), 4, '#c08fff');
        for (let k = 0; k < 18; k++) {
          G.parts.push(new Part(ox + (Math.random() - .5) * 24, oy + (Math.random() - .5) * 34, '#c08fff', -40, .7));
          G.parts.push(new Part(this.cx + (Math.random() - .5) * 24, this.cy + (Math.random() - .5) * 34, '#c08fff', -40, .7));
        }
        G.boltFx(ox, oy, this.cx, this.cy, '#c08fff');
        break;
      }
      case 's_meteor': {
        // 겨눈 자리에 예고를 띄우고 0.9초 뒤에 떨어진다 — 피할 시간을 주는 대신 크다
        const tx = mx, ty = my;
        G.warnFx(tx, ty, 150, 0.9, '#ffb04a');
        /* ★ 하늘에 있는 동안은 아무것도 가리지 않으므로 여기만은 진하게 둔다. */
        G.fallFx(tx, ty, 0.9, '#ffd07a');
        G.pending.push({
          t: 0.9, fn: () => {
            const dmg = this.scaleDmg(340 + this.d.int * 6.5, 'int');
            G.aoe(tx, ty, 150, dmg, 12, '#ffb04a');
            for (const e of G.ents) if (e instanceof Enemy && !e.dead && dist(tx, ty, e.cx, e.cy) < 150) e.addDot('fire', dmg * 0.06, 5);
            G.ringFx(tx, ty, 150, '#ffb04a', .55);
            G.ringFx(tx, ty, 90, '#fff0c0', .4);
            for (let k = 0; k < 46; k++) {
              const a = Math.random() * TAU, d2 = Math.random() * 140;
              G.parts.push(new Part(tx + Math.cos(a) * d2, ty + Math.sin(a) * d2, k % 3 ? '#ffb04a' : '#fff0c0', -150, 1));
            }
            /* 착탄 섬광 — 바닥에 깔리므로 적을 지우지 않는다. */
            G.flashFx(tx, ty, 230, '#fff0c0');
            const h = SKILL_HIT.meteor;
            G.shake = Math.max(G.shake, h.k); G.hitStop(h.st); G.sfx(h.s);
          }
        });
        break;
      }
    }
    /* 시전의 끝맺음 — 소리·흔들림·멈춤·고리를 SKILL_FX 한 표에서 가져온다. */
    const fx = SKILL_FX[id] || {};
    if (fx.c) G.ringFx(this.cx, this.cy, fx.r || 44, fx.c, .26);
    if (fx.k) G.shake = Math.max(G.shake, fx.k);
    if (fx.st) G.hitStop(fx.st);
    G.sfx(fx.s || 'skill');
  },

  /* ---- 물가로 기어오르기 ---- */
  climbOut(world, dir) {
    if (!world || !dir) return false;
    const step = Math.sign(dir) * (this.w * 0.75 + 2);
    for (let up = 0; up <= 2; up++) {
      const nx = this.x + step, ny = this.y - up * TS;
      if (world.hitSolid(nx, ny, this.w, this.h)) continue;      // 그 자리가 막혀 있다
      if (!world.hitSolid(nx, ny + 3, this.w, this.h)) continue; // 발 디딜 것이 없다
      this.x = nx; this.y = ny;
      this.vy = -190; this.vx = Math.sign(dir) * 90;             // 올라서면서 앞으로 살짝
      this.submerged = 0; this.swimming = false;
      for (let i = 0; i < 6; i++) G.parts.push(new Part(this.cx, this.y + this.h, '#bfe4ff', -40, .5));
      return true;
    }
    return false;
  },
};
mixin(Player.prototype, PlayerCombat, true);

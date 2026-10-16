/* ===== entity/boss-forms.js — 보스의 치유 · 방어막 · 결계, 마디를 넘을 때의 변신(날아오르기 · 둘로 갈라지기). 그림은 game/boss-form-fx ===== */
import { app as G } from '../ctx.js';
import { TAU, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { ENEMIES } from '../data/enemies.js';
import { SURGE_FLY } from '../data/skills.js';
import { BOSS_FORM, BOSS_MOVES } from '../data/bossmoves.js';
import { DmgText, Enemy, Part } from '../entity.js';
/* ★ 호스트만 판정한다 — 손님은 net 의 gp 칸(방어막 · 결계 · 날개 · 쌍둥이 체력)으로 그림만. 방어막은 체력 위에 얹는 몫(막대에 파랗게 늘어난다),
   결계는 몇 번 맞아야 깨지는 완전 막기(피해 0) — 둘 다 시간이 지나면 걷힌다. */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; t?: number; [k: string]: any };

export const BossForms: Bag & ThisType<Enemy> = {
  /** 나는 몸인가 — 본래 나는 갈래이거나 마디를 넘어 날아올랐다 */
  flies() { return !!SURGE_FLY[this.def.ai!] || !!this.airborne; },
  /** 둘로 갈라진 짝이 살아 있으면 그것 */
  twinLive() { const t = this.twin; return t && !t.dead ? t : null; },
  /** 마디를 재는 체력 몫 — 갈라진 뒤엔 둘을 합쳐 본래 최대 체력에 댄다(한쪽이 쓰러져도 마디가 되돌지 않게) */
  poolRatio() {
    if (!this.poolMax) return this.hp / this.maxHp;
    const t = this.twinLive();
    return (Math.max(0, this.hp) + (t ? Math.max(0, t.hp) : 0)) / this.poolMax;
  },

  /** 치유 · 방어막 · 결계 기술(entity/boss-moves mvStart 가 부른다) */
  formMove(d: Bag, p: Player, world: World, K: Bag): Run {
    const fly = this.flies();
    if (d.k === 'heal') {                                     // 멈춰 서서 빨아들인다 — 그동안 많이 맞으면 끊기고 비틀거린다
      const total = this.maxHp * (d.v || 0.06), dur = d.dur || 3;
      this.healRun = 1; this.healTook = 0;
      const r: Run = { busy: dur, acc: 0, given: 0 };
      r.tick = (dt, r) => {
        this.vx *= 0.85; if (fly) this.vy *= 0.85;
        this.move(dt, world, { gravMul: fly ? 0 : 1 });
        if (!this.healRun) { r.busy = r.t!; return; }            // 끊겼다(formHurt)
        const amt = total * dt / dur;
        this.hp = Math.min(this.maxHp, this.hp + amt); r.given += amt; r.acc += dt;
        if (r.acc >= 0.5) { r.acc = 0; G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 30, this.y - 6, '+' + Math.round(r.given), '#7dff9a', 0)); r.given = 0; }
        if (Math.random() < dt * 30) {                           // 둘레에서 빨려 드는 빛 알갱이
          const a = Math.random() * TAU, R = Math.max(this.w, this.h) * 0.9 + 40;
          const pt = new Part(this.cx + Math.cos(a) * R, this.cy + Math.sin(a) * R, Math.random() < 0.5 ? '#7dff9a' : K.c, 0, .45, { g: 0, glow: 1, drag: 1 });
          pt.vx = -Math.cos(a) * R * 2; pt.vy = -Math.sin(a) * R * 2; G.parts.push(pt);
        }
        if (r.t! >= dur - 0.02) this.healRun = 0;
      };
      return r;
    }
    if (d.k === 'shield') {                                   // 체력 위에 얹는 막 — 다 깎거나 시간이 지나면 걷힌다
      this.shieldMax = this.shield = Math.round(this.maxHp * (d.v || 0.12));
      this.shieldT = d.life || 12; this.shFx = d.fx || '';
      G.texts.push(new DmgText(this.cx, this.y - 18, tr('방어막'), '#8fd0ff', 2));
      G.vfx.sigil(this.cx, this.cy, Math.max(this.w, this.h) * 0.7, '#8fd0ff', 0.6, 6, 1, 0.6, 'sigil_aegis');
      return { busy: 0.5 };
    }
    if (d.k === 'ward') {                                     // 완전 결계 — 피해가 들지 않고, 정해진 횟수를 맞아야 깨진다
      this.ward = this.wardMax = d.hits || 12;
      this.wardT = d.life || 10; this.shFx = d.fx || '';
      G.texts.push(new DmgText(this.cx, this.y - 18, tr('결계'), '#ffe08a', 2));
      G.vfx.sigil(this.cx, this.cy, Math.max(this.w, this.h) * 0.8, K.c, 0.7, 8, 2, 0.6, 'sigil_aegis');
      return { busy: 0.6 };
    }
    return { busy: 0.3 };
  },

  /** 맞기 전(entity.ts hurt) — 결계면 0 을 돌려준다(막았다) */
  formBlock() {
    if (!(this.ward > 0)) return false;
    this.ward--; this.flash = 0.06;
    G.texts.push(new DmgText(this.cx + (Math.random() - .5) * 24, this.y - 8, tr('무효'), '#ffe08a', 0));
    for (let i = 0; i < 4; i++) G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w, this.cy + (Math.random() - .5) * this.h, '#ffe8a0', -40, .3, { glow: 1 }));
    if (this.ward <= 0) this.formBreak('ward');
    return true;
  },
  /** 맞은 뒤(armor 를 뺀 피해) — 방어막이 먼저 받고 남은 것만 돌려준다. 치유 중이면 끊길 만큼 쌓는다 */
  formHurt(dmg: number) {
    if (this.healRun) {
      this.healTook = (this.healTook || 0) + dmg;
      const d = this.mv && this.mv.d;
      if (d && this.healTook >= this.maxHp * (d.brk || 0.04)) {
        this.healRun = 0;
        G.texts.push(new DmgText(this.cx, this.y - 20, tr('치유가 끊겼다'), '#ffd27a', 2));
        if (this.gapOpen) { this.mv = null; this.gapOpen(false); this.mvCd = 3; }
      }
    }
    if (!(this.shield > 0)) return dmg;
    const take = Math.min(this.shield, dmg);
    this.shield -= take;
    if (take > 0) G.texts.push(new DmgText(this.cx + (Math.random() - 0.5) * 14, this.y - 4, take, '#8fd0ff', 0));
    if (this.shield <= 0) this.formBreak('shield');
    return dmg - take;
  },
  formBreak(k: string) {
    G.shake = Math.max(G.shake, 10);
    for (let i = 0; i < 26; i++) G.parts.push(new Part(this.cx, this.cy, k === 'ward' ? '#ffe08a' : '#8fd0ff', -60, .7, { glow: 1, spd: 1.6 }));
    G.ringFx(this.cx, this.cy, Math.max(this.w, this.h) * 1.1, k === 'ward' ? '#ffe08a' : '#8fd0ff', .45);
    G.texts.push(new DmgText(this.cx, this.y - 22, k === 'ward' ? tr('결계가 깨졌다') : tr('방어막이 깨졌다'), '#fff0b0', 2));
    G.sfxAt && G.sfxAt('break_glass', this.cx / 22, this.cy / 22);
    if (k === 'ward') { this.ward = 0; this.wardT = 0; if (this.gapOpen) { this.mv = null; this.gapOpen(true); } }   // 깨면 크게 비틀거린다
    else { this.shield = 0; this.shieldT = 0; }
  },
  /** 매 프레임(호스트, bossAI 맨 앞) — 막의 남은 시간 · 날아오른 몸의 높이 */
  formTick(dt: number, p: Player) {
    if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) this.shield = 0;
    if (this.wardT > 0 && (this.wardT -= dt) <= 0) this.ward = 0;
    if (this.airborne && !SURGE_FLY[this.def.ai!]) {          // 머리 위 비스듬히에 머문다 — 땅을 걷던 몸놀림이 좌우를 맡는다
      const ty = p.cy - 150 - this.h * 0.3 + Math.sin(G.time * 1.3 + (this.nid || 0)) * 30;
      this.vy = lerp(this.vy, clamp((ty - this.cy) * 2.2, -(this.spd || 100) * 1.6, (this.spd || 100) * 1.6), Math.min(1, dt * 3));
      if (Math.random() < dt * 20) G.parts.push(new Part(this.cx + (Math.random() - .5) * this.w * 0.5, this.y + this.h, this.airK === 'jets' ? '#ffb050' : this.airK === 'spout' ? '#bfe6ff' : '#fff4d0', 120, .4, { g: 0.4, glow: 1 }));
    }
  },
  /** 마디를 넘었다(enemy-ai onPhaseChange) — 날아오르거나 갈라진다 */
  formPhase(ph: number) {
    const F = BOSS_FORM[this.type]; if (!F || this.ghost) return;
    if (F.fly !== undefined && ph >= F.fly && !this.airborne) {
      this.airborne = 1; this.airK = F.k || 'wings'; this.vy = -420;
      if (F.n) G.bossLine(this.def.n, F.n);
      G.vfx.shock(this.cx, this.y + this.h, Math.max(this.w, this.h) * 1.4, '#fff4d0', 0.5, 10);
    }
    if (F.split !== undefined && ph >= F.split && !this.poolMax && !this.twin) this.splitBoss(F.n);
  },
  splitBoss(line?: string) {
    const t = new Enemy(this.type, this.x, this.y, 1);
    this.poolMax = t.poolMax = this.maxHp;
    const half = Math.max(1, Math.round(this.hp / 2));
    this.maxHp = t.maxHp = Math.round(this.maxHp / 2);
    this.hp = t.hp = half;
    t.dmg = this.dmg; t.armor = this.armor; t.xp = this.xp; t.gold = this.gold; t.spd = this.spd;
    t.phases = this.phases; t.phase = t.lastPhase = this.lastPhase; t.pf = this.pf; t.phaseInv = 0.8;
    t.twin = this; this.twin = t; t.mvCd = 3.5; t.sgCd = 8; t.airborne = this.airborne; t.airK = this.airK;
    t.shade = 1;                                               // 떨어져 나온 쪽 — 그림을 한 톤 어둡게(game/render)
    this.vx = -320; t.vx = 320; this.vy = t.vy = -380;
    G.ents.push(t);
    if (line) G.bossLine(this.def.n, line);
    G.vfx.shock(this.cx, this.cy, Math.max(this.w, this.h) * 1.6, (BOSS_MOVES[this.type] || {}).c || '#fff', 0.5, 10);
    for (let i = 0; i < 30; i++) G.parts.push(new Part(this.cx, this.cy, i % 2 ? this.def.c : '#ffffff', -80, .8, { spd: 1.5 }));
    G.toast(tr('{enemy|이} 둘로 갈라졌다 — 둘 다 쓰러뜨려야 한다', { enemy: ENEMIES[this.type].n }), 'bad');
  },
};
mixin(Enemy.prototype, BossForms, true);

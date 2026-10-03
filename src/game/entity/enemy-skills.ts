/* ===== entity/enemy-skills.ts — 몹의 스킬(치유 · 북돋움 · 원소 탄 · 저주)과 걸린 것(냉기 · 북돋움)의 시간 ===== */
import { app as G } from '../ctx.js';
import { angleTo, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { MOB_SKILLS, MOB_SKILLSET } from '../data/mobskills.js';
import { Enemy, Proj } from '../entity.js';
/* entity.js 의 Enemy 에서 나눈 조각 — 읽히는 순간 Enemy.prototype 에 붙는다. */

export const EnemySkills: Bag & ThisType<Enemy> = {
  /** 냉기 — 느려짐 + 얼음 껍질(그림). 처음 걸릴 때만 얼어붙는 연출 */
  chill(t: number) {
    this.slow(0.4, t);
    if (!(this.chillT > 0)) G.statusOnset(this, 'chill');
    this.chillT = Math.max(this.chillT || 0, t);
  },
  /** 북돋움 — 공격력 배수. 이미 걸려 있으면 시간만 늘린다(겹쳐 곱하지 않는다) */
  empower(dur: number, mult: number) {
    if (!(this.empT > 0)) { this.baseDmg = this.dmg; this.dmg *= mult; G.statusOnset(this, 'empower'); }
    this.empT = Math.max(this.empT || 0, dur);
  },
  /** 매 프레임 — 걸린 것의 시간 · 스킬 고르기 · 시전 예고 */
  mobSkills(dt: number, player: any, seen: boolean, dd: number) {
    if (this.chillT > 0) this.chillT -= dt;
    if (this.empT > 0) { this.empT -= dt; if (this.empT <= 0) { this.dmg = this.baseDmg; this.empT = 0; } }
    if (this.boss || this.def.passive) return;
    if (!this.skillIds) this.skillIds = MOB_SKILLSET[this.type] || (this.elite ? ['empower'] : []);
    if (!this.skillIds.length) return;
    this.mskCd = this.mskCd || {};
    for (const id in this.mskCd) this.mskCd[id] -= dt;
    /* 시전 중 — 예고가 끝나면 터뜨린다. 그동안은 거의 서 있다 */
    if (this.cast) {
      this.cast.t -= dt; this.vx *= 0.85;
      if (this.cast.t <= 0) { const c = this.cast; this.cast = null; this.atkPose = 0.3; this.castKick = 0.3; this.fireSkill(c.id, player, c.tgt); }
      return;
    }
    if (dd > this.aggro) return;
    for (const id of this.skillIds) {
      const S = MOB_SKILLS[id];
      if ((this.mskCd[id] || 0) > 0) continue;
      let tgt: any = null;
      if (S.kind === 'ally') {
        tgt = this.allyTarget(id, S);
        if (!tgt) continue;
      } else if (!seen || dd > S.range) continue;
      this.mskCd[id] = S.cd * (0.85 + Math.random() * 0.3);
      this.cast = { id, t: S.cast, max: S.cast, tgt };
      G.mobCastFx(this, S);
      break;
    }
  },
  /** 우리편 스킬의 과녁 — 치유는 가장 다친 동료(자기 포함), 북돋움은 아직 안 걸린 동료가 둘 이상일 때 */
  allyTarget(id: string, S: Bag) {
    const near = G.ents.filter((e: any) => e instanceof Enemy && !e.dead && !e.def.passive && dist(this.cx, this.cy, e.cx, e.cy) < S.range);
    if (id === 'heal') {
      let best: any = null, bk = 0.7;
      for (const e of near) { if (e.boss) continue; const k = e.hp / e.maxHp; if (k < bk) { bk = k; best = e; } }
      return best;
    }
    const fresh = near.filter((e: any) => !(e.empT > 0));
    return fresh.length >= 2 || (fresh.length === 1 && fresh[0] !== this) ? fresh : null;
  },
  fireSkill(id: string, player: any, tgt: any) {
    const S = MOB_SKILLS[id];
    if (this.dead) return;
    G.sfxAt(S.s, this.cx / 22, this.cy / 22, 1.05, 0.7);
    if (id === 'heal') {
      if (!tgt || tgt.dead) return;
      const amt = Math.round(tgt.maxHp * S.amt);
      tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
      G.mobSkillFx(this, S, id, tgt, amt);
    } else if (id === 'empower') {
      for (const e of (tgt || [])) if (!e.dead) e.empower(S.dur, S.mult);
      G.mobSkillFx(this, S, id, tgt);
    } else if (S.kind === 'shot') {
      const a = angleTo(this.cx, this.cy, player.cx, player.cy - 4);
      for (let i = 0; i < S.n; i++) {
        const aa = a + (S.n > 1 ? (i - (S.n - 1) / 2) * S.spread : 0);
        const p = new Proj(this.cx, this.cy, Math.cos(aa) * 360, Math.sin(aa) * 360, this.dmg * (S.n > 1 ? 0.6 : 0.9), 'enemy', S.proj);
        p.inflict = S.inflict;
        G.projs.push(p);
      }
      G.mobSkillFx(this, S, id);
    } else if (S.kind === 'curse') {
      /* 저주는 겨눈 그 순간에도 보여야 걸린다 — 예고 동안 벽 뒤로 숨으면 피한다 */
      if (dist(this.cx, this.cy, player.cx, player.cy) > S.range * 1.15 || !this.sense || !this.sense.seen) { G.mobSkillFx(this, S, 'fizzle'); return; }
      player.inflict(S.inflict[0], S.inflict[1], 0);
      G.mobSkillFx(this, S, id, player);
    }
  }
};
mixin(Enemy.prototype, EnemySkills, true);

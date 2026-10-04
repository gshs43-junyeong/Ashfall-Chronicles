/* ===== game/mob-fx.ts — 몹 스킬의 몸짓과 입자: 시전 몸짓 · 모여드는 빛 · 터지는 순간 · 원소 탄의 꼬리 ===== */
/* 선(마법진 · 광선 · 고리)만 그으면 "무엇을 하는지"가 안 읽힌다 — 시전은 몸이 떠오르며 젖혀지고 둘레에서 빛 알갱이가 손으로 빨려 들고,
   쏘는 순간 앞으로 내지르며 그 갈래의 알갱이(불티 · 눈 결정 · 거품 · 연기 · 빛)가 터져 나간다.
   ★ 입자는 시전 중인 몹을 그리는 쪽(drawMobFx)에서 뿌린다 — AI 를 돌리지 않는 멀티플레이 손님 화면에서도 같은 연출이 나오게.
   빛은 더하기로 그리되 작고 짧게(밑의 몹이 가려지지 않게), 연기만 보통 섞기. 수는 '화면 효과'(fxScale)를 따른다. */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { MOB_SKILLS } from '../data/mobskills.js';
import { DmgText, Enemy } from '../entity.js';
import { Game } from '../game.js';

/** 갈래마다 알갱이 모양 · 색 — rgb 는 'r,g,b' */
const LOOK: Record<string, { k: string; c: string; c2: string }> = {
  heal: { k: 'mote', c: '150,240,140', c2: '240,255,210' },
  empower: { k: 'ember', c: '255,90,50', c2: '255,200,120' },
  firebolt: { k: 'ember', c: '255,130,50', c2: '255,226,150' },
  frostbolt: { k: 'flake', c: '170,225,255', c2: '240,252,255' },
  venom: { k: 'bubble', c: '130,205,90', c2: '220,255,170' },
  hex: { k: 'smoke', c: '120,60,180', c2: '200,150,255' }
};
type MP = { k: string; x: number; y: number; vx: number; vy: number; age: number; life: number; r: number; c: string; c2: string;
  g: number; drag: number; src?: any; tgt?: any; ang?: number; rad?: number; spin?: number };

export const MobFxPart: Bag = {
  mfx: null, mfxT: 0,

  /** 손 자리 — 몸 앞 · 가슴 높이(시전 빛이 모이는 곳) */
  /** 발밑에서 오르는 알갱이의 출발 높이 — 떠 있는 몸은 허공에 한 줄로 늘어서지 않게 배 아래쪽 몸 안에서 */
  mobFootY(e: any) { return e.onGround === false ? e.y + e.h * (0.45 + Math.random() * 0.45) : e.y + e.h - 2; },
  mobHand(e: any) { return [e.cx + (e.facing || 1) * (e.w / 2 + 4), e.y + e.h * 0.35]; },
  mfxAdd(p: Partial<MP>) {
    const L = this.mfx = this.mfx || [];
    if (L.length > 700) return;
    L.push(Object.assign({ vx: 0, vy: 0, age: 0, life: 0.6, r: 2, g: 0, drag: 1, c2: '255,255,255' }, p));
  },
  /** n 개를 화면 효과 설정만큼 줄여 뿌린다 */
  mfxN(n: number) { const s = this.fxScale ? this.fxScale() : 1; return Math.max(1, Math.round(n * Math.max(0.35, s))); },

  /** 시전 중 몸짓 — 떠오르며 뒤로 젖히고 떨린다 · 쏜 순간은 앞으로 내지르며 찌그러진다. 그릴 때만 바꾼다(판정은 그대로) */
  castPose(c: CanvasRenderingContext2D, e: any, sx: number, sy: number) {
    const k = e.castKick > 0 ? e.castKick / 0.3 : 0;
    if (!e.cast && !(k > 0)) return false;
    const p = e.cast ? 1 - Math.max(0, e.cast.t) / (e.cast.max || 1) : 0, f = e.facing || 1, fly = e.def && e.def.fly;
    const px = sx + e.w / 2, py = sy + e.h;
    const shake = Math.sin(this.time * 55) * 0.9 * p;
    c.save();
    c.translate(px + shake + f * 7 * k * k, py - (fly ? 8 : 3) * Math.sin(p * Math.PI / 2));
    c.rotate(-f * 0.11 * p + f * 0.16 * k);
    c.scale(1 - 0.03 * p + 0.09 * k, 1 + 0.06 * p - 0.09 * k);
    c.translate(-px, -py);
    return true;
  },

  /** 시전 첫 순간 — 발밑에서 그 갈래의 알갱이가 한 번 피어오른다 */
  mobCastFx(e: any, S: Bag) {
    const id = this.mobSkillId(S), L = LOOK[id] || LOOK.heal;
    for (let i = 0; i < this.mfxN(10); i++) {
      const a = Math.random() * TAU;
      this.mfxAdd({ k: L.k, x: e.cx + Math.cos(a) * e.w * 0.6, y: this.mobFootY(e), vx: Math.cos(a) * 30, vy: -40 - Math.random() * 60,
        life: 0.5 + Math.random() * 0.4, r: 1.6 + Math.random() * 1.6, c: L.c, c2: L.c2, drag: 0.9 });
    }
    this.sfxAt('magic', e.cx / 22, e.cy / 22, 0.8, 0.45);
  },
  mobSkillId(S: Bag) { for (const id in MOB_SKILLS) if (MOB_SKILLS[id] === S) return id; return 'heal'; },

  /** 시전 중 매 프레임 — 둘레에서 손으로 빨려 드는 알갱이 + 갈래마다 몸에서 피어나는 것 */
  mobCastEmit(e: any, dt: number) {
    const id = e.cast.id, L = LOOK[id] || LOOK.heal, p = 1 - Math.max(0, e.cast.t) / (e.cast.max || 1);
    const [hx, hy] = this.mobHand(e);
    e._mfxAcc = (e._mfxAcc || 0) + dt * this.mfxN(46) * (0.6 + p);
    while (e._mfxAcc >= 1) {
      e._mfxAcc -= 1;
      const ang = Math.random() * TAU, rad = 26 + Math.random() * 22;
      this.mfxAdd({ k: 'gather', x: hx + Math.cos(ang) * rad, y: hy + Math.sin(ang) * rad, life: 0.45 + Math.random() * 0.25,
        r: 1.4 + Math.random() * 1.4, c: L.c, c2: L.c2, src: e, ang, rad, spin: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3) });
      if (Math.random() < 0.45) {                                  // 몸에서 피어나는 갈래 알갱이
        const bx = e.x + Math.random() * e.w, by = e.y + e.h * (0.4 + Math.random() * 0.6);
        if (L.k === 'smoke') this.mfxAdd({ k: 'smoke', x: bx, y: by, vx: (Math.random() - 0.5) * 20, vy: -18, life: 0.9, r: 5 + Math.random() * 4, c: L.c, c2: L.c2 });
        else if (L.k === 'bubble') this.mfxAdd({ k: 'bubble', x: bx, y: this.mobFootY(e), vx: (Math.random() - 0.5) * 12, vy: -30 - Math.random() * 30, life: 0.8, r: 1.5 + Math.random() * 2.5, c: L.c, c2: L.c2 });
        else if (L.k === 'flake') this.mfxAdd({ k: 'flake', x: bx, y: by, vx: (Math.random() - 0.5) * 30, vy: -20, life: 0.7, r: 2 + Math.random() * 2, c: L.c, c2: L.c2, spin: (Math.random() - 0.5) * 8 });
        else this.mfxAdd({ k: L.k, x: bx, y: this.mobFootY(e), vx: (Math.random() - 0.5) * 16, vy: -50 - Math.random() * 50, life: 0.6, r: 1.4 + Math.random() * 1.6, c: L.c, c2: L.c2, drag: 0.97 });
      }
    }
  },

  /** 몹 스킬이 터진다 — 갈래마다 다른 모양(선 없이 알갱이 · 빛 덩이로) */
  mobSkillFx(e: any, S: Bag, id: string, tgt?: any, amt?: number) {
    const v = this.vfx, L = LOOK[id] || LOOK[this.mobSkillId(S)] || LOOK.heal;
    const [hx, hy] = this.mobHand(e), f = e.facing || 1;
    if (id === 'heal' && tgt) {
      for (let i = 0; i < this.mfxN(16); i++)                     // 손에서 동료에게 날아가는 빛(호를 그리며 따라간다)
        this.mfxAdd({ k: 'seek', x: hx, y: hy, vx: (Math.random() - 0.5) * 220, vy: -120 - Math.random() * 160, life: 1.2, r: 2 + Math.random() * 1.5,
          c: L.c, c2: L.c2, tgt, age: -i * 0.025 });
      for (let i = 0; i < this.mfxN(18); i++)                     // 위에서 쏟아지는 빛
        this.mfxAdd({ k: 'mote', x: tgt.x + Math.random() * tgt.w, y: tgt.y - 30 - Math.random() * 40, vy: 70 + Math.random() * 60,
          life: 0.55, r: 1.6 + Math.random() * 1.4, c: L.c, c2: L.c2, age: -0.25 - Math.random() * 0.25 });
      v.column(tgt.cx, tgt.y + tgt.h, tgt.w + 14, tgt.h * 1.8, '#9ff09f', 0.6);
      this.texts.push(new DmgText(tgt.cx, tgt.y, '+' + amt, '#7fe07f', 0));
    } else if (id === 'empower') {
      for (let i = 0; i < this.mfxN(34); i++) {                    // 포효 — 사방으로 튀는 불꽃 + 발밑에서 솟는 불길
        const a = Math.random() * TAU, sp = 120 + Math.random() * 180;
        this.mfxAdd({ k: 'ember', x: e.cx, y: e.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, life: 0.5 + Math.random() * 0.3, r: 1.6 + Math.random() * 1.8, c: L.c, c2: L.c2, drag: 0.9 });
      }
      for (let i = 0; i < this.mfxN(14); i++)
        this.mfxAdd({ k: 'ember', x: e.x + Math.random() * e.w, y: this.mobFootY(e), vy: -120 - Math.random() * 120, life: 0.6, r: 2 + Math.random() * 2, c: L.c, c2: L.c2, drag: 0.95 });
      v.flare(e.cx, e.cy - 4, 46, '#ff7a4a', 0.28);
      this.shake = Math.max(this.shake || 0, 3);
    } else if (id === 'hex' && tgt) {
      for (let i = 0; i < this.mfxN(22); i++)                     // 보랏빛 연기가 흘러가 감싼다
        this.mfxAdd({ k: 'seek', x: hx, y: hy, vx: f * (80 + Math.random() * 120), vy: (Math.random() - 0.5) * 160, life: 1.1, r: 2.6 + Math.random() * 2,
          c: L.c, c2: L.c2, tgt, age: -i * 0.02, g: 1 });
      for (let i = 0; i < this.mfxN(8); i++)
        this.mfxAdd({ k: 'smoke', x: hx, y: hy, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, life: 1, r: 6 + Math.random() * 5, c: '60,30,90', c2: L.c2 });
    } else if (id === 'fizzle') {
      for (let i = 0; i < this.mfxN(6); i++)
        this.mfxAdd({ k: 'smoke', x: hx, y: hy, vx: (Math.random() - 0.5) * 30, vy: -25, life: 0.7, r: 4 + Math.random() * 3, c: '110,100,130', c2: '200,200,220' });
    } else {                                                        // 쏘기 — 총구 불꽃(쏜 쪽으로 퍼지는 갈래 알갱이)
      const pl = this.player, a = pl ? Math.atan2(pl.cy - hy, pl.cx - hx) : (f > 0 ? 0 : Math.PI);
      for (let i = 0; i < this.mfxN(18); i++) {
        const aa = a + (Math.random() - 0.5) * 0.9, sp = 90 + Math.random() * 200;
        this.mfxAdd({ k: L.k === 'bubble' ? 'bubble' : L.k, x: hx, y: hy, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: 0.3 + Math.random() * 0.3,
          r: 1.5 + Math.random() * 1.8, c: L.c, c2: L.c2, drag: 0.88, spin: (Math.random() - 0.5) * 10 });
      }
      v.flare(hx, hy, 30, 'rgb(' + L.c2 + ')', 0.2);
    }
  },

  /** 원소 탄의 꼬리 — 불덩이는 불티 · 얼음은 서리 김 · 독은 떨어지는 방울 · 어둠은 연기 */
  projTrails(dt: number) {
    for (const pr of this.projs || []) {
      if (pr.team !== 'enemy') continue;
      const L = pr.type === 'fire' ? LOOK.firebolt : pr.type === 'frost' ? LOOK.frostbolt : pr.type === 'poison' ? LOOK.venom
        : (pr.type === 'dark' || pr.type === 'void') ? LOOK.hex : null;
      if (!L) continue;
      pr._trail = (pr._trail || 0) + dt * this.mfxN(30);
      while (pr._trail >= 1) {
        pr._trail -= 1;
        const x = pr.cx + (Math.random() - 0.5) * 10, y = pr.cy + (Math.random() - 0.5) * 10;   // 흩뿌린다 — 한 줄로 늘어서면 점선처럼 보였다
        if (L.k === 'bubble') this.mfxAdd({ k: 'drip', x, y, vx: pr.vx * 0.05, vy: 10, g: 1, life: 0.5, r: 1.6 + Math.random(), c: L.c, c2: L.c2 });
        else if (L.k === 'smoke') this.mfxAdd({ k: 'smoke', x, y, vx: -pr.vx * 0.05, vy: -10, life: 0.6, r: 3 + Math.random() * 3, c: L.c, c2: L.c2 });
        else this.mfxAdd({ k: L.k, x, y, vx: -pr.vx * 0.12 + (Math.random() - 0.5) * 60, vy: -pr.vy * 0.12 + (Math.random() - 0.5) * 40 - (L.k === 'ember' ? 40 : 0),
          life: 0.18 + Math.random() * 0.22, r: 0.9 + Math.random() * 1.3, c: L.c, c2: L.c2, drag: 0.9, spin: (Math.random() - 0.5) * 8 });
      }
    }
  },

  /** 몹 연출 판을 움직이고 그린다(fx 단계, 투사체 위) */
  drawMobFx(c: CanvasRenderingContext2D, camX: number, camY: number) {
    const now = this.time, dt = Math.min(0.05, Math.max(0, now - (this.mfxT || now))); this.mfxT = now;
    for (const e of this.ents || []) {
      if (!(e instanceof Enemy) || e.dead) continue;
      if (e.castKick > 0) e.castKick -= dt;
      if (e.cast && e.cast.id && dt > 0) this.mobCastEmit(e, dt);
    }
    if (dt > 0) this.projTrails(dt);
    const L: MP[] = this.mfx || [];
    if (!L.length) return;
    let n = 0;
    for (const p of L) {
      p.age += dt;
      if (p.age < 0) { L[n++] = p; continue; }
      if (p.age > p.life) continue;
      if (p.k === 'gather' && p.src) {                              // 손으로 소용돌이치며 빨려 든다
        const [hx, hy] = this.mobHand(p.src), k = p.age / p.life;
        p.ang! += p.spin! * dt; const r = p.rad! * (1 - k * k);
        p.x = hx + Math.cos(p.ang!) * r; p.y = hy + Math.sin(p.ang!) * r;
      } else if (p.k === 'seek' && p.tgt) {                          // 처음 튄 방향에서 휘어 과녁으로
        const tx = p.tgt.cx, ty = p.tgt.cy, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
        const pull = 900 + p.age * 2400;
        p.vx = (p.vx + dx / d * pull * dt) * 0.93; p.vy = (p.vy + dy / d * pull * dt) * 0.93;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (d < 8) { p.life = p.age; this.mfxAdd({ k: p.g ? 'smoke' : 'mote', x: p.x, y: p.y, vy: -30, life: 0.4, r: p.g ? 5 : 2.4, c: p.c, c2: p.c2 }); }
      } else {
        p.vy += (p.k === 'drip' ? 420 : p.k === 'flake' ? 30 : 0) * dt;
        p.vx *= Math.pow(p.drag, dt * 60); p.vy *= Math.pow(p.drag, dt * 60);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.spin) p.ang = (p.ang || 0) + p.spin * dt;
      }
      L[n++] = p;
    }
    L.length = n;
    c.save();
    for (const p of L) {                                            // 연기 — 가리는 것이라 보통 섞기, 먼저
      if (p.age < 0 || p.k !== 'smoke') continue;
      const k = p.age / p.life, x = p.x - camX, y = p.y - camY, r = p.r * (1 + k * 1.4);
      c.globalAlpha = 0.5 * (1 - k) * Math.min(1, p.age * 8);
      c.fillStyle = 'rgb(' + p.c + ')'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.globalAlpha *= 0.6; c.fillStyle = 'rgb(' + p.c2 + ')'; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.3, r * 0.45, 0, TAU); c.fill();
    }
    c.globalCompositeOperation = 'lighter';
    for (const p of L) {
      if (p.age < 0 || p.k === 'smoke') continue;
      const k = p.age / p.life, x = p.x - camX, y = p.y - camY;
      const a = p.k === 'gather' ? Math.min(1, k * 4) : 1 - k * k;
      if (p.k === 'bubble' || p.k === 'drip') {                     // 거품 · 방울 — 속이 비친 알 + 반짝 한 점
        c.globalAlpha = 0.55 * a; c.fillStyle = 'rgb(' + p.c + ')'; c.beginPath(); c.arc(x, y, p.r, 0, TAU); c.fill();
        c.globalAlpha = 0.9 * a; c.fillStyle = 'rgb(' + p.c2 + ')'; c.beginPath(); c.arc(x - p.r * 0.35, y - p.r * 0.35, p.r * 0.35, 0, TAU); c.fill();
        continue;
      }
      if (p.k === 'flake') {                                         // 눈 결정 — 돌아가는 작은 마름모 둘(겹친 별)
        c.save(); c.translate(x, y); c.rotate(p.ang || 0);
        c.globalAlpha = 0.9 * a; c.fillStyle = 'rgb(' + p.c2 + ')';
        for (const rot of [0, Math.PI / 4]) {
          c.rotate(rot); const r = p.r * (rot ? 0.7 : 1.2);
          c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.3, 0); c.lineTo(0, r); c.lineTo(-r * 0.3, 0); c.closePath(); c.fill();
          c.beginPath(); c.moveTo(-r, 0); c.lineTo(0, r * 0.3); c.lineTo(r, 0); c.lineTo(0, -r * 0.3); c.closePath(); c.fill();
        }
        c.restore();
        continue;
      }
      // 빛 알갱이(mote · ember · gather · seek) — 번진 둘레 + 밝은 심
      const r = p.r * (p.k === 'ember' ? 1 - k * 0.5 : 1);
      c.globalAlpha = 0.35 * a; c.fillStyle = 'rgb(' + p.c + ')'; c.beginPath(); c.arc(x, y, r * 2.6, 0, TAU); c.fill();
      c.globalAlpha = 0.95 * a; c.fillStyle = 'rgb(' + p.c2 + ')'; c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.fill();
    }
    c.restore();
  }
};

mixin(Game.prototype, MobFxPart, true);

/* ===== entity/boss-signature.js — 보스마다 하나뿐인 기술(고유 규칙) — 다른 보스와 겹치지 않는 이동 · 지형 · 부위 · 상호작용 ===== */
import { app as G } from '../ctx.js';
import { TAU, angleTo, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
/* 설계: docs/update/v1.1.4-boss-identity.md §3. 틀 기술(boss-moves)은 여럿이 나눠 쓰지만 이것들은 그 보스만 쓴다.
   ★ 예고 → 실행 순서는 틀 기술과 같다(tele 동안 몸에 소품이 맺힌다). 위험 지대는 G.bossHazard 로만 놓는다 — 참가자에게 같은 때 보인다.
   피해는 호스트가 매기고, 끌림 · 붙잡힘 · 물속 느려짐은 화면마다 제 플레이어에게 건다(game/boss-sig). */

type Run = { busy: number; tick?: (dt: number, r: Run) => void; t?: number; [k: string]: any };
let hid = 1;
/** 나중에 상태를 고칠(bhzp) 위험 지대 번호 — 호스트가 매긴다 */
const nid = () => (hid = hid % 1e6 + 1);

export const BossSignature: Bag & ThisType<Enemy> = {

  /** 숨었다 다른 자리에서 솟는 몸(잠겼다 솟기) — 숨는 동안 맞지 않는다 */
  sigHide(dt: number, world: World, r: Run, toX: () => number, under: number, rise: number, onRise: () => void) {
    r.pt += dt;
    if (r.ph === 0) { this.burrowT = 1; this.guard = 1; this.vx = 0; if (r.pt > 0.45) { r.ph = 1; r.pt = 0; } }
    else if (r.ph === 1) {
      this.x = lerp(this.x, toX() - this.w / 2, dt * 2.6);
      this.y = this.floorY(this.cx, this.y) - this.h;
      if (r.pt > under) { r.ph = 2; r.pt = 0; r.rise(); }
    } else if (r.ph === 2) {
      if (r.pt > rise) { this.burrowT = 0; this.guard = 0; onRise(); r.ph = 3; r.pt = 0; G.shake = Math.max(G.shake, 10); }
    } else if (r.pt > 0.6) r.busy = r.t!;
    this.move(dt, world, { gravMul: r.ph >= 3 ? 1 : 0 });
  },

  sigStart(d: Bag, p: Player, world: World, K: Bag): Run {
    const m = d.m ?? 1, E = this, fy = this.floorY(p.cx, p.y), side = Math.sign(p.cx - this.cx) || 1;
    switch (d.sig) {
      case 'slap': case 'bubbles': case 'sink': case 'surge': return this.poolSig(d, p, world, K);   // 잿물 군체(entity/boss-pool)
      case 'sweep': case 'pipes': case 'scatter': case 'requiem': return this.organSig(d, p, world, K);   // 뼈 오르간(entity/boss-organ)
      case 'pendulum': case 'silk': case 'wingwind': case 'dust': case 'lightdive': return this.cocoonSig(d, p, world, K);   // 잿빛 고치(entity/boss-cocoon)
      case 'fist': case 'sandpour': case 'quick': case 'deadline': return this.hgSig(d, p, world, K);   // 모래시계 거상(entity/boss-hourglass)
      case 'brood': case 'bilefall': case 'spit': case 'bloom': return this.hvSig(d, p, world, K);   // 곪은 벌집 어미(entity/boss-hive)
      case 'dig': case 'slam': return this.mhSig(d, p, world, K);   // 갱도의 것(entity/boss-cart)
      case 'verdict': case 'tablets': case 'gavel': case 'condemn': case 'sentence': return this.jdSig(d, p, world, K);   // 판결석 좌상(entity/boss-judge)
      case 'shand': case 'hands2': case 'stare': case 'totality': return this.ecSig(d, p, world, K);   // 일식(entity/boss-eclipse)
      case 'vleap': return this.vkSig(d, p, world, K);   // 공허의 왕(entity/boss-void)
      case 'rroots': case 'rrings': case 'rbloom': case 'rfell': return this.rtSig(d, p, world, K);   // 뿌리 대성당(entity/boss-root)
      case 'beat': {                                              // 박동 — 세 번 뛸 때마다 바닥을 타고 고동이 퍼진다(뛰어넘는다)
        this.hz({ k: 'pulse', life: 2.7, ref: this, nid: this.nid, c: K.c, x: this.cx, y: this.cy, follow: 1, every: 0.85 });
        for (let b = 0; b < 3; b++) G.after(b * 0.85, () => {
          if (E.dead) return;
          const y = E.y + E.h;
          for (const s of [-1, 1]) E.hz({ k: 'wave', x: E.cx + s * E.w / 2, y, vx: s * 430, w: 30, hh: 24, life: 2.2, dmg: E.dmg * m * 0.8, c: K.c, fx: 'flesh', sd: Math.random() * 99 });
          G.shake = Math.max(G.shake, 7);
        });
        return { busy: 2.5 };
      }
      case 'mirrors': {                                           // 얼음 거울 감옥 — 둘레 여섯 중 한 칸이 빈다
        const n = 6, gap = Math.floor(Math.random() * n), a0 = Math.random() * TAU, cx = p.cx, cy = p.cy - 10;
        for (let i = 0, j = 0; i < n; i++) {
          if (i === gap) continue;
          const a = a0 + i / n * TAU;
          this.hz({ k: 'mirror', x: cx + Math.cos(a) * 190, y: cy + Math.sin(a) * 120, life: 1.6 + j * 0.24 + 0.5, fireAt: 1.2 + j * 0.24, dmg: this.dmg * m * 0.7, c: K.c, type: this.type, sd: i });
          j++;
        }
        return { busy: 1.2 };
      }
      case 'veil': {                                              // 어둠 장막 — 둘레만 남기고 어두워지고, 어둠 속 눈이 다가와 할퀸다
        this.hz({ k: 'veil', life: 3.8, c: K.c });
        for (let i = 0; i < 3; i++) G.after(0.5 + i * 1.0, () => {
          if (E.dead) return;
          const q = p, tx = q.cx + (Math.random() - 0.5) * 80, a = Math.random() * TAU;
          E.strike(tx, q.y + q.h, { r: 62, delay: 0.85, fx: 'claw', sx: tx + Math.cos(a) * 230, sy: q.cy + Math.sin(a) * 120 }, K, m);
        });
        return { busy: 3.2 };
      }
      case 'rods': {                                              // 피뢰침 — 번개가 침에 떨어지고 침과 침 사이가 전류로 이어진다
        const xs = [-1, 0, 1].map(i => p.cx + i * 170 + (Math.random() - 0.5) * 40);
        const ys = xs.map(x => this.floorY(x, p.y - TS * 2));
        xs.forEach((x, i) => {
          this.hz({ k: 'rod', x, y: ys[i], life: 3.8, c: K.c, sx: this.cx + (i - 1) * 60, sy: this.cy - 20 });
          G.after(0.15 * i, () => { if (!E.dead) E.strike(x, ys[i], { shape: 'col', w: 30, h: 420, delay: 1.0, fx: 'bolt', dir: 'down' }, K, m); });
        });
        G.after(1.3, () => {
          if (E.dead) return;
          for (let i = 0; i < 2; i++) E.hz({ k: 'arc', x0: xs[i], y0: ys[i] - 14, x1: xs[i + 1], y1: ys[i + 1] - 14, life: 2.2, on0: 0.25, dmg: E.dmg * m * 0.7, c: K.c, sd: i });
        });
        return { busy: 1.6 };
      }
      case 'scales': {                                            // 판결의 저울 — 한쪽 접시가 기울면 그쪽에 룬 기둥이 떨어진다
        const doom = Math.random() < 0.5 ? -1 : 1, cx = p.cx;
        this.hz({ k: 'scales', x: cx, y: fy, life: 2.6, doom, judge: 1.0, c: K.c });
        for (let i = 0; i < 6; i++) this.strike(cx + doom * (24 + i * 50), fy, { shape: 'col', w: 44, h: 200, delay: 1.7 + i * 0.05, fx: 'rune', dir: 'up' }, K, m);
        return { busy: 1.8 };
      }
      case 'gaze': {                                              // 응시 — 화면 끝에서 눈이 뜨고, 시선이 머문 자리에 별똥이 떨어진다
        this.hz({ k: 'gaze', life: 4.4, ex: p.cx, ey: fy, dmg: this.dmg * m, c: K.c, id: nid() });
        return { busy: 1.2 };
      }
      case 'cart': {                                              // 광차 돌진 — 레일을 깔고 끝까지, 뒤따라 광석 광차
        const y = this.y + this.h, x0 = this.cx;
        if (this.mhLay) this.mhLay(x0 - side * 60, x0 + side * 900, y); else this.hz({ k: 'rail', x0: x0 - side * 60, x1: x0 + side * 900, y, life: 3.4, c: K.c });   // 갱도의 것은 레일이 남아 길이 된다
        const r: Run = { busy: 99, ph: 0, pt: 0 };
        r.tick = (dt, r) => {
          r.pt += dt;
          if (r.ph === 0) { this.vx *= 0.7; if (r.pt > 0.3) { r.ph = 1; r.pt = 0; } }
          else if (r.ph === 1) {
            this.vx = side * this.spd! * (d.spd || 4.4);
            if (r.pt > 0.95 || this.hitWall) {
              r.ph = 2; r.pt = 0; G.shake = Math.max(G.shake, 8);
              for (let i = 0; i < 2; i++) G.after(i * 0.45, () => { if (!E.dead) E.hz({ k: 'wall', x: x0, vx: side * 380, top: y - 34, bot: y, w: 40, life: 3.2, dmg: E.dmg * m * 0.7, c: K.c, fx: 'cart', sd: Math.random() * 99 }); });
            }
          } else { this.vx *= 0.8; if (r.pt > 0.9) r.busy = r.t!; }
          this.move(dt, world);
        };
        return r;
      }
      case 'snowball': {                                          // 눈사태 — 굴러오며 커지는 눈덩이(일찍 넘어야 한다)
        this.hz({ k: 'wave', x: this.cx + side * this.w / 2, y: this.y + this.h, vx: side * 230, w: 22, hh: 22, grow: 76, life: 4.6, dmg: this.dmg * m, c: K.c, fx: 'snowball', sd: Math.random() * 99 });
        return { busy: 1.0 };
      }
      case 'grapple': {                                           // 갈고리 덩굴 — 천장에 덩굴을 걸고 몸을 끌어당겨 방을 가로지른다
        const ax = p.cx + side * 220, ay = this.ceilY(ax, fy) ?? fy - 260;
        this.hz({ k: 'vine', ax, ay, life: 1.9, ref: this, nid: this.nid, c: K.c, sd: Math.random() * 99 });
        const r: Run = { busy: 99, ph: 0, pt: 0 };
        r.tick = (dt, r) => {
          r.pt += dt;
          if (r.ph === 0) { this.vx *= 0.8; this.move(dt, world); if (r.pt > 0.35) { r.ph = 1; r.pt = 0; } return; }
          if (r.ph === 1) {
            const a = angleTo(this.cx, this.cy, ax, ay + this.h * 0.6), sp = 780;
            this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
            this.move(dt, world, { gravMul: 0 });
            if (Math.hypot(this.cx - ax, this.cy - ay - this.h * 0.6) < 50 || r.pt > 1.0 || this.hitWall) { r.ph = 2; r.pt = 0; this.vy = 120; }
            return;
          }
          this.move(dt, world);
          if (r.pt > 0.7) r.busy = r.t!;
        };
        return r;
      }
      case 'garden': {                                            // 버섯 정원 — 4초 안에 밟아 터뜨리지 않은 버섯은 포자 구름이 된다
        for (let i = 0; i < 5; i++) {
          const x = p.cx + (i - 2) * 74 + (Math.random() - 0.5) * 20;
          this.hz({ k: 'shroom', x, y: this.floorY(x, p.y - TS * 2), life: 4.3, pop: 3.8, dmg: this.dmg * m * 0.1, burst: this.dmg * m * 0.5, c: K.c, id: nid(), sd: i });
        }
        return { busy: 1.0 };
      }
      case 'anchor': {                                            // 닻 사슬 — 닻을 박고 사슬을 당겨 그 자리로 날아든다
        const ax = p.cx + (Math.random() - 0.5) * 80, ay = this.floorY(ax, p.y - TS * 2);
        this.strike(ax, ay, { r: 46, delay: 0.8, fx: 'anchor', dir: 'arc' }, K, m);
        const r: Run = { busy: 99, ph: 0, pt: 0 };
        r.tick = (dt, r) => {
          r.pt += dt;
          if (r.ph === 0) {
            this.vx *= 0.8; this.move(dt, world);
            if (r.pt > 0.85) { r.ph = 1; r.pt = 0; this.hz({ k: 'chain', ax, ay: ay - 8, life: 1.0, dmg: this.dmg * m * 0.6, ref: this, nid: this.nid, c: K.c }); }
            return;
          }
          if (r.ph === 1) {
            const a = angleTo(this.cx, this.y + this.h, ax, ay);
            this.vx = Math.cos(a) * 820; this.vy = Math.sin(a) * 820 - 60;
            this.move(dt, world, { gravMul: 0 });
            if (Math.abs(this.cx - ax) < 40 || r.pt > 0.8 || this.hitWall) {
              r.ph = 2; r.pt = 0; this.vx = 0; G.shake = Math.max(G.shake, 10);
              for (const s of [-1, 1]) this.hz({ k: 'wave', x: this.cx + s * this.w / 2, y: this.floorY(this.cx, this.y), vx: s * 340, w: 26, hh: 30, life: 2.2, dmg: this.dmg * m * 0.6, c: K.c, fx: 'water', sd: Math.random() * 99 });
            }
            return;
          }
          this.move(dt, world);
          if (r.pt > 0.5) r.busy = r.t!;
        };
        return r;
      }
      case 'islet': {                                             // 섬 던지기 — 큰 땅덩이가 떨어져 조각으로 튄다
        const x = p.cx + p.vx * 0.3;
        this.strike(x, p.y + p.h, { r: 96, delay: 1.3, fx: 'boulder', dir: 'arc' }, K, m * 1.2);
        G.after(1.35, () => {
          if (E.dead) return;
          const y = E.floorY(x, p.y - TS * 2);
          for (let i = 0; i < 5; i++) {
            const tx = x + (i - 2) * 70 + (Math.random() - 0.5) * 20;
            E.strike(tx, y, { r: 34, delay: 0.7, fx: 'boulder', dir: 'arc', sx: x, sy: y - 50 }, K, m * 0.6);
          }
        });
        return { busy: 1.5 };
      }
      case 'flood': {                                             // 밀물 — 방에 물이 차오른다(높은 곳으로)
        this.hz({ k: 'flood', y: this.y + this.h, x: this.cx, depth: 104, life: 6.5, dmg: this.dmg * m * 0.12, c: K.c });
        return { busy: 1.2 };
      }
      case 'turrets': {                                           // 리벳 포탑 — 바닥에 작은 포탑 셋을 박는다
        for (const ox of [-230, -100, 170]) {
          const x = p.cx + ox + (Math.random() - 0.5) * 30;
          this.hz({ k: 'turret', x, y: this.floorY(x, p.y - TS * 2), life: 5.6, every: 0.95, next: 0.9, dmg: this.dmg * m * 0.45, c: K.c, sd: ox });
        }
        return { busy: 1.0 };
      }
      case 'pour': {                                              // 쇳물 붓기 — 머리 위 도가니가 기울어 쏟고, 쇳물이 바닥을 따라 흐른다
        const hepha = this.def.ai === 'b_hepha', x = hepha ? clamp(p.cx, this.cx - 480, this.cx + 480) : p.cx, top = Math.max(this.ceilY(x, fy) ?? -1e9, fy - 250) + 30;
        this.hz({ k: 'crucible', x, top, y: fy, life: 2.6, pour: 0.9, stop: 2.0, dmg: this.dmg * m * 0.5, c: K.c, arm: hepha ? (x < this.cx ? 0 : 1) : undefined });   // 헤파는 팔 끝 국자로 붓는다(game/boss-hepha-art)
        G.after(1.05, () => {
          if (E.dead) return;
          for (const s of [-1, 1]) E.hz({ k: 'wave', x: x + s * 16, y: fy, vx: s * 280, w: 30, hh: 18, life: 2.4, dmg: E.dmg * m * 0.6, c: K.c, fx: 'molten', sd: Math.random() * 99 });
          E.hz({ k: 'zone', x, y: fy, r: 50, life: 4, dmg: E.dmg * 0.1, burn: 1, c: K.c, fx: 'fire', sd: Math.random() * 99 });
        });
        return { busy: 1.4 };
      }
      case 'drones': {                                            // 점검 드론 — 훑는 빛에 걸리면 경보 · 미사일
        for (const s of [-1, 1]) this.hz({ k: 'drone', cx: p.cx + s * 150, y0: fy - 210, fy, life: 5.6, ph: s > 0 ? 0 : Math.PI, dmg: this.dmg * m * 0.6, c: K.c, id: nid() });
        return { busy: 1.0 };
      }
      case 'project': {                                           // 설계도 투영 — 다음 세 걸음을 설계선으로 먼저 보이고 그대로 벤다
        const pts = [[-1, 0], [0.3, -1], [1, 0]].map(([ax, ay]) => [p.cx + ax * 110, p.y + p.h + ay * 70]);
        pts.forEach((q, i) => {
          this.hz({ k: 'ghost', type: this.type, x: q[0], y: q[1], n: i + 1, life: 1.2 + i * 0.42 + 0.2, at: 1.0 + i * 0.42, c: K.c, flip: q[0] > p.cx });
          G.after(1.0 + i * 0.42, () => {
            if (E.dead) return;
            E.x = clamp(q[0] - E.w / 2, TS * 2, G.world.dims.WW * TS - TS * 3); E.y = q[1] - E.h; E.vx = E.vy = 0;
            E.hz({ k: 'strike', x: q[0], y: q[1], r: 92, shape: 'circle', delay: 0.22, life: 0.6, dmg: E.dmg * m, c: K.c, fx: 'slash', sd: Math.random() * 99 });
          });
        });
        return { busy: 2.3 };
      }
      case 'veins': {                                             // 광맥 폭발 — 둘레 바위의 광맥이 빛나다 터진다
        for (let i = 0; i < 7; i++) {
          const x = p.cx + (Math.random() - 0.5) * 520;
          G.after(i * 0.1, () => { if (!E.dead) E.strike(x, p.y + p.h, { r: 52, delay: 1.4, fx: 'ore', dir: 'up' }, K, m); });
        }
        return { busy: 1.2 };
      }
    }
    return { busy: 0.3 };
  },
};

mixin(Enemy.prototype, BossSignature, true);

/* ===== game/rigs.js — 채취탑 · 굴뚝 연기 ===== */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { RIG } from '../data/ruins.js';
import { SESSIONS } from '../data/story.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { makeItem } from '../items.js';
import { Drop } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RigsPart: Bag = {

  /* ================= 채취탑 — 세션 2 에 다시 도는 대형 기계 ================= */
  /* 자리는 world.placeRigs 가 골라 object(type 'rig')로 저장한다 — 여기는 그림·쿵·해체만. */
  RIG_THUD: 4.6,            // 쿵 간격(초)
  RIG_NEAR: 5 * 22,         // 쿵이 들리는 거리(px) — 탑 바로 밑
  /* 그림 배율. */
  RIG_SCALE: 0.66,
  RIG_TOP: 256,             // 굴뚝 꼭대기(배율 1일 때 y)

  /** 서 있는 채취탑들(해체한 것은 빼고). */
  rigs() {
    const w = this.world;
    if (!w) return [];
    if (!this._rigs) this._rigs = w.objects.filter(o => o.type === 'rig');
    return this._rigs.filter(o => !o.gone);
  },

  /** 채취탑 해체 — 세션 2(공창)가 끝난 뒤에만. 부품(RIG.parts)이 쏟아지고 탑은 사라진다. */
  useRig(o) {
    const done = this.chapter >= SESSIONS[2].ch0;
    if (!done) {
      UI.openLore(tr('채취탑'), this.rigOn(o)
        ? [tr('공창의 채취탑이 아직 땅을 두드리고 있다. 다리 하나가 사람 몸통보다 굵다.'), tr('공창이 멈추기 전에는 손댈 엄두가 안 난다.')]
        : [tr('녹슨 채취탑이다. 리벳 틈마다 재가 쌓여 있다.'), tr('누가 세웠는지 아무도 모른다 — 뜯어낼 수 있는 때가 오면 쓸 만한 부품이 많아 보인다.')], []);
      this.sfx('open');
      return;
    }
    UI.openLore(tr('멈춘 채취탑'), [tr('공창이 멈춘 뒤로 이 탑도 더는 돌지 않는다.'), tr('볼트를 풀면 강철판과 톱니, 모터까지 건질 수 있겠다.')], [{
      t: tr('채취탑을 해체한다'), fn: () => {
        UI.closeDialogue();
        o.gone = 1;
        const cx = o.tx * TS + TS / 2, cy = (o.ty - 3) * TS;
        for (const [id, n] of RIG.parts) this.drops.push(new Drop(cx + (Math.random() - 0.5) * 60, cy, makeItem(id, n)));
        this.matBurst('metal', cx, cy, 30, { spd: 1.4 });
        this.shake = 10;
        this.sfx('break_machine');
        this.toast(tr('채취탑을 해체했다 — 부품이 쏟아졌다'), 'good');
      }
    }]);
    this.sfx('open');
  },

  /** 이 탑이 지금 도는가. */
  rigOn(r) { return this.chapter >= r.wake; },

  updateRigs(dt) {
    const p = this.player;
    if (!p || this.chapter < 9) return;
    for (const r of this.rigs()) {
      if (!this.rigOn(r)) continue;
      const dx = r.tx * TS + TS / 2 - p.cx, dy = r.ty * TS - p.cy;
      if (Math.abs(dx) > this.RIG_NEAR || Math.abs(dy) > this.RIG_NEAR * 1.4) { r.thud = 0; continue; }
      r.thud = (r.thud || 0) + dt;
      if (r.thud >= this.RIG_THUD) {
        r.thud = 0;
        this.shake = Math.max(this.shake, 2);     // 전투 타격(18)의 1/9 — 있는 줄만 알 정도
        this.sfxAt('drill', r.tx, r.ty);
      }
    }
  },

  SMOKE_EVERY: 0.42,        // 굴뚝 하나가 한 덩이를 뱉는 간격(초)
  SMOKE_MAX: 80,            // 동시에 살아 있는 덩이 수 상한
  SMOKE_RISE: 30,           // 오르는 속도(px/초)
  SMOKE_VENT_X: 15,         // 굴뚝 가운데 — 용광로 그림(44×44) 안의 자리
  SMOKE_VENT_Y: 6,          // 굴뚝 꼭대기

  /** 이 자리 위로 막힌 칸까지 몇 px인가. */
  smokeCeil(x, y) { const { WW } = dimsOf(this.world);
    const w = this.world;
    const tx = clamp(Math.floor(x / TS), 0, WW - 1);
    const y0 = Math.floor(y / TS);
    for (let d = 1; d <= 10; d++) {
      const ty = y0 - d;
      if (ty < 0) return null;
      if (w.solid(tx, ty)) return y - (ty + 1) * TS;
    }
    return null;
  },

  updateSmoke(dt) { const { WW } = dimsOf(this.world);
    const w = this.world, p = this.player;
    if (!w || !p) return;
    if (!this.smokes) this.smokes = [];
    this.smokeT = (this.smokeT || 0) + dt;
    if (this.smokeT >= this.SMOKE_EVERY) {
      this.smokeT = 0;
      const rx = this.W * 0.7 + 90, ry = this.H * 0.7 + 90;
      /* 연기를 뿜는 것 = 용광로 + 도는 채취탑. */
      const vents = [];
      for (const o of w.objects)
        if (o.type === 'forge') vents.push([o.x + this.SMOKE_VENT_X, o.y + this.SMOKE_VENT_Y]);
      for (const r of this.rigs())
        if (this.rigOn(r)) vents.push([r.tx * TS + TS / 2 + 17 * this.RIG_SCALE,
                                       r.ty * TS - this.RIG_TOP * this.RIG_SCALE]);
      for (const [vx, vy] of vents) {
        if (Math.abs(vx - p.cx) > rx || Math.abs(vy - p.cy) > ry) continue;
        if (this.smokes.length >= this.SMOKE_MAX) break;
        /* 위에 천장이 있으면 **닿을 만큼은 살게** 한다. */
        const gap = this.smokeCeil(vx, vy);
        const dur = gap === null ? 3.6 + Math.random() * 1.4
                                 : Math.min(9, gap / this.SMOKE_RISE + 1.4 + Math.random() * 0.5);
        this.smokes.push({
          x: vx + (Math.random() - 0.5) * 3, y: vy,
          t: 0, dur,
          sway: Math.random() * TAU, sz: 10 + Math.random() * 3, stuck: 0
        });
      }
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.t += dt;
      if (s.t >= s.dur) { this.smokes.splice(i, 1); continue; }
      if (s.stuck) {
        // 천장에 닿았다 — 옆으로 번지며 사그라든다
        s.x += (s.sway < Math.PI ? 1 : -1) * 13 * dt;
      } else {
        const ny = s.y - this.SMOKE_RISE * dt;
        const tx = clamp(Math.floor(s.x / TS), 0, WW - 1);
        const ty = Math.floor((ny - s.sz * 0.4) / TS);
        if (ty >= 0 && w.solid(tx, ty)) { s.stuck = 1; s.y = (ty + 1) * TS + s.sz * 0.4; }
        else { s.y = ny; s.x += Math.sin(s.sway + s.t * 1.6) * 8 * dt; }
      }
    }
  },

  /** 채취탑 한 대. */
  drawRig(c, x, y, on, ph) {
    const dim = (hex, k) => {
      const n = parseInt(hex.slice(1), 16);
      const f = (v) => Math.round(v * k);
      return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`;
    };
    const k = on ? 1 : 0.52;          // 죽은 것은 같은 색을 어둡게 — 검게 칠하면 실루엣이 된다
    const DARK = dim('#39414a', k), MID = dim('#5a6470', k), LITE = dim('#7c8794', k);
    const RIVET = dim('#b9c4d0', k);

    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(this.RIG_SCALE, this.RIG_SCALE);   // 아래 좌표는 배율 1 기준 — RIG_SCALE 참고

    // 다리 넷 — 바깥 둘은 굵게, 안쪽 둘은 가늘게.
    c.strokeStyle = DARK; c.lineCap = 'butt';
    for (const [bx, tx2, wdt] of [[-42, -15, 8], [42, 15, 8], [-22, -9, 4], [22, 9, 4]]) {
      c.lineWidth = wdt;
      c.beginPath(); c.moveTo(bx, 4); c.lineTo(tx2, -118); c.stroke();
    }
    c.lineWidth = 3;                  // 가새 — 다리 사이 X 자
    for (const yy of [-34, -76]) {
      const s = 1 - (yy + 118) / 118 * 0.0;
      c.beginPath();
      c.moveTo(-40 * s * 0.72, yy - 16); c.lineTo(40 * s * 0.72, yy + 16);
      c.moveTo(40 * s * 0.72, yy - 16); c.lineTo(-40 * s * 0.72, yy + 16);
      c.stroke();
    }

    // 몸통 — 리벳 박은 통
    c.fillStyle = MID; c.fillRect(-30, -190, 60, 72);
    c.fillStyle = LITE; c.fillRect(-30, -190, 60, 10);
    c.fillStyle = DARK; c.fillRect(-30, -130, 60, 12);
    c.fillStyle = RIVET;
    for (let ry = -184; ry < -124; ry += 14)
      for (let rx = -25; rx <= 25; rx += 10) c.fillRect(rx, ry, 2, 2);

    // 굴뚝
    c.fillStyle = DARK; c.fillRect(8, -252, 18, 64);
    c.fillStyle = MID; c.fillRect(6, -256, 22, 7);

    // 등 — 꺼져 있으면 그냥 렌즈, 켜지면 맥이 뛴다
    const lx = 20, ly = -150;
    c.fillStyle = DARK; c.fillRect(lx - 7, ly - 7, 14, 14);
    if (on) {
      const a = 0.55 + Math.sin(ph * 1.7) * 0.3;
      c.save();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
      const g = c.createRadialGradient(lx, ly, 0, lx, ly, 26);
      g.addColorStop(0, '#ffc878'); g.addColorStop(0.4, '#e07a1e'); g.addColorStop(1, '#e07a1e00');
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 26, 0, TAU); c.fill();
      c.restore();
      c.fillStyle = '#ffd9a0'; c.fillRect(lx - 3, ly - 3, 6, 6);
    } else {
      c.fillStyle = dim('#6a5a48', k); c.fillRect(lx - 3, ly - 3, 6, 6);
    }
    c.restore();
  },

  drawRigs(c, camX, camY) {
    const rs = this.rigs();
    if (!rs.length) return;
    for (const r of rs) {
      const x = r.tx * TS + TS / 2 - camX, y = r.ty * TS - camY;
      if (x < -140 || x > this.W + 140 || y < -60 || y > this.H + 300) continue;
      this.drawRig(c, x, y, this.rigOn(r), this.time + r.tx * 0.37);
    }
  },

  drawSmoke(c, camX, camY) {
    if (!this.smokes || !this.smokes.length) return;
    for (const s of this.smokes) {
      const k = clamp(s.t / s.dur, 0, 1);
      const fr = Math.min(5, Math.floor(k * 6));
      const sz = s.sz * (1 + k * 1.6) * (s.stuck ? 1.3 : 1);
      const x = s.x - camX - sz / 2, y = s.y - camY - sz / 2;
      if (x < -sz || y < -sz || x > this.W || y > this.H) continue;
      c.globalAlpha = Math.min(1, (1 - k) * 1.7) * 0.86;
      if (!(this.spritesOn && Sprites.drawFx(c, 'smoke_forge', fr, x, y, sz))) {
        // 그림이 없으면 — 네모 한 장으로라도 연기가 오르는 것은 보이게 한다
        c.fillStyle = '#2c2722';
        c.fillRect(Math.round(x + sz * 0.2), Math.round(y + sz * 0.2), Math.round(sz * 0.6), Math.round(sz * 0.6));
      }
    }
    c.globalAlpha = 1;
  },
};

mixin(Game.prototype, RigsPart, true);

/* ===== game/meteor.js — 운석 ===== */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { RNG } from '../../engine/core/rng.js';
import { tr } from '../lang.js';
import { DEEP_Y, SY, WW } from '../size.js';
import { MACH_OF_TILE, T, TILE_DEF } from '../data.js';
import { CAVE_TYPES, FAULT } from '../data/ruins.js';
import { TS, inSeaZone } from '../world.js';
import { Sprites } from '../sprites.js';
import { Enemy, Part } from '../entity.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const MeteorPart: Bag = {

  /* ================= 운석 ================= */
  METEOR: { chance: 0.0018, fall: 5.2, fg: 1.2, rMin: 5, rMax: 8 },

  /** 떨어져도 되는 자리인가 — 구덩이 상자(좌우 R+3, 위 18 · 아래 R+2) 안에 지은 것이 하나도 없어야 한다 */
  meteorSiteOk(cx, R) {
    const w = this.world;
    if (cx < 40 || cx > WW - 40 || inSeaZone(cx)) return false;
    const cy = w.surface[cx];
    const x0 = cx - R - 3, x1 = cx + R + 3, y0 = cy - 18, y1 = cy + R + 2;
    if (w.giantTree && x1 >= w.giantTree.x - 24 && x0 <= w.giantTree.x + 24) return false;
    const built = new Set([T.PLANK, T.BRICK, T.PLATFORM, T.TORCH, T.RUINBRICK, T.RUINTILE, T.ALTARSTONE]);
    for (let x = x0; x <= x1; x++) {
      if (Math.abs(w.surface[clamp(x, 0, WW - 1)] - cy) > R + 4) return false;     // 절벽 가장자리는 피한다
      for (let y = y0; y <= y1; y++) {
        const z = w.zoneAt(x, y);
        if (z === 'village' || z === 'camp' || z === 'citadel' || z === 'deepshaft') return false;
        if (w.ruinAt(x, y)) return false;
        const t = w.get(x, y);
        if (built.has(t) || MACH_OF_TILE[t] || TILE_DEF[t].liquid) return false;
        if (y < w.surface[clamp(x, 0, WW - 1)] && w.walls[w.i(x, y)]) return false;   // 땅 위의 벽 = 누가 지은 집
        if (w.machines && w.machines.has(y * WW + x)) return false;
      }
    }
    const bx0 = x0 * TS, bx1 = (x1 + 1) * TS, by0 = y0 * TS, by1 = (y1 + 1) * TS;
    for (const o of w.objects) if (o.x < bx1 && o.x + (o.w || TS) > bx0 && o.y < by1 && o.y + (o.h || TS) > by0) return false;
    return true;
  },

  /** 운석을 띄운다. */
  startMeteor(at) {
    if (this.meteor) return false;
    const w = this.world, M = this.METEOR;
    let x = -1, R = M.rMin + Math.floor(Math.random() * (M.rMax - M.rMin + 1));
    if (at !== undefined) x = clamp(Math.round(at), 40, WW - 40);
    else for (let i = 0; i < 400 && x < 0; i++) {
      const c = 40 + Math.floor(Math.random() * (WW - 80));
      if (this.meteorSiteOk(c, R)) x = c;
    }
    if (x < 0) return false;                                  // 떨어질 데가 없다 — 이번엔 지나간다
    const p = this.player, pd = x - Math.floor(p.cx / TS);
    this.meteor = { t: 0, x, y: w.surface[x], R, dir: pd >= 0 ? 1 : -1, hit: false, quake: 0, amp: 0 };
    this.toast(tr('☄ 하늘을 가르는 불덩이 — 운석이 떨어진다!'), 'bad');
    this.sfx('boss');
    return true;
  },

  updateMeteor(dt) {
    const m = this.meteor, M = this.METEOR;
    m.t += dt;
    if (!m.hit && m.t >= M.fall) this.meteorImpact();
    if (m.hit) {
      /* 지진 — 떨어진 곳과의 거리로 세기(amp)와 길이(quake)가 갈린다. */
      if (m.quake > 0) {
        m.quake -= dt;
        this.shake = Math.max(this.shake, m.amp * clamp(m.quake / m.quakeMax, 0.25, 1));
      }
      if (m.t > M.fall + Math.max(4, m.quakeMax || 0)) this.meteor = null;
    }
  },

  meteorImpact() {
    const m = this.meteor, w = this.world, p = this.player;
    m.hit = true;
    const cx = m.x, cy = m.y, R = m.R;
    const ptx = p.cx / TS, pty = p.cy / TS;
    const dist = Math.hypot(ptx - (cx + 0.5), pty - cy);
    /* 세기: 바로 곁 34 → 400칸 너머 3. */
    const near = clamp(1 - dist / 420, 0, 1);
    m.amp = 3 + 31 * near * near; m.quakeMax = m.quake = 1 + 3 * near;
    this.shake = Math.max(this.shake, m.amp);
    this.sfx('boom_big', 0.7, 0.4 + 0.6 * near);
    this.sfx('sk_quake', 1, 0.3 + 0.7 * near);
    this.carveCrater(cx, cy, R);
    // 불티·흙
    if (dist < 80) for (let i = 0; i < 90; i++) {
      const c = i % 3 ? (i % 2 ? '#ffb24a' : '#ff6a2a') : '#6a5a48';
      this.parts.push(new Part((cx + 0.5) * TS + (Math.random() - 0.5) * R * TS, cy * TS, c, -260 - Math.random() * 260, 0.9 + Math.random() * 0.9,
        { glow: i % 3 ? 1 : 0, spd: 2.2, g: i % 3 ? 0.4 : 1.2, sq: i % 3 ? 0 : 1 }));
    }
    // 폭발 반경 안의 생물 — 주인은 버틴다(보스가 돌에 맞아 죽으면 이야기가 끊긴다)
    const bx = (cx + 0.5) * TS, by = cy * TS, br = (R + 2) * TS;
    for (const e of this.ents) {
      if (e.dead || e.boss) continue;
      // die() 는 경험치·금화를 준다 — 하늘이 잡은 것까지 플레이어 몫으로 치면 안 된다
      if (Math.hypot(e.cx - bx, e.cy - by) < br) { e.hp = 0; e.dead = true; }
    }
    // ★ 머리 위면 즉사 — 판정 상자가 폭발 원(R+1칸)에 닿으면.
    const qx = clamp(bx, p.x, p.x + p.w), qy = clamp(by, p.y, p.y + p.h);
    if (Math.hypot(qx - bx, qy - by) < (R + 1) * TS && this.state === 'play') {
      p.hp = 0;
      this.toast(tr('☄ 운석에 맞았다.'), 'bad');
      this.onDeath('meteor');
      return;
    }
    const dx = cx - Math.floor(ptx);
    const where = dist < 40 ? tr('바로 곁에') : tr('{v}으로 {dx}칸 떨어진 곳에', { v: dx >= 0 ? tr('동쪽') : tr('서쪽'), dx: Math.abs(dx) });
    this.toast(tr('☄ 운석이 {where} 떨어졌다. 땅이 울린다.', { where }), 'bad');
  },

  /** 운석 구덩이 — 있는 타일로만. */
  carveCrater(cx, cy, R) {
    const w = this.world;
    for (let dx = -R - 3; dx <= R + 3; dx++) {
      const x = cx + dx;
      if (x < 1 || x >= WW - 1) continue;
      // 위의 나무·잎·풀·덩굴은 날아간다(안 떨구면 구덩이 위에 수관이 뜬다)
      for (let y = cy - 24; y <= cy + R; y++) {
        const t = w.get(x, y), d = TILE_DEF[t];
        if (t !== T.AIR && (d.tree || d.leaf || d.plant || t === T.VINE || t === T.FLOWER || t === T.WEED)) w.set(x, y, T.AIR);
      }
      if (Math.abs(dx) <= R) {
        const depth = Math.round(Math.sqrt(R * R - dx * dx) * 0.75);
        const top = w.surface[x], bot = cy + depth;
        for (let y = Math.min(top, cy) - 2; y <= bot; y++) {
          if (w.get(x, y) === T.BEDROCK) continue;
          w.set(x, y, T.AIR); w.setWall(x, y, 0);                 // 벽도 걷는다 — 하늘이 트여야 햇빛이 든다
        }
        // 바닥 — 가운데(반지름의 7할)는 열에 녹아 굳은 돌, 바깥은 재
        const skin = Math.abs(dx) <= R * 0.7 ? T.FUSEDROCK : T.ASH;
        if (w.solid(x, bot + 1) && w.get(x, bot + 1) !== T.BEDROCK) w.set(x, bot + 1, skin);
        if (w.solid(x, bot + 2) && w.get(x, bot + 2) !== T.BEDROCK && Math.random() < 0.5) w.set(x, bot + 2, skin);
        w.surface[x] = bot + 1;
      } else if (Math.abs(dx) <= R + 2) {
        // 테두리 — 튀어나간 흙이 한 칸 쌓인다
        const s = w.surface[x];
        if (w.get(x, s - 1) === T.AIR) { w.set(x, s - 1, T.DIRT); w.surface[x] = s - 1; }
      }
    }
    this.placeMeteorite(cx, cy, R);
  },

  /** 구덩이 한가운데에 운석 덩이를 반쯤 묻고, 그 둘레 바닥에 별빛 수정을 틔운다. */
  placeMeteorite(cx, cy, R) {
    const w = this.world;
    const floor = cy + Math.round(R * 0.75) + 1;            // 가운데 칸의 바닥(첫 고체) 높이
    const rows = R >= 7 ? [1, 2, 1] : [0, 1, 1], rx = R >= 7 ? 2 : 1;
    rows.forEach((hw, k) => {
      const y = floor - 1 + k;
      for (let dx = -hw; dx <= hw; dx++) {
        const x = cx + dx;
        if (w.get(x, y) === T.BEDROCK) continue;
        w.set(x, y, T.METEORITE); w.setWall(x, y, 0);
        if (y < w.surface[x]) w.surface[x] = y;
      }
    });
    // 수정 — 덩이 둘레(덩이 폭 + 4칸)의 바닥에 드문드문.
    const spots = [];
    for (let dx = -rx - 4; dx <= rx + 4; dx++) {
      const x = cx + dx, s = w.surface[x];
      if (w.get(x, s - 1) === T.AIR && w.solid(x, s)) spots.push(x);
    }
    let n = 0;
    for (const x of spots) if (Math.random() < 0.4) { w.set(x, w.surface[x] - 1, T.STARCRYSTAL); n++; }
    for (let k = 0; n < 2 && k < spots.length; k++) {
      const x = spots[(k * 5 + 3) % spots.length];
      if (w.get(x, w.surface[x] - 1) === T.AIR) { w.set(x, w.surface[x] - 1, T.STARCRYSTAL); n++; }
    }
  },

  /** 하늘 원경의 불덩이 — drawSky 가 부른다(땅 위 하늘을 그릴 때만). */
  drawMeteorSky(c, camY) {
    const m = this.meteor;
    if (!m) return;
    const M = this.METEOR;
    if (!m.hit) {
      const u = clamp(m.t / M.fall, 0, 1);
      const hx = this.W * (0.5 - m.dir * 0.42 + m.dir * 0.8 * u), hy = this.H * (0.04 + 0.62 * Math.pow(u, 1.3)) - camY * 0.05;
      const L = 90 + 240 * u, ang = Math.atan2(0.62 * this.H, m.dir * 0.8 * this.W);
      const tx = hx - Math.cos(ang) * L, ty = hy - Math.sin(ang) * L;
      /* 구운 그림(tools/mksky.py sky_meteor — 흰 머리 · 녹청빛 가장자리 · 노랑→붉은 꼬리 · 불티)을 나아가는 쪽으로 돌려 그린다. */
      const im = Sprites.img.sky_meteor;
      if (im && im.width) {
        const k = 1.0 + 1.4 * u;                                     // 낮 하늘에서도 읽히게 — 0.55+0.9u 는 한낮에 거의 안 보였다
        c.save();
        c.translate(hx, hy); c.rotate(ang);
        c.drawImage(im, -242 * k, -24 * k, 256 * k, 48 * k);
        c.globalCompositeOperation = 'lighter';                    // 머리의 섬광만 더한다(밤하늘에서 빛나게)
        const hg = c.createRadialGradient(0, 0, 0, 0, 0, 14 * k);
        hg.addColorStop(0, 'rgba(255,245,220,.55)'); hg.addColorStop(1, 'rgba(255,200,120,0)');
        c.fillStyle = hg; c.beginPath(); c.arc(0, 0, 14 * k, 0, TAU); c.fill();
        c.restore();
        return;
      }
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, 'rgba(255,120,60,0)'); g.addColorStop(0.7, 'rgba(255,150,70,.45)'); g.addColorStop(1, 'rgba(255,230,170,.95)');
      c.strokeStyle = g; c.lineWidth = 3 + 4 * u; c.lineCap = 'round';
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
      const r = 5 + 7 * u, hg = c.createRadialGradient(hx, hy, 0, hx, hy, r * 3.5);
      hg.addColorStop(0, 'rgba(255,250,220,1)'); hg.addColorStop(0.3, 'rgba(255,190,100,.8)'); hg.addColorStop(1, 'rgba(255,120,60,0)');
      c.fillStyle = hg; c.beginPath(); c.arc(hx, hy, r * 3.5, 0, TAU); c.fill();
      c.restore();
    } else {
      // 떨어진 뒤 — 지평선이 잠깐 달아오른다(멀리 떨어졌어도 어디쯤인지 보이게)
      const k = clamp(1 - (m.t - M.fall) / 2.5, 0, 1);
      if (k > 0) {
        const hx = this.W * (0.5 + m.dir * 0.38), hy = this.H * 0.7 - camY * 0.05;
        const hg = c.createRadialGradient(hx, hy, 0, hx, hy, this.W * 0.35);
        hg.addColorStop(0, `rgba(255,170,90,${0.55 * k})`); hg.addColorStop(1, 'rgba(255,120,60,0)');
        c.fillStyle = hg; c.fillRect(0, 0, this.W, this.H);
      }
    }
  },

  /** 가까이 떨어질 때 — 마지막 fg 초 동안 **세계 앞**으로 불덩이가 내리꽂힌다(화면 안이거나 곁이면) */
  drawMeteorNear(c, camX, camY) {
    const m = this.meteor;
    if (!m) return;
    const M = this.METEOR, ix = (m.x + 0.5) * TS, iy = m.y * TS;
    if (m.hit) {
      const k = clamp(1 - (m.t - M.fall) / 0.35, 0, 1);          // 떨어진 순간의 섬광
      if (k > 0 && Math.abs(ix - camX - this.W / 2) < this.W) {
        c.save(); c.globalAlpha = 0.8 * k; c.fillStyle = '#fff4d8'; c.fillRect(0, 0, this.W, this.H); c.restore();
      }
      return;
    }
    const left = M.fall - m.t;
    if (left > M.fg || Math.abs(ix - camX - this.W / 2) > this.W * 1.2) return;
    const u = 1 - left / M.fg;
    const sx = ix - m.dir * 420 * (1 - u) - camX, sy = iy - 900 * (1 - u) - camY;
    /* 구운 그림(sky_meteor_near — 울퉁불퉁한 바위 · 달아오른 앞면 · 불꼬리 · 연기). */
    const nim = Sprites.img.sky_meteor_near;
    if (nim && nim.width) {
      c.save();
      c.translate(sx, sy); c.rotate(Math.atan2(900, m.dir * 420));
      c.drawImage(nim, -286, -56, 320, 112);
      c.restore();
      return;
    }
    const tx = sx - m.dir * 120, ty = sy - 260;
    c.save();                                      // 보통 합성 — 밝은 낮 하늘에 lighter 로 더하면 하얗게 날아간다
    const g = c.createLinearGradient(tx, ty, sx, sy);
    /* ★ 한가운데까지 흰색으로 두고 lighter 로 더했더니 낮 하늘과 합쳐져 **흰 원반**만 보였다(스크린샷). */
    g.addColorStop(0, 'rgba(255,90,30,0)'); g.addColorStop(0.6, 'rgba(255,120,40,.5)'); g.addColorStop(1, 'rgba(255,190,90,.85)');
    c.strokeStyle = g; c.lineWidth = 14; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(sx, sy); c.stroke();
    const hg = c.createRadialGradient(sx, sy, 0, sx, sy, 34);
    hg.addColorStop(0, 'rgba(255,220,150,.9)'); hg.addColorStop(0.3, 'rgba(255,130,50,.7)'); hg.addColorStop(1, 'rgba(200,60,20,0)');
    c.fillStyle = hg; c.beginPath(); c.arc(sx, sy, 34, 0, TAU); c.fill();
    c.restore();
    c.fillStyle = '#3a2a22'; c.beginPath(); c.arc(sx, sy, 9, 0, TAU); c.fill();      // 돌덩이
  },

  /** 금 간 자갈을 깼다 — 곡괭이든 폭탄이든. */
  triggerFault(tx, ty) {
    const w = this.world;
    if (this.quake) return;                  // 이미 울리는 중 — 남은 자갈은 다음에 캐면 무너진다
    /* 무너질 칸 = 깬 칸에 **맞닿아 이어진 자갈 전부**. 세계가 굴 자리 전체를 자갈로 채워 두므로 (world.js buildFaults 의 ★) 덩어리 어디를 캐도 같은 굴이
       열린다. */
    const cells = [], seen = new Set([ty * WW + tx]), st = [[tx, ty]];
    while (st.length && cells.length < 6000) {
      const [x, y] = st.pop();
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = ny * WW + nx;
        if (seen.has(k) || w.get(nx, ny) !== T.FAULTSTONE) continue;
        seen.add(k); cells.push([nx, ny]); st.push([nx, ny]);
      }
    }
    let f = (w.faults || []).find(q => !q.done && Math.abs(q.cx - tx) <= FAULT.rx + 8 && Math.abs(q.cy - ty) <= FAULT.ry + 8);
    // 자갈 한 칸만 박혀 있던 v7 첫 판 세계 — 그때처럼 씨앗에서 굴 모양을 뽑는다
    const old = !cells.length && !!f;
    if (old) cells.push(...w.faultCells(f));
    if (!cells.length) return;
    if (!f) f = { x: tx, y: ty, dir: 1, cx: tx, cy: ty, seed: tx * 9973 + ty * 31 };
    f.done = 1;
    cells.sort((a, b) => Math.hypot(a[0] - tx, a[1] - ty) - Math.hypot(b[0] - tx, b[1] - ty));
    this.quake = { f, cells, t: 0, i: 0, old };
    this.toast(tr('자갈이 무너지자 땅이 울린다 — 물러서라!'), 'bad');
    this.shake = 22;
    this.sfx('sk_quake');
  },
  /* 지진 — 2.6초 동안 흔들리며 새 굴을 차례로 판다(한 번에 파면 화면이 한 프레임에 뒤바뀐다). */
  updateQuake(dt) {
    const q = this.quake, w = this.world, p = this.player;
    q.t += dt;
    this.shake = Math.max(this.shake || 0, q.t < 2.2 ? 9 : 3);
    const want = Math.floor(q.cells.length * clamp((q.t - 0.4) / 1.8, 0, 1));
    for (; q.i < want; q.i++) {
      const [x, y] = q.cells[q.i];
      const t = w.get(x, y);
      if (t !== T.FAULTSTONE && !(q.old && w.solid(x, y))) continue;   // 그새 다른 것이 된 칸은 두고
      if (t === T.BEDROCK || MACH_OF_TILE[t]) continue;           // 기계 칸을 지우면 속이 빈 유령 기계가 남는다
      w.set(x, y, T.AIR);
      if (Math.random() < 0.05) this.parts.push(new Part((x + .5) * TS, (y + .5) * TS, '#7a7266', 20, 1));
    }
    q.rockT = (q.rockT || 0) - dt;
    if (q.t < 2.2 && q.rockT <= 0) {
      q.rockT = 0.35;
      const x = Math.floor(p.cx / TS) + Math.floor(Math.random() * 13) - 6;
      let y = Math.floor(p.cy / TS) - 2;
      while (y > Math.floor(p.cy / TS) - 14 && !w.solid(x, y - 1)) y--;
      this.rocks.push({ x: (x + .5) * TS, y: (y + .5) * TS, vy: 0, t: 0.25, dmg: 10 + p.level * 0.6 });
    }
    if (q.t < 2.6 || q.i < q.cells.length) return;
    this.quake = null;
    const f = q.f;
    const k = w.dressFault(f, q.cells);
    const C = CAVE_TYPES[k];
    // 상자 — 새 굴 한가운데에 가까운 바닥에.
    const floors = q.cells.filter(([x, y]) => w.get(x, y) === T.AIR && w.solid(x, y + 1) && w.get(x, y - 1) === T.AIR);
    floors.sort((a, b) => Math.hypot(a[0] - f.cx, a[1] - f.cy) - Math.hypot(b[0] - f.cx, b[1] - f.cy));
    /* 상자는 **드물게**(열에 셋) — 무너진 굴마다 상자가 있으면 자갈을 보자마자 캐는 것이 곧 정답이 된다. */
    const chestRng = new RNG(f.seed + 13);
    if (floors.length && chestRng.chance(0.3)) {
      const [gx, gy] = floors[0];
      const tier = gy < SY(180) ? 3 : gy < DEEP_Y ? 4 : 5;
      w.objects.push({ type: 'chest', tier, x: gx * TS, y: (gy - 0.2) * TS, w: 30, h: 26, items: null });
    }
    // 굴에 살던 것들 — 셋, 플레이어에게서 떨어진 바닥에
    const pool = f.y > DEEP_Y ? ['skeleton', 'spider'] : ['bat', 'spider'];
    let made = 0;
    for (const [x, y] of floors.slice().reverse()) {
      if (made >= 3) break;
      if (Math.abs(x * TS - p.cx) < 8 * TS) continue;
      const e = new Enemy(pool[made % pool.length], x * TS, y * TS, this.scale());
      e.y = (y + 1) * TS - e.h;
      this.ents.push(e); made++;
    }
    this.tally = this.tally || {};
    this.tally.faults = (this.tally.faults || 0) + 1;
    this.toast(tr('무너진 벽 너머에 {C|이} 숨어 있었다', { C: C.n }), 'good');
    this.sfx('chapter');
    this.checkAch();
  },

  /** 동굴 쪽 그리기 — 떨어지는 돌(흔들리는 동안은 제자리에서 떤다)과 독기 굴의 탁한 공기 */
  drawCaves(c, camX, camY) {
    for (const r of (this.rocks || [])) {
      const jx = r.t > 0 ? (Math.random() - .5) * 3 : 0;
      const sx = r.x - camX + jx, sy = r.y - camY;
      if (sx < -30 || sx > this.W + 30 || sy < -30 || sy > this.H + 30) continue;
      c.fillStyle = r.kind === 'drip' ? '#9a9488' : '#6a6258';
      c.beginPath();
      if (r.kind === 'drip') { c.moveTo(sx - 7, sy - 10); c.lineTo(sx + 7, sy - 10); c.lineTo(sx, sy + 11); }
      else { c.moveTo(sx - 7, sy - 4); c.lineTo(sx - 2, sy - 8); c.lineTo(sx + 7, sy - 3); c.lineTo(sx + 5, sy + 6); c.lineTo(sx - 5, sy + 7); }
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(sx - 4, sy - 7, 2, 7);
    }
    if (this.caveHere && CAVE_TYPES[this.caveHere].id === 'fume') {
      c.save();
      c.globalAlpha = 0.16 + Math.sin((this.time || 0) * 1.3) * 0.03;
      c.fillStyle = '#9aa84a';
      c.fillRect(0, 0, this.W, this.H);
      c.restore();
    }
  },
};
mixin(G, MeteorPart);

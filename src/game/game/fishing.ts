/* ===== game/fishing.js — 낚시 ===== */
import { TAU, clamp, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { TILE_DEF } from '../data.js';
import { ITEMS } from '../data/items.js';
import { PROF_MAX } from '../data/skills.js';
import { sessionOf } from '../data/story.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { isGear, itemName, makeItem, rollGear } from '../items.js';
import { Drop, Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const FishingPart: Bag = {

  /* ================= 낚시 ================= */
  tryFish() {
    const p = this.player, w = this.world;
    const rod = idef(p.held());
    if (p.fish) {
      // 이미 드리운 줄 — 입질 중이면 즉시 챔질(보너스), 대기 중이면 거둔다
      if (p.fish.biting) { this.resolveFish('reel'); }
      else { this.fishSplash(p.fish, 3); p.fish = null; this.toast(tr('낚싯줄을 거두었다')); }
      return;
    }
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast(tr('너무 멀다'), 'bad'); return; }
    const t = w.get(tx, ty);
    // 타일 번호를 하나씩 세지 않고 liquid 표시로 본다 — 바닷물·수련칸이 늘 때마다 빠뜨렸다
    if (!TILE_DEF[t].liquid) { this.toast(tr('물 위에 던져야 한다'), 'bad'); return; }
    // 이 물이 특별히 매긴 웅덩이(정글 폭포호 등)에 속하면 rareMul을 물려받는다 — 없으면 1(보정 없음).
    let rareMul = 1;
    for (const pl of (w.pools || [])) {
      if (pl.rareMul === undefined) continue;
      if (Math.abs(tx - pl.x) < 16 && Math.abs(ty - pl.y) < 10) { rareMul = pl.rareMul; break; }
    }
    // 낚시 숙련 — 레벨마다 입질까지의 대기가 4%씩 짧아진다
    const wait = this.rng.range(1.2, 2.8) * (rod.fishWait !== undefined ? rod.fishWait : 1)
      * (1 - (p.profLv('fish') - 1) * 0.04);
    p.fish = { tx, ty, t: wait, biting: false, bite: 0, rodId: p.held().id, rareMul };
    for (let i = 0; i < 6; i++) this.parts.push(new Part((tx + .5) * TS, ty * TS, '#cfe8ff', -20, .5));
    this.sfx('splash');
    this.toast(tr('낚싯줄을 드리웠다'));
  },
  updateFishing(dt: number) {
    const p = this.player;
    if (!p.fish) return;
    // 손에서 낚싯대를 놓으면(핫바를 바꾸면) 줄도 같이 놓인다
    const held = p.held();
    if (!held || idef(held).type !== 'rod') { p.fish = null; return; }
    const f = p.fish;
    if (!f.biting) {
      f.t -= dt;
      if (f.t <= 0) {
        // 3레벨 '가벼운 손목' — 챌 수 있는 창이 1.0초에서 1.6초로 늘어난다
        f.biting = true; f.bite = f.biteMax = p.profLv('fish') >= 3 ? 1.6 : 1.0;
        this.toast(tr('손끝이 흔들린다!'), 'good');
        for (let i = 0; i < 10; i++) this.parts.push(new Part((f.tx + .5) * TS, f.ty * TS, '#ffe08a', -30, .6));
      }
    } else {
      f.bite -= dt;
      if (f.bite <= 0) this.resolveFish('auto');
    }
  },
  /** 놓쳤을 때의 뒤처리 — 미끼는 이미 먹혔다(resolveFish에서 뺀다) */
  _fishLost(msg: string) {
    this.player.fish = null;
    this.toast(msg, 'bad');
    UI.refreshBag();                // 물 튀김·소리는 resolveFish 가 줄을 걷는 순간 이미 냈다
  },
  /** 줄을 걷는 순간의 물 튀김. */
  fishSplash(f: any, n: number) {
    const wx = (f.tx + .5) * TS, wy = f.ty * TS;
    for (let i = 0; i < n; i++)
      this.parts.push(new Part(wx, wy, i % 3 ? '#cfe8ff' : '#ffffff', -60 - Math.random() * 50, .55));
  },
  /** 낚시 판정 — quality: 'auto'(시간 초과, 기본 확률) | 'reel'(입질 중 즉시 챔질, 보너스) 2단계로 굴린다 */
  /** 낚시 판정 — quality: 'auto'(시간 초과) | 'reel'(입질 중 즉시 챔질, 보너스). */
  resolveFish(quality: any) {
    const p = this.player;
    if (!p.fish) return;
    const rod: Bag = ITEMS[p.fish.rodId] || {};
    const rareMul = p.fish.rareMul === undefined ? 1 : p.fish.rareMul;
    const baited = p.removeItem('raw_meat', 1);
    /* 낚시 숙련 — 상위 어종 확률과 "잡것" 확률을 함께 밀어 올린다. */
    const flv = p.profLv('fish');
    const fishBonus = (rod.fishBonus || 0) + (baited ? 0.20 : 0) + (quality === 'reel' ? 0.12 : 0) + (flv - 1) * 0.02;
    const itemChance = clamp(((rod.fishItemChance || 0) + (baited ? 0.08 : 0) + (quality === 'reel' ? 0.05 : 0) + (flv - 1) * 0.015) * rareMul, 0, 0.85);
    // ★ 자리를 지우기 **전에** 튀긴다 — p.fish 가 null 이 되면 어디서 걷었는지 모른다
    this.fishSplash(p.fish, quality === 'reel' ? 14 : 7);
    this.sfx('splash');
    p.fish = null;
    p.addProf('fish', 1);

    /* 실패 — 오래 기다린 만큼 놓칠 수도 있어야 긴장이 생긴다. */
    const missBase = quality === 'reel' ? 0.12 : 0.55;
    const miss = clamp(missBase - (rod.fishBonus || 0) * 0.5 - (baited ? 0.05 : 0), 0.04, 0.75);
    if (this.rng.chance(miss)) {
      this._fishLost(quality === 'reel'
        ? this.rng.chance(0.5) ? tr('챘지만 바늘이 빠졌다') : tr('줄이 끊겼다')
        : tr('입질을 흘렸다 — 미끼만 털렸다'));
      return;
    }

    if (this.rng.chance(itemChance)) {
      // 1단계 통과 — 물고기 말고 다른 것.
      /* ★ 빼지 않고 **더한다**. 잡템(젤·뼈)이 대부분인 것이 낚시가 "가끔 뭔가 나온다"로 느껴지는 밑바탕이라 그대로 두고, 그 위에 아주 가끔 걸리는 것을 얹는다. */
      /* ★ 물에서 올라오는 것이 세션마다 다르다 — 사연: docs/code-history.md#h43 */
      const lucky = (flv - 1) * 0.9 + fishBonus * 6;   // 0 ~ 대략 12
      const s2 = sessionOf(this.chapter).id >= 2;      // 세션 2 이후인가
      const itemTable = [
        // --- 원래 있던 것 셋. 여전히 대부분은 이쪽이다 ---
        ['slime_gel', 34], ['potion_hp', 20], ['aether_shard', 12],
        // --- 물에서만 나오는 일곱. 세션에 따라 무게가 갈린다 ---
        ['river_scale', s2 ? 3 : 16],
        ['tide_pearl', s2 ? 4 : 9 + lucky * 0.5],
        ['lantern_fry', s2 ? 2 : 8 + lucky * 0.4],
        ['sunken_coin', s2 ? 2.5 : 4 + lucky * 0.5],
        ['rust_sinker', s2 ? 16 : 1.5],
        ['drowned_cell', s2 ? 10 + lucky * 0.4 : 0],
        ['coolant_vial', s2 ? 7 + lucky * 0.4 : 0],
        /* --- 물에서만 나오는 무기 셋 · 장신구 셋 --- */
        ['spear_river', s2 ? 0 : 0.30 + lucky * 0.10],
        ['bow_reed', s2 ? 0 : 0.30 + lucky * 0.10],
        ['staff_current', s2 ? 0 : 0.26 + lucky * 0.09],
        ['charm_float', s2 ? 0 : 0.22 + lucky * 0.08],
        ['ring_ripple', s2 ? 0 : 0.22 + lucky * 0.08],
        ['amul_river', s2 ? 0 : 0.20 + lucky * 0.07],
        ['harpoon_cool', s2 ? 0.30 + lucky * 0.10 : 0],
        ['gun_pressure', s2 ? 0.26 + lucky * 0.09 : 0],
        ['staff_deluge', s2 ? 0.24 + lucky * 0.09 : 0],
        ['charm_conden', s2 ? 0.22 + lucky * 0.08 : 0],
        ['ring_sluice', s2 ? 0.22 + lucky * 0.08 : 0],
        ['amul_undertow', s2 ? 0.20 + lucky * 0.07 : 0],
        // --- 어느 물에서든 드물다 ---
        ['knot_angler', 0.35 + lucky * 0.15]
      ];
      const catchId = this.rng.weighted(itemTable);
      const stackN = ({
        slime_gel: [2, 5], aether_shard: [1, 2],
        river_scale: [2, 4], tide_pearl: [1, 2], rust_sinker: [1, 3],
        drowned_cell: [1, 2], sunken_coin: [1, 1]
      } as Bag)[catchId];
      const n = stackN ? this.rng.int(stackN[0], stackN[1]) : 1;
      const it = isGear(makeItem(catchId)!) ? rollGear(catchId, this.rng, 0) : makeItem(catchId, n);
      if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
      /* 한 번 낚으면 기억에 남아야 하는 것 — 물에서만 나오는 무기·장신구 전부와 값나가는 셋. */
      const rare = isGear(makeItem(catchId)!)
        || ['knot_angler', 'sunken_coin', 'tide_pearl'].includes(catchId);
      if (rare) {
        // 이런 건 한 번 낚으면 기억에 남아야 한다
        this.toast(tr('물속에서 무언가 딸려 올라왔다 — {itemName}', { itemName: itemName(it!) }), 'good');
        this.burst(p.cx, p.cy - 4, 'stargain', 52, 2.0);
        this.ringFx(p.cx, p.cy, 60, '#7fc8e8', .5);
        this.sfx('level');
      } else {
        this.toast(tr('뭔가 걸렸다 — {itemName}{v}', { itemName: itemName(it!), v: n > 1 ? ' ×' + n : '' }), 'good');
        this.sfx('open');
      }
      p.addProf('fish', rare ? 3 : 1);          // 빈 바늘보다 건진 쪽이 더 는다
      UI.refreshBag();
      return;
    }

    /* 물고기 자체도 세션마다 다르게 올라온다. */
    const s2fish = sessionOf(this.chapter).id >= 2;
    const table = [
      ['none', Math.max(6, (s2fish ? 22 : 26) - fishBonus * 30)],
      ['fish_common', s2fish ? 30 : 44],
      ['fish_silver', (s2fish ? 24 : 16) + fishBonus * 26],
      ['fish_deep', ((s2fish ? 15 : 7) + fishBonus * 30) * (flv >= 6 ? 2.2 : 1)]
    ];
    const catchId = this.rng.weighted(table);
    if (catchId === 'none') { this.toast(baited ? tr('미끼만 사라졌다') : tr('빈 바늘만 올라왔다'), 'bad'); UI.refreshBag(); return; }
    // 10레벨 '물때를 안다' — 가끔 한 마리가 더 딸려 온다
    const n = (flv >= PROF_MAX && this.rng.chance(0.25)) ? 2 : 1;
    const it = makeItem(catchId, n);
    if (!p.addItem(it)) this.drops.push(new Drop(p.cx, p.cy, it!));
    this.toast(tr('낚았다 — {itemName}{v}', { itemName: itemName(it!), v: n > 1 ? ' ×' + n : '' }), 'good');
    p.addProf('fish', 1);                      // 빈 바늘보다 건진 쪽이 더 는다
    this.sfx('open');
    UI.refreshBag();
  },

  /** 손에 그려지는 낚싯대의 생김새. */
  rodLook(id: string) {
    return ({
      rod_basic: { len: 25, w: 2.2, c: '#a9855a', grip: '#5a4632', tip: '#d8c49a' },
      rod_adv:   { len: 32, w: 2.8, c: '#6d5a42', grip: '#3a3a44', tip: '#8fd0e8' }
    })[id] || { len: 28, w: 2.4, c: '#9a7a4a', grip: '#5a4632', tip: '#cfc2a4' };
  },
  /** 낚싯대 끝의 화면 좌표 — 막대기를 우리가 직접 그리므로 길이만 알면 된다. */
  rodTip(id: string, face: any, sx: number, sy: number) {
    const L = this.rodLook(id), A = -0.4;
    // 시트에 손 자리가 적혀 있으면(playerHand) 그 손이 곧 대 손잡이다 — drawHeldWeapon 이 적어 둔 것을 쓴다
    const h = this._rodHand || [sx + 10, sy + 20];
    return [h[0] + face * Math.cos(A) * L.len, h[1] + Math.sin(A) * L.len];
  },

  /* 낚싯줄과 찌 — 낚싯대 끝에서 물까지 줄을 잇고 찌를 띄운다. */
  drawFishLine(c: any, p: any, sx: any, sy: any, bob: any) {
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
      const wet = (dx: number) => { let n = 0; for (let i = 1; i <= 3; i++) if (TILE_DEF[this.world.get(f.tx + dx * i, f.ty)].liquid) n++; return n; };
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
  drawFishCue(c: any, camX: number, camY: number) {
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
};

mixin(Game.prototype, FishingPart, true);

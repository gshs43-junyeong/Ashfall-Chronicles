/* ===== game/rides.js — 탈 것: 말 · 조각배 · 광산 수레 — 놓기 · 타기 · 내리기 · 거두기 · 레일 그리기 · 탄 몸 그리기 ===== */
/* 탈 것은 세계 물건(type 'mount')이라 내리면 그 자리에 남고 세계와 함께 저장된다. 타는 동안도 물건은 세계에 있고(o.rider)
   자리만 탄 사람을 따라간다 — 타는 도중 저장해도 탈 것이 사라지지 않는다. 여럿이면 타는 동안 남의 화면에서는 물건을 지우고
   (odel) 아바타 밑에 그린 뒤, 내리면 그 자리에 다시 놓는다(oadd). 사연: docs/code-history.md#h184 */
import { clamp, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { cycleFrame } from '../../engine/render/anim.js';
import { tr } from '../lang.js';
import { T, TILE_DEF } from '../data.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { makeItem } from '../items.js';
import { Drop, Part } from '../entity.js';
import { boatRow, railAt, railRow, railTop } from '../entity/player-ride.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';

/* 물건의 판정 상자(우클릭 · 곡괭이) — 그림은 더 크다(말 54×47 · 배 56×23 · 수레 34×24, obj/ride_*.png) */
export const MOUNT_BOX: Bag = { horse: [34, 30], boat: [48, 14], cart: [30, 20] };
const ITEM_OF: Bag = { horse: 'mount_horse', boat: 'mount_boat', cart: 'mount_cart' };

export const RidesPart: Bag = {

  /* ---------------- 놓기 · 거두기 ---------------- */
  /** 손에 든 탈 것을 겨눈 자리에 — 말은 땅 위, 배는 물 위, 수레는 레일 위 */
  placeMount(slot: number) {
    const p = this.player, w = this.world, it = p.bag[slot]; if (!it) return;
    const kind = idef(it).mount || 'horse', [bw, bh] = MOUNT_BOX[kind];
    const tx = Math.floor(this.input.wx / TS), ty = Math.floor(this.input.wy / TS);
    if (dist(p.cx, p.cy, (tx + .5) * TS, (ty + .5) * TS) > TS * 6) { this.toast(tr('너무 멀다'), 'bad'); return; }
    let x = (tx + .5) * TS - bw / 2, y = 0;
    if (kind === 'horse') {
      let gy = ty; while (gy < ty + 4 && !w.solid(tx, gy + 1)) gy++;
      if (!w.solid(tx, gy + 1) || w.solid(tx, gy) || w.solid(tx, gy - 1) || TILE_DEF[w.get(tx, gy)].liquid) { this.toast(tr('말은 땅 위에 세운다'), 'bad'); return; }
      y = (gy + 1) * TS - bh;
    } else if (kind === 'boat') {
      const sr = boatRow(w, tx, ty);
      if (sr < 0) { this.toast(tr('배는 물 위에 띄운다'), 'bad'); return; }
      y = (this.surfacePx ? this.surfacePx(tx + .5, sr) : sr * TS) - 9;
    } else {
      const r = railRow(w, tx, ty);
      if (r < 0) { this.toast(tr('수레는 레일 위에 놓는다'), 'bad'); return; }
      y = railTop(r) - bh;
    }
    const o: Bag = { type: 'mount', kind, placed: 1, x: Math.round(x), y: Math.round(y), w: bw, h: bh, f: p.facing >= 0 ? 1 : -1 };
    w.objects.push(o);
    if (this.net) this.netObjAdd(o);
    it.c--; if (it.c <= 0) p.bag[slot] = null;
    for (let i = 0; i < 8; i++) this.parts.push(new Part(o.x + bw / 2, o.y + bh, kind === 'boat' ? '#cfe8ff' : '#c8a878', -30, .5));
    UI.refreshBag(); this.sfx(kind === 'boat' ? 'splash' : 'place');
  },
  /** 곡괭이로 거둔다 — 누가 타고 있으면 안 된다 */
  removeMount(o: Bag) {
    if (o.rider) return false;
    const p = this.player, w = this.world, it = makeItem(ITEM_OF[o.kind], 1)!;
    if (!p.addItem(it)) this.drops.push(new Drop(o.x + o.w / 2, o.y, it));
    const i = w.objects.indexOf(o); if (i >= 0) w.objects.splice(i, 1);
    if (this.net) this.netObjDel(o);
    this.matBurst(o.kind === 'cart' ? 'metal' : 'wood', o.x + o.w / 2, o.y + o.h / 2, 8, { spd: 1 });
    UI.refreshBag(); this.sfx('place');
    return true;
  },

  /* ---------------- 타기 · 내리기 ---------------- */
  /** 우클릭 — 내 것이면 내리고, 비어 있으면 탄다 */
  useMount(o: Bag) {
    const p = this.player;
    if (p.ride && p.ride.o === o) { this.dismount(p, 'click'); return; }
    if (p.ride) { this.toast(tr('이미 타고 있다'), 'bad'); return; }
    if (o.rider) { this.toast(tr('누군가 타고 있다'), 'bad'); return; }
    if (p.dead || p.hp <= 0) return;
    if (this.duel) return;
    const w = this.world, rd: Bag = { kind: o.kind, o, row: 0, v: 0 };
    if (o.kind === 'boat') {
      rd.row = boatRow(w, Math.floor((o.x + o.w / 2) / TS), Math.floor((o.y + o.h) / TS));
      if (rd.row < 0) { this.toast(tr('배는 물 위에 띄운다'), 'bad'); return; }
    } else if (o.kind === 'cart') {
      rd.row = Math.floor((o.y + o.h) / TS);
      if (!railAt(w, o.x + o.w / 2, rd.row)) { this.toast(tr('수레는 레일 위에 놓는다'), 'bad'); return; }
    }
    p.ride = rd; o.rider = 1;
    p.x = o.x + o.w / 2 - p.w / 2; p.vx = 0; p.vy = 0; p.facing = o.f || p.facing;
    if (o.kind === 'horse') p.y = o.y + o.h - p.h;
    else if (p.fish) { p.fish = null; }                                 // 배에 오르며 줄을 걷는다
    if (this.net) this.netObjDel(o);
    this.sfx(o.kind === 'boat' ? 'splash' : o.kind === 'cart' ? 'door_shut' : 'jump', 0.9);
  },
  /** 내리기 — 탈 것은 지금 자리에 남는다. why: click · jump · water · land · rail · dead */
  dismount(p: Player, why: string) {
    const rd = p.ride; if (!rd) return;
    const o = rd.o;
    p.ride = null; o.rider = 0;
    o.f = p.facing >= 0 ? 1 : -1;
    this.placeRideObj(o, p);
    if (why === 'jump' || why === 'land' || why === 'rail') { p.vy = -380; p.onGround = false; }
    if (why === 'water') this.toast(tr('말이 물을 싫어한다'), 'bad');
    if (this.net) this.netObjAdd(o);
  },
  /** 탄 사람 자리에 물건을 맞춘다 — 탄 동안 매 프레임, 내릴 때 한 번 */
  placeRideObj(o: Bag, p: Player) {
    o.x = Math.round(p.cx - o.w / 2);
    if (o.kind === 'horse') o.y = Math.round(p.y + p.h - o.h);
    else if (o.kind === 'boat') o.y = Math.round(p.y + p.h - 3 - 9);
    else o.y = Math.round(p.y + p.h + 8 + 4 - o.h);
  },

  /** 매 프레임 — 내 탈 것 따라오기 · 내릴 까닭 · 소리 · 흙먼지 · 빈 배 물결 타기 */
  updateRides(dt: number) {
    const p = this.player, w = this.world, rd = p && p.ride;
    if (rd) {
      const o = rd.o;
      if (p.dead || p.hp <= 0) this.dismount(p, 'dead');
      else if (rd.off) { const why = rd.off; rd.off = null; this.dismount(p, why); }
      else if (rd.kind === 'horse' && p.swimming) this.dismount(p, 'water');
      else {
        this.placeRideObj(o, p);
        const sp = Math.abs(p.vx);
        if (rd.kind === 'horse' && p.onGround && sp > 120) {
          rd.step = (rd.step || 0) - dt * sp / 260;
          if (rd.step <= 0) { rd.step = 0.5; this.sfx('step', 0.7 + Math.random() * 0.08); for (let i = 0; i < 3; i++) this.parts.push(new Part(p.cx - p.facing * 14, p.y + p.h - 2, '#b8a27a', -25, .35)); }
        } else if (rd.kind === 'boat' && sp > 60 && Math.random() < dt * sp / 40) {
          this.parts.push(new Part(p.cx - p.facing * 22, p.y + p.h + 2, '#dff2ff', -30, .45));
        } else if (rd.kind === 'cart') {
          if (rd.bump) { this.sfx('door_shut', 0.8); this.shake = Math.max(this.shake, Math.min(6, rd.bump / 90)); rd.bump = 0; }
          if (sp > 280 && Math.random() < dt * sp / 30) this.parts.push(new Part(p.cx + (Math.random() - .5) * 20, p.y + p.h + 10, '#ffd27a', -60, .25));
        }
      }
    }
    // 아무도 안 탄 배는 물결을 탄다 · 불러온 세이브의 rider 표시는 지운다(그때 탄 사람은 이제 안 타고 있다)
    for (const o of w.objects) {
      if (o.type !== 'mount') continue;
      if (o.rider && !(p && p.ride && p.ride.o === o)) o.rider = 0;
      if (o.kind === 'boat' && !o.rider && this.surfacePx) {
        const col = Math.floor((o.x + o.w / 2) / TS), sr = boatRow(w, col, Math.floor((o.y + o.h) / TS));
        if (sr >= 0) o.y = Math.round(this.surfacePx((o.x + o.w / 2) / TS, sr) - 9);
      }
    }
  },

  /* ---------------- 그리기 ---------------- */
  /** 레일 — 칸마다 침목과 쇠줄, 이웃이 한 칸 위 · 아래면 그쪽으로 비스듬히 잇는다 */
  drawRails(f: any) {
    const { c, w, camX, camY, tx0, ty0, tx1, ty1 } = f;
    for (let y = ty0 - 1; y <= ty1 + 1; y++) for (let x = tx0 - 1; x <= tx1 + 1; x++) {
      if (w.get(x, y) !== T.RAIL) continue;
      const yc = railTop(y) - camY, xc = (x + .5) * TS - camX;
      for (const side of [-1, 1]) {
        const rn = railRow(w, x + side, y);
        const yn = rn >= 0 ? railTop(rn) - camY : yc;
        const ex = xc + side * TS / 2, ey = (yc + yn) / 2;           // 칸 가장자리까지 반 토막
        // 침목 — 반 토막마다 하나
        c.fillStyle = '#5a3c24';
        const mx = (xc + ex) / 2, my = (yc + ey) / 2;
        c.save(); c.translate(mx, my + 2.5); c.rotate(Math.atan2(ey - yc, ex - xc)); c.fillRect(-2, -1.5, 4, 5); c.restore();
        c.strokeStyle = '#3e4048'; c.lineWidth = 3; c.beginPath(); c.moveTo(xc, yc + 0.5); c.lineTo(ex, ey + 0.5); c.stroke();
        c.strokeStyle = '#b8c0cc'; c.lineWidth = 1; c.beginPath(); c.moveTo(xc, yc - 0.5); c.lineTo(ex, ey - 0.5); c.stroke();
        if (rn < 0) {                                                   // 끝 — 멈춤 막이
          c.fillStyle = '#8a2a2a'; c.fillRect(ex - (side > 0 ? 3 : 0), yc - 6, 3, 7);
          c.fillStyle = '#d8a94b'; c.fillRect(ex - (side > 0 ? 3 : 0), yc - 6, 3, 1);
        }
      }
    }
  },
  /** 시트의 한 장을 발밑(fx, fy = 그림 가운데 아래)에 맞춰 — 왼쪽을 보면 뒤집는다 */
  drawRideSprite(c: CanvasRenderingContext2D, kind: string, fr: number, fx: number, fy: number, face: number, tilt = 0) {
    const key = 'obj_ride_' + kind, im = Sprites.img[key];
    const m = Sprites.meta && Sprites.meta.objects && Sprites.meta.objects.files['ride_' + kind];
    if (!im || !im.width || !m) {                                      // 그림이 없으면 간단한 상자
      c.fillStyle = kind === 'cart' ? '#6a6e78' : '#8a5a34'; c.fillRect(fx - 16, fy - 18, 32, 18); return;
    }
    const n = m.frames || 1, sw = im.width / n;
    c.save(); c.imageSmoothingEnabled = false;
    c.translate(Math.round(fx), Math.round(fy));
    if (tilt) c.rotate(tilt);
    if (face < 0) c.scale(-1, 1);
    c.drawImage(im, (fr % n) * sw, 0, sw, im.height, -m.w / 2, -m.h, m.w, m.h);
    c.restore();
  },
  /** 말 그림 장 — 서기 0 · 달리기 1~4(빠를수록 빨리) · 공중 5 */
  horseFrame(vx: number, onGround: boolean) {
    if (!onGround) return 5;
    const sp = Math.abs(vx);
    return sp > 40 ? 1 + cycleFrame(this.time, 6 + sp / 40, 4) : 0;
  },
  /** 서 있는(아무도 안 탄) 탈 것 */
  drawMountObj(c: CanvasRenderingContext2D, o: Bag, sx: number, sy: number) {
    if (o.rider) return;
    const fx = sx + o.w / 2;
    if (o.kind === 'horse') {
      this.drawRideSprite(c, 'horse', 0, fx, sy + o.h + 3, o.f || 1);
    } else if (o.kind === 'boat') {
      const tilt = Math.sin(this.time * 1.6 + o.x * 0.05) * 0.04;
      this.drawRideSprite(c, 'boat', 0, fx, sy + o.h + 6, o.f || 1, tilt);
    } else this.drawRideSprite(c, 'cart', 0, fx, sy + o.h + 2, o.f || 1);
  },
  /** 탄 사람 — 말은 몸 뒤, 배 · 수레는 몸 앞(다리가 가려진다). 사람은 안장 · 배 · 수레 높이만큼 올려 그린다 */
  drawRider(c: CanvasRenderingContext2D, p: Player, sx: number, sy: number) {
    const kind = p.ride ? p.ride.kind : p.rideK;
    if (!kind) { this.drawPlayer(c, p, sx, sy); return; }
    const fx = sx + p.w / 2, foot = sy + p.h, face = p.facing >= 0 ? 1 : -1;
    if (kind === 'horse') {
      const fr = this.horseFrame(p.vx, p.onGround), bob = fr >= 1 && fr <= 4 ? (fr % 2 ? -1 : 0) : 0;
      this.drawRideSprite(c, 'horse', fr, fx, foot + 3, face);
      this.drawPlayer(c, p, sx - face * 1, sy - 22 + bob);
      return;
    }
    if (kind === 'boat') {
      const tilt = clamp(p.vx / 900, -0.08, 0.08) + Math.sin(this.time * 1.6) * 0.03;
      this.drawPlayer(c, p, sx, sy + 4);
      this.drawRideSprite(c, 'boat', 0, fx, foot + 12, face, tilt);
      return;
    }
    const tilt = p.ride ? (p.ride.tilt || 0) : 0;
    this.drawPlayer(c, p, sx, sy + 2);
    this.drawRideSprite(c, 'cart', Math.abs(p.vx) > 30 ? cycleFrame(this.time, Math.abs(p.vx) / 25, 2) : 0, fx, foot + 12, face, tilt);
  }
};

mixin(Game.prototype, RidesPart, true);

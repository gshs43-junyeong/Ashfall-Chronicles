/* ===== game/trinkets.js — 잡동사니로 만든 도구: 귀환 구슬(캠프 · 마을) · 되짚는 나침반 · 멈춘 모래시계 ===== */
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { TS } from '../world.js';
import { Part } from '../entity.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';

/** 멈춘 모래시계 — 멈추는 시간 · 다시 쓸 수 있을 때까지 */
export const STOP_T = 1, STOP_CD = 60;

export const TrinketPart: Bag = {
  /** 귀환 — 'camp' · 'village' · 'grave'. 옮겼으면 true(구슬을 쓴다), 못 갔으면 false(그대로 둔다) */
  recallTo(where: string) {
    const p = this.player, w = this.world;
    let tx = 0, ty = 0, to = '';
    if (where === 'camp') { tx = w.spawnX; ty = w.spawnY - 3; to = tr('베이스캠프'); }
    else if (where === 'village') {
      const d = w.dawnCity;
      if (!this.villageUnlocked || !d) { this.toast(tr('여명 마을이 되살아난 뒤에야 길이 이어진다'), 'bad'); return false; }
      tx = (d.x0 + d.x1) >> 1; ty = d.gy - 3; to = tr('여명 마을');
    } else {
      const m = this.deathMark;
      if (!m) { this.toast(tr('바늘이 가리킬 곳이 없다 — 쓰러진 자리가 남아 있지 않다'), 'bad'); return false; }
      tx = m.x / TS; ty = m.y / TS - 3; to = tr('쓰러진 자리');
    }
    if (p.ride) this.dismount(p, 'recall');
    for (let i = 0; i < 26; i++) this.parts.push(new Part(p.cx, p.cy, where === 'grave' ? '#c8b07a' : '#9fe8dc', -70, 1));
    this.placeAt(p, tx, ty);
    for (let i = 0; i < 34; i++) this.parts.push(new Part(p.cx + (Math.random() - 0.5) * 30, p.cy + (Math.random() - 0.5) * 40, '#ffe6a8', -50, 1.2));
    this.shake = Math.max(this.shake || 0, 4);
    this.toast(tr('{to}에 도착했다', { to }), 'good');
    this.sfx('travel');
    return true;
  },
  /** 플레이어를 칸 (tx, ty) 에 — 카메라도 한 번에 옮긴다(따라가며 휩쓸리지 않게) */
  placeAt(p: Player, tx: number, ty: number) {
    const { WW, WH } = dimsOf(this.world);
    p.x = tx * TS - p.w / 2; p.y = ty * TS; p.vx = p.vy = 0;
    this.cam.x = clamp(p.cx - this.W / 2, 0, WW * TS - this.W);
    this.cam.y = clamp(p.cy - this.H / 2, 0, WH * TS - this.H);
  },

  /** 멈춘 모래시계 — 몹 · 몹 투사체 · 보스 기술이 STOP_T 초 동안 선다. 쓰는 이는 그대로 움직인다.
      여럿이면 세계는 호스트가 돌리므로 참가자는 호스트에게 부탁한다(stop). */
  useStopGlass() {
    const p = this.player;
    if ((p.stopCd || 0) > 0) { this.toast(tr('모래가 아직 다 차오르지 않았다 ({s}초)', { s: Math.ceil(p.stopCd) }), 'bad'); return; }
    p.stopCd = STOP_CD;
    if (this.net && this.net.role === 'guest') this.netBroadcast({ k: 'stop' });
    this.startTimeStop(p.cx, p.cy);
    if (this.net && this.net.role === 'host') this.netBroadcast({ k: 'stop', x: p.cx, y: p.cy });
    UI.refreshBag();
  },
  startTimeStop(x: number, y: number) {
    this.timeStop = STOP_T; this.stopAt = { x, y, t0: this.time };
    this.sfx('timestop');
  },
  /** 멈춘 동안은 몹 AI · 몹 투사체 · 보스 기술 시계를 건너뛴다(game.ts update 가 묻는다) */
  stopped() { return (this.timeStop || 0) > 0; },
  tickTrinkets(dt: number) {
    if (this.timeStop > 0) this.timeStop = Math.max(0, this.timeStop - dt);
    for (const q of this.players) if (q.stopCd > 0) q.stopCd = Math.max(0, q.stopCd - dt);
  },

  /** 화면 — 멈춘 동안 푸르스름하게 바래고, 쓴 자리에서 시계 테가 퍼진다 */
  rTimeStop(f: any) {
    const s = this.stopAt; if (!s) return;
    const age = this.time - s.t0, life = STOP_T + 0.35;
    if (age > life) { this.stopAt = null; return; }
    const c = f.c, k = age < 0.12 ? age / 0.12 : age > STOP_T ? 1 - (age - STOP_T) / 0.35 : 1;
    c.save();
    c.globalCompositeOperation = 'saturation'; c.fillStyle = `rgba(0,0,0,${0.85 * k})`; c.fillRect(0, 0, this.W, this.H);
    c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(70,110,170,${0.18 * k})`; c.fillRect(0, 0, this.W, this.H);
    const x = s.x - f.camX, y = s.y - f.camY, R = 40 + Math.min(1, age / 0.35) * Math.max(this.W, this.H) * 0.7;
    c.strokeStyle = `rgba(220,235,255,${0.55 * k})`; c.lineWidth = 3;
    c.beginPath(); c.arc(x, y, R, 0, TAU); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, R * 0.6, 0, TAU); c.stroke();
    // 시계 눈금 · 바늘 — 쓴 자리 위에
    c.translate(x, y - 46); c.globalAlpha = k;
    c.strokeStyle = '#e8f0ff'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); c.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); c.stroke(); }
    const hand = -Math.PI / 2 + Math.min(age, STOP_T) / STOP_T * TAU;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(hand) * 11, Math.sin(hand) * 11); c.stroke();
    c.restore();
  },
};

mixin(Game.prototype, TrinketPart, true);

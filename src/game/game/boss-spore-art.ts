/* ===== game/boss-spore-art.ts — 포자 여왕 그림 — 망사 치마 · 들리고 퍼지는 갓 · 균사 팔 · 매달린 실 · 빛나는 주름 · 바닥의 균사 깔개 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { Sprites } from '../sprites.js';
import { Part } from '../entity.js';
import { SQ } from '../entity/boss-spore.js';
import { Game } from '../game.js';
import { hzGlow } from './boss-hazard-art.js';
/* ★ 멈춘 버섯이 아니게 — 망사가 숨 쉬고 · 갓이 열릴 땐 들리며 기울고 · 균사 팔이 늘 너울대고 · 매달린 뒤엔 실 끝에서 흔들린다.
   주름이 열린 동안은 갓 아래가 청록으로 빛나고 포자 알갱이가 떨어진다 — 그때가 깊이 닿는 때라는 신호(숫자 대신 빛).
   설계 좌표는 tools/mkbossrig.py spore_*(몸 44×76 · 갓 조각 80×36 의 (40, 30) 이 몸 (22, 9) 에 앉는다). 사연: docs/code-history.md#h236 */

type C2 = CanvasRenderingContext2D;
const K = SQ.K, BW = SQ.W * K, BH = SQ.H * K, PW = 320, PH = 144, GLOW = '#8ff0c8';
const ease = (cur: number, to: number, dt: number, rate: number) => cur + (to - cur) * (1 - Math.exp(-dt * rate));

export const BossSporeArt: Bag = {
  /** 몸(actors 단계 · drawEnemy 가 넘긴다) */
  drawSpore(c: C2, e: Bag, sx: number, sy: number) {
    const im = Sprites.want('spore_queen'), pim = Sprites.want('spore_queen_parts'); if (!im || !pim) return false;
    const T = this.time || 0, hang = !!e.sqHang, A = e.sqA || (e.sqA = { op: 0, t0: T, arms: [0, 0] });
    const dt = this.paused ? 0 : Math.max(0, Math.min(0.1, T - A.t0)); A.t0 = T;
    A.op = ease(A.op, e.sqOpen ? 1 : 0, dt, 5);
    const sway = hang ? Math.sin(T * 1.1) * 0.06 + Math.max(-0.12, Math.min(0.12, -(e.vx || 0) * 0.0012)) : Math.sin(T * 0.8) * 0.015;
    const foot = hang ? SQ.HANG_FOOT : SQ.FOOT;
    const X = sx + e.w / 2, Y = sy + e.h, ox = -SQ.CX * K, oy = -foot * K;
    /* 매달린 실 — 갓 위에서 천장까지 */
    if (hang && e.sqRoof !== undefined) {
      const top = e.sqRoof - this.cam.y;
      c.save(); c.strokeStyle = 'rgba(240,234,216,.75)'; c.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) {
        const bx = X + i * 26 + Math.sin(sway) * (Y + oy - top) * 0.2, by = Y + oy + SQ.CAP[1] * K - 30 + Math.abs(i) * 3;
        c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + Math.sin(T + i) * 8, (by + top) / 2, X + i * 10, top); c.stroke();
      }
      c.restore();
    }
    c.save(); c.imageSmoothingEnabled = false;
    /* 매달리면 갓 꼭대기를 축으로 흔들린다 · 땅에선 대주머니를 축으로 */
    const pvx = X, pvy = hang ? Y + oy + SQ.CAP[1] * K - 40 : Y;
    c.translate(pvx, pvy); c.rotate(sway); c.translate(-pvx, -pvy);
    const st = hang ? 2 : (e.pf || 0) > 0.2 ? 1 : 0, fr = st * 2 + ((T % 1.5) < 0.75 ? 0 : 1);
    /* 균사 팔 — 망사 뒤에서 너울댄다 · 깔개를 깔 땐 그쪽 바닥을 가리킨다 · 기술 땐 플레이어 쪽으로 */
    const q = this.hzNear(e.cx, e.cy), busy = !!(e.mv && e.mv.d), lay = e.sqLay && T - e.sqLay.t < 0.6;
    SQ.ARMS.forEach(([ax, ay], i) => {
      const side = i === 0 ? -1 : 1, wx = X + ox + ax * K, wy = Y + oy + ay * K;
      let to = (side < 0 ? Math.PI - 1.1 : 1.1) + Math.sin(T * 1.4 + i * 2) * 0.25;
      if (busy && q) to = Math.atan2(q.cy - (wy + this.cam.y), q.cx - (wx + this.cam.x));
      else if (lay) to = Math.atan2(80, (e.sqLay.x - this.cam.x) - wx);
      if (hang) to = side < 0 ? Math.PI - 1.4 + Math.sin(T * 1.3 + i) * 0.2 : 1.4 + Math.sin(T * 1.3 + i) * 0.2;
      A.arms[i] = ease(A.arms[i] || to, to, dt, 4);
      c.save(); c.translate(wx, wy); c.rotate(A.arms[i]);
      c.drawImage(pim, 4 * PW, 0, PW, PH, -4 * K, -18 * K, PW, PH); c.restore();
    });
    c.drawImage(im, fr * BW, 0, BW, BH, X + ox, Y + oy, BW, BH);
    if (e.flash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(0.5, e.flash * 4); c.drawImage(im, fr * BW, 0, BW, BH, X + ox, Y + oy, BW, BH); c.restore(); }
    /* 갓 — 열릴 땐 들리며 살짝 기운다 · 숨 쉬듯 부푼다 */
    const cf = (hang ? 2 : 0) + (A.op > 0.5 ? 1 : 0), lift = A.op * 10, breathe = 1 + Math.sin(T * 1.5) * 0.015;
    c.save(); c.translate(X + ox + SQ.CAP[0] * K, Y + oy + SQ.CAP[1] * K - lift); c.rotate(Math.sin(T * 0.9) * 0.03 + A.op * 0.05 * Math.sin(T * 3));
    c.scale(1 / breathe, breathe);
    c.drawImage(pim, cf * PW, 0, PW, PH, -40 * K, -30 * K, PW, PH); c.restore();
    c.restore();
    e.sqGill = [X + ox + SQ.CAP[0] * K + this.cam.x, Y + oy + SQ.CAP[1] * K - lift + 4 + this.cam.y];
    /* 포자 알갱이 — 열린 주름에서 떨어진다 */
    if (A.op > 0.5 && !this.paused && Math.random() < (hang ? 0.9 : 0.5)) {
      const w = hang ? 130 : 66, pt = new Part(e.sqGill[0] + (Math.random() - 0.5) * w * 2, e.sqGill[1], Math.random() < 0.5 ? GLOW : '#d8fff0', 0, 1.6, { spd: 0, r: 1.6 + Math.random(), g: 0.08, drag: 0.96 });
      pt.vx = (Math.random() - 0.5) * 20; pt.vy = 20 + Math.random() * 30; this.parts.push(pt);
    }
    return true;
  },
  /** 빛(fx 단계) — 열린 주름의 청록 빛 · 얼굴의 빛 점 */
  drawSporeGlow(f: any) {
    const c: C2 = f.c, T = this.time || 0;
    for (const e of this.ents) {
      if (!e || e.dead || !e.def || e.def.ai !== 'b_spore' || !e.sqGill || !e.sqA) continue;
      const x = e.sqGill[0] - f.camX, y = e.sqGill[1] - f.camY, op = e.sqA.op, w = e.sqHang ? 140 : 72;
      c.save(); c.globalCompositeOperation = 'lighter';
      if (op > 0.05) {
        const g = c.createRadialGradient(x, y, 4, x, y, w);
        g.addColorStop(0, `rgba(143,240,200,${0.35 * op})`); g.addColorStop(1, 'rgba(143,240,200,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(x, y + 6, w, w * 0.35, 0, 0, Math.PI * 2); c.fill();
      }
      hzGlow(c, x, y + 30, 10 + Math.sin(T * 3) * 2, GLOW, 0.35);
      c.restore();
    }
  },
  /** 균사 깔개(mycel) — 바닥을 덮는 흰 실 그물 · 작은 빛 버섯 · 밟고 있으면 여왕 쪽으로 실이 빛난다 */
  drawSporeMat(c: C2, h: Bag, cx0: number, cy0: number, f: number) {
    const x = h.x - cx0, y = h.y - cy0, g = Math.min(1, h.t / 0.8), w = h.w * g, T = this.time || 0;
    c.save(); c.globalAlpha = f * 0.9; c.strokeStyle = '#f0ead8'; c.lineWidth = 1;
    let s = h.sd;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < 18; i++) {
      const x0 = x + (rnd() - 0.5) * w, len = 14 + rnd() * 30, up = rnd() * 6;
      c.beginPath(); c.moveTo(x0, y - 1); c.quadraticCurveTo(x0 + len * 0.5, y - 2 - up, x0 + len * (rnd() < 0.5 ? -1 : 1), y - 1); c.stroke();
    }
    c.fillStyle = 'rgba(240,234,216,.35)'; c.fillRect(x - w / 2, y - 3, w, 3);
    for (let i = 0; i < 5; i++) {                                              // 빛 버섯
      const mx = x + (rnd() - 0.5) * w * 0.9, mh = 3 + rnd() * 4;
      c.fillStyle = '#d8ccb0'; c.fillRect(mx - 0.5, y - mh, 1.5, mh);
      c.fillStyle = '#8a5a7a'; c.beginPath(); c.ellipse(mx + 0.2, y - mh, 3, 1.8, 0, Math.PI, 0); c.fill();
      hzGlow(c, mx, y - mh + 1, 4 + Math.sin(T * 3 + i) * 1, GLOW, 0.4 * f);
    }
    if (h.feed) {                                                              // 먹는 중 — 여왕 쪽으로 빛 실
      const b = this.hzBoss(h);
      if (b) { c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(143,240,200,${0.35 + 0.25 * Math.sin(T * 8)})`; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, y - 2); c.quadraticCurveTo((x + b.cx - cx0) / 2, y - 60, b.cx - cx0, b.y + b.h * 0.5 - cy0); c.stroke(); }
    }
    c.restore();
    return true;
  },
  /** 균사 깔개의 매 틱 — 밟은 나는 느려지고, 밟은 사람마다 여왕이 낫는다(호스트) · 여왕이 쓰러지면 시든다 */
  sporeHz(h: Bag, dt: number, host: boolean, me: any) {
    const b = this.hzBoss(h);
    if (!b) { h.life = Math.min(h.life, h.t + 0.5); return true; }
    const on = (q: any) => q && !q.dead && q.hp > 0 && Math.abs(q.cx - h.x) < h.w / 2 && Math.abs(q.y + q.h - h.y) < 20;
    if (on(me)) me.vx *= Math.pow(0.35, dt * 6);
    const n = this.players.filter(on).length;
    h.feed = n > 0;
    if (host && n && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.0025 * n * dt);
    return true;
  },
};
mixin(Game.prototype, BossSporeArt, true);

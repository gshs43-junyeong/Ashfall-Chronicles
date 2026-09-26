/* ===== game/render-fx.js — 스킬 고유 연출 · 별 조각 궤도 ===== */
import { shade } from '../../engine/core/color.js';
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { CHAR_OF } from '../data/start.js';
import { SIG_FX } from '../data/values.js';
import { Sprites } from '../sprites.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RenderFxPart: Bag = {

  /* ================= 특별한 스킬의 고유 연출 ================= */
  drawSigGround(c, camX, camY) {
    if (!this.sigs || !this.sigs.length) return;
    const fs = this.fxScale();
    for (let i = this.sigs.length - 1; i >= 0; i--) {
      const s = this.sigs[i];
      s.t -= 1 / 60;
      if (s.t <= 0) { this.sigs.splice(i, 1); continue; }
      const k = s.t / s.max, x = s.x - camX, y = s.y - camY;
      if (s.k === 'band') {
        /* 유성 화살비가 떨어질 띠. */
        /* 처음에 가장 진하고 화살이 다 떨어질 때까지 옅어진다. */
        const a = SIG_FX.rain.a * Math.min(1, 0.35 + k);
        const line = () => {
          c.beginPath(); c.moveTo(x - s.hw, y); c.lineTo(x + s.hw, y); c.stroke();
          for (let j = -3; j <= 3; j++) {
            const tx = x + (s.hw / 3) * j;
            c.beginPath(); c.moveTo(tx, y - 16); c.lineTo(tx, y - 4); c.stroke();   // 내려오는 방향
            c.beginPath(); c.moveTo(tx - 3.5, y - 8); c.lineTo(tx, y - 4); c.lineTo(tx + 3.5, y - 8); c.stroke();
          }
        };
        c.lineJoin = 'round'; c.lineCap = 'round';
        c.globalAlpha = a * 0.8; c.strokeStyle = '#12100c'; c.lineWidth = 4.5; line();
        c.globalAlpha = a; c.strokeStyle = s.c; c.lineWidth = 2; line();
        c.lineCap = 'butt';
      } else if (s.k === 'sigil') {
        /* 소환 문양 — 안으로 **조여드는** 고리. */
        const a = SIG_FX.wolf.a * Math.min(1, k * 1.6);
        const rune = () => {
          c.beginPath(); c.arc(x, y, s.r * (0.25 + k * 0.75), 0, TAU); c.stroke();
          c.beginPath(); c.arc(x, y, s.r * 0.34, 0, TAU); c.stroke();
          c.beginPath();
          for (let j = 0; j < 6; j++) {                                      // 육각 룬
            const ang = -Math.PI / 2 + j * TAU / 6, rr = s.r * 0.34;
            j ? c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr)
              : c.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
          }
          c.closePath(); c.stroke();
        };
        c.lineJoin = 'round';
        c.globalAlpha = a * 0.75; c.strokeStyle = '#12100c'; c.lineWidth = 4; rune();   // 밑줄 — 밝은 바닥에서도 읽힌다
        c.globalAlpha = a; c.strokeStyle = s.c; c.lineWidth = 2; rune();
      } else if (s.k === 'flash') {
        /* 착탄 섬광. */
        const a = SIG_FX.flash.a * fs * k;
        if (a > 0.004) {
          const g = c.createRadialGradient(x, y, 0, x, y, s.r);
          g.addColorStop(0, s.c); g.addColorStop(1, 'transparent');
          c.globalAlpha = a; c.fillStyle = g;
          c.beginPath(); c.arc(x, y, s.r, 0, TAU); c.fill();
        }
      }
      c.globalAlpha = 1; c.lineWidth = 1;
    }
  },

  /** 떨어지는 별. */
  drawSigSky(c, camX, camY) {
    if (!this.sigs) return;
    for (const s of this.sigs) {
      if (s.k !== 'fall') continue;
      const k = 1 - s.t / s.max;                       // 0 -> 1 로 내려온다
      /* ★ 420 · k^1.5 면 0.25초쯤 화면에 들어와 나머지를 내려오는 것이 다 보인다. */
      const e = Math.pow(k, 1.5);
      const x = s.x - 150 * (1 - e) - camX, y = s.y - 420 * (1 - e) - camY;
      const a = SIG_FX.fall.a;
      c.save();
      c.globalAlpha = a * 0.5; c.strokeStyle = s.c; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x + 54, y - 150); c.lineTo(x, y); c.stroke();   // 꼬리 — 내려오는 각과 같게
      c.globalAlpha = a; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + 22, y - 62); c.lineTo(x, y); c.stroke();    // 꼬리 심
      c.fillStyle = '#fff6dc'; c.globalAlpha = a;
      c.beginPath(); c.arc(x, y, 5 + k * 3, 0, TAU); c.fill();                // 머리 — 가까워지며 커진다
      c.restore();
      c.globalAlpha = 1; c.lineWidth = 1;
    }
  },

  /** 회오리 검무 — 도는 동안 칼선 둘. */
  drawWhirlArc(c, p, camX, camY) {
    const ch = p.channel;
    if (!ch || ch.id !== 's_whirl') return;
    const x = p.cx - camX, y = p.cy - camY, a = this.time * 13;
    const fade = Math.min(1, ch.t / 0.25);             // 끝맺을 때 사라진다
    c.save();
    c.lineCap = 'round';
    for (let j = 0; j < 2; j++) {
      const ang = a + j * Math.PI;
      c.globalAlpha = SIG_FX.whirl.a * fade;
      c.strokeStyle = '#ffcf6a'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, y, 96, ang, ang + 1.1); c.stroke();             // 96 = 실제 피해 반경
      c.globalAlpha = SIG_FX.whirl.a * fade * 0.45;
      c.lineWidth = 8;
      c.beginPath(); c.arc(x, y, 96, ang - 0.5, ang); c.stroke();             // 지나간 자취
    }
    c.restore();
    c.globalAlpha = 1; c.lineWidth = 1;
  },

  /* ---- 캐릭터 렌더 ---- */
  /* ================= 별 조각 궤도 (세션 1) ================= */
  drawStarOrbit(c, p, camX, camY) {
    const n = p.starOrbits | 0;
    if (!n) return;
    const t = this.time;
    const cx = p.cx - camX, cy = p.cy - camY - 4;
    // 5장을 끝내면 다섯이 한 점으로 모였다가 다시 퍼진다 — 5장 outro 와 같은 사건이다
    const mg = this.starMerge > 0 ? Math.min(1, this.starMerge / this.STAR_MERGE) : 0;
    /* 8장 — 하늘로 돌아간다. */
    let riseY = 0, riseK = 0, riseFade = 1;
    if (this.starRise) {
      const s = this.starRise;
      if (s.t < this.STAR_GATHER) {
        riseK = s.t / this.STAR_GATHER;            // 0 → 1 로 모인다
      } else {
        riseK = 1;
        const k = (s.t - this.STAR_GATHER) / this.STAR_RISE;
        riseY = -k * k * 900;                      // 가속하며 위로
        riseFade = Math.max(0, 1 - k * k * 1.15);
      }
    }
    const gather = Math.max(mg * 0.92, riseK);
    const rx = (30 + Math.sin(t * 0.7) * 1.5) * (1 - gather);
    const ry = rx * 0.42;
    const lit = p.starLit ? 1 : 0;
    const base = p.starFade ? 0.18 : (0.5 + lit * 0.25);
    const spr = this.spritesOn && typeof Sprites !== 'undefined'
      && Sprites.img && Sprites.img.proj_starfrag && Sprites.img.proj_starfrag.width;

    c.save();
    // 그림이 있으면 제 색으로(금빛이 하얗게 날아가지 않게), 없으면 빛으로 겹쳐 그린다
    if (!spr) c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = t * 0.7 + i * TAU / Math.max(n, 1);
      let x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry + riseY;
      /* 방금 얻은 조각(마지막 하나)은 3초에 걸쳐 위에서 내려와 궤도에 앉는다 — 얻는 장면. */
      if (this.starGain && i === n - 1) {
        const gk = Math.min(1, this.starGain.t / this.starGain.dur);
        const ease = 1 - Math.pow(1 - gk, 3);        // 빨리 내려와 천천히 앉는다
        y -= (1 - ease) * 240;
        x += (1 - ease) * 40;
      }
      // 뒤로 돌 때는 옅게 — 그래야 도는 것으로 보인다.
      const back = (riseK > 0.9 || Math.sin(a) >= 0) ? 1 : 0.45;
      const r = (2.6 + mg * 2.2 + riseK * 1.6) * (0.85 + 0.15 * Math.sin(t * 3 + i));
      c.globalAlpha = (base * back * (0.7 + 0.3 * Math.sin(t * 2.4 + i * 1.7))
                       + mg * 0.35 + riseK * 0.4) * riseFade;
      if (spr) {
        // 조각마다 반짝이는 박자를 어긋나게 둔다 — 다섯이 한꺼번에 깜빡이면 기계 같다
        const fr = Math.floor(t * 6 + i * 1.7) % 4;
        const w = r * 5.4;
        Sprites.drawFx(c, 'proj_starfrag', fr, x - w / 2, y - w / 2, w);
      } else {
        const g = c.createRadialGradient(x, y, 0, x, y, r * 3.2);
        g.addColorStop(0, lit ? '#fff6d8' : '#e8dcb8');
        g.addColorStop(0.35, lit ? 'rgba(255,224,138,.55)' : 'rgba(200,190,160,.4)');
        g.addColorStop(1, 'rgba(255,224,138,0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(x, y, r * 3.2, 0, TAU); c.fill();
        c.fillStyle = '#fff8e0';
        c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.fill();
      }
    }
    c.restore();
  },

  drawPlayer(c, p, sx, sy) {
    c.save();
    if (p.iframe > 0 && Math.floor(this.time * 24) % 2 === 0) c.globalAlpha = 0.45;
    /* ★ 주인공은 **손그림 시트 한 장이 전부**다(char/player_<id>.png, tools/mkplayer.py) — 사연: docs/code-history.md#h69 */
    const ch = CHAR_OF(p.charId);
    const fr = this.playerFrame(p);
    const key = 'player_' + ch.id;
    if (this.spritesOn && p.swimming && p.swimMove && !p.floating && !(p.swing > 0) && !p.channel
        && this.drawSwimPlayer(c, p, sx, sy, key)) { c.restore(); return; }
    if (this.spritesOn && Sprites.draw(c, key, fr, sx, sy, p.facing < 0)) {
      this.drawHeldWeapon(c, p, sx, sy, 0, this.playerHand(key, fr, sx, sy, p.facing < 0));
      c.restore();
      return;
    }
    /* 시트를 못 읽었으면 절차 렌더. */
    const f = 1;
    const skin = shade('#e8c39a', f), cloth = shade('#4a6fa8', f), pant = shade('#33384a', f), hair = shade('#3a2a1e', f);
    const bob = p.onGround && Math.abs(p.vx) > 20 ? Math.sin(this.time * 14) * 1.6 : 0;
    // 다리
    c.fillStyle = pant;
    const legSwing = p.onGround && Math.abs(p.vx) > 20 ? Math.sin(this.time * 14) * 4 : 0;
    c.fillRect(sx + 3, sy + 26 + bob, 6, 14 - bob);
    c.fillRect(sx + 11, sy + 26 + bob, 6, 14 - bob);
    if (legSwing) { c.fillRect(sx + 3 + legSwing, sy + 34, 6, 6); c.fillRect(sx + 11 - legSwing, sy + 34, 6, 6); }
    // 몸
    c.fillStyle = cloth; c.fillRect(sx + 2, sy + 13 + bob, 16, 15);
    // 머리
    c.fillStyle = skin; c.fillRect(sx + 4, sy + 2 + bob, 12, 12);
    c.fillStyle = hair; c.fillRect(sx + 3, sy + 1 + bob, 14, 5);
    c.fillRect(sx + (p.facing > 0 ? 3 : 14), sy + 1 + bob, 3, 9);
    // 눈
    c.fillStyle = '#1a1a22';
    c.fillRect(sx + (p.facing > 0 ? 11 : 6), sy + 7 + bob, 2, 2);
    this.drawHeldWeapon(c, p, sx, sy, bob);
    c.restore();
  },


  /** 시트에 적힌 이 프레임의 무기 손 — { pt:[x,y] 화면 좌표(손 가운데), box:[x,y,w,h], key, fr, flip } 또는 null. */
  playerHand(key, fr, sx, sy, flip) {
    const m = Sprites.meta && Sprites.meta.characters.sheets[key];
    if (!m || !m.hand || !m.hand[fr]) return null;
    const X0 = Math.round(sx) + m.ox, Y0 = Math.round(sy) + m.oy;
    const [hx, hy] = m.hand[fr], [bx0, by0, bx1, by1] = m.handBox[fr];
    const px = flip ? X0 + m.frameW - (hx + 0.5) : X0 + hx + 0.5;
    const bx = flip ? X0 + m.frameW - bx1 - 1 : X0 + bx0;
    return { pt: [px, Y0 + hy + 0.5], box: [bx, Y0 + by0, bx1 - bx0 + 1, by1 - by0 + 1], key, fr, flip };
  },

  /** 헤엄 — 따로 그린 헤엄 그림 없이 **걷기 네 장을 눕혀서** 돌린다(머리가 나아가는 쪽). */
  drawSwimPlayer(c, p, sx, sy, key) {
    const im = Sprites.img[key], m = Sprites.meta && Sprites.meta.characters.sheets[key];
    if (!im || !im.width || !m) return false;
    const dir = p.facing < 0 ? -1 : 1;
    const fr = 2 + (Math.floor((p.swimPh || 0) * 4) % 4);
    const a = clamp(Math.atan2(p.vy, Math.max(20, Math.abs(p.vx))), -1.1, 1.1);
    const S = Sprites.scale, fw = m.frameW, fh = m.frameH;
    // 판정 상자 가운데를 돌림 중심으로 — 시트 칸 안의 판정 상자 가운데는 (-ox + 10, -oy + 20)
    const ccx = -m.ox + p.w / 2, ccy = -m.oy + p.h / 2;
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(Math.round(sx + p.w / 2), Math.round(sy + p.h / 2));
    c.scale(dir, 1);
    c.rotate(Math.PI / 2 + a);                               // 머리(위)가 앞(오른쪽)으로
    c.drawImage(im, fr * fw * S, 0, fw * S, fh * S, -ccx, -ccy, fw, fh);
    c.restore();
    return true;
  },
};
mixin(G, RenderFxPart);

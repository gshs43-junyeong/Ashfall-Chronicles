/* ===== game/render-actors.js — 인물 그림 — 플레이어 · 몹 · 펫 · NPC · 든 무기 · 시체 ===== */
import { mixHex, shade } from '../../engine/core/color.js';
import { TAU, angleTo, clamp, dist } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { Beat, cycleFrame } from '../../engine/render/anim.js';
import { drawOutlined } from '../../engine/render/outline.js';
import { TILE_DEF } from '../data.js';
import { BOW_HAND, CHAR_OF } from '../data/start.js';
import { tileMat } from '../data/materials.js';
import { NPCS } from '../data/npcs.js';
import { PET_MOTION, dragonStage } from '../data/pets.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Art } from '../itemart.js';
import { Sprites } from '../sprites.js';
import { Part } from '../entity.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

/** 걷기 장(0~3) 가운데 발이 땅에 닿는 장 */
export const STEP_BEATS = [0, 2];
/** 바닥 재질 → 발소리 [음높이, 크기] */
export const STEP_FEEL: Record<string, [number, number]> = {
  stone: [0.82, 1], dirt: [1, 0.85], wood: [1.12, 0.95], metal: [1.25, 0.9], ice: [1.15, 0.8], plant: [0.95, 0.6], glass: [1.3, 0.8], bone: [1.1, 0.85],
};

export const RenderActorsPart: Bag = {

  /* ---- 프레임 선택 (우리 엔티티 필드 기준) ---- */
  /** 걸을 때 발밑 흙먼지 — 그림만(Part 는 충돌·판정이 없다). 걷기 프레임(9fps)의 발 딛는 두 칸에 맞춰
      절반쯤만 한 톨씩 — 매 프레임 뿌리면 달리기 내내 연기처럼 깔린다. */
  walkDust(p: Player) {
    this._stepBeat = this._stepBeat || new Beat();
    const step = this._stepBeat.hit(cycleFrame(this.time, 9, 4), STEP_BEATS);   // 걷기 장의 발 딛는 두 장(engine render/anim)
    if (!step || !p.onGround || p.swimming || Math.abs(p.vx) < 60) return;
    const w = this.world, fy = p.y + p.h + 1;
    const tx = Math.floor(p.cx / TS), ty = Math.floor(fy / TS);
    const d = TILE_DEF[w.get(tx, ty)];
    /* 발소리는 딛는 바닥 재질을 따른다 — 돌은 낮고 단단하게, 눈·풀은 낮고 작게, 나무·쇠는 높게 */
    const fs = STEP_FEEL[tileMat(w.get(tx, ty))] || STEP_FEEL.dirt;
    this.sfx('step', fs[0] * (0.92 + Math.random() * 0.16), fs[1]);
    if (w.liquid(tx, ty - 1) || Math.random() > 0.55) return;   // 얕은 물을 걸을 땐 먼지가 안 인다
    if (!d || !d.solid || !d.c) return;
    const n = Math.random() < 0.3 ? 2 : 1;
    for (let i = 0; i < n; i++)
      this.parts.push(new Part(p.cx - Math.sign(p.vx) * 5, fy - 2, mixHex(d.c, '#d2c6a8', 0.75), -22, 0.38,
        { spd: 0.2, r: 1, g: 0.2, drag: 0.9 }));
  },
  playerFrame(p: Player) {
    if (p.flash > 0.12) return 12;                                  // 피격
    if (p.dashV > 0) return 8;                                      // 대시
    if (p.swing > 0) return 9 + Math.min(2, Math.floor((0.24 - p.swing) / 0.08));
    if (!p.onGround) return p.vy < 0 ? 6 : 7;                       // 점프 / 낙하
    if (Math.abs(p.vx) > 20) return cycleFrame(this.time, 9, 4, 2);   // 걷기 네 장
    return cycleFrame(this.time, 2, 2);                                // 서기 두 장
  },
  enemyFrame(e: Enemy) {
    if (e.boss) {
      /* ★ 체력 문턱(66%/33%)을 여기서 다시 계산하면 안 된다. */
      const m = Sprites.meta && Sprites.meta.bosses.sheets[e.type];
      /* ★ 시트 끝의 **쓰러지는 칸**(death)은 마디가 아니다. */
      const idle = m ? m.count - (m.death || 0) : 6;
      const pairs = m ? Math.max(1, Math.floor(idle / 2)) : 3;   // 시트에 든 페이즈 그림 벌 수
      /* 비율로 나누므로 2페이즈는 **첫 벌과 마지막 벌**을 쓴다(가운데를 쓰면 두 마디 차이가 가장 작은 두 그림이 된다). */
      const sp = Math.min(pairs - 1, Math.round((e.pf || 0) * (pairs - 1)));
      return sp * 2 + (Math.floor(this.time * 2.5) % 2);
    }
    /* ★ 공격 직후는 atkPose 로 본다. */
    if (e.atkPose > 0) return 4;
    /* 말랑한 몹(ENEMIES squish)은 공중에서 걷기 두 장을 번갈아 돌리면 떨어뜨린 상자처럼 보였다 — 오를 땐 늘어난 장, 내릴 땐 둥근 장. */
    if (e.def.squish && !e.onGround) return e.vy < 0 ? 2 : 0;
    if (e.def.hop) return !e.onGround ? 3 : Math.abs(e.vx) > 6 ? 2 : 0;   // 깡충 — 뻗은 장은 공중만, 서 있을 땐 한 장(웅크림과 번갈면 들썩였다)
    if (Math.abs(e.vx) > 6) return 2 + (Math.floor(this.time * 7) % 2);
    return Math.floor(this.time * 2.4) % 2;
  },

  /** 비석 — 쓰러진 발밑 땅에 박힌 낡은 돌. 흙 둔덕 · 살짝 기운 아치 돌(왼쪽 빛 · 오른쪽 그늘 · 금 · 이끼) · 새긴 별 표식 ·
      발치의 꺼져 가는 초. 남은 시간이 줄면 돌이 바래고, 막 섰을 땐 땅에서 솟는다(t0). 넋불은 어둠 위에 따로(drawGraveGlow). */
  drawGrave(c: CanvasRenderingContext2D, dm: Bag, camX: number, camY: number) {
    const gx = Math.round(dm.x - camX), gy = Math.round(dm.y - camY);
    if (gx < -60 || gx > this.W + 60 || gy < -90 || gy > this.H + 60) return;
    const left = clamp(1 - (this.dayCount * 1440 + this.dayT - (dm.at || 0)) / 720, 0, 1);
    const rise = dm.t0 !== undefined ? clamp((this.time - dm.t0) / 0.8, 0, 1) : 1;
    const sink = Math.round((1 - rise * rise * (3 - 2 * rise)) * 30);
    const tilt = ((Math.floor(dm.x / TS) * 7) % 5 - 2) * 0.03;
    const R = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    c.save();
    // 흙 둔덕 — 돌이 솟을 때도 그대로
    R(gx - 15, gy - 3, 30, 3, '#3a2e24'); R(gx - 12, gy - 5, 24, 2, '#4a3a2c'); R(gx - 8, gy - 6, 16, 1, '#57452f');
    c.beginPath(); c.rect(gx - 30, gy - 80, 60, 77); c.clip();        // 땅 밑으로 들어간 몫은 안 보이게
    c.translate(gx, gy - 4 + sink); c.rotate(tilt);
    c.globalAlpha = 0.55 + 0.45 * left;
    const W = 9, H = 26;                                                // 반폭 · 높이
    // 몸 — 아치 머리 + 곧은 몸, 왼쪽은 빛 · 오른쪽은 그늘
    for (let y = -H; y <= 0; y++) {
      const ay = y + H, half = ay < W ? Math.round(Math.sqrt(W * W - (W - ay) * (W - ay))) : W;
      for (let x = -half; x < half; x++) {
        const u = (x + 0.5) / half;
        const n = ((x * 13 + y * 7) & 7);
        const col = u < -0.55 ? '#8f897b' : u < 0.25 ? (n === 0 ? '#6f6a5e' : '#7a7468') : u < 0.7 ? '#625d52' : '#4c4840';
        R(x, y, 1, 1, col);
      }
      R(-half - 1, y, 1, 1, '#2a2722'); R(half, y, 1, 1, '#2a2722');     // 윤곽
    }
    for (let x = -W + 2; x < W - 2; x++) { const ay = W - Math.round(Math.sqrt(W * W - x * x)); R(x, -H + ay - 1, 1, 1, '#2a2722'); }
    // 새긴 별 표식(별이 잠든 땅) — 파인 홈은 어둡고 아랫변에 빛 한 줄
    const star: number[][] = [[0, -19], [0, -18], [-1, -17], [0, -17], [1, -17], [-3, -16], [-2, -16], [-1, -16], [0, -16], [1, -16], [2, -16], [3, -16],
      [-1, -15], [0, -15], [1, -15], [-2, -14], [2, -14], [-2, -13], [2, -13]];
    for (const [x, y] of star) R(x, y + 1, 1, 1, '#9a9484');
    for (const [x, y] of star) R(x, y, 1, 1, '#2e2b25');
    // 가로 홈 두 줄(이름이 닳아 지워진 자리)
    R(-5, -9, 10, 1, '#4a463d'); R(-4, -6, 8, 1, '#4a463d'); R(-5, -8, 10, 1, '#8a8477');
    // 금 · 이끼
    R(4, -22, 1, 3, '#3a362f'); R(5, -19, 1, 2, '#3a362f'); R(4, -17, 1, 2, '#3a362f');
    R(-9, -3, 4, 3, '#5d6b42'); R(-8, -5, 2, 2, '#6f7f4c'); R(6, -2, 3, 2, '#55613c'); R(-7, -24, 2, 1, '#6a7848');
    c.restore();
    // 발치의 초 — 꺼져 가는 불(남은 시간만큼 키)
    if (rise >= 1) {
      const cx = gx + 12, h = 3 + Math.round(left * 4);
      R(cx - 1, gy - 4 - h, 3, h, '#d8cfb8'); R(cx - 1, gy - 4 - h, 1, h, '#f0e8d4'); R(cx - 2, gy - 4, 5, 1, '#6a5a44');
      if (left > 0) {
        const fl = Math.sin(this.time * 9 + dm.x) * 0.6;
        R(cx + Math.round(fl), gy - 6 - h, 1, 2, '#ffd27a'); R(cx, gy - 5 - h, 1, 1, '#fff2c0');
      }
    }
    if (sink > 2 && Math.random() < 0.6)                                   // 솟을 때 흙먼지
      this.parts.push(new Part(dm.x + (Math.random() - 0.5) * 22, dm.y - 2, '#6a5642', -60, 0.35, { spd: 0.4, r: 0.7 }));
  },
  /** 비석의 넋불 — 어둠을 덮은 뒤에 얹어 굴 속 · 밤에도 보인다. 돌 위에서 숨 쉬듯 오르내리고 작은 불티가 피어오른다. */
  drawGraveGlow(c: CanvasRenderingContext2D, dm: Bag, camX: number, camY: number) {
    const left = clamp(1 - (this.dayCount * 1440 + this.dayT - (dm.at || 0)) / 720, 0, 1);
    if (left <= 0 || (dm.t0 !== undefined && this.time - dm.t0 < 0.8)) return;
    const gx = dm.x - camX, gy = dm.y - camY - 44 + Math.sin(this.time * 1.7) * 3;
    if (gx < -80 || gx > this.W + 80 || gy < -80 || gy > this.H + 80) return;
    const a = (0.55 + 0.25 * Math.sin(this.time * 2.3)) * (0.4 + 0.6 * left);
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, 26);
    g.addColorStop(0, `rgba(255,236,170,${a})`); g.addColorStop(0.25, `rgba(255,200,110,${a * 0.5})`); g.addColorStop(1, 'rgba(255,170,80,0)');
    c.fillStyle = g; c.fillRect(gx - 26, gy - 26, 52, 52);
    c.fillStyle = `rgba(255,248,220,${Math.min(1, a + 0.3)})`; c.fillRect(Math.round(gx) - 1, Math.round(gy) - 1, 3, 3);
    for (let i = 0; i < 4; i++) {                                         // 오르는 불티 — 시간으로 정한 자리라 입자를 안 쌓는다
      const ph = (this.time * 0.45 + i / 4) % 1;
      const mx = gx + Math.sin((ph + i) * 6.3) * 6, my = gy + 6 - ph * 30;
      c.fillStyle = `rgba(255,214,130,${(1 - ph) * a})`; c.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
    c.restore();
  },
  /** 쓰러진 플레이어(여럿일 때) — 바닥에 누운 잿빛 몸 + 빠져나가는 넋. 남의 화면에서도 누가 쓰러졌는지 한눈에 보이게
      (혼자일 때는 죽음 창이 화면을 덮는다). 몸은 판정 상자 가운데를 축으로 눕혀 아래 끝이 바닥에 닿는다. */
  drawDowned(c: CanvasRenderingContext2D, p: Player, sx: number, sy: number) {
    const key = 'player_' + CHAR_OF(p.charId).id, dir = p.facing < 0 ? 1 : -1;
    c.save();
    c.translate(sx + p.w / 2, sy + p.h - p.w / 2 - 1);
    c.rotate(dir * Math.PI / 2);
    c.filter = 'grayscale(0.75) brightness(0.7)';
    if (!(this.spritesOn && Sprites.draw(c, key, 12, -p.w / 2, -p.h / 2, p.facing < 0))) {
      c.fillStyle = '#5a5e6a'; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    c.restore();
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const k = ((this.time * 0.55 + i / 3) % 1), x = sx + p.w / 2 + Math.sin(this.time * 2.2 + i * 2.1) * 5 * k;
      const y = sy + p.h - 14 - k * 46, r = 7 - k * 3;
      const g = c.createRadialGradient(x, y, 0, x, y, r * 2.2);
      g.addColorStop(0, `rgba(200,215,255,${0.55 * (1 - k)})`); g.addColorStop(1, 'rgba(160,180,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.2, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
  drawPlayer(c: CanvasRenderingContext2D, p: Player, sx: number, sy: number) {
    if (p.hp <= 0 && this.net) { this.drawDowned(c, p, sx, sy); return; }
    c.save();
    if (p.iframe > 0 && Math.floor(this.time * 24) % 2 === 0) c.globalAlpha = 0.45;
    /* ★ 주인공은 **손그림 시트 한 장이 전부**다(char/player_<id>.png, tools/mkplayer.py) — 사연: docs/code-history.md#h69 */
    const ch = CHAR_OF(p.charId);
    const fr = this.playerFrame(p);
    const key = 'player_' + ch.id;
    const swim = this.spritesOn && p.swimming && p.swimMove && !p.floating && !(p.swing > 0) && !p.channel;
    /* 물속에서는 몹(drawEnemy 의 헤엄 몹)과 같은 식으로 — 어두운 그림자 윤곽 + 등에 맺힌 빛 한 줄. 발광은 쓰지 않는다(어둠에선 같이 어둡다) */
    if (this.spritesOn && this.world.liquid(Math.floor(p.cx / TS), Math.floor(p.cy / TS)))
      drawOutlined(c, (ox, oy) => swim ? this.drawSwimPlayer(c, p, sx + ox, sy + oy, key) : Sprites.draw(c, key, fr, sx + ox, sy + oy, p.facing < 0));
    if (swim && this.drawSwimPlayer(c, p, sx, sy, key)) { c.restore(); return; }
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
  playerHand(key: string, fr: any, sx: number, sy: number, flip: boolean) {
    const m = Sprites.meta && Sprites.meta.characters.sheets[key];
    if (!m || !m.hand || !m.hand[fr]) return null;
    const X0 = Math.round(sx) + m.ox, Y0 = Math.round(sy) + m.oy;
    const [hx, hy] = m.hand[fr], [bx0, by0, bx1, by1] = m.handBox[fr];
    const px = flip ? X0 + m.frameW - (hx + 0.5) : X0 + hx + 0.5;
    const bx = flip ? X0 + m.frameW - bx1 - 1 : X0 + bx0;
    return { pt: [px, Y0 + hy + 0.5], box: [bx, Y0 + by0, bx1 - bx0 + 1, by1 - by0 + 1], key, fr, flip };
  },

  /** 헤엄 — 따로 그린 헤엄 그림 없이 **걷기 네 장을 눕혀서** 돌린다(머리가 나아가는 쪽). */
  drawSwimPlayer(c: CanvasRenderingContext2D, p: Player, sx: number, sy: number, key: string) {
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

  /** 장착한 펫을 플레이어 뒤에 둥실둥실 띄워 그린다 (별도 물리 없이 위치만 따라감) */
  /** 펫 — 손그림 시트가 있으면 그것으로, 없으면 itemart 의 절차 생성 아이콘으로. */
  drawPet(c: CanvasRenderingContext2D, pet: any, camX: number, camY: number) {
    const sx = Math.round(pet.x - camX), sy = Math.round(pet.y - camY);
    const S = 20;
    c.save();
    c.imageSmoothingEnabled = false;
    // 공격 직후 잠깐 밝게 — 뭘 하고 있는지 눈에 보이게
    if (pet.flash > 0) { c.shadowColor = pet.def.c; c.shadowBlur = 10; }
    /* 손그림 시트가 있으면 그쪽을 쓴다. */
    /* 드래곤은 단계마다 시트가 따로다(pet_<id>_s<단계>) — 날갯짓 flap 장을 초당 9장으로 돌고, 공격 직후엔 숨결 장 */
    const key = pet.def.dragon ? `pet_${pet.id}_s${dragonStage(pet.lvOf(this.player))}` : 'pet_' + pet.id;
    const sheet = this.spritesOn && Sprites.meta && Sprites.meta.characters.sheets[key];
    if (sheet) {
      const mo = PET_MOTION[pet.id] || {}, fps = mo.fps || 3, ph = (this.time * fps + pet.slot) * Math.PI;
      const idle = sheet.idle || 2;                     // 떠 있기 장 수 — 사이 장을 구운 펫은 넷, 공격 장은 그다음
      const fr = sheet.flap ? (pet.flash > 0 ? sheet.flap : Math.floor(this.time * 9 + pet.slot * 2) % sheet.flap)
        : pet.flash > 0 ? idle : (Math.floor(this.time * fps + pet.slot) % idle);
      /* 공격 순간 — 근접은 과녁 쪽으로 달려들고, 쏘는 펫은 반동으로 살짝 물러난다 */
      const a = pet.def.atk, hit = pet.flash > 0 ? pet.flash / 0.18 : 0;
      const lunge = hit ? pet.facing * (a && a.k === 'melee' ? 8 : -2) * Math.sin(hit * Math.PI) : 0;
      c.save(); c.translate(sx + lunge, sy + (mo.bob || 0) * Math.sin(ph));
      if (mo.tilt) c.rotate(mo.tilt * Math.sin(ph) * pet.facing);
      if (mo.spin) c.rotate(mo.spin * Math.sin(ph * 0.5));
      const sc = 1 + (mo.pulse || 0) * Math.sin(ph);
      c.scale(sc * (1 - (mo.flapX || 0) * Math.abs(Math.sin(ph))), sc);
      const ok = Sprites.draw(c, key, fr, -sheet.frameW / 2, -sheet.frameH / 2, pet.facing < 0);
      c.restore();
      if (ok) { c.restore(); return; }
    }
    if (pet.facing < 0) { c.translate(sx * 2, 0); c.scale(-1, 1); }
    Art.draw(c, 'p:' + pet.id, sx - S / 2, sy - S / 2, S);
    c.restore();
  },

  drawEnemy(c: any, e: any, sx: any, sy: any) {
    if (e.def.ai === 'flotsam') { this.drawFlotsam(c, e, sx, sy); return; }
    /* 손그림 스프라이트 우선. */
    /* 개조된 개체는 원래 시트를 강철로 눕힌 사본으로 그린다(Sprites.mechSheet). */
    const key0 = (e.mech && this.spritesOn && Sprites.mechSheet && Sprites.mechSheet(e.type))
      ? 'mech_' + e.type : e.type;
    const burning = e.dots && e.dots.some((d: any) => d.kind === 'burn' || d.kind === 'fire');
    const key = !this.spritesOn ? key0 : burning && Sprites.burnSheet(key0) ? 'burn_' + key0
      : e.chillT > 0 && Sprites.frostSheet(key0) ? 'frost_' + key0 : key0;   // 타면 달군 사본 · 얼면 언 사본(윤곽째)
    const meta = this.spritesOn && Sprites.meta &&
      (Sprites.meta.characters.sheets[key] || Sprites.meta.bosses.sheets[key]);
    // Sprites.footInset가 실측한 여백이라 그만큼 덜 밀어 올린다.
    /* ★ max(0, …) 를 쓰면 안 된다. */
    /* 장마다 발 높이가 다른 시트(매니페스트 feet — 0번 장 기준 발끝 차이 px)는 그만큼 내려 발을 한 줄에 맞춘다.
       토끼는 웅크린 장이 1px 낮고 뻗은 장이 2~3px 높아, 장이 바뀔 때마다 제자리에서 둠칫거렸다. */
    const m0 = meta && (Sprites.meta.characters.sheets[key0] || Sprites.meta.bosses.sheets[key0]);
    const feet = m0 && m0.feet ? m0.feet[this.enemyFrame(e)] || 0 : 0;
    const dy = meta ? meta.frameH - e.h - (Sprites.footInset[key] || 0) + feet : 0;
    /* ★ 가로는 **프레임이 아니라 그림**을 가운데 맞춘다. */
    const side = meta ? (Sprites.sideInset[key] || 0) * (e.facing < 0 ? -1 : 1) : 0;
    const dx = meta ? (e.w - meta.frameW) / 2 - side : 0;

    /* 물속 몹은 어둡게 깔린 물 위에 제 색이 묻혀 안 보인다 — 웅덩이 뱀장어(#3a6a5a)는 어두운 물과 거의 같은 색이라 "보이지 않는 몬스터"가 됐다. */
    const wet = e.type === 'grotto_eel' && this.world.liquid(Math.floor(e.cx / TS), Math.floor(e.cy / TS));
    if (this.spritesOn && wet && meta) {
      drawOutlined(c, (ox, oy) => Sprites.draw(c, key, this.enemyFrame(e), sx + dx + ox, sy - dy + oy, e.facing < 0),
        { light: true, dark: 0.5, offsets: [[-2, 0], [2, 0], [0, -2], [0, 2]] });
    } else if (this.spritesOn && meta && e.def.ai === 'swimmer'
      && this.world.liquid(Math.floor(e.cx / TS), Math.floor(e.cy / TS))) {
      /* 물속 몹은 물색과 명도가 비슷해(암초 상어 #5a6a78 : 바닷물 #12496e) 윤곽이 풀린다.
         발광 대신 물속에서 실제로 보이는 식으로 — 아래·옆은 어두운 그림자 윤곽,
         위는 수면에서 내려오는 빛이 등에 맺힌 한 줄. 둘 다 조명 아래라 어둠에선 같이 어둡다. */
      const fr = this.enemyFrame(e), fl = e.facing < 0, bx = sx + dx, by = sy - dy;
      drawOutlined(c, (ox, oy) => Sprites.draw(c, key, fr, bx + ox, by + oy, fl));
    }

    /* 말랑한 몹 — 공중에선 속도만큼 세로로 늘고(최대 10%) 폭은 그만큼 준다. 부피가 같아 말랑하게 읽힌다. */
    if (e.def.squish && !e.onGround && this.spritesOn && meta) {
      const k = 1 + Math.min(0.1, Math.abs(e.vy) / 4000);
      c.save();
      c.translate(sx + e.w / 2, sy + e.h);
      c.scale(1 / k, k);
      c.translate(-(sx + e.w / 2), -(sy + e.h));
      const ok = Sprites.draw(c, key, this.enemyFrame(e), sx + dx, sy - dy, e.facing < 0);
      if (ok) this.enemyFlash(c, e, key, sx + dx, sy - dy);
      c.restore();
      if (ok) { this.drawEnemyOverlay(c, e, sx, sy, dy, meta, dx); return; }
    }

    /* 그림이 거의 안 움직이는 개체는(ENEMIES 의 stiff — 프레임 간 픽셀 차를 재서 골랐다) 렌더러가 대신 흔들어 준다. */
    const st = e.def.stiff;
    if (st && this.spritesOn) {
      const moving = Math.abs(e.vx) > 6;
      if (moving) {
        const ph = this.time * 7 * Math.PI;                 // 걸음 프레임과 같은 박자
        const bob = Math.abs(Math.sin(ph)) * 2.6 * st;
        const lean = Math.sin(ph * 0.5) * 0.035 * st * (e.facing < 0 ? -1 : 1);
        c.save();
        c.translate(sx + e.w / 2, sy + e.h);
        c.rotate(lean);
        c.translate(-(sx + e.w / 2), -(sy + e.h) - bob);
      } else {
        const br = Math.sin(this.time * 2.4 * Math.PI) * 1.1 * st;   // idle 박자
        c.save();
        c.translate(0, br);
      }
      const ok = Sprites.draw(c, key, this.enemyFrame(e), sx + dx, sy - dy, e.facing < 0);
      if (ok) this.enemyFlash(c, e, key, sx + dx, sy - dy);
      c.restore();
      if (ok) { this.drawEnemyOverlay(c, e, sx, sy, dy, meta, dx); return; }
    }

    if (this.spritesOn && Sprites.draw(c, key, this.enemyFrame(e), sx + dx, sy - dy, e.facing < 0)) {
      this.enemyFlash(c, e, key, sx + dx, sy - dy);
      this.drawEnemyOverlay(c, e, sx, sy, dy, meta, dx);
      return;
    }
    const f = 1;
    // 그림이 없어 절차 생성으로 떨어지는 경로 — 개조된 것은 여기서도 강철색이라야 세기만 다르고 생김새는 같은 몹이 되는 일이 없다
    let col = e.mech ? '#79838f' : e.def.c;
    if (e.flash > 0) col = '#ffffff';
    c.save();
    const t = e.type;
    if (e.def.ai === 'jumper' || t === 'king_slime') {
      const sq = e.onGround ? 1 : 0.86;
      const hh = e.h * sq, ww = e.w * (2 - sq);
      c.fillStyle = col; c.globalAlpha = .88;
      c.beginPath(); c.roundRect(sx - (ww - e.w) / 2, sy + (e.h - hh), ww, hh, 8); c.fill();
      c.globalAlpha = 1; c.fillStyle = '#1a1a22';
      c.fillRect(sx + ww * .26, sy + e.h - hh * .62, 4, 5); c.fillRect(sx + ww * .62, sy + e.h - hh * .62, 4, 5);
      if (t === 'king_slime') { c.fillStyle = shade('#d8b13d', f); c.fillRect(sx + e.w * .3, sy + e.h - hh - 8, e.w * .4, 8); }
    } else if (e.def.ai === 'flyer') {
      c.fillStyle = col;
      const flap = Math.sin(this.time * 18) * 6;
      c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h / 2, e.w * .32, e.h * .42, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(sx + e.w / 2, sy + e.h / 2);
      c.lineTo(sx - 6, sy + e.h / 2 - flap); c.lineTo(sx + 4, sy + e.h / 2 + 6); c.fill();
      c.beginPath(); c.moveTo(sx + e.w / 2, sy + e.h / 2);
      c.lineTo(sx + e.w + 6, sy + e.h / 2 - flap); c.lineTo(sx + e.w - 4, sy + e.h / 2 + 6); c.fill();
      c.fillStyle = '#ff5a5a'; c.fillRect(sx + e.w * .34, sy + e.h * .38, 3, 3); c.fillRect(sx + e.w * .58, sy + e.h * .38, 3, 3);
    } else if (e.def.ai === 'swimmer') {
      // 물속 생물 — 몸통 하나에 꼬리지느러미.
      const wag = Math.sin(this.time * 9 + e.x * .05) * (e.h * .28);
      const fx = e.facing < 0 ? -1 : 1;
      const mx = sx + e.w / 2, my = sy + e.h / 2;
      c.fillStyle = col; c.globalAlpha = .95;
      c.beginPath(); c.ellipse(mx, my, e.w * .40, e.h * .42, 0, 0, TAU); c.fill();
      c.beginPath();                                   // 꼬리
      c.moveTo(mx - fx * e.w * .34, my);
      c.lineTo(mx - fx * (e.w * .62), my - e.h * .40 + wag);
      c.lineTo(mx - fx * (e.w * .62), my + e.h * .40 + wag);
      c.closePath(); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = shade(col, 1.45);                  // 등지느러미
      c.fillRect(mx - e.w * .10, my - e.h * .56, e.w * .22, e.h * .18);
      c.fillStyle = e.def.passive ? '#e8f4ff' : '#ffcf5a';
      c.fillRect(mx + fx * e.w * .20, my - e.h * .10, 3, 3);
    } else if (e.def.ai === 'caster' || e.boss) {
      c.fillStyle = col; c.globalAlpha = .92;
      c.beginPath(); c.roundRect(sx, sy, e.w, e.h, 10); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = '#0e0e14'; c.fillRect(sx + e.w * .2, sy + e.h * .22, e.w * .6, e.h * .24);
      c.fillStyle = e.boss ? '#ff7a4a' : '#ffdd66';
      const ey = Math.sin(this.time * 3) * 1.5;
      c.fillRect(sx + e.w * .27, sy + e.h * .28 + ey, e.w * .16, e.h * .1);
      c.fillRect(sx + e.w * .57, sy + e.h * .28 + ey, e.w * .16, e.h * .1);
      if (e.boss) {
        c.globalAlpha = .2; c.fillStyle = e.def.c;
        c.beginPath(); c.arc(sx + e.w / 2, sy + e.h / 2, e.w * (0.9 + Math.sin(this.time * 3) * .08), 0, TAU); c.fill();
        c.globalAlpha = 1;
      }
    } else {
      // 인간형
      c.fillStyle = col;
      c.fillRect(sx + 2, sy + e.h * .3, e.w - 4, e.h * .5);
      c.fillRect(sx + 3, sy + e.h * .8, 5, e.h * .2);
      c.fillRect(sx + e.w - 8, sy + e.h * .8, 5, e.h * .2);
      c.fillStyle = shade(e.def.c, f * 1.12);
      c.fillRect(sx + 3, sy + 2, e.w - 6, e.h * .28);
      c.fillStyle = '#1a1a22';
      c.fillRect(sx + (e.facing > 0 ? e.w - 9 : 5), sy + e.h * .12, 3, 3);
      if (e.type === 'archer') { c.strokeStyle = shade('#8a6a3a', f); c.beginPath(); c.arc(sx + e.w / 2 + e.facing * 10, sy + e.h * .45, 9, -1, 1); c.stroke(); }
    }
    c.restore();
    // 체력바
    if (e.hp < e.maxHp && !e.boss) {
      const bw = Math.max(22, e.w);
      c.fillStyle = '#000a'; c.fillRect(sx + (e.w - bw) / 2, sy - 8, bw, 4);
      c.fillStyle = '#d0564c'; c.fillRect(sx + (e.w - bw) / 2, sy - 8, bw * (e.hp / e.maxHp), 4);
    }
  },
  /** 마을 경비병 — 여명 마을의 남색 겉옷에 창과 활 */
  drawGuard(c: any, e: any, sx: any, sy: any) {
    const f = e.face || 1, t = this.time;
    // 손그림 시트가 있으면 그걸로 (일반 몹과 같은 7프레임 규격)
    if (this.spritesOn && Sprites.img.npc_guard) {
      c.fillStyle = '#00000038';
      c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h, 11, 3.5, 0, 0, TAU); c.fill();
      const fr = e.shootCd > 0.85 || e.atkCd > 0.5 ? 4
        : Math.abs(e.vx) > 6 ? 2 + (Math.floor(t * 7) % 2)
          : Math.floor(t * 2.4) % 2;
      if (Sprites.draw(c, 'npc_guard', fr, sx, sy, f < 0)) {
        if (e.hp < e.maxHp) {
          c.fillStyle = '#00000088'; c.fillRect(sx - 2, sy - 7, e.w + 4, 3);
          c.fillStyle = '#5fc45f'; c.fillRect(sx - 2, sy - 7, (e.w + 4) * clamp(e.hp / e.maxHp, 0, 1), 3);
        }
        return;
      }
    }
    const bob = e.onGround && Math.abs(e.vx) > 20 ? Math.sin(t * 11) * 1.4 : 0;
    c.save();
    c.fillStyle = '#00000038';
    c.beginPath(); c.ellipse(sx + e.w / 2, sy + e.h, 11, 3.5, 0, 0, TAU); c.fill();
    c.fillStyle = '#2f3f5e'; c.fillRect(sx + 3, sy + 14 + bob, 14, 18);           // 겉옷
    c.fillStyle = '#3f5580'; c.fillRect(sx + 4, sy + 15 + bob, 12, 8);
    c.fillStyle = '#d8a94b'; c.fillRect(sx + 8, sy + 17 + bob, 4, 12);            // 문장 띠
    c.fillStyle = '#33333a'; c.fillRect(sx + 4, sy + 31, 5, 9);                   // 다리
    c.fillRect(sx + 11, sy + 31, 5, 9);
    c.fillStyle = '#c8a488'; c.fillRect(sx + 5, sy + 4 + bob, 10, 11);            // 얼굴
    c.fillStyle = '#6a7a8e'; c.fillRect(sx + 4, sy + 2 + bob, 12, 6);             // 투구
    c.fillRect(sx + (f > 0 ? 13 : 3), sy + 6 + bob, 3, 7);                        // 볼가리개
    c.fillStyle = '#8a6a3a';                                                       // 창
    c.fillRect(sx + (f > 0 ? 16 : 2), sy + 6 + bob, 2, 26);
    c.fillStyle = '#c8ccd4';
    c.fillRect(sx + (f > 0 ? 15.5 : 1.5), sy + 2 + bob, 3, 6);
    if (e.hp < e.maxHp) {                                                          // 체력
      c.fillStyle = '#00000088'; c.fillRect(sx - 2, sy - 7, e.w + 4, 3);
      c.fillStyle = '#5fc45f'; c.fillRect(sx - 2, sy - 7, (e.w + 4) * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
    c.restore();
  },
  drawWolf(c: CanvasRenderingContext2D, e: Enemy, sx: number, sy: number) {
    c.save();
    c.globalAlpha = .65 + Math.sin(this.time * 6) * .1;
    c.fillStyle = '#9fd8ff';
    c.beginPath(); c.roundRect(sx, sy + 4, e.w, e.h - 4, 5); c.fill();
    c.beginPath(); c.moveTo(sx + e.w - 4, sy + 4); c.lineTo(sx + e.w + 6, sy); c.lineTo(sx + e.w + 6, sy + 12); c.fill();
    c.fillStyle = '#fff'; c.fillRect(sx + e.w, sy + 4, 3, 3);
    c.restore();
  },
  drawNpc(c: CanvasRenderingContext2D, o: Bag, sx: number, sy: number, f: any) {
    const d = NPCS[o.npc], p = this.player;
    /* 1순위 — 손그림 캐릭터 시트(char/npc_*.png, 매니페스트 키 npcw_*). */
    const flip = o.x + o.w / 2 > p.cx;                      // 늘 플레이어 쪽을 본다
    const fr = Math.floor(this.time * 1.6 + o.x * 0.05) % 2;
    // 시트 프레임(40px)이 판정 박스(44px)보다 짧아서, 위쪽을 맞춰 그리면 발이 바닥에서 4px 뜬다.
    const meta = this.spritesOn && Sprites.meta && Sprites.meta.characters.sheets['npcw_' + d.art];
    const dy = meta ? meta.frameH - o.h - (Sprites.footInset['npcw_' + d.art] || 0) : 0;
    // 적과 같은 정렬 — 그림 중심을 판정 박스 중심에.
    const nside = meta ? (Sprites.sideInset['npcw_' + d.art] || 0) * (flip ? -1 : 1) : 0;
    const dx = meta ? (o.w - meta.frameW) / 2 - nside : 0;
    if (!(this.spritesOn && Sprites.draw(c, 'npcw_' + d.art, fr, sx + dx, sy - dy, flip))) {
      c.fillStyle = shade(d.c!, f);
      c.fillRect(sx + 3, sy + 14, 16, 20);
      c.fillRect(sx + 5, sy + 34, 5, 10); c.fillRect(sx + 13, sy + 34, 5, 10);
      const im = this.spritesOn && Sprites.img['npc_' + d.art];
      if (im && im.width) {
        c.save();
        c.imageSmoothingEnabled = false;
        c.drawImage(im, sx + o.w / 2 - 14, sy - 2, 28, 28);
        c.restore();
      } else {
        c.fillStyle = shade('#e8c39a', f); c.fillRect(sx + 5, sy + 3, 12, 12);
        c.fillStyle = shade('#2a2018', f); c.fillRect(sx + 4, sy + 2, 14, 4);
        c.fillStyle = '#1a1a22'; c.fillRect(sx + 8, sy + 8, 2, 2); c.fillRect(sx + 13, sy + 8, 2, 2);
      }
    }
    // 상호작용 표시 — 이모지 대신 나침반과 같은 손그림 말풍선 아이콘을 재사용
    if (dist(p.cx, p.cy, o.x + o.w / 2, o.y + o.h / 2) < TS * 7) {
      c.globalAlpha = .6 + Math.sin(this.time * 4) * .3;
      this.drawCompassGlyph(c, 'npc', sx + o.w / 2, sy - 9, '#e8c86a');
      c.globalAlpha = 1;
    }
  },

  /** 지금 겨누고 있는 각도 — doAttack 이 화살을 쏘는 각도와 같은 식이다. */
  aimAngle(p: Player) {
    const i = this.input;
    if (!i || i.wx === undefined || i.wy === undefined) return p.facing > 0 ? 0 : Math.PI;
    return angleTo(p.cx, p.cy, i.wx, i.wy);
  },

  drawHeldWeapon(c: any, p: any, sx: any, sy: any, bob: any, hand: any) {
    /* 손에 그려지는 것은 "지금 실제로 쓰는 것"이어야 한다 — 핫바에 도구·낚싯대가 있으면 그것을, 아니면 장착 무기를. */
    const hi = p.held(), hd = hi && idef(hi);
    const tool = hd && (hd.type === 'tool' || hd.type === 'rod') ? hi : null;
    const wep = tool || p.equip.weapon;
    /* hand(game.js playerHand — 시트에 적힌 이 프레임의 무기 손)가 있으면 **그 손이 곧 자루 자리**다 — 사연: docs/code-history.md#h73 */
    const piv = hand ? hand.pt : [sx + 10, sy + 20 + bob];
    this._rodHand = hand ? piv : null;
    if (wep) {
      const d = idef(wep);
      c.save();
      c.translate(piv[0], piv[1]);
      if (hd && hd.type === 'rod') {
        /* 낚싯대는 아이템 그림(릴·줄·고리까지 그려진 32칸 도안)을 그대로 들면 손 옆에서 뭉개져 무엇인지 안 읽힌다. */
        const L = this.rodLook(wep.id);
        c.scale(p.facing > 0 ? 1 : -1, 1);
        c.rotate(-0.4);
        c.lineCap = 'round';
        const line = (col: string, w: number) => {
          c.strokeStyle = col; c.lineWidth = w;
          c.beginPath(); c.moveTo(-3, 0); c.lineTo(L.len, 0); c.stroke();
        };
        line('#241c14', L.w + 1.6);                                 // 어두운 심 — 배경과 안 붙게
        line(L.c, L.w);
        c.strokeStyle = L.grip; c.lineWidth = L.w + 1.2;            // 손잡이
        c.beginPath(); c.moveTo(-3, 0); c.lineTo(4, 0); c.stroke();
        c.fillStyle = L.tip;                                        // 대 끝 — 등급 표시
        c.fillRect(L.len - 4, -L.w / 2 - 1, 4, L.w + 2);
        c.lineWidth = 1; c.lineCap = 'butt';
        c.restore();
      } else if (!tool && d.wc === 'ranged') {
        /* 활·쇠뇌·총은 겨눈 쪽을 향해야 한다. */
        c.rotate(this.aimAngle(p));
        c.translate(hand ? 3 : BOW_HAND, 0);  // 팔을 뻗은 만큼 앞으로 — 손 자리면 이미 팔 끝이라 조금만
        Art.drawItem(c, wep.id, -13, -13, 26);
        c.restore();
      } else {
        if (tool && p.swing <= 0) {
          /* 도구는 **거울로 뒤집어** 그린다 — 사연: docs/code-history.md#h74 */
          c.scale(p.facing > 0 ? 1 : -1, 1);
          c.rotate(-0.4);
        } else {
          const ang = p.swing > 0
            ? (p.swingAng + (p.swingDir > 0 ? 1 : -1) * (p.swing / 0.24 - 0.5) * 2.0)
            : (p.facing > 0 ? -0.4 : Math.PI + 0.4);
          c.rotate(ang);
        }
        // 스프라이트는 위를 향하므로 90° 돌려 자루가 손에 오게 한다 — 손 자리면 자루 끝이 손을 한 칸 지나게(12)
        c.translate(hand ? 12 : 15, 0); c.rotate(Math.PI / 2);
        Art.drawItem(c, wep.id, -13, -13, 26);
        c.restore();
      }
      // 스윙 궤적 — 무기를 실제로 휘두를 때만(도구를 들고 있으면 베는 게 아니다)
      if (!tool && p.swing > 0 && d.wc === 'melee') {
        c.globalAlpha = p.swing / 0.24 * 0.32;
        c.strokeStyle = '#fff2c8'; c.lineWidth = 4;
        c.beginPath();
        c.arc(piv[0], piv[1], p.swingReach * 0.8, p.swingAng - 0.9, p.swingAng + 0.9);
        c.stroke(); c.lineWidth = 1; c.globalAlpha = 1;
      }
    }
    /* 손을 무기 **위에** 한 번 더 — 시트의 손 칸만 잘라 다시 그리면 손가락이 자루를 감싼 것처럼 보인다. */
    if (hand && wep) {
      c.save();
      c.beginPath(); c.rect(hand.box[0], hand.box[1], hand.box[2], hand.box[3]); c.clip();
      Sprites.draw(c, hand.key, hand.fr, sx, sy, hand.flip);
      c.restore();
    }
    if (p.fish) this.drawFishLine(c, p, sx, sy, bob);
    if (p.channel) {
      c.globalAlpha = .5; c.strokeStyle = '#ffcf6a'; c.lineWidth = 3;
      c.beginPath(); c.arc(sx + 10, sy + 20, 60 + Math.sin(this.time * 20) * 8, 0, TAU); c.stroke();
      c.lineWidth = 1; c.globalAlpha = 1;
    }
  },

  /** 손그림 몹 위에 얹는 것들 — 피격 섬광 · 체력 막대 · 페이즈 전환 섬광. */
  /** 피격 섬광(흰빛) · 페이즈 전환(금빛) — 방금 그린 그림과 같은 자리 · 같은 변형 안에서 실루엣 사본으로 */
  enemyFlash(c: CanvasRenderingContext2D, e: Enemy, key: string, x: number, y: number) {
    if (!(e.flash > 0) && !(e.phaseT > 0)) return;
    const fr = this.enemyFrame(e), fl = e.facing < 0;
    for (const [on, col, a] of [[e.flash > 0, '#ffffff', Math.min(.75, e.flash * 6)], [e.phaseT > 0, '#ffe08a', Math.min(.55, e.phaseT * 0.8)]] as [boolean, string, number][]) {
      const tk = on && Sprites.tintSheet(key, col); if (!tk) continue;
      c.save(); c.globalAlpha = a; Sprites.draw(c, tk, fr, x, y, fl); c.restore();
    }
  },
  drawEnemyOverlay(c: CanvasRenderingContext2D, e: Enemy, sx: number, sy: number, dy: number, meta: Bag, dx: number) {
    const w = meta ? meta.frameW : e.w;
    /* 개조된 것의 화로 — 구워 둔 시트에는 고정된 불빛만 들어 있다. */
    if (e.mech) {
      const ph = this.time * 3.4 + (e.cx % 97) * 0.31;
      const a = 0.30 + Math.sin(ph) * 0.22;
      const r = 3.4 + Math.sin(ph) * 0.9;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.max(0, a);
      const gx = sx + e.w / 2, gy = sy + e.h * 0.42;
      const gr = c.createRadialGradient(gx, gy, 0, gx, gy, r * 2.6);
      gr.addColorStop(0, '#ffb45a'); gr.addColorStop(0.45, '#d85a1e'); gr.addColorStop(1, '#d85a1e00');
      c.fillStyle = gr;
      c.beginPath(); c.arc(gx, gy, r * 2.6, 0, TAU); c.fill();
      c.restore();
    }
    /* 손그림 몹의 섬광 · 금빛은 enemyFlash 가 그림 윤곽대로 얹는다 — 여기 네모는 절차 그림(meta 없음)에만. 사연: docs/code-history.md#h156 */
    if (e.flash > 0 && !meta) {
      c.save(); c.globalAlpha = Math.min(.75, e.flash * 6); c.fillStyle = '#fff';
      c.fillRect(sx + (dx || 0), sy - dy, w, e.h + dy); c.restore();
    }
    if (e.phaseT > 0 && !meta) {
      c.save(); c.globalAlpha = Math.min(.55, e.phaseT * 0.8); c.fillStyle = '#ffe08a';
      c.fillRect(sx, sy - dy, w, e.h + dy); c.restore();
    }
    // 바다 부유물은 다치지 않아도 늘 보인다 — 막대 길이가 곧 "몇 대 쳐야 하나"(= 등급)라서
    if ((e.hp < e.maxHp || e.def.ai === 'flotsam') && !e.boss) {
      const bw = Math.max(22, e.w);
      c.fillStyle = '#000a'; c.fillRect(sx + (e.w - bw) / 2, sy - dy - 8, bw, 4);
      c.fillStyle = '#d0564c'; c.fillRect(sx + (e.w - bw) / 2, sy - dy - 8, bw * (e.hp / e.maxHp), 4);
    }
  },

  /** 바다 부유물 — 구운 그림(obj_flotsamN, tools/mkflotsam.py)을 물결 기울기(e.tilt)만큼 기울여 그린다. */
  drawFlotsam(c: CanvasRenderingContext2D, e: Enemy, sx: number, sy: number) {
    const m = Sprites.meta && Sprites.meta.objects && Sprites.meta.objects.files[e.type];
    const w = m ? m.w : e.w, h = m ? m.h : e.h;
    const dx = (e.w - w) / 2, dy = h - e.h;
    c.save();
    c.translate(sx + e.w / 2, sy + e.h * 0.55);
    c.rotate(clamp(e.tilt || 0, -0.35, 0.35));
    c.translate(-(sx + e.w / 2), -(sy + e.h * 0.55));
    if (e.def.tier === 3) {
      const a = 0.25 + Math.sin(this.time * 2.6) * 0.12;
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.fillStyle = '#6fe0ff';
      c.beginPath(); c.arc(sx + e.w / 2, sy + e.h * 0.5, 9, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    if (!(this.spritesOn && Sprites.drawObj(c, 'obj_' + e.type, sx + dx, sy - dy, w, h, this.time))) {
      c.fillStyle = e.def.c!; c.fillRect(sx, sy, e.w, e.h);
    }
    c.restore();
    this.drawEnemyOverlay(c, e, sx, sy, dy, null, dx);
  },

  /* ================= 시체 ================= */
  CORPSE_MAX: 24,
  addCorpse(e: Enemy) {
    if (!this.spritesOn || !Sprites.meta) return;
    const key = (e.mech && Sprites.mechSheet && Sprites.mechSheet(e.type))
      ? 'mech_' + e.type : e.type;
    const bm = Sprites.meta.bosses.sheets[key];
    const m = bm || Sprites.meta.characters.sheets[key];
    if (!m) return;
    const last = bm ? m.count - 1 : 6;                 // 보스는 끝의 두 칸
    if (last < 1 || m.count <= last) return;
    this.corpses.push({
      key, x: e.x, y: e.y, w: e.w, h: e.h, facing: e.facing,
      f0: last - 1, f1: last, t: 0, dur: e.boss ? 1.15 : 0.42,
    });
    if (this.corpses.length > this.CORPSE_MAX) this.corpses.shift();
  },
  drawCorpses(c: CanvasRenderingContext2D, camX: number, camY: number) {
    if (!this.corpses.length || !Sprites.meta) return;   // 그림을 끈 뒤에도 안전하게
    for (const q of this.corpses) {
      const sx = q.x - camX, sy = q.y - camY;
      if (sx < -200 || sx > this.W + 200 || sy < -200 || sy > this.H + 200) continue;
      const m = Sprites.meta.bosses.sheets[q.key] || Sprites.meta.characters.sheets[q.key];
      if (!m) continue;
      const r = q.t / q.dur;
      // 살아 있는 그림과 **같은 자리 계산**을 쓴다 — 죽는 순간 그림이 튀면 안 된다
      const dy = m.frameH - q.h - (Sprites.footInset[q.key] || 0);
      const side = (Sprites.sideInset[q.key] || 0) * (q.facing < 0 ? -1 : 1);
      const dx = (q.w - m.frameW) / 2 - side;
      c.save();
      c.globalAlpha = r > 0.7 ? 1 - (r - 0.7) / 0.3 : 1;
      Sprites.draw(c, q.key, r < 0.35 ? q.f0 : q.f1, sx + dx, sy - dy, q.facing < 0);
      c.restore();
    }
  },
};

mixin(Game.prototype, RenderActorsPart, true);

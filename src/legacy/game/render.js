/* ===== game/render.js — 렌더 — 파이프라인 단계 ===== */
import { mixHex, shade } from '../../engine/core/color.js';
import { TAU, clamp, inv, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tileHash } from '../../engine/core/rng.js';
import { createPipeline, tileView } from '../../engine/render/pipeline.js';
import { FONT, FONT_PLAIN, tr } from '../lang.js';
import { HELL_Y, SURF_BASE, WH, WW } from '../size.js';
import { FLUID_FLOW, LEAVE_OF, MACH_OF_TILE, SIG_FX, T } from '../data.js';
import { TS } from '../world.js';
import { ALPHA_TILE, BODY_ONLY, CONN, LEAF_TWIG, TOP_SKIP, TileArt } from '../tileart.js';
import { Art } from '../itemart.js';
import { Sprites } from '../sprites.js';
import { Bomb, Guard, PROJ_FX, PROJ_STYLE, Wolf } from '../entity.js';
import { Factory } from '../factory.js';
import { G, MAP_REVEAL_LIGHT } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RenderPart = {


  /* ================= 렌더 ================= */
  /** 한 프레임 그리기 — 카메라·흔들림과 보이는 칸 범위만 정하고, 나머지는 렌더 단계가 순서대로 그린다(buildPipeline). */
  render() {
    const c = this.ctx, w = this.world, p = this.player;
    const shk = this.shake * (this.settings ? this.settings.shake / 100 : 1);
    const shX = (Math.random() - 0.5) * shk, shY = (Math.random() - 0.5) * shk;
    const camX = Math.round(this.cam.x + shX), camY = Math.round(this.cam.y + shY);

    const dayF = this.dayFactor();
    const f = { c, w, p, camX, camY, dayF, ...tileView(camX, camY, this.W, this.H, TS) };
    this.pipe.run(f);
  },
  /** 렌더 단계 — 순서가 곧 겹침 순서다(엔진 render/pipeline). */
  buildPipeline() {
    this.pipe = createPipeline(['sky', 'light', 'far', 'tiles', 'machines', 'objects', 'ground', 'drops', 'actors', 'lighting', 'fx', 'screen']);
    this.pipe.add('sky', f => this.rSky(f));
    this.pipe.add('light', f => this.rLightCalc(f));
    this.pipe.add('far', f => this.rFar(f));
    this.pipe.add('tiles', f => this.rTiles(f));
    this.pipe.add('machines', f => this.rMachines(f));
    this.pipe.add('objects', f => this.rObjects(f));
    this.pipe.add('ground', f => this.rGround(f));
    this.pipe.add('drops', f => this.rDrops(f));
    this.pipe.add('actors', f => this.rActors(f));
    this.pipe.add('lighting', f => this.rLightOverlay(f));
    this.pipe.add('fx', f => this.rFx(f));
    this.pipe.add('screen', f => this.rScreen(f));
  },
  /** 렌더 단계 — 하늘 */
  rSky(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    this.drawSky(c, dayF, camX, camY);
  },
  /** 렌더 단계 — 화면 범위 조명 계산 */
  rLightCalc(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    const dayLight = lerp(3.0, 15, dayF);
    // 발광 물약 — lit/lit_greater 버프가 있으면 미광 반경을 넓힌다 — 사연: docs/code-history.md#h60
    const litR = p.buffs.some(b => b.id === 'lit_greater') ? 9.5
      : p.buffs.some(b => b.id === 'lit') ? 6.8
      : p.buffs.some(b => b.id === 'lantern') ? 6.0 : 4.6;
    w.computeLight(tx0, ty0, tx1, ty1, dayLight,
      [[Math.floor(p.cx / TS), Math.floor(p.cy / TS), litR]]);   // 플레이어 미광
  },
  /** 렌더 단계 — 원경 · 채취탑 */
  rFar(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 배경 지형 ----
    this.drawParallax(c, camX, camY, dayF);

    /* ---- 채취탑 ---- */
    this.drawRigs(c, camX, camY);
  },
  /** 렌더 단계 — 타일 · 벽지 */
  rTiles(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 타일 (절차적 텍스처 아틀라스) ----
    const VA = TileArt.V;
    const ashF = this.ashF(), ashOn = ashF > 0.02 && TileArt.ashAtlas;
    const eyeX = Math.floor(p.cx / TS), eyeY = Math.floor((p.y + 8) / TS);
    this._mapTick = ((this._mapTick || 0) + 1) & 3;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (tx < 0 || ty < 0 || tx >= WW || ty >= WH) continue;
        const k = ty * WW + tx;
        const id = w.tiles[k], wl = w.walls[k];
        /* 화면에 들어왔다고 곧바로 지도에 남기지 않는다 — 밝고, **눈에서 보이는** 칸만. 빛만 보면 수정·발광 이끼가 비추는
           바위 너머 굴이 가 보지도 않았는데 지도에 떴다. 안 보인 칸은 네 프레임에 한 번만 다시 잰다. */
        if (w.lightAt(tx, ty) >= MAP_REVEAL_LIGHT &&
            (w.explored[k] || (((tx + ty + this._mapTick) & 3) === 0 && this.seesTile(eyeX, eyeY, tx, ty)))) {
          w.explored[k] = 1;
          this.mapAtlasX.fillStyle = this.mapColorAt(tx, ty, id, wl);
          this.mapAtlasX.fillRect(tx, ty, 1, 1);
        }
        const sx = tx * TS - camX, sy = ty * TS - camY;
        /* 움직이는 타일(물·폭포·용암)은 아틀라스 칸을 **시간**으로 고른다. */
        const an = TileArt.ANIM[id];
        const v = an ? ((((this.time * an.fps) + tx * 0.7 + ty * 0.4) | 0) % an.fr)
                : LEAF_TWIG[id] ? this.pickLeafV(w, tx, ty) : (tileHash(tx, ty) * VA) | 0;
        if (id === T.AIR) { if (wl) TileArt.drawWall(c, wl, v, sx, sy); continue; }
        /* 바다 수면 — 타일을 통째로 칠하지 않고 **파도 높이만큼만** 채운다. */
        if (id === T.SEAWATER && w.tiles[k - WW] === T.AIR) { this.drawWave(c, tx, ty, sx, sy, wl); continue; }
        if (ALPHA_TILE[id] && wl) TileArt.drawWall(c, wl, v, sx, sy);
        // 기계 몸체는 Factory.render 가 그린다(떨림·동작) — 여기서도 그리면 흔들 때 두 겹으로 보인다
        if (MACH_OF_TILE[id] && w.machines.has(k)) continue;
        // 흐르는 액체 — 수위만큼만 (world.js '유체' 절)
        if (FLUID_FLOW[id]) { this.drawFlow(c, w, id, k, tx, ty, sx, sy); continue; }
        if (id === T.FALLS) { this.drawFallsTile(c, tx, ty, sx, sy); continue; }
        /* 물에 뜬·잠긴 장식(수련·물풀·해초)은 그 칸 밑에 **진짜 물 타일**을 옆 물칸과 같은 프레임으로 먼저 깐다. */
        const ul = LEAVE_OF[id];
        if (ul) {
          const ua = TileArt.ANIM[ul];
          TileArt.draw(c, ul, ua ? ((((this.time * ua.fps) + tx * 0.7 + ty * 0.4) | 0) % ua.fr) : 0, sx, sy);
        }
        if (ashOn && this.ASH_TILE[id]) { this.drawAshTile(c, id, v, sx, sy, tx, ty, ashF); continue; }
        // 이웃을 보고 그리는 타일(이끼·종유석·위가 막힌 잔디 …) — tileart.js 의 ★ 참고.
        if ((BODY_ONLY[id] || CONN[id]) && TileArt.drawConn(c, w, id, tx, ty, sx, sy, v)) continue;
        if (id === T.PLATFORM) TileArt.draw(c, id, v, sx, sy, 7);
        else TileArt.draw(c, id, v, sx, sy);
        /* 상단 하이라이트는 **하늘에 드러난 윗면**을 흉내 내는 선이다. */
        if (!TOP_SKIP[id] && w.tiles[k - WW] === T.AIR
            && w.walls[k - WW] === 0 && ty - 1 <= w.surface[tx]) {
          c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(sx, sy, TS, 2);
        }
      }
    }
  },
  /** 렌더 단계 — 기계 몸체 · 벨트 위 물건 · 놓을 자리 */
  rMachines(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 기계 오버레이 (방향 · 벨트 위 아이템 · 진행/연료 · 상태등) ----
    Factory.render(c, w, camX, camY, tx0, ty0, tx1, ty1, this.time);
    this.drawPlaceGhost(c, camX, camY);
  },
  /** 렌더 단계 — 설치물 · NPC */
  rObjects(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 오브젝트 ----
    for (const o of w.objects) {
      if (o.type === 'rig') continue;           // 채취탑은 drawRigs 가 지형 뒤에 따로 그린다
      const sx = o.x - camX, sy = o.y - camY;
      if (sx < -120 || sx > this.W + 120 || sy < -140 || sy > this.H + 140) continue;
      const f = 1;   // 명암은 조명 오버레이가 담당
      c.save(); c.globalAlpha = 1;
      /* 아래 셋(상자·작업대·용광로)은 이제 한 타일(22px) 안에 그려진다. */
      if (o.type === 'chest' || o.type === 'crate') {
        const gold = o.gold || (o.type === 'chest' && o.tier >= 6);
        const body = shade(gold ? '#8a6a1a' : '#7a5326', f);
        const band = shade(gold ? '#ffd85a' : '#c8a04a', f);
        if (gold) {   // 황금 상자는 은은한 후광으로 멀리서도 눈에 띈다
          c.globalAlpha = .30 + Math.sin(this.time * 3) * .16;
          c.fillStyle = '#ffe58a';
          c.beginPath(); c.arc(sx + o.w / 2, sy + o.h / 2, o.w * .78, 0, TAU); c.fill();
          c.globalAlpha = 1;
        }
        c.fillStyle = body; c.fillRect(sx, sy + 3, o.w, o.h - 3);      // 몸통
        c.fillStyle = shade(gold ? '#a8841f' : '#96683a', f);
        c.fillRect(sx, sy, o.w, 5);                                    // 뚜껑
        c.fillStyle = band; c.fillRect(sx, sy + 4, o.w, 2);            // 뚜껑 띠
        c.fillStyle = band; c.fillRect(sx + o.w / 2 - 2, sy + 3, 4, 5); // 자물쇠
        c.strokeStyle = shade(gold ? '#e8b830' : '#3a2610', f);
        c.strokeRect(sx + .5, sy + .5, o.w - 1, o.h - 1);
      } else if (o.type === 'workbench') {
        // 손그림(레벨별 obj_workbench_lvN)이 있으면 그걸 쓰고, 없으면 절차 생성으로 폴백.
        if (!(this.spritesOn && Sprites.drawObj(c, 'obj_workbench_lv' + (o.lv || 1), sx, sy, o.w, o.h))) {
          // 상판 + 다리 두 개.
          c.fillStyle = shade('#9c7a4a', f); c.fillRect(sx, sy, o.w, 3);
          c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + 3, o.w, 3);
          c.fillRect(sx + 2, sy + 6, 4, o.h - 6);
          c.fillRect(sx + o.w - 6, sy + 6, 4, o.h - 6);
          c.fillStyle = shade('#5c4026', f); c.fillRect(sx + 2, sy + o.h - 4, o.w - 4, 2);  // 아래 가로대
        }
      } else if (o.type === 'forge') {
        if (!(this.spritesOn && Sprites.drawObj(c, 'obj_forge_lv' + (o.lv || 1), sx, sy, o.w, o.h))) {
          // 꽉 찬 돌 몸통 + 아래쪽 불구멍.
          c.fillStyle = shade('#4a4a52', f); c.fillRect(sx, sy + 3, o.w, o.h - 3);
          c.fillStyle = shade('#33333a', f); c.fillRect(sx, sy, o.w, 4);                    // 굴뚝 갓
          c.fillStyle = shade('#5c5c66', f); c.fillRect(sx + 1, sy + 5, o.w - 2, 2);
          c.fillStyle = '#ff8a3a'; c.globalAlpha = .8 + Math.sin(this.time * 6) * .18;
          c.fillRect(sx + 4, sy + o.h - 8, o.w - 8, 5);                                     // 불구멍
          c.globalAlpha = 1;
        }
      } else if (o.type === 'altar') {
        this.drawAltar(c, o, sx, sy, Math.max(f, .5));
      } else if (o.type === 'lorestone') {
        // 유적 비문 — 벽에 기대 세운 낮은 비석.
        const done = o.hint !== undefined || (this.loreRead && this.loreRead[o.lore]);
        c.fillStyle = shade('#4a4438', f); c.fillRect(sx, sy + 5, o.w, o.h - 5);
        c.fillStyle = shade('#5d5648', f); c.fillRect(sx - 2, sy, o.w + 4, 8);
        c.fillStyle = done ? '#4a5f7a' : '#e8d8a0';
        c.globalAlpha = done ? .5 : .55 + Math.sin(this.time * 2.2) * .3;
        for (let k = 0; k < 3; k++) c.fillRect(sx + 5, sy + 13 + k * 7, o.w - 10, 2.5);
        c.globalAlpha = 1;
      } else if (o.type === 'tablet') {
        c.fillStyle = '#57503f'; c.fillRect(sx, sy + 4, o.w, o.h - 4);
        c.fillStyle = '#6a6250'; c.fillRect(sx - 3, sy, o.w + 6, 7);
        c.fillStyle = (this.tabletsRead && this.tabletsRead[o.tablet]) ? '#4a5f7a' : '#9fe8d8';
        c.globalAlpha = .55 + Math.sin(this.time * 2.4 + o.tablet) * .28;
        for (let k = 0; k < 4; k++) c.fillRect(sx + 7, sy + 12 + k * 8, o.w - 14, 3);
        c.globalAlpha = 1;
      } else if (o.type === 'seal') {
        c.fillStyle = o.opened ? '#2a2634' : '#3a3550';
        c.fillRect(sx, sy, o.w, o.h);
        if (!o.opened) {
          c.globalAlpha = .4 + Math.sin(this.time * 1.8) * .22;
          c.strokeStyle = '#a06fff'; c.lineWidth = 2.5;
          c.beginPath(); c.arc(sx + o.w / 2, sy + o.h / 2, 15, 0, TAU); c.stroke();
          c.fillStyle = '#a06fff'; c.fillRect(sx + o.w / 2 - 1.5, sy + 8, 3, o.h - 16);
          c.globalAlpha = 1; c.lineWidth = 1;
        }
      } else if (o.type === 'mystic') {
        // 떠 있는 빛무리 하나 — 여기 무언가 있다는 것만 알리고, 무엇인지는 다가가야 안다
        const t = this.time;
        c.save();
        for (let i = 0; i < 3; i++) {
          const a = t * (0.5 + i * 0.2) + i * 2.1;
          c.globalAlpha = o.used ? 0.16 : 0.34 + Math.sin(t * 1.6 + i) * 0.2;
          c.fillStyle = o.used ? '#5a5a66' : '#bfe8ff';
          c.beginPath();
          c.arc(sx + o.w / 2 + Math.cos(a) * (10 + i * 5), sy + o.h / 2 + Math.sin(a * 1.3) * (7 + i * 3),
            2.4 - i * 0.4, 0, TAU);
          c.fill();
        }
        c.restore();
      } else if (o.type === 'codedoor') {
        /* 숫자 잠긴 문 — 세 자리를 넣는 홈 셋을 그려서, 무엇을 요구하는 문인지 설명 없이도 보이게 한다. */
        c.fillStyle = o.opened ? '#2b2a22' : '#4a4432';
        c.fillRect(sx, sy, o.w, o.h);
        for (let i = 0; i < 3; i++) {
          const gy = sy + o.h * (0.24 + i * 0.24);
          c.fillStyle = '#191712';
          c.fillRect(sx + o.w * 0.22, gy, o.w * 0.56, 5);
          if (!o.opened) {
            c.globalAlpha = .45 + Math.sin(this.time * 2.2 + i) * .3;
            c.fillStyle = '#e0c86a';
            c.fillRect(sx + o.w * 0.3, gy + 1.5, o.w * 0.4, 2);
            c.globalAlpha = 1;
          }
        }
      } else if (o.type === 'ciphernote') {
        /* 암호 쪽지 — 벽에 못으로 박아 둔 종이 한 장. */
        const read = (this.cipherSeen || {})[o.ruin] && (this.cipherSeen[o.ruin] || {})[o.idx];
        c.fillStyle = shade('#3a3226', f); c.fillRect(sx - 1, sy - 1, o.w + 2, o.h + 2);
        c.fillStyle = shade(read ? '#9a9078' : '#cfc6a8', f); c.fillRect(sx, sy, o.w, o.h);
        c.fillStyle = shade('#7a6f56', f);
        for (let i = 1; i < 5; i++) c.fillRect(sx + 3, sy + 3 + i * 4, o.w - 6, 1);
        c.fillStyle = shade('#5a5142', f); c.fillRect(sx + o.w / 2 - 1, sy + 1, 2, 2);   // 못
        if (!read) {
          c.globalAlpha = .35 + Math.sin(this.time * 2.6 + o.idx) * .3;
          c.fillStyle = '#ffe9a8'; c.fillRect(sx - 2, sy - 2, o.w + 4, o.h + 4);
          c.globalAlpha = 1;
        }
      } else if (o.type === 'npc') {
        this.drawNpc(c, o, sx, sy, f);
      } else {
        this.drawFacility(c, o, sx, sy, f);
      }
      c.restore();
    }
  },
  /** 렌더 단계 — 스킬의 바닥 연출 */
  rGround(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 특별한 스킬의 바닥 연출 ----
    this.drawSigGround(c, camX, camY);
  },
  /** 렌더 단계 — 시체 · 떨어진 물건 */
  rDrops(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 드롭 ----
    c.textAlign = 'center'; c.textBaseline = 'middle';
    /* ---- 시체 ---- */
    this.drawCorpses(c, camX, camY);

    for (const d of this.drops) {
      const sx = d.x - camX + 8, sy = d.y - camY + 8 + Math.sin(this.time * 3 + d.t) * 3;
      if (sx < -30 || sx > this.W + 30) continue;
      c.globalAlpha = d.life < 8 ? (Math.sin(this.time * 12) * .5 + .5) : 1;
      Art.drawItem(c, d.item.id, sx - 11, sy - 11, 22);
      c.globalAlpha = 1;
    }
  },
  /** 렌더 단계 — 몹 · 비석 · 플레이어 · 펫 */
  rActors(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 적 ----
    for (const e of this.ents) {
      const sx = e.x - camX, sy = e.y - camY;
      if (sx < -200 || sx > this.W + 200 || sy < -200 || sy > this.H + 200) continue;
      if (e instanceof Wolf) this.drawWolf(c, e, sx, sy);
      else if (e instanceof Guard) this.drawGuard(c, e, sx, sy);
      else this.drawEnemy(c, e, sx, sy);
    }

    // ---- 플레이어 ----
    /* 비석 — 쓰러진 자리에 실제로 세워 둔다. */
    if (this.deathMark) {
      const dm = this.deathMark;
      const left = 1 - (this.dayCount * 1440 + this.dayT - (dm.at || 0)) / 720;
      const gx = Math.round(dm.x - camX), gy = Math.round(dm.y - camY);
      if (gx > -60 && gx < this.W + 60 && gy > -80 && gy < this.H + 80) {
        c.save();
        c.globalAlpha = clamp(0.35 + left * 0.65, 0.2, 1);
        c.fillStyle = '#6a6458';
        c.fillRect(gx - 9, gy - 20, 18, 22);                 // 비석 몸
        c.fillRect(gx - 13, gy + 1, 26, 4);                  // 받침
        c.fillStyle = '#4a463c';
        c.beginPath(); c.arc(gx, gy - 20, 9, Math.PI, 0); c.fill();   // 둥근 윗머리
        c.fillStyle = '#2a2620';
        c.fillRect(gx - 1.5, gy - 16, 3, 11);                // 십자
        c.fillRect(gx - 5, gy - 13, 10, 3);
        c.globalAlpha = clamp(left, 0, 1) * (0.5 + 0.5 * Math.sin(this.time * 2.2));
        c.fillStyle = '#ffe08a';
        c.beginPath(); c.arc(gx, gy - 26, 2.6, 0, TAU); c.fill();     // 남아 있다는 불빛
        c.restore();
      }
    }
    this.drawRipeCrops(c, camX, camY);
    this.drawStarOrbit(c, p, camX, camY);
    this.drawPlayer(c, p, p.x - camX, p.y - camY);
    for (const pet of (this.petEnts || [])) if (pet) this.drawPet(c, pet, camX, camY);
    /* 회오리 검무의 칼선 — 플레이어 바로 위에, 선으로만. */
    this.drawWhirlArc(c, p, camX, camY);
    // ---- 떨어지는 별 ----
    this.drawSigSky(c, camX, camY);
  },
  /** 렌더 단계 — 어둠 · 빛 색 · 공기색 · 유적 여운 */
  rLightOverlay(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 조명 (부드러운 그라디언트 오버레이) ----
    this.drawLightOverlay(c, camX, camY, tx0, ty0, tx1, ty1);
    this.drawGlow(c, camX, camY, tx0, ty0, tx1, ty1);   // 빛 색 — 어둠 위에 더한다
    this.drawLairGlow(c, camX, camY);                  // 깨어 있는 둥지의 알·노심 — 어두운 유적에서도 보이게
    this.drawFishCue(c, camX, camY);   // 입질 알림은 밤에도 보여야 한다 — 조명 위에
    /* 유적 고유 이벤트의 여운을 화면에 덮는다. */
    // 이름표는 원경이 바뀌는 자리에서 — 그리는 김에 같은 카메라 값으로 본다
    this.checkBiomeEntry(camX, camY);
    /* 그 땅의 공기색 — 아주 옅게. */
    const air = this.biomeAir(camX, camY);
    if (air) this.drawAir(c, air);
    if (this.ruinDark > 0) {
      c.save();
      c.globalAlpha = Math.min(1, this.ruinDark / 2) * 0.72;
      c.fillStyle = '#04050a';
      c.fillRect(0, 0, this.W, this.H);
      c.restore();
    }
    if (this.ruinSpore > 0) {
      c.save();
      c.globalAlpha = Math.min(1, this.ruinSpore / 2) * 0.26;
      c.fillStyle = '#7fd08a';
      c.fillRect(0, 0, this.W, this.H);
      c.restore();
    }
    this.drawCaves(c, camX, camY);
  },
  /** 렌더 단계 — 폭발 · 투사체 · 링 · 번개 · 입자 · 피해 숫자 */
  rFx(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 폭발/타격 이펙트 ----
    if (this.bursts) for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.t += 1 / 60;
      const fr = Math.floor(b.t / (0.04 * (b.sp || 1)));
      if (fr >= 6) { this.bursts.splice(i, 1); continue; }
      Sprites.drawFx(c, 'burst_' + b.kind, fr, b.x - camX - b.s / 2, b.y - camY - b.s / 2, b.s);
    }

    // ---- 투사체 ----
    for (const pr of this.projs) {
      const st = PROJ_STYLE[pr.type] || PROJ_STYLE.bolt;
      const sx = pr.cx - camX, sy = pr.cy - camY;
      if (this.spritesOn && PROJ_FX[pr.type]) {
        const fr = Math.floor(this.time * 14) % 4;
        c.save();
        c.translate(sx, sy); c.rotate(Math.atan2(pr.vy, pr.vx));
        Sprites.drawFx(c, 'proj_' + PROJ_FX[pr.type], fr, -9, -9, 18);
        c.restore();
        continue;
      }
      if (pr instanceof Bomb) { this.drawBomb(c, pr, sx, sy); continue; }
      if (st.tracer) {                                     // 예광탄 — 지나온 자리로 옅어지는 줄기 + 밝은 머리
        const sp = Math.hypot(pr.vx, pr.vy) || 1, ux = pr.vx / sp, uy = pr.vy / sp;
        const g = c.createLinearGradient(sx - ux * st.tracer, sy - uy * st.tracer, sx, sy);
        g.addColorStop(0, 'rgba(255,200,90,0)'); g.addColorStop(1, 'rgba(255,230,160,.95)');
        c.strokeStyle = g; c.lineWidth = 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(sx - ux * st.tracer, sy - uy * st.tracer); c.lineTo(sx, sy); c.stroke();
        c.fillStyle = '#fffbe8'; c.fillRect(sx - 1, sy - 1, 2.5, 2.5);
        continue;
      }
      c.fillStyle = st.c;
      if (st.glow) { c.globalAlpha = .28; c.beginPath(); c.arc(sx, sy, st.r * 2.4, 0, TAU); c.fill(); c.globalAlpha = 1; }
      if (st.len) {
        const a = Math.atan2(pr.vy, pr.vx);
        c.save(); c.translate(sx, sy); c.rotate(a);
        c.fillRect(-st.len / 2, -1.5, st.len, 3);
        c.fillStyle = '#fff'; c.fillRect(st.len / 2 - 4, -1.5, 4, 3);
        c.restore();
      } else { c.beginPath(); c.arc(sx, sy, st.r, 0, TAU); c.fill(); }
    }

    // ---- 링 이펙트 ----
    if (this.rings) for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t -= 1 / 60;
      if (r.t <= 0) { this.rings.splice(i, 1); continue; }
      const mx = r.max || 0.3, k = r.t / mx;
      c.strokeStyle = r.c; c.globalAlpha = k * .8; c.lineWidth = 3;
      c.beginPath(); c.arc(r.x - camX, r.y - camY, r.r * (1.3 - k * 0.3), 0, TAU); c.stroke();
      c.globalAlpha = 1; c.lineWidth = 1;
    }

    // ---- 떨어질 자리 예고 (별의 낙하) ----
    if (this.warns) for (let i = this.warns.length - 1; i >= 0; i--) {
      const w = this.warns[i]; w.t -= 1 / 60;
      if (w.t <= 0) { this.warns.splice(i, 1); continue; }
      const k = 1 - w.t / w.max;                 // 0 -> 1 로 차오른다
      const x = w.x - camX, y = w.y - camY;
      c.globalAlpha = 0.22 + 0.2 * Math.sin(k * 18);
      c.fillStyle = w.c;
      c.beginPath(); c.arc(x, y, w.r * k, 0, TAU); c.fill();
      c.globalAlpha = 0.85; c.strokeStyle = w.c; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, w.r, 0, TAU); c.stroke();
      c.globalAlpha = 1; c.lineWidth = 1;
    }

    // ---- 번개 (사슬 번개 · 차원 도약) ----
    if (this.bolts) for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.t -= 1 / 60;
      if (b.t <= 0) { this.bolts.splice(i, 1); continue; }
      const k = b.t / b.max;
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const [lw, col, al] of [[6, b.c, 0.22 * k], [2.4, b.c, 0.9 * k], [1, '#ffffff', 0.9 * k]]) {
        c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = lw;
        c.beginPath();
        b.pts.forEach((p, j) => j ? c.lineTo(p[0] - camX, p[1] - camY) : c.moveTo(p[0] - camX, p[1] - camY));
        c.stroke();
      }
      c.globalAlpha = 1; c.lineWidth = 1; c.lineCap = 'butt';
    }

    // ---- 보스 대사 (화면 아래) ----
    if (this.bossSay) {
      const bs = this.bossSay; bs.t -= 1 / 60;
      if (bs.t <= 0) this.bossSay = null;
      else {
        const a = Math.min(1, bs.t / 0.6);
        c.save();
        c.globalAlpha = a;
        c.font = '600 15px ' + FONT;
        c.textAlign = 'center';
        const y = this.H - 96;
        c.fillStyle = '#000a'; c.fillText(bs.text, this.W / 2 + 1, y + 1);
        c.fillStyle = '#f0e2b1'; c.fillText(bs.text, this.W / 2, y);
        c.font = '11px ' + FONT; c.fillStyle = '#c8a05a';
        c.fillText(bs.who, this.W / 2, y - 18);
        c.textAlign = 'left';
        c.restore();
      }
    }

    // ---- 비전 방벽 — 플레이어를 감싼 육각 결계 ----
    const pl = this.player;
    if (pl && pl.shield > 0) {
      const x = pl.cx - camX, y = pl.cy - camY;
      const rr = 30 + Math.sin(this.time * 5) * 1.5;
      const k = pl.shieldMax ? pl.shield / pl.shieldMax : 1;
      c.save();
      c.globalAlpha = 0.10 + 0.10 * k;
      c.fillStyle = '#6fb8ff';
      c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
      c.globalAlpha = 0.35 + 0.45 * k; c.strokeStyle = '#9fd4ff'; c.lineWidth = 1.6;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = this.time * 0.6 + i * TAU / 6;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 1.15;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath(); c.stroke();
      c.restore();
    }

    this.drawMeteorNear(c, camX, camY);                 // 가까이 떨어지는 운석 · 떨어진 순간의 섬광

    // ---- 용광로 굴뚝 연기 ----
    this.drawSmoke(c, camX, camY);

    // ---- 입자 ----
    /* 파편 — 재질에 따라 모양이 다르다. */
    let lit = false;
    for (const pt of this.parts) {
      const want = !!pt.glow;
      if (want !== lit) { c.globalCompositeOperation = want ? 'lighter' : 'source-over'; lit = want; }
      c.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      c.fillStyle = pt.c;
      const x = pt.x - camX, y = pt.y - camY, r = pt.r;
      if (pt.sq === 0) { c.beginPath(); c.arc(x, y, r * 0.6, 0, TAU); c.fill(); }
      else if (pt.spin && Math.abs(pt.rot) > 0.001 && r > 2.2) {
        c.save(); c.translate(x, y); c.rotate(pt.rot);
        c.fillRect(-r / 2, -r / 2, r, r); c.restore();
      } else c.fillRect(x - r / 2, y - r / 2, r, r);
    }
    if (lit) c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;

    // ---- 피해 숫자 ----
    if (!this.settings || this.settings.dmgnum) for (const t of this.texts) {
      c.globalAlpha = clamp(t.life / 0.85, 0, 1);
      c.font = (t.crit ? 'bold 19px' : '14px') + ' ' + FONT;
      c.fillStyle = '#000'; c.fillText(t.v, t.x - camX + 1, t.y - camY + 1);
      c.fillStyle = t.c; c.fillText(t.v, t.x - camX, t.y - camY);
      if (t.crit) { c.font = '10px ' + FONT_PLAIN; c.fillStyle = '#ffd24a'; c.fillText(tr('치명'), t.x - camX, t.y - camY - 15); }
    }
    c.globalAlpha = 1;
  },
  /** 렌더 단계 — 조준 · 비 · 비네트 · 길잡이 */
  rScreen(f) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 조준/채굴 표시 ----
    this.drawCursor(c, camX, camY);

    // ---- 비 (하늘이 트인 근처에서만) ----
    if (camY < SURF_BASE * TS + 400) this.drawRain(c);

    // ---- 비네트 ----
    const vg = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * .38, this.W / 2, this.H / 2, Math.max(this.W, this.H) * .78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = vg; c.fillRect(0, 0, this.W, this.H);
    if (p.flash > 0) { c.fillStyle = `rgba(180,30,30,${p.flash * .5})`; c.fillRect(0, 0, this.W, this.H); }
    /* 불굴 — 테두리만 한 번 물든다. */
    if (this.edge) {
      this.edge.t -= 1 / 60;
      if (this.edge.t <= 0) this.edge = null;
      else {
        const k = this.edge.t / this.edge.max, a = SIG_FX.undying.a * k * this.fxScale();
        if (a > 0.004) {
          const eg = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * .30,
            this.W / 2, this.H / 2, Math.max(this.W, this.H) * .62);
          eg.addColorStop(0, `rgba(${this.edge.rgb},0)`); eg.addColorStop(1, `rgba(${this.edge.rgb},1)`);
          c.globalAlpha = a; c.fillStyle = eg; c.fillRect(0, 0, this.W, this.H);
          c.globalAlpha = 1;
        }
      }
    }

    // ---- 길잡이 (비네트 위에 얹어야 어두운 곳에서도 읽힌다) ----
    if (this.settings === undefined || this.settings.compass !== false) this.drawCompass(c, camX, camY);
    this.drawPulse(c);
  },

  dayFactor() {
    const t = this.dayT;
    if (t >= 7 * 60 && t <= 17 * 60) return 1;
    if (t > 17 * 60 && t < 20 * 60) return 1 - inv(17 * 60, 20 * 60, t);
    if (t >= 20 * 60 || t < 4 * 60) return 0;
    return inv(4 * 60, 7 * 60, t);
  },
  drawSky(c, f, camX, camY) {
    const surfPx = SURF_BASE * TS;
    let top = mixHex('#0a0d1c', '#4a86c8', f);
    let bot = mixHex('#141020', '#a8c8e0', f);
    // 이벤트 중에는 하늘 자체가 물든다 — 붉은 달이 떴다는 걸 UI 없이 알 수 있게.
    let ev = this.eventActive() ? this.eventSpec() : null;
    if (!ev && this.event && this.event.id === 'rain') {
      const p = this.player, w = this.world;
      const zone = p && w ? w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS)) : null;
      if (zone === 'village' || zone === 'camp') ev = this.eventSpec();
    }
    /* ---- 노을 ---- */
    /* 땅 위에 설 때 0 — camY 그대로 쓰면 지표 깊이(수천 px)만큼 해가 화면 밖으로 밀려 한낮 해가 잘렸다 */
    const skyDy = clamp((camY + this.H / 2 - surfPx) * .05, -this.H * .3, this.H * .3);
    const sunU = this.skyArc(1), sunUp = Math.sin(Math.PI * sunU), sunX = this.W / 2 + Math.cos(Math.PI * sunU) * this.W * .42;
    const gold = clamp(1 - Math.abs(sunUp - 0.02) / 0.32, 0, 1) * (ev ? 0.4 : 1);
    if (ev) { top = mixHex(top, ev.tint, ev.tintAmt); bot = mixHex(bot, ev.tint, ev.tintAmt * 0.7); }
    let mid = mixHex(top, bot, 0.55);
    if (gold > 0) {
      top = mixHex(top, '#3a3a78', gold * 0.5);
      mid = mixHex(mid, '#d8849a', gold * 0.6);
      bot = mixHex(bot, '#f3a45a', gold * 0.85);
    }
    /* 원경이 "멀어 보이는" 색으로 쓸 지금의 하늘색. */
    this.skyHaze = bot;
    if (camY < surfPx + 400) {
      const g = c.createLinearGradient(0, 0, 0, this.H);
      // 가장 따뜻한 띠(bot)가 원경 능선 높이(화면 0.5~0.8)에 오게 — 화면 맨 아래는 어차피 땅이다
      g.addColorStop(0, top); g.addColorStop(0.42, mid); g.addColorStop(0.78, bot); g.addColorStop(1, bot);
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
      // 해 쪽 지평선이 더 달아오른다 — 노을은 하늘 전체가 아니라 해가 있는 쪽이 짙다
      if (gold > 0.02) {
        /* ★ 달아오른 자리는 해보다 **위**(화면 0.5)에 둔다. */
        const hy = this.H * .5 - skyDy;
        const hg = c.createRadialGradient(sunX, hy, 0, sunX, hy, this.W * .8);
        hg.addColorStop(0, `rgba(255,176,96,${0.6 * gold})`);
        hg.addColorStop(0.4, `rgba(240,130,110,${0.25 * gold})`);
        hg.addColorStop(1, 'rgba(240,130,110,0)');
        c.fillStyle = hg; c.fillRect(0, 0, this.W, this.H);
      }
      // 별
      if (f < 0.55) {
        c.fillStyle = `rgba(255,255,255,${(1 - f / .55) * .8})`;
        for (let i = 0; i < 90; i++) {
          const sx = (i * 137.5) % this.W, sy = ((i * 73.3) % (this.H * .6));
          const tw = 0.5 + Math.sin(this.time * 2 + i) * 0.5;
          c.globalAlpha = (1 - f / .55) * (0.25 + tw * 0.55);
          c.fillRect(sx, sy - camY * 0.02, 2, 2);
        }
        c.globalAlpha = 1;
      }
      /* ---- 해와 달 ---- */
      for (const sun of [1, 0]) {
        const u = sun ? sunU : this.skyArc(0), up = Math.sin(Math.PI * u);
        const al = clamp((up + 0.04) / 0.16, 0, 1);       // 지평선 조금 아래까지 — 원경 뒤로 넘어간다
        if (al <= 0) continue;
        const bx = this.W / 2 + Math.cos(Math.PI * u) * this.W * .42;   // u 0 = 오른쪽(동) → 1 = 왼쪽(서)
        /* 높이는 √up — 선형이면 아침·저녁 내내 숲 원경(화면 0.15~0.5) 뒤에 숨어 한낮에만 보였다 */
        const by = this.H * .52 - (up > 0 ? Math.sqrt(up) : up) * this.H * .40 - skyDy;
        if (sun) this.drawSun(c, bx, by, al, gold);
        else this.drawMoon(c, bx, by, al);
      }
      c.globalAlpha = 1;
      // 구름 — 비가 오는 동안은 짙고 빽빽하게, 평소엔 옅게 흘러간다
      this.drawClouds(c, camX, camY, this.rainT || 0);
      this.drawMeteorSky(c, camY);                     // 운석 — 구름 앞, 원경 능선 뒤
    } else {
      const deep = camY > HELL_Y * TS - 400;
      const g = c.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, deep ? '#2a0d08' : '#0a0a10');
      g.addColorStop(1, deep ? '#4a1408' : '#06060a');
      c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
      /* 땅속에서는 원경이 씻길 색도 땅속 색이다 — 하늘색을 그대로 두면 지옥의 먼 바위가 파랗게 물든다 */
      this.skyHaze = deep ? '#4a1408' : '#06060a';
    }
  },
  /** 해(1)·달(0)이 하늘을 건넌 몫 — 0 = 동쪽 지평선(화면 오른쪽), 1 = 서쪽 지평선. 밖이면 지평선 밑(sin 이 음수).
      ★ 뜨고 지는 시각은 dayFactor 가 밝아지고(4~7시) 어두워지는(17~20시) 한가운데여야 한다 — 어긋나면
      밝은 하늘에 해가 없거나, 해가 중천 가까이에서 갑자기 나타나 제멋대로 떠 보인다. */
  skyArc(sun) {
    const RISE = 330, SET = 1110;                         // 5:30 · 18:30
    const t0 = sun ? RISE : SET, dur = sun ? SET - RISE : 1440 - SET + RISE, off = (1440 - dur) / 2;
    return ((((this.dayT - t0 + off) % 1440) + 1440) % 1440 - off) / dur;
  },
  /** 해 — 넓은 햇무리 · 안쪽 광채 · 원반. */
  drawSun(c, x, y, al, gold) {
    const r = 22 * (1 + gold * 0.35);
    const core = mixHex('#fff6d8', '#ffd08a', gold), rim = mixHex('#ffd66a', '#ff7a3a', gold);
    const halo = mixHex('#fff0b8', '#ff9a50', gold);
    const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    c.save();
    c.globalAlpha = al;
    // 넓은 햇무리 — 하늘에 녹아드는 빛.
    c.translate(x, y); c.scale(1 + gold * 0.6, 1);
    let g = c.createRadialGradient(0, 0, 0, 0, 0, r * 7);
    g.addColorStop(0, rgba(halo, 0.34)); g.addColorStop(0.35, rgba(halo, 0.12)); g.addColorStop(1, rgba(halo, 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 7, 0, TAU); c.fill();
    c.setTransform(1, 0, 0, 1, 0, 0);
    // 안쪽 광채
    g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 2.4);
    g.addColorStop(0, rgba(core, 0.55)); g.addColorStop(1, rgba(core, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.4, 0, TAU); c.fill();
    /* 원반 — 구운 그림(tools/mksky.py: 주변 감광 · 쌀알 무늬 · 코로나). */
    const day = Sprites.img.sky_sun, set = Sprites.img.sky_sun_set;
    if (day && day.width) {
      const S = r / 38.4 * 128, sq = 1 - 0.12 * gold;
      c.drawImage(day, x - S / 2, y - S * sq / 2, S, S * sq);
      if (gold > 0.01 && set && set.width) {
        c.globalAlpha = al * gold;
        c.drawImage(set, x - S / 2, y - S * sq / 2, S, S * sq);
      }
    } else {
      g = c.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, core); g.addColorStop(1, rim);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.restore();
  },
  /** 달 — 차가운 원반에 옅은 얼룩 셋, 푸른 달무리 */
  drawMoon(c, x, y, al) {
    const r = 18;
    c.save();
    c.globalAlpha = al;
    let g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 5);
    g.addColorStop(0, 'rgba(190,210,255,0.22)'); g.addColorStop(1, 'rgba(190,210,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 5, 0, TAU); c.fill();
    g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, '#fbfcff'); g.addColorStop(1, '#c4cce0');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(120,130,160,0.22)';
    for (const [dx, dy, rr] of [[-5, -3, 4.5], [6, 4, 3.2], [-2, 8, 2.4]]) { c.beginPath(); c.arc(x + dx, y + dy, rr, 0, TAU); c.fill(); }
    c.restore();
  },
  /** 하늘에 늘 몇 점씩 흘러가는 구름. */
  drawClouds(c, camX, camY, rainT) {
    // 맑을 때는 16개가 옅게 흘러가고, 비가 짙어질수록 개수·범위·불투명도가 함께 올라 폭우일 때는 하늘 대부분이 구름으로 덮인다.
    const n = Math.round(16 + 90 * rainT);
    const wrapW = 2600;
    // 뒷 배경(원경 언덕·나무)과 안 겹치게, 비가 와도 화면 위쪽 띠 안에서만 빽빽해진다
    const bandH = this.H * 0.22;
    for (let i = 0; i < n; i++) {
      const seed = i * 91.7 + 13.1;
      const speed = 4 + (i % 7) * 2.1;
      const cy = 6 + ((i * 53 + (i * i * 7) % 211) % Math.round(bandH)) - camY * 0.03;
      if (cy < -70 || cy > this.H * 0.3) continue;
      const cx = ((seed + this.time * speed - camX * 0.1) % wrapW + wrapW) % wrapW - 260;
      const sc = 0.65 + (i % 5) * 0.24;
      const alpha = (0.14 + rainT * 0.62) * (0.65 + (i % 3) * 0.18);
      c.globalAlpha = Math.min(1, alpha);
      /* 손그림 구름 — 1~3 은 맑은 날, 4~7 은 먹구름 — 사연: docs/code-history.md#h63 */
      const dark = rainT > 0.02 + (i % 7) * 0.025;
      const im = this.spritesOn &&
        Sprites.img['cloud_' + (dark ? 4 + (i % 4) : 1 + (i % 3))];
      if (im && im.width) {
        const w2 = 128 * sc, h2 = 64 * sc;
        c.drawImage(im, cx - w2 / 2, cy - h2 / 2, w2, h2);
        continue;
      }
      // 그림이 없을 때의 대체 — 손그림 쪽과 같은 규칙으로 갈린다(섞지 않고 둘 중 하나)
      c.fillStyle = dark ? '#2e343c' : '#ffffff';
      for (const [dx, dy, r] of [[0, 0, 22], [18, -4, 17], [-16, -2, 16], [8, 6, 15], [-8, 7, 14]]) {
        c.beginPath(); c.arc(cx + dx * sc, cy + dy * sc, r * sc, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  },
  /** 빗줄기. */
  drawRain(c) {
    if (!this.rainDrops) return;
    if (this.snowMode) {
      c.globalAlpha = 0.85;
      c.fillStyle = '#f0f6ff';
      for (const d of this.rainDrops) if (d.on) { c.beginPath(); c.arc(d.x, d.y, d.r, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
      return;
    }
    c.globalAlpha = 0.55;
    c.strokeStyle = '#bcd0e0';
    c.lineWidth = 1.4;
    c.beginPath();
    for (const d of this.rainDrops) if (d.on) { c.moveTo(d.x, d.y); c.lineTo(d.x - 5, d.y + d.len); }
    c.stroke();
    c.globalAlpha = 1;
  },
  drawParallax(c, camX, camY, f) {
    // 손그림 원경이 있으면 그것으로
    if (this.spritesOn && this.drawParallaxArt(c, camX, camY, f)) return;
    if (camY > SURF_BASE * TS + 500) return;
    c.save();
    const layers = [[0.22, '#2b3a4a', 150], [0.38, '#25313f', 90]];
    const groundCamY = SURF_BASE * TS - this.H / 2;
    for (const [sp, col, off] of layers) {
      c.fillStyle = mixHex('#0d1018', col, 0.3 + f * 0.7);
      // 수직도 X축과 같은 sp 비율로만 반응(멀리 있는 배경일수록 카메라 이동에 덜 흔들려야 한다)
      const ox = -camX * sp, base = SURF_BASE * TS - groundCamY + off + (groundCamY - camY) * sp;
      c.beginPath(); c.moveTo(0, this.H);
      for (let x = -100; x < this.W + 100; x += 40) {
        const wx = x - (ox % 400);
        const h = Math.sin((x + ox) * 0.004) * 70 + Math.sin((x + ox) * 0.011) * 34;
        c.lineTo(x, base - h);
      }
      c.lineTo(this.W, this.H); c.closePath(); c.fill();
    }
    c.restore();
  },
  /* 초록색 앙상한 장대는 살아 있는 숲으로 안 읽힌다 — 색이 아니라 **모양**이 바뀌어야 한다 — 사연: docs/code-history.md#h64 */
  FOREST_STAGE: [
    [0.10, 'parallax_forest_lush'],   // 1장 — 잎이 가장 우거진 것
    [0.38, 'parallax_forest_mid'],    // 3~4장 — 성글어진 것
    [0.66, 'parallax_forest_thin'],   // 5~7장 — 가지 끝에만
    [0.99, 'parallax_forest']         // 8장 — 죽은 나무만 (원본)
  ],

  /** 숲 원경을 지금 잿빛 깊이에 맞춰 섞어 둔다. */
  forestBg(im) {
    const af = this.ashF();
    const S = this.FOREST_STAGE;
    /* 지금 잿빛 깊이가 어느 두 단계 사이인가. */
    let a = 0;
    while (a < S.length - 2 && af > S[a + 1][0]) a++;
    const dense = Sprites.img[S[a][1]], sparse = Sprites.img[S[a + 1][1]];
    const t = clamp((af - S[a][0]) / (S[a + 1][0] - S[a][0]), 0, 1);
    const ok = dense && dense.width && sparse && sparse.width;
    const key = ok ? S[a][1] + '|' + t.toFixed(2) : 'plain';
    if (af > 0.98 && !ok) return im;              // 다 빠졌다 — 원본이 곧 그 상태다
    if (this._fbg && this._fbg.key === key && Math.abs(this._fbg.f - af) < 0.004) return this._fbg.cv;
    const cv = this._fbg ? this._fbg.cv : document.createElement('canvas');
    cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    if (ok) {
      g.drawImage(sparse, 0, 0);
      g.globalAlpha = 1 - t; g.drawImage(dense, 0, 0); g.globalAlpha = 1;
    } else {
      g.drawImage(im, 0, 0);
    }
    /* ★ zip 을 file:// 로 열면 크롬은 PNG 를 다른 출처로 보고 캔버스를 더럽힌다 — getImageData 가 매 프레임 SecurityError 를
       던져 숲 원경이 안 그려졌다(20초에 740번). 그때는 픽셀을 못 읽으니 filter 로 채도만 빼서 비슷하게 만든다. */
    let d = null;
    if (!this._fbgTaint) { try { d = g.getImageData(0, 0, cv.width, cv.height); } catch (e) { this._fbgTaint = true; } }
    if (!d) {
      g.clearRect(0, 0, cv.width, cv.height);
      g.filter = `saturate(${Math.max(0.25, af).toFixed(2)}) hue-rotate(${Math.round((1 - af) * 18)}deg) brightness(${(1 + af * 0.06).toFixed(2)})`;
      g.drawImage(ok ? sparse : im, 0, 0);
      if (ok) { g.globalAlpha = 1 - t; g.drawImage(dense, 0, 0); g.globalAlpha = 1; }
      g.filter = 'none';
      this._fbg = { key, cv, f: af };
      return cv;
    }
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      /* 밝기는 그대로 두고 색만 숲으로 되돌린다. */
      const l = px[i] * 0.30 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      /* 잿빛이 짙을수록 아주 조금 **들어 올린다.** */
      const haze = af * 14;
      px[i] = Math.min(255, px[i] * af + (l * 0.60 + 4) * (1 - af) + haze);
      px[i + 1] = Math.min(255, px[i + 1] * af + (l * 1.10 + 8) * (1 - af) + haze);
      px[i + 2] = Math.min(255, px[i + 2] * af + (l * 0.78 + 9) * (1 - af) + haze);
    }
    g.putImageData(d, 0, 0);
    this._fbg = { key, cv, f: af };
    return cv;
  },
};
mixin(G, RenderPart);

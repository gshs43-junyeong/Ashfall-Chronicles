/* ===== game/render.js — 렌더 파이프라인 — 단계 함수 ===== */
import { shade } from '../../engine/core/color.js';
import { TAU, clamp, lerp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { tileHash } from '../../engine/core/rng.js';
import { drawFloatTexts } from '../../engine/fx/floattext.js';
import { createPipeline, tileView } from '../../engine/render/pipeline.js';
import { FONT, FONT_PLAIN, tr } from '../lang.js';
import { dimsOf } from '../size.js';
import { MACH_OF_TILE, T } from '../data.js';
import { FLUID_FLOW, LEAVE_OF } from '../data/materials.js';
import { SIG_FX } from '../data/values.js';
import { TS } from '../world.js';
import { ALPHA_TILE, BODY_ONLY, CONN, LEAF_TWIG, TOP_SKIP, TileArt } from '../tileart.js';
import { Art } from '../itemart.js';
import { Sprites } from '../sprites.js';
import { Bomb, Enemy, Guard, PROJ_FX, PROJ_STYLE, Wolf } from '../entity.js';
import { Factory } from '../factory.js';
import { DAY_CYCLE, Game, MAP_REVEAL_LIGHT, PATH_BUDGET } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const RenderPart: Bag = {


  /* ================= 렌더 ================= */
  /** 한 프레임 그리기 — 카메라·흔들림과 보이는 칸 범위만 정하고, 나머지는 렌더 단계가 순서대로 그린다(buildPipeline). */
  render() {
    const c = this.ctx, w = this.world, p = this.player;
    const shk = this.shake * (this.settings ? this.settings.shake / 100 : 1);
    const { x: camX, y: camY } = this.cam.view(shk);    // 흔들림은 이어지는 잡음(engine Camera)

    const dayF = this.dayFactor();
    const f = { c, w, p, camX, camY, dayF, ...tileView(camX, camY, this.W, this.H, TS) };
    this.pipe.run(f);
  },
  /** 렌더 단계 — 순서가 곧 겹침 순서다(엔진 render/pipeline). */
  buildPipeline() {
    this.pipe = createPipeline(['sky', 'light', 'far', 'tiles', 'machines', 'objects', 'ground', 'drops', 'actors', 'lighting', 'fx', 'screen']);
    this.pipe.add('sky', (f: any) => this.rSky(f));
    this.pipe.add('light', (f: any) => this.rLightCalc(f));
    this.pipe.add('far', (f: any) => this.rFar(f));
    this.pipe.add('tiles', (f: any) => this.rTiles(f));
    this.pipe.add('tiles', (f: any) => this.rFarmWet(f));    // 젖은 밭(game/act)
    this.pipe.add('machines', (f: any) => this.rMachines(f));
    this.pipe.add('objects', (f: any) => this.rObjects(f));
    this.pipe.add('objects', (f: any) => this.rStreaks(f));   // 물줄기(game/act) — 인물 뒤
    this.pipe.add('ground', (f: any) => this.rGround(f));
    this.pipe.add('drops', (f: any) => this.rDrops(f));
    this.pipe.add('actors', (f: any) => this.rActors(f));
    this.pipe.add('lighting', (f: any) => this.rLightOverlay(f));
    this.pipe.add('fx', (f: any) => this.rFx(f));
    this.pipe.add('fx', (f: any) => this.rUtil(f));           // 탐지 파동(game/utility)
    this.pipe.add('screen', (f: any) => this.rScreen(f));
    this.pipe.add('screen', (f: any) => this.fade.draw(f.c, this.W, this.H));   // 잠 · 되살아남 — 화면 맨 위(engine render/fade)
    this.pipe.add('screen', (f: any) => {                                       // F3 성능 판(engine ui/perf)
      if (!this.perf.on) return;
      const st = this.pipe.stats ? this.pipe.stats() : null;
      this.perf.info([`ents ${this.ents.length} · parts ${this.parts.length} · projs ${this.projs.length} · lights ${this.world.light ? this.world.light.cache.size : 0}`,
        `cam ${Math.round(this.cam.x / TS)},${Math.round(this.cam.y / TS)} · paths ${PATH_BUDGET - this.pathBudget}/${PATH_BUDGET}`,
        ...(st ? Object.keys(st).map(k => `${k} ${(+st[k]).toFixed(2)}ms`) : [])]);
      this.perf.draw(f.c, this.cv.width / Math.max(1, this.cv.clientWidth));
    });
  },
  /** 렌더 단계 — 하늘 */
  rSky(f: any) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    this.drawSky(c, dayF, camX, camY);
  },
  /** 렌더 단계 — 화면 범위 조명 계산 */
  rLightCalc(f: any) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    const dayLight = lerp(3.0, 15, dayF);
    // 발광 물약 — lit/lit_greater 버프가 있으면 미광 반경을 넓힌다 — 사연: docs/code-history.md#h60
    const litR = p.buffs.some((b: any) => b.id === 'lit_greater') ? 9.5
      : p.buffs.some((b: any) => b.id === 'lit') ? 6.8
      : p.buffs.some((b: any) => b.id === 'lantern') ? 6.0 : 4.6;
    /* 해 — 하늘에 그린 자리(skyArc: 0 = 동 · 1 = 서)에서 방향을 잡는다. 떠오르고 질 때는 세기를 줄여 그림자가 서서히 생기고 사라진다.
       비 오는 동안은 구름이 해를 가려 그림자가 옅다. */
    const sun = DAY_CYCLE.sunDir(this.dayT, (this.rainT || 0) * 1.4);
    /* 장이 넘어가며 잿빛에 진 잎만큼 잎 그늘도 옅어진다 — drawAshTile 이 칸을 지우는 평균 비율(shed × 잿빛)을 그대로 쓴다 */
    const ashF = this.ashF(), keep = (t: number) => { const a = this.ASH_TILE[t]; return a && a.shed ? clamp(1 - a.shed * ashF * a.fade * 1.15, 0, 1) : 1; };
    w.computeLight(tx0, ty0, tx1, ty1, dayLight,
      [[Math.floor(p.cx / TS), Math.floor(p.cy / TS), litR]], sun, keep);   // 플레이어 미광
  },
  /** 렌더 단계 — 원경 · 채취탑 */
  rFar(f: any) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 배경 지형 ----
    this.drawParallax(c, camX, camY, dayF);

    /* ---- 채취탑 ---- */
    this.drawRigs(c, camX, camY);
  },
  /** 렌더 단계 — 타일 · 벽지 */
  rTiles(f: any) { const { WW, WH } = dimsOf(this.world);
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
          this.mapAtlas.paint(tx, ty, this.mapColorAt(tx, ty, id, wl));
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
  rMachines(f: any) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 기계 오버레이 (방향 · 벨트 위 아이템 · 진행/연료 · 상태등) ----
    Factory.render(c, w, camX, camY, tx0, ty0, tx1, ty1, this.time);
    this.drawPlaceGhost(c, camX, camY);
  },
  /** 렌더 단계 — 설치물 · NPC */
  rObjects(f: any) {
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
        if (!(this.spritesOn && Sprites.drawObj(c, 'obj_workbench_lv' + (o.lv || 1), sx, sy, o.w, o.h, this.time))) {
          // 상판 + 다리 두 개.
          c.fillStyle = shade('#9c7a4a', f); c.fillRect(sx, sy, o.w, 3);
          c.fillStyle = shade('#7a5734', f); c.fillRect(sx, sy + 3, o.w, 3);
          c.fillRect(sx + 2, sy + 6, 4, o.h - 6);
          c.fillRect(sx + o.w - 6, sy + 6, 4, o.h - 6);
          c.fillStyle = shade('#5c4026', f); c.fillRect(sx + 2, sy + o.h - 4, o.w - 4, 2);  // 아래 가로대
        }
      } else if (o.type === 'forge') {
        if (!(this.spritesOn && Sprites.drawObj(c, 'obj_forge_lv' + (o.lv || 1), sx, sy, o.w, o.h, this.time))) {
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
  rGround(f: any) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 특별한 스킬의 바닥 연출 ----
    this.drawSigGround(c, camX, camY);
  },
  /** 렌더 단계 — 시체 · 떨어진 물건 */
  rDrops(f: any) {
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
  rActors(f: any) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 적 ----
    for (const e of this.ents) {
      const sx = e.x - camX, sy = e.y - camY;
      if (sx < -200 || sx > this.W + 200 || sy < -200 || sy > this.H + 200) continue;
      const posed = e instanceof Enemy && this.castPose(c, e, sx, sy);   // 시전 몸짓(mob-fx)
      if (e instanceof Wolf) this.drawWolf(c, e, sx, sy);
      else if (e instanceof Guard) this.drawGuard(c, e, sx, sy);
      else this.drawEnemy(c, e, sx, sy);
      if (posed) c.restore();
      if (e instanceof Enemy) this.drawStatus(c, e, sx, sy);
    }

    // ---- 플레이어 ----
    /* 비석 — 쓰러진 자리에 실제로 세워 둔다. */
    if (this.deathMark && this.deathMark.g) this.drawGrave(c, this.deathMark, camX, camY);
    this.drawRipeCrops(c, camX, camY);
    this.drawStarOrbit(c, p, camX, camY);
    if (this.spritesOn) this.trail.draw((s: any, a: number) => {                // 대시 잔상 — 몸보다 먼저(뒤에)
      c.save(); c.globalAlpha = a * 0.42; c.filter = 'brightness(1.6) saturate(0.4)';
      Sprites.draw(c, s.d.key, s.d.fr, s.x - camX, s.y - camY, s.d.flip);
      c.restore(); c.filter = 'none';
    });
    this.drawPlayer(c, p, p.x - camX, p.y - camY);
    for (const q of this.players) if (q !== p) { this.drawPlayer(c, q, q.x - camX, q.y - camY); this.drawNameTag(c, q, camX, camY); }
    for (const q of this.players) if (!q.downed) this.drawStatus(c, q, q.x - camX, q.y - camY);
    for (const pet of (this.petEnts || [])) if (pet) this.drawPet(c, pet, camX, camY);
    for (const q of this.players) if (q.remote && q.petEnts) for (const pet of q.petEnts) if (pet) this.drawPet(c, pet, camX, camY);
    /* 회오리 검무의 칼선 — 플레이어 바로 위에, 선으로만. */
    this.drawWhirlArc(c, p, camX, camY);
    // ---- 떨어지는 별 ----
    this.drawSigSky(c, camX, camY);
  },
  /** 남의 캐릭터 머리 위 이름과 체력 줄. */
  drawNameTag(c: CanvasRenderingContext2D, q: any, camX: number, camY: number) {
    const x = Math.round(q.cx - camX), y = Math.round(q.y - camY) - 14;
    c.save();
    c.font = '11px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(q.name, x, y);
    c.fillStyle = '#e8f0ff'; c.fillText(q.name, x, y);
    if (q.hp <= 0) {      // 쓰러졌다 — 생명 막대 대신 붉은 글
      c.font = 'bold 10px ' + FONT; c.textBaseline = 'top';
      c.strokeText(tr('쓰러짐'), x, y + 1); c.fillStyle = '#ff7a6a'; c.fillText(tr('쓰러짐'), x, y + 1);
      c.restore(); return;
    }
    const k = clamp(q.hp / (q.netMaxHp || q.d.maxHp || 1), 0, 1);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - 14, y + 2, 28, 3);
    c.fillStyle = k > 0.35 ? '#6fd36f' : '#e05a4a'; c.fillRect(x - 14, y + 2, Math.round(28 * k), 3);
    c.restore();
  },
  /** 렌더 단계 — 어둠 · 빛 색 · 공기색 · 유적 여운 */
  rLightOverlay(f: any) {
    const { c, w, p, camX, camY, dayF, tx0, ty0, tx1, ty1 } = f;
    // ---- 조명 (부드러운 그라디언트 오버레이) ----
    this.drawLightOverlay(c, camX, camY, tx0, ty0, tx1, ty1);
    this.drawGlow(c, camX, camY, tx0, ty0, tx1, ty1);   // 빛 색 — 어둠 위에 더한다
    this.drawLairGlow(c, camX, camY);                  // 깨어 있는 둥지의 알·노심 — 어두운 유적에서도 보이게
    if (this.deathMark && this.deathMark.g) this.drawGraveGlow(c, this.deathMark, camX, camY);   // 비석 넋불 — 굴 속에서도 찾게
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
  rFx(f: any) {
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

    // ---- 고리 · 떨어질 자리 예고 · 번개(engine fx/shapes) ----
    this.shapes.draw(c, camX, camY);
    this.vfx.draw(c, camX, camY);          // 스킬 연출(engine fx/vfx)
    this.drawMobFx(c, camX, camY);         // 몹 스킬 · 원소 탄 꼬리(mob-fx)

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
    if (!this.settings || this.settings.dmgnum)
      drawFloatTexts(c, this.texts, camX, camY, { font: crit => (crit ? 'bold 19px' : '14px') + ' ' + FONT, critLabel: tr('치명'), critFont: '10px ' + FONT_PLAIN });
    c.globalAlpha = 1;
  },
  /** 렌더 단계 — 조준 · 비 · 비네트 · 길잡이 */
  rScreen(f: any) { const { SURF_BASE } = dimsOf(this.world);
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

    this.drawDebuffEdge(c, this.W, this.H);

    // ---- 길잡이 (비네트 위에 얹어야 어두운 곳에서도 읽힌다) ----
    if (this.settings === undefined || this.settings.compass !== false) this.drawCompass(c, camX, camY);
    this.drawPulse(c);
  },
};

mixin(Game.prototype, RenderPart, true);

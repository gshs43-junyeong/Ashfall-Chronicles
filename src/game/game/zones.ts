/* ===== game/zones.js — 바이옴 들어섬 · 공기 빛깔 · 배경 갈래 ===== */
import { mixHex } from '../../engine/core/color.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { dimsOf } from '../size.js';
import { TS, ZONE_CARD } from '../world.js';
import { UI } from '../ui.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const ZonesPart: Bag = {

  /** 바이옴에 처음 들어섰을 때 — 그 땅이 어떤 곳인지 한 번 알린다. */
  /** 지금 화면 뒤에 깔린 원경이 무엇인가 — drawParallaxArt 의 고르는 규칙과 같다. */
  bgId(camX, camY) { const { WW, SURF_BASE, HELL_Y } = dimsOf(this.world);
    const p = this.player, w = this.world;
    if (!p || !w) return null;
    if (camY > HELL_Y * TS - 700) return 'hell';
    const zone = w.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    if (zone === 'sky' || zone === 'ruin' || zone === 'village' || zone === 'camp') return zone;
    if (camY > SURF_BASE * TS + 500) return null;
    /* ★ 땅 이름은 **플레이어가 선 자리**로 정한다. */
    return w.biomeAt(clamp(Math.floor(p.cx / TS), 0, WW - 1)).id;
  },

  /** 땅·구역의 이름표. */
  checkBiomeEntry(camX, camY) { const { BIOMES } = dimsOf(this.world);
    if (this.time < 3) return;                 // 시작 직후엔 장 카드와 겹친다
    const id = this.bgId(camX, camY);
    if (!id) return;                           // 원경이 없는 층 — 기준이 없으니 세지 않는다
    if (id === this._bgId) return;             // 배경이 그대로면 아무 일도 없다
    const first = this._bgId === undefined;
    this._bgId = id;
    if (first) return;                         // 들어온 첫 프레임은 "바뀐 것"이 아니다
    if (!this.seenBiomes) this.seenBiomes = {};
    const z = ZONE_CARD[id];
    const b = z ? null : BIOMES.find(q => q.id === id);
    const card = z ? z.card : (b && b.card);
    if (!card) return;                         // 유적·하늘 섬·지옥은 제 카드가 따로 있다
    /* ★ 기록(seenBiomes — 탐험 목표가 읽는다)은 남기되 카드는 **들어올 때마다** 띄운다. */
    this.seenBiomes[id] = 1;
    this._cardAt = this._cardAt || {};
    if (this.time - (this._cardAt[id] || -1e9) < 90) return;
    this._cardAt[id] = this.time;
    /* 소리는 내지 않는다. */
    UI.chapterCard({ sub: z ? z.sub : b.card.sub, title: z ? z.n : b.n, line: card.line });
  },

  /** 그 땅의 공기색. */
  biomeAir(camX, camY) { const { WW, SURF_BASE, HELL_Y, BIOMES } = dimsOf(this.world);
    const w = this.world;
    const tx = clamp(Math.floor((camX + this.W / 2) / TS), 0, WW - 1);
    const [i, j, k] = w.biomeMix(tx);
    const A = BIOMES[i].air, B = BIOMES[j].air;
    if (!A || !B) return null;
    const ty = (camY + this.H / 2) / TS;
    // 지표 위에서는 그대로, 지옥에 가까울수록 사라진다
    const depth = 1 - clamp((ty - SURF_BASE - 60) / (HELL_Y - SURF_BASE - 60), 0, 1);
    const a = (A.a * (1 - k) + B.a * k) * (0.4 + 0.6 * depth);
    if (a < 0.004) return null;
    /* ★ 색도 채널별로 섞는다. */
    /* k 는 0(한복판)~0.5(경계 한가운데) — 경계에서 딱 반반이라는 뜻이라 그대로 쓴다. */
    return { c: mixHex(A.c, B.c, k), a };
  },

  /** 공기색을 화면에 덮는다. */
  drawAir(c, air) {
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.globalAlpha = Math.min(0.55, air.a * 2.2);
    c.fillStyle = air.c;
    c.fillRect(0, 0, this.W, this.H);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = air.a * 0.42;
    c.fillRect(0, 0, this.W, this.H);
    c.restore();
  },
};

mixin(Game.prototype, ZonesPart, true);

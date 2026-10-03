/* ===== game/boss.js — 보스 — 제단 · 소환 · 둥지 · 결전 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { ITEMS } from '../data/items.js';
import { MODE_OF } from '../data/start.js';
import { ENEMIES } from '../data/enemies.js';
import { STORY_BOSSES } from '../data/skills.js';
import { RUIN_SPEC } from '../data/ruins.js';
import { CHAPTERS } from '../data/story.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Enemy } from '../entity.js';
import { UI } from '../ui.js';
import { Music } from '../music.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const BossPart: Bag = {

  /* ================= 제단 / 보스 ================= */
  /** 이 장의 결전 보스인데 아직 자격이 없으면 막는다 — 소환 아이템만으로 깨울 수 있으면 장 목표를 통째로 건너뛴다. */
  bossGated(bossId) {
    const ch = CHAPTERS[this.chapter];
    if (!ch || !ch.goal || ch.goal.type !== 'boss' || ch.goal.target !== bossId) return false;
    const st = this.chapterState(ch);
    if (st.ready) return false;
    this.toast(this.goalLocked(ch, st), 'bad');
    return true;
  },
  altar(o) {
    const p = this.player;
    const need = Object.keys(ITEMS).find(k => ITEMS[k].boss === o.boss);
    if (this.boss) { this.toast(tr('이미 무언가가 깨어 있다'), 'bad'); return; }
    if (this.bossGated(o.boss)) return;
    // 소환 아이템이 아예 없는 보스라면 제단이 아니라 둥지로 다뤄야 한다 — 사연: docs/code-history.md#h47
    if (!need) { this.wakeLair({ boss: o.boss, ruin: 12, nm: tr('제단'), x: o.x, y: o.y, w: o.w, h: o.h }); return; }
    if (p.countItem(need) <= 0) { this.toast(tr('{item|이} 필요하다', { item: ITEMS[need].n }), 'bad'); return; }
    p.removeItem(need, 1);
    this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 60);
    UI.refreshBag();
  },
  useSummon(slot) {
    const p = this.player, it = p.bag[slot];
    const bossId = idef(it).boss;
    if (this.boss) { this.toast(tr('이미 무언가가 깨어 있다'), 'bad'); return; }
    if (this.bossGated(bossId)) return;
    const zone = this.world.zoneAt(Math.floor(p.cx / TS), Math.floor(p.cy / TS));
    const req = {
      king_slime: ['surface', 'cave'], bone_lord: ['cave', 'deep'], corrupt_heart: ['corrupt'],
      frost_witch: ['ice'], void_king: ['hell'], storm_warden: ['sky'], first_keeper: ['ruin'],
      pursuer: ['surface'],  // 하늘이 트인 지상에서만 — 숨는 대신 위치를 알려주는 의식이다
      overseer: ['works']
    }[bossId];
    if (req && !req.includes(zone)) { this.toast(tr('여기서는 반응하지 않는다'), 'bad'); return; }
    p.removeItem(it.id, 1);
    this.spawnBoss(bossId, p.cx + 160 * (p.facing || 1), p.cy - 90);
    UI.refreshBag();
  },
  spawnBoss(id, x, y) {
    /* 스토리 보스는 수치를 고정한다. */
    const e = new Enemy(id, x, y, STORY_BOSSES[id] ? 1 : this.scale() * 0.9);
    this.netBossScale(e);                    // 멀티플레이 — 인원만큼 체력
    this.ents.push(e); this.boss = e;
    this.toast(tr('{enemy|이} 깨어났다!', { enemy: ENEMIES[id].n }), 'bad');
    this.shake = 16;
    // 등장 효과음을 따로 두지 않고 보스 브금이 바로 치고 들어오게 한다
    if (Music) Music.play('boss', true);
  },
  onBossDown(id) {
    this.boss = null;
    this.pulseBossDown();          // 유적 주인 · 메아리 — 맥박을 가라앉히고 보상을 준다
    // 둥지에서 깨운 것이라면 그 둥지를 비운 것으로 남긴다
    if (this.pendingLair !== undefined && this.pendingLair !== null) {
      this.lairs = this.lairs || {};
      this.lairs[this.pendingLair] = 1;
      this.pendingLair = null;
    }
    this.toast(tr('{enemy} 토벌!', { enemy: ENEMIES[id].n }), 'good');
    UI.bossBar(null);
  },

  /* ---- 미니보스 둥지 ---- */
  wakeLair(o) {
    this.lairs = this.lairs || {};
    // 바이옴 유적의 빈 둥지는 메아리 시련 자리다(RUIN_SPEC 의 여섯만 — 나머지 둥지는 그대로 빈다)
    if (this.lairs[o.ruin] && RUIN_SPEC[o.ruin] && RUIN_SPEC[o.ruin].id) { this.openEcho(o); return; }
    if (this.lairs[o.ruin]) { this.toast(tr('이미 비어 있다')); return; }
    if (this.boss) { this.toast(tr('이미 무언가가 깨어 있다'), 'bad'); return; }
    if (this.bossGated(o.boss)) return;
    const spec = RUIN_SPEC[o.ruin];
    const name = o.nm || (spec ? spec.n : tr('둥지'));
    UI.openLore(name, [
      tr('무언가가 이 자리에서 아주 오래 기다렸다.'),
      tr('건드리면 깨어난다.')
    ], [
      {
        t: tr('(깨운다)'), quest: 1, fn: () => {
          UI.closeDialogue();
          // 어느 둥지를 깨웠는지 기억해 둔다 — 잡으면 그 둥지를 비운 것으로 남긴다
          this.pendingLair = o.ruin;
          this.spawnBoss(o.boss, o.x + o.w / 2, o.y - 70);
        }
      },
      { t: tr('(그냥 둔다)'), fn: () => UI.closeDialogue() }
    ]);
  },

  /** 쓰러지면 싸움은 없던 일 — 깨운 보스는 조용히 사라지고(처치 아님 · 보상 없음) 제단·둥지·메아리는 다시 깨울 수 있다. */
  endBossFight() {
    if (this.boss) { this.boss.dead = true; this.boss = null; }       // die() 를 거치지 않는다
    this.pendingLair = null; this.pendingEcho = null;
    UI.bossBar(null);
  },

  /* ================= 특성 연출 ================= */
  /** 보스가 페이즈를 넘기며 던지는 한 줄. */
  bossLine(who, text) {
    this.bossSay = { who, text, t: 3.2 };
  },
  /* 몹의 세기는 **스토리 진행(장)만** 따라간다. */
  scale() { return 1 + this.chapter * 0.09; },
  /** 난이도가 몹의 체력·공격력에만 곱하는 값. */
  modeMul() { return MODE_OF(this.mode).mul; },
};

mixin(G, BossPart);

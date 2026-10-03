/* ===== savefmt.js — 세이브 모양: 판올림 · 서명 · 슬롯 요약 · 저장소 ===== */
import { makeSigner } from '../engine/save/seal.js';
import { createSaveStore } from '../engine/save/store.js';
import { upgrade } from '../engine/save/upgrade.js';
import { N_ } from './lang.js';
import { affixIndex } from './items.js';
/* ★ 세이브 모양을 바꿨으면 SAVE_UPGRADES 끝에 한 칸을 더한다(CLAUDE.md §1-4) — SAVE_VERSION 을 손으로 올리지 말 것. */

/** 이름을 비워 둔 모험가 — 세이브에는 원문으로 남기고 보일 때 옮긴다(언어를 바꿔도 따라온다) */
export const NONAME = N_('이름 없는 모험가');

export const SAVE_KEY = 'ashfall_save_v3';   // v1: 640×232 · v2: 2800×480 — 세계 폭이 바뀌면 호환 불가
export const SAVE_SLOTS = 3;

/* ---------------- 세이브 판올림 ---------------- */
export const SAVE_UPGRADES = [
  // v1 → v2
  (d) => {
    // 상인 재고 — 하루 단위로 갈리는 무작위 재고를 세이브에 담는다
    if (!d.shopStock) d.shopStock = {};
    if (d.shopStockDay === undefined) d.shopStockDay = -1;
  },
  // v2 → v3 — 유틸리티 장비 칸 두 개가 생겼다
  (d) => {
    const eq = d.player && d.player.equip;
    if (!eq) return;
    if (eq.util1 === undefined) eq.util1 = null;
    if (eq.util2 === undefined) eq.util2 = null;
  },
  /* v3 → v4 — 업적. */
  (d) => { if (!d.achievements) d.achievements = {}; },
  /* v4 → v5 — 업적 중에 세이브에 없는 값을 묻는 것들이 생겼다 (플레이 시간·거래 횟수·익사 같은 것). */
  (d) => { if (!d.tally) d.tally = {}; },
  /* v5 → v6 — 유적 탐사 기록. */
  (d) => { if (!d.survey) d.survey = {}; },
  /* v6 → v7 — 동굴 갈래(world.caveGrid)와 금 간 자갈(world.faults). */
  (d) => { if (d.world) { if (d.world.caveGrid === undefined) d.world.caveGrid = null; if (!d.world.faults) d.world.faults = []; } },
  /* v7 → v8 — 세계 크기(world.size: 's' 소형 · 'm' 중형 · 'l' 대형). */
  (d) => { if (d.world && !d.world.size) d.world.size = 's'; },
  /* v8 → v9 — 드릴이 광맥 칸마다 더 캘 수 있는 횟수(world.oreHits). */
  (d) => { if (d.world && !d.world.oreHits) d.world.oreHits = {}; },
  /* v9 → v10 — 바다 수면(world.sea). 없으면 World.deserialize 가 타일에서 다시 잰다(null 로 두면 그쪽이 채운다). */
  (d) => { if (d.world && d.world.sea === undefined) d.world.sea = null; },
  /* v10 → v11 — 장비 접사를 글자({n, s}) 대신 표 번호({k, i})로. 아이템이 가방·장비·금고·상자·기계 어디에나 있어 통째로 훑는다. */
  (d) => {
    const seen = new Set();
    (function walk(o) {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      if (Array.isArray(o.a) && typeof o.id === 'string') {
        for (const a of o.a) if (a && (a.k === 'p' || a.k === 's') && a.i === undefined) {
          const i = affixIndex(a);
          if (i >= 0) { a.i = i; delete a.n; delete a.s; }
        }
      }
      for (const k in o) { const v = o[k]; if (v && typeof v === 'object') walk(v); }
    })(d);
  },
  /* v11 → v12 — 밭 젖음(world.wet: 밭 칸 → 젖어 있는 마지막 날). 이미 심어 둔 작물이 판이 바뀌자마자 서지 않게, 그 밑 밭은 사흘 젖게 둔다. */
  (d) => {
    if (!d.world || d.world.wet) return;
    const wet = {}, ww = d.world.ww || 5000, until = (d.dayCount || 0) + 3;
    for (const k of (d.world.crops || [])) wet[k + ww] = until;
    d.world.wet = wet;
  },
  /* v12 → v13 — 멀티플레이 손님 기록(mpGuests: 손님 아이디 → 마지막 자리 · 새로 만든 손님 캐릭터). 옛 세계엔 손님이 없었다. */
  (d) => { if (!d.mpGuests) d.mpGuests = {}; }
];
export const SAVE_VERSION = SAVE_UPGRADES.length + 1;

/** 옛 세이브를 지금 판까지 끌어올린다. */
export function upgradeSave(d) { return upgrade(d, SAVE_UPGRADES); }
export const slotKey = (i) => `${SAVE_KEY}_slot${i}`;
export const sigKey = (i) => `${SAVE_KEY}_slot${i}_s`;

/* ================= 세이브 무결성 ================= */
export const SAVE_SALT = 'ashfall-seal-1';
/** FNV-1a 32비트 두 벌 — 소금은 게임 것(engine/save/seal.js). */
export const saveSign = makeSigner(SAVE_SALT);
/** 열어도 되는 기록인가(sig 는 그 기록에 딸린 서명). */
export function saveSealOk(raw, d, sig) {
  if (!d || !d.sealed) return true;
  return !!sig && sig === saveSign(raw);
}
/** 슬롯 목록에 띄울 요약 — 본문을 열지 않고 목록을 그리려고 따로 적는다 */
export function saveHead(d) {
  return { name: d.name || NONAME, level: d.p ? d.p.level : 1, chapter: d.chapter,
    size: (d.world && d.world.size) || 's', savedAt: d.savedAt };
}

/* ================= 저장소 ================= */
export const SaveStore = createSaveStore({ dbName: 'ashfall', slots: SAVE_SLOTS, slotKey, sigKey,
  sign: saveSign, head: saveHead, sealOk: saveSealOk });
export const SET_KEY = 'ashfall_settings';

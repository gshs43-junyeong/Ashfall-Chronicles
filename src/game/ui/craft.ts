/* ===== ui/craft.js — 제작 · 마을 회관 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { ITEMS, STATION_DESC, STATION_NAME, STATION_UP } from '../data/items.js';
import { RECIPES } from '../data/recipes.js';
import { VILLAGE } from '../data/start.js';
import { Art } from '../itemart.js';
import { makeItem } from '../entity.js';
import { $, $$, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const CraftUIPart: Bag = {

  /* ---------------- 제작 ---------------- */
  craftTab: 'work',
  /* null이면 **지금 진행 중인 세션**을 연다 — 사연: docs/code-history.md#h97 */
  questSession: null,
  craftGroup: 'all',
  craftShowLocked: false,
  craftQuery: '',
  /** 제작품의 쓰임새 기준 분류. */
  craftGroupFor(r) {
    const id = r.out, type = ITEMS[id].type;
    const factory = new Set(['wire', 'circuit', 'motor', 'machine_frame', 'battery_empty', 'battery_cell', 'fuel_brick', 'refined_oil', 'polymer', 'steel_plate', 'rivet']);
    if (id.startsWith('m_') || factory.has(id)) return 'factory';
    if (['weapon', 'tool', 'armor', 'acc', 'bag'].includes(type)) return 'gear';
    if (type === 'consum' || type === 'summon' || id.startsWith('food_') || id.startsWith('potion_')) return 'survival';
    if (type === 'block') return 'build';
    return 'other';
  },
  matLine(p, need) {
    return Object.entries(need).map(([k, v]) => {
      const have = p.countItem(k);
      return `<span class="${have < v ? 'lack' : ''}">${ITEMS[k].n} ${have}/${v}</span>`;
    }).join(' · ');
  },
  refreshCraft() {
    const p = G.player, near = G.nearSt;
    const lv = { work: (G.nearStObj.work && G.nearStObj.work.lv) || 1, forge: (G.nearStObj.forge && G.nearStObj.forge.lv) || 1 };
    let tab = this.craftTab;
    // 이제는 **지금 이 순간 실제로 근처(70px)에 있는 시설만** 같이 보여준다 — 없으면 맨손 탭 하나뿐 — 사연: docs/code-history.md#h98
    if (tab !== 'hand' && !near[tab]) tab = this.craftTab = 'hand';
    const allTabs = { work: ['work', tr('작업대 Lv.{work}', { work: lv.work })], forge: ['forge', tr('용광로 Lv.{forge}', { forge: lv.forge })], hand: ['hand', tr('맨손')] };
    const tabs = [];
    if (tab === 'work' || (tab === 'hand' && near.work)) tabs.push(allTabs.work);
    if (tab === 'forge' || (tab === 'hand' && near.forge)) tabs.push(allTabs.forge);
    tabs.push(allTabs.hand);
    let head = '<div class="craft-tabs">' + tabs.map(([k, n]) =>
      `<button class="ctab${tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('') + '</div>';

    if (tab === 'hand') {
      head += `<div class="st-info">${tr('시설 없이 만들 수 있는 것들이다.')}</div>`;
    } else {
      const L = lv[tab];
      head += `<div class="st-info"><b>${STATION_NAME[tab][L]}</b> — ${STATION_DESC[tab][L]}` +
        (near[tab] ? '' : ` <span class="lack">${tr('· 시설 앞으로 가야 쓸 수 있다')}</span>`) + '</div>';
      if (L < STATION_UP[tab].length) {
        const up = STATION_UP[tab][L], can = near[tab] && p.hasAll(up.need);
        head += `<div class="st-up${can ? '' : ' no'}" data-up="${tab}">` +
          `<div class="rname">${tr('▲ {stationName|으로} 개조', { stationName: STATION_NAME[tab][L + 1] })}</div>` +
          `<div class="rmat">${this.matLine(p, up.need)}</div></div>`;
      } else {
        head += `<div class="st-up done">${tr('더 손볼 데가 없다. 마지막 단계다.')}</div>`;
      }
    }
    // 만들 수 있는 것 → 재료만 모자란 것 → 아직 안 열린 것 순.
    const rows = [];
    for (let i = 0; i < RECIPES.length; i++) {
      const r = RECIPES[i];
      if (tab === 'hand' ? r.station : r.station !== tab) continue;
      const need = r.lv || 1;
      const locked = tab !== 'hand' && lv[tab] < need;
      const group = this.craftGroupFor(r);
      const query = this.craftQuery.trim().toLowerCase();
      const matches = !query || ITEMS[r.out].n.toLowerCase().includes(query);
      if ((!this.craftShowLocked && locked) || (this.craftGroup !== 'all' && group !== this.craftGroup) || !matches) continue;
      rows.push({ i, r, locked, mat: p.hasAll(r.need), group });
    }
    rows.sort((a, b) => (a.locked - b.locked) || (b.mat - a.mat) || ((a.r.lv || 1) - (b.r.lv || 1)));

    const groups = [['all', tr('전체')], ['gear', tr('장비')], ['survival', tr('생존')], ['build', tr('건축')], ['factory', tr('자동화')], ['other', tr('기타')]];
    const escapedQuery = this.craftQuery.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    head += `<div class="craft-filter"><input id="craft-search" type="search" value="${escapedQuery}" placeholder="${tr('제작품 검색')}">` +
      groups.map(([key, label]) => `<button class="cg${this.craftGroup === key ? ' on' : ''}" data-cgroup="${key}">${label}</button>`).join('') +
      `<button class="lock-toggle${this.craftShowLocked ? ' on' : ''}" data-lock-toggle>${this.craftShowLocked ? tr('잠긴 제작법 숨기기') : tr('잠긴 제작법 보기')}</button>` +
      `<span class="craft-count">${tr('{rowsCount}개 표시', { rowsCount: rows.length })}</span></div>`;
    $('#craft-note').innerHTML = head;

    let h = '';
    for (const { i, r, locked, mat } of rows) {
      const d = ITEMS[r.out];
      const ok = !locked && mat && (!r.station || near[r.station]);
      let mats = this.matLine(p, r.need);
      if (locked) mats = `<span class="lack">${tr('[{stationName} 필요]', { stationName: STATION_NAME[tab][r.lv] })}</span> ` + mats;
      h += `<div class="recipe ${ok ? '' : 'no'}" data-r="${i}"><div class="ric"></div><div>` +
        `<div class="rname">${d.n}${r.n > 1 ? ' ×' + r.n : ''}</div><div class="rmat">${mats}</div></div></div>`;
    }
    $('#craft-list').innerHTML = h || `<div class="st-info">${tr('여기서 만들 수 있는 것이 아직 없다.')}</div>`;

    $$('#craft-note .ctab').forEach(b => b.addEventListener('click', () => {
      this.craftTab = b.dataset.tab;
      this.craftGroup = 'all'; this.craftQuery = ''; this.refreshCraft();
    }));
    $$('#craft-note .cg').forEach(b => b.addEventListener('click', () => { this.craftGroup = b.dataset.cgroup; this.refreshCraft(); }));
    const lockToggle = $('#craft-note [data-lock-toggle]');
    if (lockToggle) lockToggle.addEventListener('click', () => { this.craftShowLocked = !this.craftShowLocked; this.refreshCraft(); });
    const search = $('#craft-search');
    if (search) search.addEventListener('change', () => { this.craftQuery = search.value; this.refreshCraft(); });
    const upEl = $('#craft-note .st-up[data-up]');
    if (upEl) upEl.addEventListener('click', () => G.upgradeStation(upEl.dataset.up));
    $$('#craft-list .recipe').forEach(el => {
      const i = +el.dataset.r;
      this.setIcon(el.querySelector('.ric'), Art.itemUrl(RECIPES[i].out));
      el.addEventListener('click', () => G.craft(i));
      el.addEventListener('mouseenter', e => this.showTip(makeItem(RECIPES[i].out, 1, 0), e));
      el.addEventListener('mouseleave', () => this.hideTip());
    });
  },

  /* ---------------- 마을 회관 ---------------- */
  openTownhall() {
    this.closePanel();
    this.panels.show('town'); G.uiOpen = true;
    this.refreshTownhall();
  },
  refreshTownhall() {
    const p = G.player, lv = G.villageLv();
    $('#town-title').textContent = tr('여명 마을 — {v}', { v: VILLAGE[lv] ? VILLAGE[lv].n : '—' });
    let h = '';
    // 단계 수는 VILLAGE 표가 정한다 — 3으로 박아 두면 표에 단계를 더해도 창에 안 뜬다
    for (let i = 1; i <= VILLAGE.length - 1; i++) {
      const v = VILLAGE[i];
      const state = i <= lv ? 'done' : i === lv + 1 ? 'next' : 'far';
      h += `<div class="tv ${state}">` +
        `<div class="tv-head">${tr('<b>{i}단계 · {v}</b>', { i, v: v.n })}` +
        `<span class="tv-tag">${state === 'done' ? tr('완료') : state === 'next' ? tr('다음') : tr('잠김')}</span></div>` +
        `<div class="tv-desc">${v.d}</div>` +
        '<ul class="tv-gain">' + v.gain.map(g => `<li>${g}</li>`).join('') + '</ul>';
      if (state === 'next') {
        const can = p.hasAll(v.need);
        h += `<div class="tv-cost">${tr('필요한 것 — {matLine}', { matLine: this.matLine(p, v.need) })}</div>` +
          `<button class="tv-btn${can ? '' : ' no'}" id="town-up">${tr('이 단계로 올린다')}</button>`;
      }
      h += '</div>';
    }
    h += `<div class="tv-note">${tr('지어 올린 것은 되돌릴 수 없다. 베이스캠프는 이 개선의 대상이 아니다 —')} ` +
      `${tr('엘라라가 거긴 그냥 두라고 했다.')}</div>`;
    $('#town-body').innerHTML = h;
    const b = $('#town-up');
    if (b) b.addEventListener('click', () => { G.upgradeVillage(); this.refreshTownhall(); });
  },
};
mixin(UI, CraftUIPart);

/* ===== ui/tree.js — 특성 트리 · 생활 숙련 ===== */
import { app as G } from '../ctx.js';
import { mixin } from '../../engine/core/mixin.js';
import { tr } from '../lang.js';
import { NODE_KIND_COL, PROFS, PROF_MAX, SKILLS, TIER_REQ, nodeKind, profNeed, skillSlotN } from '../data/skills.js';
import { Art } from '../itemart.js';
import { $, $$, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const TreeUIPart: Bag = {

  /* ---------------- 특성 트리 ---------------- */
  /* ★ 판 하나 · 분야를 나누지 않는다 — 머리글 · 갈래별 점수를 걷고, 칸 색은 무엇을 주는가(기술 · 힘 · 칸 열기)로만 가른다.
     ★ 배운 칸과 이어진 칸만 드러난다 — 멀리 있는 칸은 틀도 선도 없다(미리 보이면 길을 고르는 맛이 없다, 사용자 결정 2026-10-16).
     자리는 예전 그대로 가운데 핵에서 네 쪽으로 뻗는다. 사연: docs/code-history.md#h90 · #h187 · #h191 */
  TREE_BOX: 44,
  /* 칸 사이를 넓혔다(사용자) — 판이 창보다 커서 끌거나 휠로 움직인다(_treePan) */
  TREE_GX: 62, TREE_GY: 70, TREE_ROW: 118, TREE_COL: 124, TREE_SKEW: 34, TREE_H: 600, TREE_CY: 300,
  TREE_DIR: { blade: [-1, -1], ranger: [1, -1], arcane: [1, 1], explore: [-1, 1] } as Record<string, number[]>,
  HOLD_T: 0.42,                     // 꾹 눌러 배우는 시간(초) — 한 번 클릭으로 잘못 찍던 것을 막고 '찍는 손맛'을 준다
  _nodeXY(id: string) {
    const sk = SKILLS[id], [sx, sy] = this.TREE_DIR[sk.br!] || [1, 1], t = sk.tier!;
    return [sx * (this.TREE_GX + t * this.TREE_SKEW + sk.col! * this.TREE_COL), sy * (this.TREE_GY + t * this.TREE_ROW)];
  },

  buildTree() {
    const w = $('#tree-wrap'); if (!w) return;
    w.innerHTML = '';
    this._treeVis = null;
    const NS = 'http://www.w3.org/2000/svg';
    const legend = document.createElement('div');
    legend.className = 'tlegend';
    legend.innerHTML = ['active', 'passive', 'unlock'].map(k => `<span class="tk" style="--bc:${NODE_KIND_COL[k]}"><i></i>${
      k === 'active' ? tr('기술') : k === 'passive' ? tr('힘') : tr('칸 열기')}</span>`).join('') +
      `<span class="thint">${tr('꾹 눌러 배운다 · 끌거나 휠로 판을 옮긴다 · 우클릭으로 스킬 칸 고르기')}</span>`;
    w.appendChild(legend);

    /* 판(plane)은 칸이 다 들어가는 크기, 창(grid)은 그 일부를 보여 준다 */
    let mx = 0, my = 0;
    for (const id in SKILLS) { const [x, y] = this._nodeXY(id); mx = Math.max(mx, Math.abs(x)); my = Math.max(my, Math.abs(y)); }
    const PW = Math.round((mx + 80) * 2), PH = Math.round((my + 80) * 2);
    const grid = document.createElement('div');
    grid.className = 'bgrid';
    grid.style.height = `min(${this.TREE_H}px, calc(100vh - 380px))`;   // 창 안에 다 들어오게 — 창이 스크롤되면 끌기와 겹친다
    grid.style.setProperty('--cy', '50%');
    const plane = document.createElement('div');
    plane.className = 'bplane'; plane.style.width = PW + 'px'; plane.style.height = PH + 'px';
    plane.style.setProperty('--cy', PH / 2 + 'px');
    this._treePlane = { el: plane, grid, w: PW, h: PH };
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'blines');
    const line = (a: number[], b: number[], cls: string, c: string) => {
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', String(a[0])); ln.setAttribute('y1', String(a[1]));
      ln.setAttribute('x2', String(b[0])); ln.setAttribute('y2', String(b[1]));
      ln.setAttribute('class', cls); ln.style.setProperty('--bc', c);
      ln.style.setProperty('--len', String(Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]))));
      svg.appendChild(ln); return ln;
    };
    /* ★ 가운데가 트리의 심장 — 단 고리(3 · 8 · 14점)가 핵을 둘러 '모든 칸은 핵에서 잰다'를 보이고, 뿌리 선은 배운 첫 단으로 기운을 흘린다 */
    for (let t = 1; t < TIER_REQ.length; t++) {
      const ids = Object.keys(SKILLS).filter(id => SKILLS[id].tier === t);
      const r = ids.reduce((a, id) => a + Math.hypot(...this._nodeXY(id)), 0) / ids.length - this.TREE_ROW * 0.45;
      const ring = document.createElementNS(NS, 'circle');
      ring.setAttribute('r', String(Math.round(r))); ring.setAttribute('class', 'bring'); ring.dataset.t = String(t);
      svg.appendChild(ring);
      const lb = document.createElementNS(NS, 'text');
      lb.setAttribute('x', '0'); lb.setAttribute('y', String(-Math.round(r) + 4)); lb.setAttribute('class', 'bringlb'); lb.dataset.t = String(t);
      lb.textContent = tr('{n}점', { n: TIER_REQ[t] });
      svg.appendChild(lb);
    }
    for (const id in SKILLS) if (SKILLS[id].tier === 0) { const ln = line([0, 0], this._nodeXY(id), 'broot', NODE_KIND_COL[nodeKind(id)]); ln.dataset.to = id; }
    for (const id in SKILLS) for (const rq of (SKILLS[id].req || [])) {
      const ln = line(this._nodeXY(rq), this._nodeXY(id), 'bline', NODE_KIND_COL[nodeKind(id)]);
      ln.dataset.from = rq; ln.dataset.to = id;
    }
    plane.appendChild(svg);
    const core = document.createElement('div');
    core.className = 'bcore';
    core.innerHTML = '<span class="cst">✦</span><b class="cpts">0</b>';
    core.addEventListener('mouseenter', (e: any) => {
      const have = this.treePts(), next = TIER_REQ.find(n => n > have);
      this.tipText(tr('트리의 심장'), (next !== undefined ? tr('찍은 점수 {have} · 다음 단까지 {left}점', { have, left: next - have })
        : tr('찍은 점수 {have} · 모든 단이 열렸다', { have })) + ' — ' + tr('모든 칸은 여기서 뻗어 나간다'), e);
    });
    core.addEventListener('mouseleave', () => this.hideTip());
    plane.appendChild(core);

    for (const id in SKILLS) {
      const sk = SKILLS[id];
      const [x, y] = this._nodeXY(id);
      const n = document.createElement('div');
      n.className = 'node hid'; n.dataset.sk = id; n.dataset.kind = nodeKind(id);
      n.style.setProperty('--bc', NODE_KIND_COL[nodeKind(id)]);
      n.style.left = `calc(50% + ${x}px)`;
      n.style.top = `calc(var(--cy) + ${y - this.TREE_BOX / 2}px)`;
      n.innerHTML = `<div class="nbox"><svg class="nhold" viewBox="0 0 52 52"><rect x="2" y="2" width="48" height="48" rx="8" pathLength="100"/></svg>` +
        `<span class="nic"></span><span class="nlock">🔒</span></div>` +
        `<div class="nname">${sk.n}</div><div class="npips">${'<i></i>'.repeat(sk.max!)}</div>`;
      this.setIcon(n.querySelector('.nic'), Art.skillUrl(id));
      n.addEventListener('pointerdown', (e: any) => { if (e.button === 0) this.holdStart(id, n); });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) n.addEventListener(ev, () => this.holdStop(n));
      n.addEventListener('contextmenu', (e: MouseEvent) => { e.preventDefault(); this.slotPicker(id, e.clientX, e.clientY); });
      n.addEventListener('mouseenter', e => { this.showSkillTip(id, e); this.pathHi(id, true); });
      n.addEventListener('mousemove', e => this.placeTip(e.clientX, e.clientY));
      n.addEventListener('mouseleave', () => { this.hideTip(); this.pathHi(id, false); });
      plane.appendChild(n);
    }
    grid.appendChild(plane);
    w.appendChild(grid);
    this.bindTreePan(grid);
    this.bindSkillTabs();
  },

  /** 판 옮기기 — 빈 곳을 끌거나 휠(Shift = 가로). 처음 열 때는 핵이 가운데 */
  bindTreePan(grid: HTMLElement) {
    const P = this._treePlane;
    const apply = () => {
      if (!grid.clientWidth) return;                         // 창이 닫혀 있으면 잴 수 없다 — 열 때(refreshTree) 다시
      const vw = grid.clientWidth, vh = grid.clientHeight || this.TREE_H;
      if (!this._treePan) this._treePan = { x: (vw - P.w) / 2, y: (vh - P.h) / 2 };
      const t = this._treePan, pad = 60;                     // 판 끝이 창 안쪽으로 60px 넘게 들어오지 않게
      t.x = Math.min(pad, Math.max(vw - P.w - pad, t.x)); t.y = Math.min(pad, Math.max(vh - P.h - pad, t.y));
      if (P.w < vw) t.x = (vw - P.w) / 2;
      if (P.h < vh) t.y = (vh - P.h) / 2;
      P.el.style.transform = `translate(${Math.round(t.x)}px,${Math.round(t.y)}px)`;
    };
    this._treePanApply = apply;
    grid.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      apply(); const t = this._treePan; if (!t) return;
      if (e.shiftKey) t.x -= e.deltaY; else { t.x -= e.deltaX; t.y -= e.deltaY; }
      apply();
    }, { passive: false });
    let drag: number[] | null = null;
    grid.addEventListener('pointerdown', (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('.node, .bcore') || e.button === 2) return;
      apply(); const t = this._treePan; if (!t) return;
      drag = [e.clientX, e.clientY, t.x, t.y]; grid.classList.add('dragging');
      try { grid.setPointerCapture(e.pointerId); } catch (_) { /* 잡지 못해도 끌기는 된다 */ }
    });
    grid.addEventListener('pointermove', (e: PointerEvent) => {
      if (!drag) return;
      this._treePan.x = drag[2] + e.clientX - drag[0]; this._treePan.y = drag[3] + e.clientY - drag[1]; apply();
    });
    const end = () => { drag = null; grid.classList.remove('dragging'); };
    grid.addEventListener('pointerup', end); grid.addEventListener('pointercancel', end);
    requestAnimationFrame(apply);
  },
  /** 우클릭 — 어느 스킬 칸(Q · E · R · F · G · V)에 끼울지 고르는 작은 판 */
  slotPicker(id: string, cx: number, cy: number) {
    const p = G.player, sk = SKILLS[id];
    this.closeSlotPicker(); this.hideTip();
    if (sk.type !== 'active') { G.toast(tr('지니는 힘은 칸에 끼우지 않는다'), 'bad'); return; }
    if (!(p.skills[id] > 0)) { G.toast(tr('먼저 배워야 칸에 끼울 수 있다'), 'bad'); return; }
    const keys = ['Q', 'E', 'R', 'F', 'G', 'V'], n = skillSlotN(p);
    const box = document.createElement('div'); box.id = 'slotpick';
    box.innerHTML = `<div class="sp-t">${tr('{name} — 끼울 칸', { name: sk.n })}</div><div class="sp-row">` +
      keys.slice(0, n).map((k, i) => `<button data-i="${i}" class="${p.slots[i] === id ? 'on' : ''}"><span class="ic"></span><b>${k}</b></button>`).join('') +
      `</div>` + (p.slots.includes(id) ? `<button class="sp-off">${tr('칸에서 빼기')}</button>` : '');
    document.body.appendChild(box);
    box.querySelectorAll<HTMLElement>('.sp-row button').forEach(b => {
      const i = +b.dataset.i!; this.setIcon(b.querySelector('.ic'), p.slots[i] ? Art.skillUrl(p.slots[i]) : '');
      b.addEventListener('click', () => {
        for (let j = 0; j < p.slots.length; j++) if (p.slots[j] === id) p.slots[j] = null;
        p.slots[i] = id; this.closeSlotPicker();
        this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar();
      });
    });
    const off = box.querySelector('.sp-off');
    if (off) off.addEventListener('click', () => {
      for (let j = 0; j < p.slots.length; j++) if (p.slots[j] === id) p.slots[j] = null;
      this.closeSlotPicker(); this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar();
    });
    const r = box.getBoundingClientRect();
    box.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, cx - r.width / 2)) + 'px';
    box.style.top = Math.max(8, Math.min(innerHeight - r.height - 8, cy + 14)) + 'px';
    const out = (e: Event) => { if (!box.contains(e.target as Node)) this.closeSlotPicker(); };
    const esc = (e: KeyboardEvent) => { if (e.code === 'Escape') { e.stopPropagation(); this.closeSlotPicker(); } };
    setTimeout(() => { addEventListener('pointerdown', out, true); addEventListener('keydown', esc, true); });
    this._slotPickOff = () => { removeEventListener('pointerdown', out, true); removeEventListener('keydown', esc, true); box.remove(); };
  },
  closeSlotPicker() { if (this._slotPickOff) { this._slotPickOff(); this._slotPickOff = null; } },

  /** 팝업 위쪽 두 갈래 — 특성 트리 / 생활 숙련 */
  bindSkillTabs() {
    const box = $('#panel-skill'); if (!box || box.dataset.tabBound) return;
    box.dataset.tabBound = '1';
    $$('#panel-skill .sk-tab').forEach(btn => {
      btn.addEventListener('click', () => this.setSkillTab(btn.dataset.sktab));
    });
  },
  setSkillTab(id: string) {
    $$('#panel-skill .sk-tab').forEach(b => b.classList.toggle('on', b.dataset.sktab === id));
    $$('#panel-skill .sk-pane').forEach(p => p.classList.toggle('on', p.id === 'sk-pane-' + id));
    this.skillTab = id;
    if (id === 'prof') this.refreshProf();
  },

  /** 트리에 찍은 점수 합 — 단을 여는 기준(분야를 가리지 않는다) */
  treePts() { let n = 0; const p = G.player; for (const id in SKILLS) n += p.skills[id] || 0; return n; },
  /** 이어진 윗칸 중 하나라도 배웠는가. */
  reqMet(id: string) {
    const req = SKILLS[id].req;
    if (!req || !req.length) return true;
    const p = G.player;
    return req.some(r => (p.skills[r] || 0) > 0);
  },
  /** 드러나는가 — 배웠거나, 첫 단이거나, 이어진 윗칸을 배웠다 */
  nodeVisible(id: string) { return (G.player.skills[id] || 0) > 0 || SKILLS[id].tier === 0 || this.reqMet(id); },
  /** 이 칸이 왜 잠겨 있는지 — 잠겨 있지 않으면 빈 문자열 */
  lockReason(id: string) {
    const sk = SKILLS[id];
    if (!this.reqMet(id)) return tr('이어진 칸을 먼저 배워야 한다');
    const need = TIER_REQ[sk.tier!], have = this.treePts();
    if (have < need) return tr('트리에 {need}점을 찍으면 열린다 (지금 {have}점)', { need, have });
    return '';
  },
  skDesc(id: string, rank: any) {
    const sk = SKILLS[id];
    const r = Math.max(1, rank);
    let txt = sk.d;
    if (sk.v) txt = txt!.replace(/%d/g, sk.v(r));
    else if (sk.b) { const b = sk.b(r); const vals = Object.values(b); let i = 0; txt = txt!.replace(/%d/g, () => vals[i++] ?? 0); }
    return txt!.replace(/%%/g, '%');
  },
  /** 칸 위에 올렸을 때의 설명. */
  showSkillTip(id: any, e: any) {
    const p = G.player, sk = SKILLS[id], rank = p.skills[id] || 0;
    if (!this.nodeVisible(id)) return;
    const why = this.lockReason(id);
    const k = nodeKind(id), kind = k === 'active' ? tr('액티브') : k === 'unlock' ? tr('칸 열기') : tr('패시브');
    let h = `<div class="tname c${rank > 0 ? 3 : 0}">${sk.n}</div>`;
    h += `<div class="tmeta">${tr('{kind} · {rank}/{max} 랭크', { kind, rank, max: sk.max })}` +
      (sk.type === 'active' ? ` ${tr('· 마나 {mana} · 재사용 {cd}초', { mana: sk.mana, cd: sk.cd })}` : '') + `</div>`;
    h += `<div class="tdesc">${this.skDesc(id, rank)}</div>`;
    if (rank > 0 && rank < sk.max!)
      h += `<div class="tnext">${tr('다음 랭크 — {skDesc}', { skDesc: this.skDesc(id, rank + 1) })}</div>`;
    if (why) h += `<div class="tbad">${why}</div>`;
    else if (rank >= sk.max!) h += `<div class="tdim">${tr('최대 랭크')}</div>`;
    else if (p.skillPts <= 0) h += `<div class="tbad">${tr('특성 포인트가 없다')}</div>`;
    else h += `<div class="tgood">${tr('꾹 눌러 습득{v}', { v: sk.type === 'active' ? ` ${tr('· 우클릭으로 슬롯 등록')}` : '' })}</div>`;
    this.tip.show(h, e.clientX, e.clientY);
    this.tipTarget = true;
  },

  refreshTree() {
    if (this._treePanApply) requestAnimationFrame(this._treePanApply);
    const p = G.player;
    const vis: Bag = {}, fresh: string[] = [];
    for (const id in SKILLS) vis[id] = this.nodeVisible(id);
    const was = this._treeVis;
    if (was) for (const id in SKILLS) if (vis[id] && !was[id]) fresh.push(id);
    this._treeVis = vis;
    $$('#tree-wrap .node').forEach(el => {
      const id = el.dataset.sk, sk = SKILLS[id], rank = p.skills[id] || 0;
      const locked = !!this.lockReason(id);
      const can = !locked && rank < sk.max! && p.skillPts > 0;
      el.className = 'node' + (rank > 0 ? ' learned' : '') + (rank >= sk.max! ? ' maxed' : '') +
        (locked ? ' locked' : '') + (can ? ' can' : '') + (p.slots.includes(id) ? ' active' : '') +
        (vis[id] ? '' : ' hid');
      el.querySelectorAll('.npips i').forEach((pip: any, i: number) => pip.classList.toggle('on', i < rank));
    });
    const pts = this.treePts();
    $$('#tree-wrap .bring, #tree-wrap .bringlb').forEach(r => r.classList.toggle('lit', pts >= TIER_REQ[+r.dataset.t]));
    const cp = $('#tree-wrap .cpts'); if (cp) cp.textContent = String(pts);
    $$('#tree-wrap .broot').forEach(ln => ln.classList.toggle('on', (p.skills[ln.dataset.to] || 0) > 0));
    $$('#tree-wrap .bline').forEach(ln => {
      const a = (p.skills[ln.dataset.from] || 0) > 0, b = (p.skills[ln.dataset.to] || 0) > 0;
      ln.classList.toggle('on', a);
      ln.classList.toggle('full', a && b);
      ln.classList.toggle('hid', !vis[ln.dataset.from] || !vis[ln.dataset.to] || !(a || b));
    });
    /* 새로 드러난 칸 — 빛이 선을 타고 닿은 뒤 별자리처럼 차례로 떠오른다 */
    fresh.forEach((id, i) => {
      const el = $(`#tree-wrap .node[data-sk="${id}"]`); if (!el) return;
      el.style.animationDelay = (0.32 + i * 0.13) + 's';
      el.classList.add('reveal');
      setTimeout(() => { el.classList.remove('reveal'); el.style.animationDelay = ''; }, 1600 + i * 130);
      $$(`#tree-wrap .bline[data-to="${id}"]`).forEach(ln => {
        if (ln.classList.contains('hid')) return;
        ln.style.animationDelay = (0.18 + i * 0.13) + 's';
        ln.classList.add('draw');
        setTimeout(() => { ln.classList.remove('draw'); ln.style.animationDelay = ''; }, 1400 + i * 130);
      });
    });
    this.refreshStatAlloc();
  },

  /** 꾹 누르기 — 테두리 고리가 차오르고 다 차면 배운다. 못 배우는 칸은 흔들고 까닭을 알린다 */
  holdStart(id: string, el: any) {
    const p = G.player, sk = SKILLS[id];
    if (!this.nodeVisible(id)) return;
    const why = (p.skills[id] || 0) >= sk.max! ? tr('이미 최대 랭크다') : this.lockReason(id) || (p.skillPts <= 0 ? tr('특성 포인트가 없다') : '');
    if (why) {
      this.toast(why, 'bad');
      el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny');
      return;
    }
    this.holdStop(el);
    const t0 = performance.now();
    el.classList.add('holding');
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 1000 / this.HOLD_T);
      el.style.setProperty('--hold', String(k));
      if (k >= 1) { this.holdStop(el); this.learn(id); return; }
      el._hold = requestAnimationFrame(step);
    };
    el._hold = requestAnimationFrame(step);
  },
  holdStop(el: any) {
    if (el._hold) cancelAnimationFrame(el._hold);
    el._hold = 0; el.classList.remove('holding'); el.style.setProperty('--hold', '0');
  },
  /** 마우스를 올린 칸까지 이어진 길(배운 윗칸 → 이 칸)을 밝힌다 */
  pathHi(id: string, on: boolean) {
    $$(`#tree-wrap .bline[data-to="${id}"], #tree-wrap .bline[data-from="${id}"]`).forEach(ln => ln.classList.toggle('hi', on));
  },

  learn(id: string) {
    const p = G.player, sk = SKILLS[id];
    if (p.skillPts <= 0) { this.toast(tr('특성 포인트가 없다'), 'bad'); return; }
    if ((p.skills[id] || 0) >= sk.max!) { this.toast(tr('이미 최대 랭크다'), 'bad'); return; }
    const why = this.lockReason(id);
    if (why) { this.toast(why, 'bad'); return; }
    p.skillPts--; p.skills[id] = (p.skills[id] || 0) + 1;
    if (sk.type === 'active' && !p.slots.includes(id)) {
      const empty = p.slots.slice(0, skillSlotN(p)).indexOf(null);
      if (empty >= 0) p.slots[empty] = id;
    }
    p.recalc(); p.syncBagCapacity();
    if (sk.unlock || sk.br === 'explore') { this.refreshEquip(); this.refreshBag(); }
    this.toast(tr('{sk} 습득 ({skills}/{max})', { sk: sk.n, skills: p.skills[id], max: sk.max }), 'good');
    G.sfx('learn', 0.92 + p.skills[id] * 0.07 + (p.skills[id] >= sk.max! ? 0.08 : 0));   // 랭크가 오를수록 높게 · 끝 랭크는 한 번 더
    this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar(); this.refreshStatSheet();
    this.flashNode(id);
  },

  /** 습득 연출 — 칸이 부풀고 충격파 · 불티, 판이 한 번 울리고, 그 칸에 닿는 선에 빛이 흐른다 · 점수 숫자가 튄다 */
  flashNode(id: string) {
    const el = $(`#tree-wrap .node[data-sk="${id}"]`);
    if (el) {
      const maxed = el.classList.contains('maxed');
      el.classList.remove('just'); void el.offsetWidth; el.classList.add('just');
      setTimeout(() => el.classList.remove('just'), 900);
      const box = el.querySelector('.nbox');
      for (const d of [0, 0.12].slice(0, maxed ? 2 : 1)) {
        const wv = document.createElement('i'); wv.className = 'nwave'; wv.style.animationDelay = d + 's';
        box.appendChild(wv); setTimeout(() => wv.remove(), 900 + d * 1000);
      }
      for (let i = 0; i < (maxed ? 18 : 11); i++) {
        const sp = document.createElement('i');
        sp.className = 'nspark';
        const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * (maxed ? 34 : 20);
        sp.style.setProperty('--dx', Math.cos(a) * d + 'px');
        sp.style.setProperty('--dy', Math.sin(a) * d + 'px');
        sp.style.animationDelay = (Math.random() * 0.12) + 's';
        box.appendChild(sp);
        setTimeout(() => sp.remove(), 900);
      }
      const grid = $('#tree-wrap .bgrid');
      if (grid) { grid.classList.remove('thump'); void grid.offsetWidth; grid.classList.add('thump'); }
    }
    const pts = $('#skill-pts');
    if (pts) { pts.classList.remove('bump'); void pts.offsetWidth; pts.classList.add('bump'); }
    $$('#tree-wrap .bline').forEach(ln => {
      if (ln.dataset.to !== id || ln.classList.contains('hid') || !(G.player.skills[ln.dataset.from] > 0)) return;
      ln.classList.remove('flow'); void ln.getBoundingClientRect(); ln.classList.add('flow');
      setTimeout(() => ln.classList.remove('flow'), 900);
    });
  },

  assign(id: string) {
    const p = G.player, sk = SKILLS[id];
    if (sk.type !== 'active' || !(p.skills[id] > 0)) return;
    const cur = p.slots.indexOf(id);
    if (cur >= 0) { p.slots[cur] = null; }
    else { const e = p.slots.slice(0, skillSlotN(p)).indexOf(null); p.slots[e >= 0 ? e : 0] = id; }
    this.refreshTree(); this.refreshSkillSlots(); this.refreshSkillbar();
  },
  buildSkillSlots() {
    const box = $('#skill-slots'); box.innerHTML = '';
    const keys = ['Q', 'E', 'R', 'F', 'G', 'V'];
    for (let i = 0; i < 6; i++) {                // 여섯째 칸('재빠른 손' 2랭크)도 — 다섯 칸만 짜서 V 칸이 없었다
      const d = document.createElement('div');
      d.className = 'ss'; d.innerHTML = `<span class="key">${keys[i]}</span><span class="ic"></span>`;
      d.addEventListener('click', () => { G.player.slots[i] = null; this.refreshSkillSlots(); this.refreshTree(); this.refreshSkillbar(); });
      box.appendChild(d);
    }
  },
  refreshSkillSlots() {
    const p = G.player;
    const n = skillSlotN(p);
    $$('#skill-slots .ss').forEach((el, i) => {
      el.hidden = i >= n;
      const id = p.slots[i];
      el.className = 'ss' + (id ? ' filled' : '');
      this.setIcon(el.querySelector('.ic'), id ? Art.skillUrl(id) : '');
    });
  },

  /* ---------------- 생활 숙련 ---------------- */
  buildProf() {
    const w = $('#prof-wrap'); if (!w) return;
    w.innerHTML = '';
    for (const k in PROFS) {
      const P = PROFS[k];
      const d = document.createElement('div');
      d.className = 'prof'; d.dataset.pf = k;
      d.style.setProperty('--pc', P.c);
      d.innerHTML =
        `<div class="phead"><span class="pic"></span>` +
        `<span class="pn">${P.n}</span><span class="plv">Lv 1</span></div>` +
        `<div class="pline">${P.line}</div>` +
        `<div class="pbar"><i></i></div><div class="pxp"></div>` +
        `<div class="plin"></div>` +
        `<div class="pperks"></div>`;
      d.querySelector('.pic')!.textContent = P.i;   // 그림 아이콘을 따로 굽지 않는다 — 이 둘뿐이라 글자로 충분하다
      w.appendChild(d);
    }
  },
  refreshProf() {
    const w = $('#prof-wrap'); if (!w) return;
    if (!w.firstChild) this.buildProf();
    const p = G.player;
    for (const k in PROFS) {
      const P = PROFS[k], el = w.querySelector(`.prof[data-pf="${k}"]`);
      if (!el) continue;
      const pr = (p.prof && p.prof[k]) || { lv: 1, xp: 0 };
      const capped = pr.lv >= PROF_MAX;
      const need = capped ? 1 : profNeed(pr.lv);
      el.querySelector('.plv').textContent = capped ? tr('Lv {profMax} · 끝', { profMax: PROF_MAX }) : `Lv ${pr.lv}`;
      el.querySelector('.pbar i').style.width = (capped ? 100 : Math.min(100, pr.xp / need * 100)) + '%';
      el.querySelector('.pxp').textContent = capped ? tr('더 오를 곳이 없다') : `${pr.xp} / ${need}`;
      el.querySelector('.plin').innerHTML = P.lin
        .map(([n, f]: [string, (lv: number) => any]) => `<span class="pl"><b>${f(pr.lv)}</b>${n}</span>`).join('');
      /* ★ 특별 기술은 열리기 바로 앞 레벨부터 드러난다 — 그 전에는 봉인된 칸(사용자 결정 2026-10-16) */
      el.querySelector('.pperks').innerHTML = P.perks.map(([at, n, dsc]: any[]) => pr.lv >= at - 1
        ? `<div class="perk${pr.lv >= at ? ' on' : ' soon'}"><span class="pk">Lv ${at}</span>` +
          `<span class="pkn">${n}</span><span class="pkd">${dsc}</span></div>`
        : `<div class="perk sealed"><span class="pk">Lv ${at}</span><span class="pkn">???</span>` +
          `<span class="pkd">${tr('{lv}레벨이 되면 드러난다', { lv: at - 1 })}</span></div>`).join('');
    }
  },
};
mixin(UI, TreeUIPart);

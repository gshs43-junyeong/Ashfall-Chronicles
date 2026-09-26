/* ===== ui/hud.js — HUD · 전체 지도 ===== */
import { app as G } from '../ctx.js';
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { pad2 } from '../util.js';
import { fmt, tr } from '../lang.js';
import { SURF_BASE, WH, WW } from '../size.js';
import { BUFFS } from '../data/skills.js';
import { idef } from '../data/values.js';
import { TS } from '../world.js';
import { Art } from '../itemart.js';
import { $, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const HudUIPart: Bag = {

  /* ---------------- HUD ---------------- */
  updateHUD() {
    const p = G.player, d = p.d;
    $('#hp-fill').style.width = (p.hp / d.maxHp * 100) + '%';
    $('#hp-text').textContent = `${Math.ceil(p.hp)} / ${d.maxHp}`;
    $('#hp-fill').parentElement.classList.toggle('low', p.hp / d.maxHp < 0.3);
    $('#mp-fill').style.width = (p.mp / d.maxMp * 100) + '%';
    $('#mp-text').textContent = `${Math.floor(p.mp)} / ${d.maxMp}`;
    $('#xp-fill').style.width = (p.xp / p.xpNext * 100) + '%';
    $('#xp-text').textContent = `Lv.${p.level}   ${fmt(p.xp)} / ${fmt(p.xpNext)}`;
    // 전하 막대 — 동력 장비를 쓸 때만 나타난다
    const held = p.held(), wp = p.weapon();
    const usesPw = (held && idef(held).pw) || (wp && idef(wp).pw) || p.charge < d.maxCharge;
    $('#hp-fill').closest('.orb-row').classList.toggle('has-pw', !!usesPw);
    if (usesPw) {
      $('#pw-fill').style.width = (p.charge / d.maxCharge * 100) + '%';
      const grid = p.gridT !== undefined && G.time - p.gridT < 0.4;   // 전주 곁에서 망으로 차는 중
      $('#pw-text').textContent = `${grid ? '⚡ ' : ''}${Math.floor(p.charge)} / ${d.maxCharge}`;
    }
    /* 추진기 열 — 제트팩을 낀 동안에만. */
    $('#hp-fill').closest('.orb-row').classList.toggle('has-jet', !!d.jet);
    if (d.jet) {
      const jb = $('#jet-bar');
      // 남은 쪽을 채운다 — 열이 오를수록 줄어든다(체력·마나와 같은 방향으로 읽히게)
      $('#jet-fill').style.width = Math.round((1 - (p.jetHeat || 0)) * 100) + '%';
      jb.classList.toggle('over', !!p.jetOver);
      /* ★ 평상시에는 **숫자만** 쓴다. */
      $('#jet-text').textContent = p.jetOver ? tr('과열 — 식는 중')
        : (p.jetGap > 30 ? tr('한계 높이') : `${Math.round((1 - (p.jetHeat || 0)) * 100)}%`);
    }
    /* 산소 막대 — 물속이거나 아직 덜 찼을 때만 나온다(전하 막대와 같은 방식). */
    const oxy = p.oxygen === undefined ? d.oxyMax : p.oxygen;
    const showAir = p.headUnder || oxy < d.oxyMax - 0.05;
    $('#hp-fill').closest('.orb-row').classList.toggle('has-air', !!showAir);
    if (showAir) {
      const r = oxy / d.oxyMax;
      $('#air-fill').style.width = (r * 100) + '%';
      $('#air-text').textContent = `${Math.ceil(oxy)} / ${d.oxyMax}`;
      $('#air-fill').parentElement.classList.toggle('low', r < 0.3);
    }
    $('#gold-text').innerHTML = `<span class="ui-ic" style="background-image:url(${Art.uiUrl('coin')})"></span>${fmt(p.gold)}`;
    // 발밑 지형이 아니라 세계 공통 기준선(SURF_BASE)에서 잰다 — 발밑 지형 기준이면 어디를 걷든 "발밑에서 몇 칸 떠 있나"만 재서 늘 비슷한 값(예: 항상 5m)이 나오고
    const ty = Math.floor(p.cy / TS);
    const depth = Math.round((ty - SURF_BASE) * 5);
    $('#depth-text').textContent = depth > 0 ? tr('지하 {depth}m', { depth }) : tr('지상 {n}m', { n: -depth });
    const hh = Math.floor(G.dayT / 60), mm = Math.floor(G.dayT % 60);
    $('#clock-text').textContent = `${pad2(hh)}:${pad2(mm)}`;
    $('#clock-icon').textContent = '';
    this.setIcon($('#clock-icon'), Art.uiUrl((hh >= 6 && hh < 19) ? 'sun' : 'moon'));
    // 버프
    const bf = $('#buffs');
    bf.innerHTML = p.buffs.map(b =>
      `<div class="buff" title="${BUFFS[b.id].n}"><span class="bi" style="background-image:url(${Art.buffUrl(b.id)})"></span>` +
      `<span class="bt">${Math.ceil(b.t)}</span></div>`).join('');
    this.refreshSkillbar();
  },

  /* ---------------- 전체 지도 ---------------- */
  initFullmap() {
    const canvas = $('#fullmap-canvas');
    this.fmCanvas = canvas; this.fmC = canvas.getContext('2d');
    this.fmZoom = 3; this.fmX = 0; this.fmY = 0; this.fmDrag = null;
    $('#minimap').addEventListener('click', () => this.openFullmap());

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const wx = this.fmX + (mx - this.fmDprW / 2) / this.fmZoom;
      const wy = this.fmY + (my - this.fmDprH / 2) / this.fmZoom;
      this.fmZoom = clamp(this.fmZoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), 0.4, 16);
      this.fmX = wx - (mx - this.fmDprW / 2) / this.fmZoom;
      this.fmY = wy - (my - this.fmDprH / 2) / this.fmZoom;
      this.renderFullmap();
    }, { passive: false });
    canvas.addEventListener('mousedown', e => {
      this.fmDrag = { x: e.clientX, y: e.clientY, fx: this.fmX, fy: this.fmY };
    });
    addEventListener('mousemove', e => {
      if (!this.fmDrag) return;
      this.fmX = this.fmDrag.fx - (e.clientX - this.fmDrag.x) / this.fmZoom;
      this.fmY = this.fmDrag.fy - (e.clientY - this.fmDrag.y) / this.fmZoom;
      this.renderFullmap();
    });
    addEventListener('mouseup', () => { this.fmDrag = null; });
    addEventListener('resize', () => { if (this.open === 'fullmap') { this.resizeFullmap(); this.renderFullmap(); } });
  },
  openFullmap() {
    const already = this.open === 'fullmap';
    this.togglePanel('fullmap');
    if (already) return;
    const p = G.player;
    this.fmX = p.cx / TS; this.fmY = p.cy / TS; this.fmZoom = 3; this.fmDrag = null;
    this.resizeFullmap();
    this.renderFullmap();
  },
  resizeFullmap() {
    const wrap = $('#fullmap-wrap'), c = this.fmCanvas;
    const w = wrap.clientWidth, h = wrap.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    c.width = w * dpr; c.height = h * dpr;
    this.fmC.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.fmDprW = w; this.fmDprH = h;
  },
  renderFullmap() {
    if (this.open !== 'fullmap' || !this.fmDprW) return;
    const c = this.fmC, W = this.fmDprW, H = this.fmDprH, z = this.fmZoom;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#050609'; c.fillRect(0, 0, W, H);
    const sw = W / z, sh = H / z;
    let sx0 = this.fmX - sw / 2, sy0 = this.fmY - sh / 2;
    // 세계 범위 밖으로 너무 벗어나 헤매지 않게 살짝만 여유를 두고 막는다
    this.fmX = clamp(this.fmX, -sw * 0.4, WW + sw * 0.4);
    this.fmY = clamp(this.fmY, -sh * 0.4, WH + sh * 0.4);
    sx0 = this.fmX - sw / 2; sy0 = this.fmY - sh / 2;
    c.drawImage(G.mapAtlas, sx0, sy0, sw, sh, 0, 0, W, H);
    // 플레이어 위치
    const p = G.player;
    const px = (p.cx / TS - sx0) * z, py = (p.cy / TS - sy0) * z;
    c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(clamp(px, 4, W - 4), clamp(py, 4, H - 4), 4, 0, TAU); c.fill(); c.stroke();
  }
};
mixin(UI, HudUIPart);

/* ===== ui/hud.js — HUD · 전체 지도 ===== */
import { app as G } from '../ctx.js';
import { TAU, clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { PanZoom } from '../../engine/ui/panzoom.js';
import { pad2 } from '../util.js';
import { fmt, tr } from '../lang.js';
import { altOf, dimsOf } from '../size.js';
import { BUFFS } from '../data/skills.js';
import { idef } from '../data/values.js';
import { DEPTH_LAYER, TS } from '../world.js';
import { Art } from '../itemart.js';
import { $, UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const HudUIPart: Bag = {

  /* ---------------- HUD ---------------- */
  updateHUD() { const { SURF_BASE } = dimsOf(G.world);
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
    // 발밑 지형이 아니라 세계 공통 고도(altOf)로 잰다 — 발밑 기준이면 어디를 걷든 늘 비슷한 값(예: 항상 5m)이 나왔다
    const ty = Math.floor(p.cy / TS);
    const lay = DEPTH_LAYER[G.world.depthLayer(Math.floor(p.cx / TS), ty)];   // 지표 · 하늘에선 층 이름을 안 붙인다
    $('#depth-text').textContent = tr('고도 {alt}m', { alt: fmt(altOf(G.world, ty)) }) + (lay && lay !== DEPTH_LAYER.surface && lay !== DEPTH_LAYER.sky ? ' · ' + lay.s : '');
    const hh = Math.floor(G.dayT / 60), mm = Math.floor(G.dayT % 60);
    $('#clock-text').textContent = `${pad2(hh)}:${pad2(mm)}`;
    $('#clock-icon').textContent = '';
    this.setIcon($('#clock-icon'), Art.uiUrl((hh >= 6 && hh < 19) ? 'sun' : 'moon'));
    // 버프
    const bf = $('#buffs');
    bf.innerHTML = p.buffs.map((b: any) =>
      `<div class="buff" title="${BUFFS[b.id].n}"><span class="bi" style="background-image:url(${Art.buffUrl(b.id)})"></span>` +
      `<span class="bt">${Math.ceil(b.t)}</span></div>`).join('');
    this.refreshSkillbar();
  },

  /* ---------------- 전체 지도 ---------------- */
  initFullmap() {
    const canvas = $('#fullmap-canvas');
    this.fmCanvas = canvas; this.fmC = canvas.getContext('2d');
    /* 휠 · 끌기 · 두 손가락 집기(engine ui/panzoom) — 보기 가운데와 배율은 지도 칸 단위 */
    this.fmPZ = new PanZoom({ min: 0.4, max: 16, step: 1.2, change: () => this.renderFullmap(), size: () => ({ w: this.fmDprW || 1, h: this.fmDprH || 1 }) });
    this.fmPZ.bind(canvas);
    $('#minimap').addEventListener('click', () => this.openFullmap());
    addEventListener('resize', () => { if (this.open === 'fullmap') { this.resizeFullmap(); this.renderFullmap(); } });
  },
  openFullmap() {
    const already = this.open === 'fullmap';
    this.togglePanel('fullmap');
    if (already) return;
    const p = G.player;
    this.fmPZ.set(p.cx / TS, p.cy / TS, 3);
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
  renderFullmap() { const { WW, WH } = dimsOf(G.world);
    if (this.open !== 'fullmap' || !this.fmDprW) return;
    const c = this.fmC, W = this.fmDprW, H = this.fmDprH, v = this.fmPZ, z = v.zoom;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#050609'; c.fillRect(0, 0, W, H);
    const sw = W / z, sh = H / z;
    // 세계 범위 밖으로 너무 벗어나 헤매지 않게 살짝만 여유를 두고 막는다
    v.x = clamp(v.x, -sw * 0.4, WW + sw * 0.4);
    v.y = clamp(v.y, -sh * 0.4, WH + sh * 0.4);
    const sx0 = v.x - sw / 2, sy0 = v.y - sh / 2;
    G.mapAtlas.draw(c, sx0, sy0, sw, sh, W, H);
    // 플레이어 위치
    const p = G.player;
    const px = (p.cx / TS - sx0) * z, py = (p.cy / TS - sy0) * z;
    c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(clamp(px, 4, W - 4), clamp(py, 4, H - 4), 4, 0, TAU); c.fill(); c.stroke();
  }
};
mixin(UI, HudUIPart);

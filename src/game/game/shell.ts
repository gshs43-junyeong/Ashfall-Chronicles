/* ===== game/shell.js — 화면 겹 — 창 · 확인 · 설정 · 멈춤 · 알림 ===== */
import { mixin } from '../../engine/core/mixin.js';
import { createSettingsStore } from '../../engine/save/settings.js';
import { confirmBox, createModalStack } from '../../engine/ui/modal.js';
import { tr } from '../lang.js';
import { SET_DEFAULT } from '../data/values.js';
import { Art } from '../itemart.js';
import { $, UI } from '../ui.js';
import { Ambient, Music, Sfx } from '../music.js';
import { SET_KEY } from '../savefmt.js';
import { Game, TOUCH } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

/** 설정 — 기본값 위에 저장한 값(engine save/settings). 세이브와 따로 localStorage 한 칸 */
export const SETTINGS = createSettingsStore(SET_KEY, SET_DEFAULT as Bag);

export const ShellPart: Bag = {
  /** 게임 안 확인 창 — 확인이면 true. Esc·바깥 누르기는 취소, Enter 는 확인. 브라우저 confirm 은 게임 화면 밖에 떴다. */
  askConfirm(msg: any, ok: any) {
    return confirmBox({ root: '#confirm-screen', msg: '#confirm-msg', ok: '#btn-confirm-ok', cancel: '#btn-confirm-cancel' }, msg, ok || tr('확인'), tr('취소'));
  },

  /* ---- 타이틀 팝업(engine ui/modal) — 여러 겹으로 열린다(슬롯 위에 새 게임). 목록 앞이 위 ---- */
  modals: null as any,
  modalStack() {
    return this.modals || (this.modals = createModalStack(['#code-screen', '#newgame-screen', '#bye-screen', '#credits-screen',
      '#settings-screen', '#slots-screen', '#mp-screen'], { '#code-screen': () => this.closeCodeDoor() }));
  },
  openModal(sel: string) { this.modalStack().open(sel); },
  closeModal(sel: string) { this.modalStack().close(sel); },
  /** 열려 있는 팝업 중 가장 위의 것을 닫는다. */
  closeTopModal() { return this.modalStack().closeTop(); },
  /** 게임에 들어갈 때 — 타이틀에서 열려 있던 팝업을 전부 걷는다 */
  closeAllModals() { this.modalStack().closeAll(); },
  /** 나가기. */
  quit() {
    try { window.close(); } catch (e) { }
    setTimeout(() => { if (!window.closed) this.openModal('#bye-screen'); }, 120);
  },

  /** 새 게임 팝업 — 캐릭터를 가장 크게 고르고, 난이도·이름·씨앗을 그 아래에서 정한다. */
  /** 새로 그린 HTML 의 data-ui-icon 칸에 그림을 채운다(UI.init 은 처음 한 번만 훑는다) */
  fillIcons(root: any) {
    if (typeof Art === 'undefined' || !Art.ready) { setTimeout(() => this.fillIcons(root), 200); return; }
    root.querySelectorAll('[data-ui-icon]').forEach((el: HTMLElement) => UI.setIcon(el, Art.uiUrl(el.dataset.uiIcon)));
  },

  /* ================= 설정 ================= */
  loadSettings() {
    const { value, raw: v } = SETTINGS.load();
    this.settings = value;
    /* 낮은 폰 화면은 처음부터 UI 를 작게 — 한 번 고른 값은 그대로 둔다 */
    if (v.uiscale === undefined && TOUCH && Math.min(innerWidth, innerHeight) <= 540) this.settings.uiscale = 80;
    this.applySettings();
  },
  saveSettings() {
    SETTINGS.save(this.settings);
  },
  /** 설정값을 실제 동작에 반영한다. */
  applySettings() {
    const s = this.settings;
    if (Music) Music.vol = s.music / 100;
    if (Sfx) Sfx.vol = s.sfx / 100;
    if (Ambient) Ambient.vol = 0.45 * (s.sfx / 100);
    const mm = $('#minimap'); if (mm) mm.style.display = s.minimap ? '' : 'none';
    /* ★ 퀘스트 추적은 ui.js 가 style.display 를 직접 켜고 끄므로, 숨김은 body 클래스(!important)로 건다 */
    for (const k of ['tabbar', 'quest', 'buffs', 'clock', 'hotbar'])
      document.body.classList.toggle('hide-' + k, !s['hud_' + k]);
    document.documentElement.style.setProperty('--ui-scale', String((s.uiscale || 100) / 100));
    // 시야 배율은 캔버스 변환에 들어가므로 값이 바뀌면 다시 잡아 준다
    const vq = s.view + '/' + this.quality();
    if (this._viewApplied !== vq) { this._viewApplied = vq; this.resize(); }
    UI.syncSettings();
  },
  setOpt(k: any, v: number) {
    this.settings[k] = v;
    this.applySettings();
    this.saveSettings();
  },
  setPause(on: boolean) {
    this.scenes.set(this.net ? 'mpause' : 'pause', on);
    if (!on) this.scenes.set(this.net ? 'pause' : 'mpause', false);   // 메뉴를 연 사이에 방을 열고 닫았어도 닫힌다
    $('#pause-screen').classList.toggle('open', on);
    if (on) { UI.syncSettings(); this.refreshPauseMp(); }   // 열 때마다 현재 값으로 맞춘다
  },
  /* 설정에서 끈 갈래는 띄우지 않는다. */
  toast(m: any, k: any) {
    if (k && k !== 'bad') {
      const n = this.settings && this.settings.notice;
      if (n && n[k] === 0) return;
    }
    UI.toast(m, k);
  },
};

mixin(Game.prototype, ShellPart, true);

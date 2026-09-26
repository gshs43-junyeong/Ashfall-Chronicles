/* ===== engine/audio/music.js — 배경음악: 상황별 자동 전환 + 무한 반복 + 부드러운 크로스페이드 ===== */
import { aud } from './url.js';

/** 곡 표(키 → 파일, 배열이면 그중 하나)와 대체 곡 표를 받아 음악 틀을 만든다. */
export function createMusic({ tracks: BGM, fallback: BGM_FALLBACK }) {
  return {
    vol: 0.42, fadeDur: 0.9,
    cur: null, curKey: null, prev: null, fadeT: 0, fadeDurCur: 0, started: false,
    missing: {},   // 파일이 없다고 확인된 키

    /** 실제로 틀 수 있는 키로 바꾼다 — 파일이 없으면 대체 곡을 따라간다 */
    resolve(key) {
      let k = key;
      for (let i = 0; i < 4 && k && this.missing[k]; i++) k = BGM_FALLBACK[k];
      return k && BGM[k] && !this.missing[k] ? k : (BGM[key] && !this.missing[key] ? key : 'normal');
    },

    /** 브라우저 자동재생 정책 때문에 최초 사용자 입력이 있어야 재생을 시작할 수 있다. */
    armStart(getKeyFn) {
      if (this.started) return;
      const start = () => {
        if (this.started) return;
        this.started = true;
        this.play(getKeyFn());
        document.removeEventListener('pointerdown', start);
        document.removeEventListener('keydown', start);
      };
      document.addEventListener('pointerdown', start, { once: true });
      document.addEventListener('keydown', start, { once: true });
    },

    /** fast를 주면 거의 즉시 갈아탄다 — 보스전처럼 "지금 바로" 바뀌어야 하는 전환용. */
    /** 그 키가 이번에 실제로 틀 파일 하나. */
    pick(key) {
      const v = BGM[key];
      return Array.isArray(v) ? v[(Math.random() * v.length) | 0] : v;
    },

    play(key, fast) {
      key = this.resolve(key);
      if (!this.started || this.curKey === key || !BGM[key]) return;
      // curKey를 여기서 바로 확정하지 않는다 — play()가 (자동재생 차단 등으로) 실패하면 이 값만 미리 바뀐 채 굳어 버려서
      const prevKey = this.curKey;
      this.curKey = key;
      const a = new Audio(aud(this.pick(key)));
      a.loop = true; a.volume = 0;
      const dur = fast ? 0.12 : this.fadeDur;
      // 파일 자체가 없을 때(404) 울리는 신호.
      a.addEventListener('error', () => { this.missing[key] = true; }, { once: true });
      a.play().then(() => {
        if (this.prev) this.prev.pause();
        this.prev = this.cur;
        this.cur = a;
        this.fadeDurCur = dur;
        this.fadeT = dur;
      }).catch(err => {
        // 소스를 못 읽는 실패는 "없는 파일"로 확정하고 다시 시도하지 않는다.
        if (err && (err.name === 'NotSupportedError' || a.error)) this.missing[key] = true;
        this.curKey = prevKey;
      });
    },

    /** 매 프레임 호출 — 게임 상태(일시정지 등)와 무관하게 항상 불러서 페이드가 끊기지 않게 한다. */
    update(dt) {
      if (this.fadeT <= 0) { if (this.cur) this.cur.volume = this.vol; return; }
      const dur = this.fadeDurCur || this.fadeDur;
      this.fadeT = Math.max(0, this.fadeT - dt);
      const p = 1 - this.fadeT / dur;
      if (this.cur) this.cur.volume = this.vol * p;
      if (this.prev) {
        this.prev.volume = this.vol * (1 - p);
        if (p >= 1) { this.prev.pause(); this.prev = null; }
      }
    }
  };
}

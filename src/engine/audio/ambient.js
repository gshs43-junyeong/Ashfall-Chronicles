/* ===== engine/audio/ambient.js — 이어지는 환경음: 두 플레이어를 엇갈려 틀며 크로스페이드 ===== */
import { aud } from './url.js';

export const AMBIENT_OVERLAP = 0.3;   // 겹쳐 트는 구간(초)

/** 환경음 표(키 → 파일 이름)를 받는다. 언제 얼마나 크게 틀지는 게임이 step(키, 음량) 으로 정한다. */
export function createAmbient({ dir: SFX_DIR, files: AMBIENT_FILES }) {
  return {
    vol: 0.45,
    pair: {},      // key -> [AudioA, AudioB]
    active: {},    // key -> 지금 "메인"인 쪽의 인덱스(0|1)
    started: {},   // key -> 재생을 이미 시작했는가(다시 가까워질 때 처음부터 틀기 위한 리셋용)
    dur: {},       // key -> 파일 길이(초). loadedmetadata 전에는 모름 — 그동안은 크로스페이드 없이 튼다
    missing: {},   // key -> 파일 없음 확인됨
    cur: {},       // key -> 지금 부드럽게 따라가는 중인 음량(0~1, 거리 기반)

    ensure(key) {
      if (this.pair[key] || this.missing[key]) return;
      const mk = () => {
        const a = new Audio(aud(SFX_DIR + AMBIENT_FILES[key] + '.mp3'));
        a.loop = false; a.preload = 'auto'; a.volume = 0;   // loop는 직접 관리 — 끝나기 전에 다음 걸 겹쳐 튼다
        return a;
      };
      const a0 = mk(), a1 = mk();
      a0.addEventListener('error', () => { this.missing[key] = true; }, { once: true });
      a0.addEventListener('loadedmetadata', () => { this.dur[key] = a0.duration; }, { once: true });
      this.pair[key] = [a0, a1];
      this.active[key] = 0;
      this.started[key] = false;
    },

    /** 두 플레이어를 엇갈려 틀며 볼륨을 맞춘다. */
    step(key, targetVol) {
      const [a, b0] = this.pair[key];
      const ai = this.active[key];
      const cur = ai === 0 ? a : b0, other = ai === 0 ? b0 : a;

      if (!this.started[key]) {
        cur.currentTime = 0; cur.volume = targetVol; cur.play().catch(() => { });
        other.pause(); other.currentTime = 0;
        this.started[key] = true;
        return;
      }
      const dur = this.dur[key];
      if (!dur) { cur.volume = targetVol; return; }   // 길이를 아직 몰라 크로스페이드 타이밍을 못 잰다

      const ov = Math.min(AMBIENT_OVERLAP, dur * 0.4);   // 곡이 아주 짧으면 겹침도 비례해 줄인다
      const remaining = dur - cur.currentTime;
      if (remaining <= 0) {
        // 넘어갔다 — 역할을 교대하고 방금 것은 다음 순번을 위해 처음으로 되돌려 둔다.
        cur.pause(); cur.currentTime = 0; cur.volume = 0;
        other.volume = targetVol;
        this.active[key] = 1 - ai;
      } else if (remaining <= ov) {
        if (other.paused) { other.currentTime = 0; other.volume = 0; other.play().catch(() => { }); }
        const p = 1 - remaining / ov;             // 0(겹침 시작)~1(끝)
        // 등가파워(equal-power) 크로스페이드 — 직선(1-p)/p로 섞으면 서로 다른 두 소리가 겹치는 중간 지점에서 체감 음량이 살짝 꺼져 보인다(선형 합이 지각 음량과 안
        // 맞음).
        cur.volume = targetVol * Math.sqrt(1 - p);
        other.volume = targetVol * Math.sqrt(p);
      } else {
        cur.volume = targetVol;
        if (!other.paused) { other.pause(); other.currentTime = 0; }
      }
    }
  };
}

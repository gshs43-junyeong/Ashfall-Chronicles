/* ===== engine/audio/sfx.ts — 짧은 효과음 · 이어지는 효과음 ===== */
import { aud } from './url.js';

/** 효과음 표를 받아 효과음 틀을 만든다 — files(키 → 파일 이름) · fam(빌려 쓰는 한 벌) · gap(최소 간격) · vol(음량 배수) · start(시작 지점). */
/** fam[키] = [빌려 쓸 키, 음높이 배수, 음량 배수] */
export interface SfxConfig {
  dir: string; files: Record<string, string>; fam: Record<string, [string, number, number]>;
  gap: Record<string, number>; vol: Record<string, number>; start: Record<string, number>;
}

export function createSfx({ dir: SFX_DIR, files: SFX_FILES, fam: SFX_FAM, gap: SFX_GAP, vol: SFX_VOL, start: SFX_START }: SfxConfig) {
  return {
    vol: 0.5,
    voices: {} as Record<string, HTMLAudioElement[]>,   // key -> [Audio, ...] (로드 성공한 것만)
    turn: {} as Record<string, number>,     // key -> 다음에 쓸 목소리 번호
    last: {} as Record<string, number>,     // key -> 마지막 재생 시각

    init(): void {
      for (const k in SFX_FILES) {
        const src = aud(SFX_DIR + SFX_FILES[k] + '.mp3');
        const probe = new Audio(src);
        probe.preload = 'auto';
        probe.addEventListener('canplaythrough', () => {
          // 같은 소리가 겹쳐 울릴 수 있도록 몇 개를 미리 복제해 둔다
          const n = SFX_GAP[k] !== undefined && SFX_GAP[k] < 0.15 ? 4 : 2;
          const pool = [probe];
          for (let i = 1; i < n; i++) { const a = new Audio(src); a.preload = 'auto'; pool.push(a); }
          this.voices[k] = pool; this.turn[k] = 0;
        }, { once: true });
        probe.addEventListener('error', () => {}, { once: true });   // 파일이 없으면 조용히 포기
        probe.load();
      }
    },

    /** 재생을 시도한다. */
    /** vol — 이 한 번만 음량을 더 줄이거나 키우는 배수(기본 1). */
    play(kind: string, rate?: number, vol?: number): boolean {
      /* 제 이름의 파일이 없으면 **같은 결의 한 벌**을 대신 튼다(SFX_FAM). */
      let pool = this.voices[kind], fr = 1, fg = 1, file = kind;
      if (!pool) {
        const f = SFX_FAM[kind];
        if (f && this.voices[f[0]]) { pool = this.voices[f[0]]; fr = f[1]; fg = f[2]; file = f[0]; }
      }
      if (!pool) return false;
      const now = performance.now() / 1000;
      const gap = SFX_GAP[kind];
      if (gap !== undefined && now - (this.last[kind] || -9) < gap) return true;   // 너무 잦다 — 조용히 건너뛴다
      this.last[kind] = now;
      /* 순번은 ||0 으로 받는다 — 한 벌을 빌려 쓰는 키(hit_stone → mat_stone)는 제 이름으로 로드된 적이 없어 turn 에 자리가 없다. */
      const i = this.turn[kind] = ((this.turn[kind] || 0) + 1) % pool.length;
      const a = pool[i];
      a.volume = Math.min(1, this.vol * (SFX_VOL[kind] === undefined ? 1 : SFX_VOL[kind]) * fg * (vol === undefined ? 1 : vol));
      /* ★ 한 획마다 음높이를 흔든다. */
      a.playbackRate = (rate || 1) * fr;
      try { a.currentTime = SFX_START[kind] !== undefined ? SFX_START[kind] : (SFX_START[file] || 0); } catch (e) { }
      a.play().catch(() => { });
      return true;
    }
  };
}

/* ===== 이어지는 효과음(헤엄·도화선) — 1초 파일 두 개를 엇갈려 튼다 ===== */
export const SFX_LOOP_LEN = 0.90;      // 실제로 쓰는 길이 — 파일 끝 0.1초는 버린다
export const SFX_LOOP_OV = 0.12;       // 겹치는 구간

/** 이어 트는 키(키 → 음량 배수)와 짧은 효과음 틀(그 음량을 따른다)을 받는다. */
export interface SfxLoopConfig { dir: string; files: Record<string, string>; keys: Record<string, number>; sfx: { vol: number } }

export function createSfxLoop({ dir: SFX_DIR, files: SFX_FILES, keys: SFX_LOOP_KEYS, sfx: Sfx }: SfxLoopConfig) {
  return {
    pair: {} as Record<string, [HTMLAudioElement, HTMLAudioElement]>, active: {} as Record<string, number>, on: {} as Record<string, boolean>,
    cur: {} as Record<string, number>, missing: {} as Record<string, boolean>,
    ensure(key: string): void {
      if (this.pair[key] || this.missing[key]) return;
      const src = SFX_DIR + (SFX_FILES[key] || key) + '.mp3';
      const mk = () => { const a = new Audio(src); a.loop = false; a.preload = 'auto'; a.volume = 0; return a; };
      const a0 = mk(), a1 = mk();
      a0.addEventListener('error', () => { this.missing[key] = true; }, { once: true });
      this.pair[key] = [a0, a1]; this.active[key] = 0; this.on[key] = false;
    },
    /** 이 프레임에 이 소리가 나야 하는가. */
    set(key: string, want: boolean, vol?: number): void {
      this.ensure(key);
      if (this.missing[key]) return;
      const target = want ? (SFX_LOOP_KEYS[key] || 1) * (vol === undefined ? 1 : vol) * Sfx.vol : 0;
      const c = this.cur[key] || 0;
      this.cur[key] = c + (target - c) * 0.25;             // 켜고 끌 때 툭 끊기지 않게
      const v = this.cur[key];
      const [a, b] = this.pair[key];
      if (v < 0.004) {                                     // 다 잦아들었으면 멈춘다
        if (!a.paused) a.pause(); if (!b.paused) b.pause();
        a.currentTime = 0; b.currentTime = 0; this.on[key] = false; this.cur[key] = 0;
        return;
      }
      const ai = this.active[key];
      const cur = ai === 0 ? a : b, other = ai === 0 ? b : a;
      if (!this.on[key]) {
        cur.currentTime = 0; cur.volume = v; cur.play().catch(() => { });
        this.on[key] = true; return;
      }
      const remain = SFX_LOOP_LEN - cur.currentTime;
      if (remain <= SFX_LOOP_OV) {
        if (other.paused) { other.currentTime = 0; other.play().catch(() => { }); }
        const t = Math.max(0, Math.min(1, 1 - remain / SFX_LOOP_OV));
        cur.volume = v * Math.sqrt(1 - t);
        other.volume = v * Math.sqrt(t);
        if (remain <= 0) { cur.pause(); cur.currentTime = 0; this.active[key] = ai === 0 ? 1 : 0; }
      } else {
        cur.volume = v;
        if (!other.paused && other.currentTime > SFX_LOOP_OV) { other.pause(); other.currentTime = 0; }
      }
    },
    /** 이번 프레임에 아무도 안 켠 소리는 꺼 준다 */
    idle(except?: Record<string, unknown>): void {
      for (const k in SFX_LOOP_KEYS) if (!except || !except[k]) this.set(k, false);
    }
  };
}

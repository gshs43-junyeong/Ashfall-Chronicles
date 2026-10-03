/* ===== engine/audio/spatial.ts — 자리가 있는 소리: 거리로 줄고 좌우로 갈린다 ===== */
/* 듣는 이(화면 가운데의 주인공)와 소리 난 자리 사이로 음량과 좌우를 잰다. 화면 밖 멀리서 난 소리는 아예 틀지 않는다(null).
   좌우 가르기는 <audio> 를 WebAudio 로 돌려야 하는데, file:// 에서는 크롬이 그 소리를 다른 출처로 보고 **무음으로 만든다** —
   그래서 http(s) 에서만 가른다(zip 판은 거리 음량만). */

export interface SpatialConfig {
  near: number;      // 이 거리(px) 안은 제 음량
  far: number;       // 이 거리(px)에서 0 — 그 너머는 틀지 않는다
  panWidth: number;  // 이 가로 거리(px)에서 한쪽 끝까지 갈린다
  maxPan?: number;   // 가장 크게 갈리는 정도(0~1) — 1 이면 한쪽 귀에서만 들린다
}

/** 듣는 이 (lx, ly) · 소리 (sx, sy) → { gain 0~1, pan -1~1 } 또는 null(너무 멀다) */
export function spatialMix(cfg: SpatialConfig, lx: number, ly: number, sx: number, sy: number): { gain: number; pan: number } | null {
  const dx = sx - lx, dy = sy - ly, d = Math.hypot(dx, dy);
  if (d >= cfg.far) return null;
  const t = d <= cfg.near ? 0 : (d - cfg.near) / (cfg.far - cfg.near);
  const gain = (1 - t) * (1 - t);                       // 귀에 들리는 줄어듦은 거리에 곧게가 아니라 더 빠르게
  const m = cfg.maxPan === undefined ? 0.6 : cfg.maxPan;
  const pan = Math.max(-m, Math.min(m, (dx / cfg.panWidth) * m));
  return { gain, pan };
}

/** <audio> 를 좌우로 가르는 길 — 목소리마다 한 번만 WebAudio 에 잇는다. getCtx 가 null 이거나 file:// 이면 가르지 않는다. */
export function createPanRouter(getCtx: () => AudioContext | null) {
  const ok = typeof location !== 'undefined' && /^https?:$/.test(location.protocol);
  const nodes = new WeakMap<HTMLAudioElement, StereoPannerNode>();
  return {
    /** 이 목소리의 좌우를 pan 으로. 갈랐으면 true */
    pan(a: HTMLAudioElement, pan: number): boolean {
      if (!ok) return false;
      let p = nodes.get(a);
      if (!p) {
        if (Math.abs(pan) < 0.02) return false;           // 가운데 소리 때문에 길을 새로 잇지는 않는다
        const ac = getCtx();
        if (!ac || !ac.createStereoPanner) return false;
        try {
          const src = ac.createMediaElementSource(a);
          p = ac.createStereoPanner();
          src.connect(p); p.connect(ac.destination);
          nodes.set(a, p);
        } catch (e) { return false; }
      }
      p.pan.value = pan;
      return true;
    }
  };
}

/* ===== engine/save/settings.ts — 설정(소리 크기 · 키 · 화면 …): 기본값 위에 저장한 값을 덮는다 ===== */
/* 설정은 세이브와 따로 localStorage 한 칸에 둔다(세계를 지워도 설정은 남게). 저장소가 막힌 브라우저(사생활 모드)에서도
   기본값으로 돌아야 하므로 읽기·쓰기는 조용히 실패한다. 새 설정 칸은 기본값에만 더하면 옛 설정도 그 값을 얻는다. */

export function createSettingsStore<T extends Record<string, unknown>>(key: string, defaults: T) {
  return {
    /** 저장한 값(없거나 깨졌으면 빈 것)과 기본값을 합친 것 · raw 는 저장돼 있던 그대로(처음 쓰는 칸인지 볼 때) */
    load(): { value: T; raw: Partial<T> } {
      let raw: Partial<T> = {};
      try { raw = JSON.parse(localStorage.getItem(key) as string) || {}; } catch (e) { raw = {}; }
      return { value: Object.assign({}, defaults, raw), raw };
    },
    save(v: T): boolean {
      try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    /** 저장한 것을 지우고 기본값으로 */
    reset(): T { try { localStorage.removeItem(key); } catch (e) { } return Object.assign({}, defaults); },
  };
}

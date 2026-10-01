/* ===== engine/net/chunk.ts — 큰 글(세계 스냅샷)을 조각으로 나눠 보내고 다시 잇기 ===== */
/* ★ WebRTC 데이터 통로는 한 번에 보낼 수 있는 크기가 브라우저마다 다르다(16 KiB 는 어디서나 된다).
   조각은 `#아이디:번호:전체:` 머리를 단 글자열 — rel 통로(순서 보장)로 보내지만 순서가 섞여도 잇는다. */
export const CHUNK_SIZE = 16000;

export function chunkText(id: number, text: string, size = CHUNK_SIZE): string[] {
  const n = Math.max(1, Math.ceil(text.length / size)), out: string[] = [];
  for (let i = 0; i < n; i++) out.push(`#${id}:${i}:${n}:` + text.slice(i * size, (i + 1) * size));
  return out;
}

/** 조각인지 — 조각이 아닌 보통 메시지와 한 통로를 같이 쓸 때 가른다. */
export const isChunk = (msg: string) => msg.charCodeAt(0) === 35;   // '#'

export interface Joiner {
  /** 조각 하나를 넣는다 — 그 아이디의 조각이 다 모이면 이은 글을, 아니면 null. */
  push(msg: string): { id: number; text: string } | null;
  /** 모으는 중인 것의 [받은 수, 전체] — 진행 막대용. */
  progress(id: number): [number, number] | null;
}

export function createJoiner(): Joiner {
  const parts = new Map<number, { got: number; list: string[] }>();
  return {
    push(msg) {
      const a = msg.indexOf(':'), b = msg.indexOf(':', a + 1), c = msg.indexOf(':', b + 1);
      if (msg[0] !== '#' || a < 0 || b < 0 || c < 0) return null;
      const id = +msg.slice(1, a), i = +msg.slice(a + 1, b), n = +msg.slice(b + 1, c);
      let e = parts.get(id);
      if (!e) { e = { got: 0, list: new Array(n) }; parts.set(id, e); }
      if (e.list[i] === undefined) { e.list[i] = msg.slice(c + 1); e.got++; }
      if (e.got < n) return null;
      parts.delete(id);
      return { id, text: e.list.join('') };
    },
    progress(id) { const e = parts.get(id); return e ? [e.got, e.list.length] : null; }
  };
}

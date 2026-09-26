/* ===== engine/save/store.js — 세이브 저장소: IndexedDB(gzip + 서명), 안 되면 localStorage ===== */
/* ★ 세이브를 읽고 쓰는 곳은 전부 이 저장소의 put/get/remove/list 를 거친다 — localStorage 를 직접 만지면 IndexedDB 쪽과 어긋난다.
   게임 고유값(DB 이름 · 슬롯 수 · 키 이름 · 목록 요약 · 서명)은 cfg 로 받는다. */

/** @param cfg { dbName, slots, slotKey(i), sigKey(i), sign(text), head(d), sealOk(raw, d, sig) } */
export function createSaveStore({ dbName, slots: SAVE_SLOTS, slotKey, sigKey, sign: saveSign, head: saveHead, sealOk: saveSealOk }) {
  return {
    mode: 'ls',
    db: null,
    ready: null,
    start() { return this.ready || (this.ready = this.init()); },
    async init() {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
        this.db = await new Promise((res, rej) => {
          const q = indexedDB.open(dbName, 1);
          q.onupgradeneeded = () => { q.result.createObjectStore('data'); q.result.createObjectStore('head'); };
          q.onsuccess = () => res(q.result);
          q.onerror = () => rej(q.error);
          q.onblocked = () => rej(new Error('blocked'));
          setTimeout(() => rej(new Error('timeout')), 4000);     // 열기가 멈춘 채로 안 돌아오는 브라우저가 있다
        });
        /* 다른 탭이 DB 를 지우거나 판을 올리려 하면 이쪽 연결을 닫아 준다 — 안 닫으면 그쪽이 영영 기다린다. */
        this.db.onversionchange = () => { this.db.close(); };
        this.mode = 'idb';
      } catch (e) { console.warn('IndexedDB 를 못 열어 localStorage 에 저장한다:', e); this.mode = 'ls'; return; }
      try { await this.migrate(); } catch (e) { console.error(e); }
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
    },
    _req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    _tx(stores, mode, fn) {
      return new Promise((res, rej) => {
        const tx = this.db.transaction(stores, mode);
        let out;
        Promise.resolve(fn(tx)).then(v => { out = v; }, rej);
        tx.oncomplete = () => res(out);
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error || new Error('abort'));
      });
    },
    async _gz(text) {
      if (typeof CompressionStream === 'undefined') return null;
      return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    },
    async _ungz(buf) {
      return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    },
    /** 슬롯에 글자열을 넣으면서 서명도 같이 적는다. */
    async put(slot, text, head, sig) {
      await this.start();
      return this._put(slot, text, head, sig);
    },
    /* ★ init·migrate 안에서는 put/get 이 아니라 _put/_get 을 쓴다 — put 은 init 이 끝나기를 기다리므로 init 안에서 부르면 서로를 기다리며 멈춘다(타이틀
       목록이 영영 안 뜬다). */
    async _put(slot, text, head, sig) {
      if (sig === undefined) sig = saveSign(text);
      if (this.mode === 'ls') {
        localStorage.setItem(slotKey(slot), text);
        try { if (sig) localStorage.setItem(sigKey(slot), sig); else localStorage.removeItem(sigKey(slot)); } catch (e) { }
        return;
      }
      // 압축은 트랜잭션 **밖에서** 끝낸다 — 트랜잭션은 기다리는 동안 저절로 닫힌다
      const gz = await this._gz(text);
      const rec = gz ? { gz, sig } : { text, sig };
      await this._tx(['data', 'head'], 'readwrite', tx => {
        tx.objectStore('data').put(rec, slotKey(slot));
        tx.objectStore('head').put(head, slotKey(slot));
      });
    },
    /** { raw, sig } 또는 null */
    async get(slot) {
      await this.start();
      return this._get(slot);
    },
    async _get(slot) {
      if (this.mode === 'ls') {
        const raw = localStorage.getItem(slotKey(slot));
        if (!raw) return null;
        let sig = null;
        try { sig = localStorage.getItem(sigKey(slot)); } catch (e) { }
        return { raw, sig };
      }
      const rec = await this._tx(['data'], 'readonly', tx => this._req(tx.objectStore('data').get(slotKey(slot))));
      if (!rec) return null;
      return { raw: rec.gz ? await this._ungz(rec.gz) : rec.text, sig: rec.sig || null };
    },
    async remove(slot) {
      await this.start();
      localStorage.removeItem(slotKey(slot));
      localStorage.removeItem(sigKey(slot));   // 서명만 남으면 다음 기록이 헛되이 잠긴다
      if (this.mode === 'idb') await this._tx(['data', 'head'], 'readwrite', tx => {
        tx.objectStore('data').delete(slotKey(slot)); tx.objectStore('head').delete(slotKey(slot));
      });
    },
    /** 슬롯 요약 SAVE_SLOTS 개(빈 칸은 null). */
    async list() {
      await this.start();
      const out = [];
      for (let i = 0; i < SAVE_SLOTS; i++) {
        if (this.mode === 'idb') {
          out.push(await this._tx(['head'], 'readonly', tx => this._req(tx.objectStore('head').get(slotKey(i)))) || null);
          continue;
        }
        const raw = localStorage.getItem(slotKey(i));
        if (!raw) { out.push(null); continue; }
        try {
          const d = JSON.parse(raw);
          let sig = null;
          try { sig = localStorage.getItem(sigKey(i)); } catch (e) { }
          out.push(Object.assign(saveHead(d), { bad: !saveSealOk(raw, d, sig) }));
        } catch (e) { out.push(null); }
      }
      return out;
    },
    async migrate() {
      for (let i = 0; i < SAVE_SLOTS; i++) {
        const raw = localStorage.getItem(slotKey(i));
        if (!raw) continue;
        const have = await this._tx(['head'], 'readonly', tx => this._req(tx.objectStore('head').get(slotKey(i))));
        if (have) continue;                         // 이미 옮긴 칸은 건드리지 않는다
        let d;
        try { d = JSON.parse(raw); } catch (e) { continue; }
        const sig = localStorage.getItem(sigKey(i));
        await this._put(i, raw, saveHead(d), sig);
        const back = await this._get(i);
        if (back && back.raw === raw && back.sig === sig) {
          localStorage.removeItem(slotKey(i)); localStorage.removeItem(sigKey(i));
        }
      }
    }
  };
}

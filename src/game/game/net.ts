/* ===== game/net.js — 멀티플레이: 호스트 권위 · WebRTC(설계: docs/v1.1.2-multiplayer-plan.md) ===== */
import { mixin } from '../../engine/core/mixin.js';
import { chunkText, createJoiner, isChunk } from '../../engine/net/chunk.js';
import { SnapBuffer } from '../../engine/net/interp.js';
import { closeRoom, createHttpSignal, createTabSignal, openRoom } from '../../engine/net/signal.js';
import { guestAnswer, hostOffer } from '../../engine/net/webrtc.js';
import { tr } from '../lang.js';
import { makeItem } from '../entity.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const NET_MAX = 4;          // 호스트 포함
export const NET_HZ = 15;          // 위치를 보내는 횟수(초당)
/* 방 중개 — 사이트의 Vercel 함수(api/room.js). zip(file://)·Electron 도 이 주소로 붙는다. */
export const SIGNAL_URL = 'https://ashfall-chronicles.vercel.app/api/room';
const now = () => performance.now() / 1000;

export const NetPart: Bag = {
  net: null,

  /* ================= 상태 한 장 ================= */
  /** 남의 화면이 이 플레이어를 그리는 데 쓰는 것만 — 레벨·가방은 보내지 않는다. */
  netState(p) {
    const held = p.held(), wep = p.equip.weapon;
    return { x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), f: p.facing,
      g: p.onGround ? 1 : 0, sw: p.swing || 0, sa: p.swingAng || 0, sd: p.swingDir || 0, sr: p.swingReach || 0,
      dv: p.dashV || 0, fl: p.flash || 0, ch: p.channel ? 1 : 0, sm: p.swimming ? 1 : 0, smv: p.swimMove ? 1 : 0,
      flt: p.floating ? 1 : 0, sp: p.swimPh || 0, ifr: p.iframe || 0, hp: Math.round(p.hp), mhp: Math.round(p.d.maxHp),
      hid: held ? held.id : '', wid: wep ? wep.id : '', c: p.charId, n: p.name };
  },
  /** 받은 상태를 남의 아바타에 — 자리(x·y)는 보간 버퍼가 따로 맞춘다. */
  netApply(rp, s) {
    rp.vx = s.vx; rp.vy = s.vy; rp.facing = s.f; rp.onGround = !!s.g;
    rp.swing = s.sw; rp.swingAng = s.sa; rp.swingDir = s.sd; rp.swingReach = s.sr; rp.dashV = s.dv; rp.flash = s.fl;
    rp.channel = s.ch ? (rp.channel || {}) : null;
    rp.swimming = !!s.sm; rp.swimMove = !!s.smv; rp.floating = !!s.flt; rp.swimPh = s.sp; rp.iframe = s.ifr;
    rp.hp = s.hp; rp.netMaxHp = s.mhp; rp.charId = s.c; rp.name = s.n;
    if (rp._hid !== s.hid) { rp._hid = s.hid; rp.bag[rp.sel] = s.hid ? makeItem(s.hid) : null; }
    if (rp._wid !== s.wid) { rp._wid = s.wid; rp.equip.weapon = s.wid ? makeItem(s.wid) : null; }
  },
  /** 남의 아바타 — 이 화면에서는 그림자(update 를 안 돌리고 피해는 주인에게 넘긴다). */
  netAvatar(id, s) {
    const rp = this.freshPlayer(s.x, s.y, s.n, s.c);
    rp.remote = true; rp.netId = id; rp.netBuf = new SnapBuffer(1.5 / NET_HZ);
    this.netApply(rp, s);
    this.players.push(rp);
    return rp;
  },
  netRemove(rp) {
    const i = this.players.indexOf(rp);
    if (i > 0) this.players.splice(i, 1);
  },
  /** 남의 아바타를 보간한 자리로 옮긴다 — 매 프레임. */
  netMoveAvatars() {
    const t = now();
    for (const rp of this.players) {
      if (!rp.remote || !rp.netBuf) continue;
      const s = rp.netBuf.sample(t);
      if (s) { rp.x = s.x; rp.y = s.y; }
    }
  },
  netSend(t, ch, msg) {
    const text = JSON.stringify(msg);
    if (text.length > 15000) for (const part of chunkText(++this.net.chunkId, text)) t.send('rel', part);
    else t.send(ch, text);
  },

  /** 중개 주소 — ?sig=tab 이면 같은 브라우저 탭끼리(null), ?sig=<주소> 면 그 주소(시험용), 아니면 사이트 함수. */
  netSignalUrl() {
    const s = new URLSearchParams(location.search).get('sig');
    if (s === 'tab') return null;
    if (s) return s;
    return location.host === 'ashfall-chronicles.vercel.app' ? '/api/room' : SIGNAL_URL;
  },

  /* ================= 호스트 ================= */
  /** 방을 연다 — 참가자 셋까지. 인터넷 중개면 방 코드는 중개가 고른다. */
  async mpHost(room) {
    if (this.net || !this.me) return;
    const url = this.netSignalUrl(), n: Bag = { role: 'host', room, sig: null, peers: new Map(), pending: new Map(), nextId: 1, sendT: 0, chunkId: 0, url };
    this.net = n; this.me.netId = 0;
    if (url) {
      try { n.room = room = await openRoom(url); }
      catch (e) { console.warn('net: 방 열기 실패', e); this.net = null; this.toast(tr('중개 서버에 닿지 않는다'), 'bad'); return; }
      const hs = createHttpSignal(url, room, 'host', 2000);
      hs.onerror = () => this.toast(tr('방이 닫혔다 — 새로 열어야 한다'), 'bad');
      n.sig = hs;
      addEventListener('pagehide', () => closeRoom(url, room));
    } else n.sig = createTabSignal(room);
    const sig = n.sig;
    sig.onmessage = async m => {
      if (m.t === 'want' && !m.to) {
        if (n.peers.size + n.pending.size >= NET_MAX - 1) { sig.post({ t: 'full', from: 'host', to: m.from }); return; }
        if (n.pending.has(m.from)) return;
        const h = await hostOffer();
        n.pending.set(m.from, h);
        sig.post({ t: 'offer', from: 'host', to: m.from, sdp: h.offer });
      } else if (m.t === 'answer' && m.to === 'host' && n.pending.has(m.from)) {
        const h = n.pending.get(m.from);
        try { this.netAddPeer(await h.accept(m.sdp)); }
        catch (e) { console.warn('net: 참가 실패', e); }
        finally { n.pending.delete(m.from); }
      }
    };
    this.toast(tr('방 {room|을} 열었다', { room }), 'good');
  },
  netAddPeer(t) {
    const n = this.net, peer: Bag = { id: n.nextId++, t, rp: null, joiner: createJoiner() };
    n.peers.set(peer.id, peer);
    t.onmessage = (ch, d) => {
      if (isChunk(d)) { const r = peer.joiner.push(d); if (r) this.netOnHost(peer, JSON.parse(r.text)); return; }
      this.netOnHost(peer, JSON.parse(d));
    };
    t.onclose = () => this.netDropPeer(peer);
  },
  netOnHost(peer, m) {
    const n = this.net;
    if (m.k === 'hello') {
      const me = this.me, s = Object.assign(this.netState(me), { x: me.x + 24, n: m.n, c: m.c });
      peer.rp = this.netAvatar(peer.id, s);
      const roster = [[0, this.netState(me)]];
      for (const q of n.peers.values()) if (q.rp && q !== peer) roster.push([q.id, this.netState(q.rp)]);
      this.netSend(peer.t, 'rel', { k: 'world', id: peer.id, x: s.x, y: s.y, save: this.saveData(), roster });
      for (const q of n.peers.values()) if (q !== peer) this.netSend(q.t, 'rel', { k: 'join', id: peer.id, s });
      this.toast(tr('{name|이} 들어왔다', { name: m.n }), 'good');
    } else if (m.k === 'st' && peer.rp) {
      peer.rp.netBuf.push(now(), m.s); this.netApply(peer.rp, m.s); peer.last = m.s; peer.heard = now();
    } else if (m.k === 'bye') {
      peer.t.close(); this.netDropPeer(peer);
    }
  },
  netDropPeer(peer) {
    const n = this.net;
    if (!n || !n.peers.has(peer.id)) return;
    n.peers.delete(peer.id);
    if (peer.rp) { this.netRemove(peer.rp); this.toast(tr('{name|이} 나갔다', { name: peer.rp.name }), 'info'); }
    for (const q of n.peers.values()) this.netSend(q.t, 'rel', { k: 'leave', id: peer.id });
  },

  /* ================= 참가자 ================= */
  /** 방에 붙는다 — 캐릭터는 새로 만든 것(charId · name). 제 캐릭터 고르기·저장은 M4. */
  mpJoin(room, name, charId) {
    if (this.net) return;
    const url = this.netSignalUrl(), me = Math.random().toString(36).slice(2, 8);
    room = String(room || '').trim().toUpperCase();
    const sig = url ? createHttpSignal(url, room, me, 1000) : createTabSignal(room);
    if (url) (sig as Bag).onerror = () => { clearInterval(n.ask); this.net = null; this.toast(tr('그런 방이 없다'), 'bad'); };
    const n: Bag = { role: 'guest', room, sig, t: null, joiner: createJoiner(), sendT: 0, chunkId: 0, id: -1, others: new Map() };
    n.char = this.freshPlayer(0, 0, name, charId);
    this.net = n;
    sig.onmessage = async m => {
      if (m.to !== me || n.t) return;
      if (m.t === 'full') { this.toast(tr('방이 가득 찼다'), 'bad'); clearInterval(n.ask); return; }
      if (m.t !== 'offer') return;
      clearInterval(n.ask);
      const g = await guestAnswer(m.sdp);
      sig.post({ t: 'answer', from: me, to: 'host', sdp: g.answer });
      const t = await g.ready;
      n.t = t;
      if (url) sig.close();                         // 붙었으면 우편함은 그만 본다(중개 요청을 아낀다)
      t.onmessage = (ch, d) => {
        if (isChunk(d)) { const r = n.joiner.push(d); if (r) this.netOnGuest(JSON.parse(r.text)); return; }
        this.netOnGuest(JSON.parse(d));
      };
      t.onclose = () => this.netLost();
      this.netSend(t, 'rel', { k: 'hello', n: n.char.name, c: n.char.charId });
      /* 탭을 닫으면 데이터 통로가 끊겼다는 소식이 늦게(수십 초) 간다 — 나간다고 먼저 알린다. */
      addEventListener('pagehide', () => { if (n.t) n.t.send('rel', JSON.stringify({ k: 'bye' })); });
    };
    const ask = () => sig.post({ t: 'want', from: me });
    n.ask = setInterval(ask, url ? 4000 : 2000); ask();   // 호스트가 아직 방을 안 열었으면 열 때까지 두드린다
  },
  netOnGuest(m) {
    const n = this.net;
    if (m.k === 'world') {
      this.currentSlot = null;                      // ★ 남의 세계다 — 참가자 슬롯에 저장하지 않는다
      this._loadGame(JSON.stringify(m.save));
      const me = n.char;
      me.x = m.x; me.y = m.y; me.netId = n.id = m.id;
      this.player = me;
      for (const [id, s] of m.roster) n.others.set(id, this.netAvatar(id, s));
      this.cam.x = me.cx - this.W / 2; this.cam.y = me.cy - this.H / 2;
      this.petEnts = []; this.syncPets();
      UI.refreshBag(); UI.refreshEquip(); UI.refreshSkillbar(); UI.refreshStatAlloc(); UI.refreshSkillSlots();
    } else if (m.k === 'ps') {
      const t = now();
      for (const [id, s] of m.list) {
        if (id === n.id) continue;
        const rp = n.others.get(id) || (n.others.set(id, this.netAvatar(id, s)), n.others.get(id));
        rp.netBuf.push(t, s); this.netApply(rp, s);
      }
    } else if (m.k === 'join') {
      if (!n.others.has(m.id)) n.others.set(m.id, this.netAvatar(m.id, m.s));
      this.toast(tr('{name|이} 들어왔다', { name: m.s.n }), 'good');
    } else if (m.k === 'leave') {
      const rp = n.others.get(m.id);
      if (rp) { n.others.delete(m.id); this.netRemove(rp); this.toast(tr('{name|이} 나갔다', { name: rp.name }), 'info'); }
    } else if (m.k === 'hurt') {
      this.me.hurt(m.a, m.sx);
    }
  },
  netLost() {
    const n = this.net;
    if (!n || n.role !== 'guest') return;
    for (const rp of n.others.values()) this.netRemove(rp);
    n.sig.close(); this.net = null;
    this.toast(tr('호스트와 연결이 끊겼다'), 'bad');
  },

  /* ================= 매 프레임 ================= */
  netTick(dt) {
    const n = this.net;
    this.netMoveAvatars();
    n.sendT -= dt;
    if (n.sendT > 0) return;
    n.sendT += 1 / NET_HZ;
    if (n.sendT < 0) n.sendT = 0;
    if (n.role === 'guest') { if (n.t && n.id >= 0) n.t.send('fast', JSON.stringify({ k: 'st', s: this.netState(this.me) })); return; }
    const t = now();
    for (const q of n.peers.values()) if (q.heard && t - q.heard > 5) { q.t.close(); this.netDropPeer(q); }   // 5초 넘게 소식 없음 = 나감
    const list = [[0, this.netState(this.me)]];
    for (const q of n.peers.values()) if (q.last) list.push([q.id, q.last]);
    for (const q of n.peers.values()) if (q.rp) q.t.send('fast', JSON.stringify({ k: 'ps', list: list.filter(e => e[0] !== q.id) }));
  },
  /** 호스트의 몹이 남의 아바타를 쳤다 — 피해는 그 주인 화면에서 계산한다(무적 시간도 거기 것). */
  netRemoteHurt(rp, amount, srcX) {
    const n = this.net;
    if (!n || n.role !== 'host' || rp.iframe > 0 || (rp._hurtAt && this.time - rp._hurtAt < 0.3)) return;
    const peer = n.peers.get(rp.netId);
    if (!peer) return;
    rp._hurtAt = this.time;
    this.netSend(peer.t, 'rel', { k: 'hurt', a: amount, sx: srcX });
  },
  /** 주소의 ?mp=host&room= — 새 게임·불러오기를 마치면 방을 연다(개발판 시험용, 창은 M4). */
  mpAuto() {
    const qs = new URLSearchParams(location.search);
    if (!this.net && qs.get('mp') === 'host') this.mpHost((qs.get('room') || 'TEST').toUpperCase());
  }
};

mixin(G, NetPart);

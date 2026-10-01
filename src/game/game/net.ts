/* ===== game/net.js — 멀티플레이: 호스트 권위 · WebRTC(설계: docs/v1.1.2-multiplayer-plan.md) ===== */
import { dist2 } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { chunkText, createJoiner, isChunk } from '../../engine/net/chunk.js';
import { SnapBuffer } from '../../engine/net/interp.js';
import { closeRoom, createHttpSignal, createTabSignal, createWsSignal, openRoom } from '../../engine/net/signal.js';
import { guestAnswer, hostOffer } from '../../engine/net/webrtc.js';
import { tr } from '../lang.js';
import { T, TILE_DEF } from '../data.js';
import { HIT_FX } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { DmgText, Enemy, Proj, makeItem } from '../entity.js';
import { UI } from '../ui.js';
import { G } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const NET_MAX = 4;          // 호스트 포함
export const NET_HZ = 15;          // 위치를 보내는 횟수(초당)
/* 방 중개 — 본 중개는 Cloudflare(relay/ — WebSocket, 기다리는 동안 요청 0), 예비는 사이트의 Vercel 함수(api/room.js · 폴링).
   RELAY_URL 이 비어 있으면(배포 전) 예비를 쓴다. zip(file://)·Electron 도 이 주소들로 붙는다. */
export const RELAY_URL = '';
export const SIGNAL_URL = 'https://ashfall-chronicles.vercel.app/api/room';
const isWs = url => /^wss?:/.test(url || '');
/* ★ 호스트는 참가를 받는 동안만 우편함을 본다 — 열어 둔 내내 보면 중개 요청이 시간에 비례해 무료 범위를 넘는다. */
export const INVITE_MS = 5 * 60 * 1000;
export const JOIN_GIVEUP_MS = 60 * 1000;   // 참가자가 답을 기다리는 시간
const now = () => performance.now() / 1000;

export const NetPart: Bag = {
  net: null,

  /** 이 자리에서 가장 가까운 플레이어 — 몹이 노리는 대상 · 물건이 끌려가는 쪽. */
  nearestPlayer(x, y) {
    const ps = this.players;
    if (ps.length < 2) return this.me;
    let best = ps[0], bd = Infinity;
    for (const q of ps) { if (q.hp <= 0) continue; const d = dist2(x, y, q.cx, q.cy); if (d < bd) { bd = d; best = q; } }
    return best;
  },

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
  /* ================= 세계 바뀜 — 타일 · 벽지 · 물 수위 · 문 ================= */
  /* 캐기·놓기는 각자 화면에서 하고(손맛 · 얻은 물건은 제 가방) 바뀐 칸만 보낸다 — 호스트가 받아 넣고 남에게 퍼뜨린다.
     물 흐름·작물·무너지는 바닥은 호스트만 돌리고 결과 칸을 보낸다. */
  netTrackWorld() { this.world.netLog = new Set(); this.world.netMute = false; },
  /** 모인 바뀐 칸 → [칸, 타일, 벽지, 수위, 젖음(밭에 물 준 날), …] */
  netTakeTiles() {
    const w = this.world, log = w && w.netLog;
    if (!log || !log.size) return null;
    const out = [];
    for (const k of log) out.push(k, w.tiles[k], w.walls[k], w.flv ? w.flv[k] : 0, (w.wet && w.wet[k]) | 0);
    log.clear();
    return out;
  },
  /** 받은 칸을 넣는다 — 기록하지 않고(되돌려 보내지 않게). fromGuest 면 기반암은 건드리지 못한다. */
  netPutTiles(list, fromGuest) {
    const w = this.world, { WW } = w.dims;
    w.netMute = true;
    try {
      for (let i = 0; i + 4 < list.length; i += 5) {
        const k = list[i], t = list[i + 1], wl = list[i + 2], x = k % WW, y = (k / WW) | 0;
        if (!w.inB(x, y)) continue;
        if (fromGuest && (w.tiles[k] === T.BEDROCK || t === T.BEDROCK)) continue;   // ★ 세계 경계 — 누구의 글로도 안 바뀐다
        if (w.tiles[k] !== t) w.set(x, y, t);
        if (w.walls[k] !== wl) w.setWall(x, y, wl);
        if (w.flv) w.flv[k] = list[i + 3];
        if (list[i + 4] > ((w.wet[k]) | 0)) w.wet[k] = list[i + 4];
        if (fromGuest && TILE_DEF[t].crop) w.crops.add(k);   // 참가자가 심은 씨앗 — 작물은 호스트가 키운다
      }
    } finally { w.netMute = false; }
  },
  /** 문을 여닫았다 — 자리(x·y)로 같은 문을 찾는다. */
  netDoor(o) {
    const m = { k: 'door', x: o.x, y: o.y, c: o.closed ? 1 : 0 }, n = this.net;
    if (n.role === 'guest') { if (n.t) this.netSend(n.t, 'rel', m); }
    else for (const q of n.peers.values()) if (q.rp) this.netSend(q.t, 'rel', m);
  },
  netPutDoor(m) {
    const d = (this.world.doors || []).find(o => o.x === m.x && o.y === m.y);
    if (!d || d.closed === !!m.c) return;
    d.closed = !!m.c;
    if (this.me && Math.abs(this.me.cx - d.x) < 600 && Math.abs(this.me.cy - d.y) < 400) this.sfx(d.closed ? 'door_shut' : 'door_open');
  },
  /* ================= 몹 — 호스트가 돌리고 참가자는 그림자를 그린다 ================= */
  /** 참가자 근처 몹 한 장 — [번호, 종류, x, y, vx, vy, 방향, 땅, hp, 최대 hp, 번쩍임] */
  netEnemyList(rp) {
    const n = this.net, out = [];
    for (const e of this.ents) {
      if (!(e instanceof Enemy) || e.dead || Math.abs(e.cx - rp.cx) > 1500 || Math.abs(e.cy - rp.cy) > 1000) continue;
      if (!e.nid) { e.nid = ++n.eid; n.live.set(e.nid, e); }
      out.push([e.nid, e.type, Math.round(e.x), Math.round(e.y), Math.round(e.vx), Math.round(e.vy), e.facing, e.onGround ? 1 : 0,
        Math.round(e.hp), Math.round(e.maxHp), +(e.flash || 0).toFixed(2)]);
    }
    return out;
  },
  /** 참가자 화면 — 그림자 몹을 받은 자리로 보간해 옮긴다(AI 는 안 돌린다). */
  netGhostStep(e, dt) {
    const s = e.netBuf && e.netBuf.sample(now());
    if (s) { e.x = s.x; e.y = s.y; }
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
  },
  netPutEnemies(list) {
    const n = this.net, t = now();
    for (const [nid, type, x, y, vx, vy, f, g, hp, mhp, fl] of list) {
      let e = n.ghosts.get(nid);
      if (!e) {
        if (!ENEMIES[type]) continue;
        e = new Enemy(type, x, y); e.ghost = true; e.nid = nid; e.netBuf = new SnapBuffer(1.5 / NET_HZ);
        n.ghosts.set(nid, e); this.ents.push(e);
      }
      e.netBuf.push(t, { x, y }); e.vx = vx; e.vy = vy; e.facing = f; e.onGround = !!g; e.hp = hp; e.maxHp = mhp;
      if (fl > (e.flash || 0)) e.flash = fl;
      e.seenAt = t;
    }
    for (const [nid, e] of n.ghosts) if (t - e.seenAt > 1) { e.dead = true; n.ghosts.delete(nid); }   // 멀어졌다
  },
  /** 참가자가 그림자 몹을 쳤다 — 맞는 그림은 바로(손맛), 피해는 호스트가 계산한다. */
  netHitGhost(e, amount, crit, src, kb, fam) {
    const n = this.net;
    if (!n || !n.t) return;
    const dmg = Math.max(1, Math.round(amount * (1 - e.armor / (e.armor + 70))));
    this.texts.push(new DmgText(e.cx + (Math.random() - 0.5) * 14, e.y - 4, dmg, crit ? '#ffd24a' : '#fff', crit ? 1 : 0));
    this.hitFx(e, e.cx, e.cy, crit, fam);
    if (fam && HIT_FX[fam]) this.burst(e.cx, e.cy - 2, 'hit_' + fam + (crit ? '_crit' : ''), HIT_FX[fam].size * (crit ? 1.3 : 1), HIT_FX[fam].slow);
    e.flash = 0.12;
    this.netSend(n.t, 'rel', { k: 'hit', e: e.nid, a: amount, c: crit ? 1 : 0, kb: kb || 0, f: fam || '' });
  },
  /** 호스트 — 남의 아바타가 몹을 잡았다. 경험치·금화·전리품은 그 주인 화면에서 굴린다. */
  netKilledBy(rp, e) {
    const peer = this.net && this.net.peers.get(rp.netId);
    if (!peer) return;
    const mult = this.killMult ? this.killMult() : 1;
    this.netSend(peer.t, 'rel', { k: 'kill', e: e.nid, t: e.type, xp: Math.round(e.xp * mult), gold: Math.round(e.gold * mult), x: e.x, y: e.y, mech: e.mech || 0 });
    if (e.nid) this.net.dead.push(e.nid);
  },
  /** 참가자 — 내가 잡았다는 소식. 보상을 굴리는 길은 혼자 할 때의 Enemy.die 그대로다. */
  netPutKill(m) {
    const n = this.net;
    let e = n.ghosts.get(m.e);
    if (e) n.ghosts.delete(m.e);
    else { if (!ENEMIES[m.t]) return; e = new Enemy(m.t, m.x, m.y); this.ents.push(e); }
    e.ghost = false; e.dead = false; e.xp = m.xp; e.gold = m.gold; e.mech = m.mech;
    e.die(this.me);
  },
  netPutDeaths(list) {
    const n = this.net;
    for (const nid of list) {
      const e = n.ghosts.get(nid);
      if (!e) continue;
      n.ghosts.delete(nid); e.dead = true;
      this.addCorpse(e); this.deathBurst(e);
    }
  },
  /** 참가자 근처 적 투사체 — [번호, x, y, vx, vy, 종류] */
  netProjList(rp) {
    const n = this.net, out = [];
    for (const q of this.projs) {
      if (q.team !== 'enemy' || q.dead || Math.abs(q.cx - rp.cx) > 1300 || Math.abs(q.cy - rp.cy) > 900) continue;
      if (!q.nid) q.nid = ++n.eid;
      out.push([q.nid, Math.round(q.cx), Math.round(q.cy), Math.round(q.vx), Math.round(q.vy), q.type]);
    }
    return out;
  },
  netPutProjs(list) {
    const n = this.net, t = now();
    for (const [nid, x, y, vx, vy, type] of list) {
      let q = n.gproj.get(nid);
      if (!q) { q = new Proj(x, y, vx, vy, 0, 'enemy', type); q.ghost = true; q.nid = nid; n.gproj.set(nid, q); this.projs.push(q); }   // 처음 볼 때만 발사음
      q.x = x - q.w / 2; q.y = y - q.h / 2; q.vx = vx; q.vy = vy; q.seenAt = t;
    }
    for (const [nid, q] of n.gproj) if (t - q.seenAt > 0.25) { q.dead = true; n.gproj.delete(nid); }   // 맞았거나 사라졌다
  },
  /** 시계·날짜·세계 사건(비·붉은 달…) — 참가자는 사건을 굴리지 않고 호스트 것을 받는다. */
  netPutClock(m) {
    if (Math.abs(this.dayT - m.d) > 2) this.dayT = m.d;
    this.dayCount = m.n;
    this.event = m.ev;
  },
  /* ================= 물건 — 놓기·걷기 · 상자 안 ================= */
  /* 물건은 종류와 자리로 찾는다(같은 칸에 같은 종류는 하나뿐이다). */
  netObjKey(o) { return o.type + '@' + Math.round(o.x) + ',' + Math.round(o.y); },
  netObjFind(key) { return this.world.objects.find(o => this.netObjKey(o) === key); },
  /** 남에게 — 호스트면 모든 참가자에게(except 빼고), 참가자면 호스트에게. */
  netBroadcast(msg, except?) {
    const n = this.net;
    if (!n) return;
    if (n.role === 'guest') { if (n.t) this.netSend(n.t, 'rel', msg); return; }
    for (const q of n.peers.values()) if (q.rp && q !== except) this.netSend(q.t, 'rel', msg);
  },
  netObjAdd(o) { this.netBroadcast({ k: 'oadd', o: JSON.parse(JSON.stringify(o)) }); },
  netObjDel(o) { this.netBroadcast({ k: 'odel', key: this.netObjKey(o) }); },
  /** 상자 안 · 지킴이 깨움 — 바뀐 그대로 */
  netObjState(o) { this.netBroadcast({ k: 'ost', key: this.netObjKey(o), items: o.items || null, guarded: !!o.guarded, woke: o.woke || 0 }); },
  netPutObj(m) {
    const w = this.world;
    if (m.k === 'oadd') {
      if (this.netObjFind(this.netObjKey(m.o))) return;
      w.objects.push(m.o);
      if (m.o.type === 'door') w.doors.push(m.o);
    } else if (m.k === 'odel') {
      const o = this.netObjFind(m.key);
      if (!o) return;
      w.objects.splice(w.objects.indexOf(o), 1);
      const i = w.doors.indexOf(o); if (i >= 0) w.doors.splice(i, 1);
      if (UI.chestRef === o || UI.storeRef === o) UI.closePanel();
    } else if (m.k === 'ost') {
      const o = this.netObjFind(m.key);
      if (!o) return;
      const host = this.net.role === 'host';
      const wake = host && m.guarded && !o.guarded && o.guard, boss = host && m.woke && !o.woke && o.boss;
      o.items = m.items; o.guarded = m.guarded; o.woke = m.woke;
      this.net.objJ.set(o, JSON.stringify([o.items, !!o.guarded, o.woke || 0]));   // 되돌려 보내지 않게
      if (wake) this.wakeChestGuard(o);
      if (boss) this.wakeChestBoss(o);
      if (UI.chestRef === o) UI.refreshChest();
      if (UI.storeRef === o) UI.refreshVault();
    }
  },
  /** 연 상자를 지켜보기 시작 — 여는 순간에 올려 둬야 한 박자 안에 넣고 닫아도 놓치지 않는다. */
  netWatch(o) { this.net.watch.set(o, now()); },
  /** 열어 둔(또는 막 닫은) 상자의 안이 바뀌었으면 보낸다 — 옮기는 길이 여럿(끌기·우클릭·모두 넣기)이라 결과를 본다. */
  netWatchObjs() {
    const n = this.net, t = now();
    for (const o of [UI.chestRef, UI.storeRef]) if (o) n.watch.set(o, t);
    for (const [o, at] of n.watch) {
      if (t - at > 3) { n.watch.delete(o); continue; }
      const j = JSON.stringify([o.items || null, !!o.guarded, o.woke || 0]);
      if (n.objJ.get(o) !== j) { n.objJ.set(o, j); this.netObjState(o); }
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
    if (RELAY_URL) return RELAY_URL;
    return location.host === 'ashfall-chronicles.vercel.app' ? '/api/room' : SIGNAL_URL;
  },

  /* ================= 호스트 ================= */
  /** 방을 연다 — 참가자 셋까지. 인터넷 중개면 방 코드는 중개가 고른다. */
  async mpHost(room) {
    if (this.net || !this.me) return;
    const url = this.netSignalUrl(), n: Bag = { role: 'host', room, sig: null, peers: new Map(), pending: new Map(), nextId: 1, sendT: 0, chunkId: 0, url,
      eid: 0, live: new Map(), dead: [], joined: new Set(), watch: new Map(), objJ: new WeakMap() };
    this.net = n; this.me.netId = 0;
    this.netTrackWorld();
    if (isWs(url)) {
      const ws = createWsSignal(url, { role: 'host' });
      n.sig = ws;
      try { n.room = room = await ws.room; }
      catch (e) { console.warn('net: 방 열기 실패', e); this.net = null; this.toast(tr('중개 서버에 닿지 않는다'), 'bad'); return; }
      ws.onerror = () => this.toast(tr('중개 서버와 끊겼다 — 새 참가는 받을 수 없다'), 'bad');   // 이미 붙은 참가자는 그대로 논다
    } else if (url) {
      try { const o = await openRoom(url); n.room = room = o.room; n.key = o.key; }
      catch (e) { console.warn('net: 방 열기 실패', e); this.net = null; this.toast(tr('중개 서버에 닿지 않는다'), 'bad'); return; }
      const hs = createHttpSignal(url, room, 'host', 2000, INVITE_MS, n.key);
      hs.onerror = () => this.mpInvite();            // 창 안에서 방이 만료됐으면 같은 코드로 되찾는다
      n.sig = hs;
      addEventListener('pagehide', () => closeRoom(url, n.room, n.key));
    } else n.sig = createTabSignal(room);
    const sig = n.sig;
    sig.onmessage = async m => {
      if (m.t === 'want' && !m.to) {
        if (n.peers.size + n.pending.size >= NET_MAX - 1) { sig.post({ t: 'full', from: 'host', to: m.from }); return; }
        if (n.pending.has(m.from) || n.joined.has(m.from)) return;   // 이미 붙은 참가자가 앞서 보내 둔 글이 늦게 왔다
        const h = await hostOffer();
        n.pending.set(m.from, h);
        sig.post({ t: 'offer', from: 'host', to: m.from, sdp: h.offer });
      } else if (m.t === 'answer' && m.to === 'host' && n.pending.has(m.from)) {
        const h = n.pending.get(m.from);
        try { this.netAddPeer(await h.accept(m.sdp)); n.joined.add(m.from); }
        catch (e) { console.warn('net: 참가 실패', e); }
        finally { n.pending.delete(m.from); }
      }
    };
    if (isWs(url)) this.toast(tr('방 {room|을} 열었다', { room }), 'good');
    else this.toast(tr('방 {room|을} 열었다 — 5분 동안 참가를 받는다', { room }), 'good');
  },
  /** 참가 받기를 5분 더 — 쉬는 동안 방이 만료됐으면 같은 코드로 되찾는다(남이 가져갔으면 새 코드). */
  async mpInvite() {
    const n = this.net;
    if (!n || n.role !== 'host' || !n.url) return;
    if (isWs(n.url)) { this.toast(tr('방 {room|을} 열었다', { room: n.room }), 'good'); return; }   // 늘 받고 있다
    try { await openRoom(n.url, n.room, n.key); }
    catch (e) {
      try { const o = await openRoom(n.url); n.room = o.room; n.key = o.key; } catch (e2) { this.toast(tr('중개 서버에 닿지 않는다'), 'bad'); return; }
      n.sig.close();
      const hs = createHttpSignal(n.url, n.room, 'host', 2000, INVITE_MS, n.key);
      hs.onerror = () => this.mpInvite(); hs.onmessage = n.sig.onmessage; n.sig = hs;
    }
    n.sig.resume(INVITE_MS);
    this.toast(tr('방 {room|을} 열었다 — 5분 동안 참가를 받는다', { room: n.room }), 'good');
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
    } else if (m.k === 'tiles' && peer.rp) {
      this.netPutTiles(m.l, true);
      for (const q of n.peers.values()) if (q !== peer && q.rp) this.netSend(q.t, 'rel', m);   // 다른 참가자에게 그대로
    } else if (m.k === 'hit' && peer.rp) {
      const e = n.live.get(m.e);
      if (e && !e.dead && Math.abs(e.cx - peer.rp.cx) < 900 && Math.abs(e.cy - peer.rp.cy) < 700) e.hurt(m.a, !!m.c, peer.rp, m.kb, m.f || undefined);
    } else if ((m.k === 'oadd' || m.k === 'odel' || m.k === 'ost') && peer.rp) {
      this.netPutObj(m);
      this.netBroadcast(m, peer);
    } else if (m.k === 'door' && peer.rp) {
      this.netPutDoor(m);
      for (const q of n.peers.values()) if (q !== peer && q.rp) this.netSend(q.t, 'rel', m);
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
    const sig = isWs(url) ? createWsSignal(url, { role: 'guest', room, id: me }) : url ? createHttpSignal(url, room, me, 1000) : createTabSignal(room);
    if (url) (sig as Bag).onerror = () => { clearInterval(n.ask); clearTimeout(n.giveUp); this.net = null; this.toast(tr('그런 방이 없다'), 'bad'); };
    const n: Bag = { role: 'guest', room, sig, t: null, joiner: createJoiner(), sendT: 0, chunkId: 0, id: -1, others: new Map(), ghosts: new Map(), gproj: new Map(), watch: new Map(), objJ: new WeakMap() };
    n.char = this.freshPlayer(0, 0, name, charId);
    this.net = n;
    sig.onmessage = async m => {
      if (m.to !== me || n.t) return;
      if (m.t === 'full') { this.toast(tr('방이 가득 찼다'), 'bad'); clearInterval(n.ask); return; }
      if (m.t !== 'offer') return;
      clearInterval(n.ask); clearTimeout(n.giveUp);
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
    n.ask = setInterval(ask, isWs(url) ? 5000 : url ? 4000 : 2000); ask();
    /* 방은 있는데 호스트가 참가 받기를 쉬고 있으면 답이 없다 — 1분 뒤 포기한다. */
    n.giveUp = setTimeout(() => {
      if (this.net !== n || n.t) return;
      clearInterval(n.ask); sig.close(); this.net = null;
      this.toast(tr('호스트가 지금 참가를 받고 있지 않다'), 'bad');
    }, JOIN_GIVEUP_MS);   // 호스트가 아직 방을 안 열었으면 열 때까지 두드린다
  },
  netOnGuest(m) {
    const n = this.net;
    if (m.k === 'world') {
      this.currentSlot = null;                      // ★ 남의 세계다 — 참가자 슬롯에 저장하지 않는다
      this._loadGame(JSON.stringify(m.save));
      const me = n.char;
      me.x = m.x; me.y = m.y; me.netId = n.id = m.id;
      this.player = me;
      this.netTrackWorld();
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
    } else if (m.k === 'es') {
      this.netPutEnemies(m.l);
      if (m.p) this.netPutProjs(m.p);
    } else if (m.k === 'clk') {
      this.netPutClock(m);
    } else if (m.k === 'ed') {
      this.netPutDeaths(m.l);
    } else if (m.k === 'kill') {
      this.netPutKill(m);
    } else if (m.k === 'tiles') {
      this.netPutTiles(m.l, false);
    } else if (m.k === 'door') {
      this.netPutDoor(m);
    } else if (m.k === 'oadd' || m.k === 'odel' || m.k === 'ost') {
      this.netPutObj(m);
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
    const tiles = this.netTakeTiles();
    this.netWatchObjs();
    if (n.role === 'guest') {
      if (n.t && n.id >= 0) {
        n.t.send('fast', JSON.stringify({ k: 'st', s: this.netState(this.me) }));
        if (tiles) this.netSend(n.t, 'rel', { k: 'tiles', l: tiles });
      }
      return;
    }
    if (tiles) for (const q of n.peers.values()) if (q.rp) this.netSend(q.t, 'rel', { k: 'tiles', l: tiles });
    for (const [nid, e] of n.live) if (e.dead) { n.live.delete(nid); if (!n.dead.includes(nid)) n.dead.push(nid); }
    for (const q of n.peers.values()) {
      if (!q.rp) continue;
      q.t.send('fast', JSON.stringify({ k: 'es', l: this.netEnemyList(q.rp), p: this.netProjList(q.rp) }));
      if (n.dead.length) this.netSend(q.t, 'rel', { k: 'ed', l: n.dead });
    }
    n.dead = [];
    n.clkT = (n.clkT || 0) - 1 / NET_HZ;
    if (n.clkT <= 0) {
      n.clkT = 1;
      const clk = JSON.stringify({ k: 'clk', d: this.dayT, n: this.dayCount, ev: this.event || null });
      for (const q of n.peers.values()) if (q.rp) q.t.send('rel', clk);
    }
    const t = now();
    for (const q of n.peers.values()) if (q.heard && t - q.heard > 5) { q.t.close(); this.netDropPeer(q); }   // 5초 넘게 소식 없음 = 나감
    const list = [[0, this.netState(this.me)]];
    for (const q of n.peers.values()) if (q.last) list.push([q.id, q.last]);
    for (const q of n.peers.values()) if (q.rp) q.t.send('fast', JSON.stringify({ k: 'ps', list: list.filter(e => e[0] !== q.id) }));
  },
  /** 호스트의 몹이 남의 아바타를 쳤다 — 피해는 그 주인 화면에서 계산한다(무적 시간도 거기 것). */
  netRemoteHurt(rp, amount, srcX) {
    const n = this.net;
    /* 무적 시간은 주인 화면이 본다(Player.hurt) — 여기 사본은 한 박자 늦어 막 풀린 피해를 버렸다. 0.3초 간격만 둔다. */
    if (!n || n.role !== 'host' || (rp._hurtAt && this.time - rp._hurtAt < 0.3)) return;
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

/* ===== game/life.js — 성장 · 별 · 쓰러짐 · 부활 ===== */
import { TAU } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { MODE_OF } from '../data/start.js';
import { PROFS } from '../data/skills.js';
import { TS } from '../world.js';
import { Sprites } from '../sprites.js';
import { Part } from '../entity.js';
import { $, UI } from '../ui.js';
import { SaveStore } from '../savefmt.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const LifePart: Bag = {
  /** 세션 1 의 진행 표시. */
  /* ================= 별이 하늘로 돌아간다 (세션 1 종장) ================= */
  /* ★ 별의 세 사건은 **천천히** 지나가야 한다 — 사연: docs/code-history.md#h55 */
  STAR_GAIN: 3.0,
  STAR_MERGE: 5.0,
  STAR_RISE_ALL: 5.0,
  get STAR_GATHER() { return this.STAR_RISE_ALL / 3; },   // 모이는 마디
  get STAR_RISE() { return this.STAR_RISE_ALL * 2 / 3; }, // 올라가는 마디
  startStarRise() {
    this.starRise = { t: 0, dur: this.STAR_GATHER + this.STAR_RISE, x: 0, y: 0 };
    /* 별의 세 사건은 제 소리를 쓴다(learn·level 을 빌리면 다섯 번뿐인 장면이 특성 창 소리로 지나간다). */
    this.sfx('star_rise');
  },
  /** 남은 시간(초). */
  tickStarRise(dt) {
    const s = this.starRise; if (!s) return;
    s.t += dt;
    const p = this.player;
    if (s.t < this.STAR_GATHER) {
      // 모이는 동안 반짝임이 조금씩 붙는다
      if (Math.random() < dt * 14)
        this.parts.push(new Part(p.cx + (Math.random() - .5) * 70, p.cy - 10 + (Math.random() - .5) * 40, '#ffe08a', -30, .6));
      return;
    }
    if (!s.popped) {                       // 한 점으로 모인 순간
      s.popped = 1;
      this.burst(p.cx, p.cy - 14, 'starmerge', 120, 2.6);
      this.ringFx(p.cx, p.cy - 14, 66, '#ffe8a8', .5);
      this.sfx('star_merge');
    }
    // 올라가는 동안 지나간 자리에 잔불을 남긴다
    const k = (s.t - this.STAR_GATHER) / this.STAR_RISE;
    const y = p.cy - 14 - k * k * 900;
    if (Math.random() < dt * 30)
      this.parts.push(new Part(p.cx + (Math.random() - .5) * 22, y + Math.random() * 40, '#ffe08a', 40, .7));
    if (s.t >= s.dur) {
      this.starRise = null;
      p.starOrbits = 0; p.starLit = 0; p.starFade = 1;
    }
  },

  gainStarOrbit(id) {
    const p = this.player;
    if (id >= 1 && id <= 5) {
      p.starOrbits = Math.min(5, (p.starOrbits || 0) + 1);
      /* 조각이 맺히는 것을 보여 준 다음에 말로 알린다 — 순서가 반대면 글자가 먼저 뜨고 그림이 뒤따라서 둘이 따로 논다. */
      /* 생성 3초 — 조각이 멀리서 내려와 궤도에 앉기까지. */
      this.starGain = { t: 0, dur: this.STAR_GAIN };
      setTimeout(() => {
        const q = this.player;
        this.burst(q.cx + 30, q.cy - 8, 'stargain', 46, this.STAR_GAIN * 0.8);
        this.sfx('star_gain');
      }, 700);
      setTimeout(() => this.toast(tr('별 조각이 하나 더 곁에 남았다 — {starOrbits}/5', { starOrbits: p.starOrbits }), 'good'),
                 this.STAR_GAIN * 1000 - 600);
      if (id === 5) {
        // 다섯이 한 점으로 모였다가 다시 퍼진다.
        p.starLit = 1;
        setTimeout(() => {
          this.starMerge = this.STAR_MERGE;
          this.burst(this.player.cx, this.player.cy - 4, 'starmerge', 176, this.STAR_MERGE * 0.9);
          this.shake = 10; this.sfx('star_merge');
        }, this.STAR_GAIN * 1000);
        // 생성이 끝난 뒤 합성이 시작되고, 그것도 다 보고 나서 뒷이야기로
        return (this.STAR_GAIN + this.STAR_MERGE) * 1000 + 900;
      }
      return this.STAR_GAIN * 1000 + 500;   // 조각이 맺히고 한 줄 뜰 때까지
    } else if (id === 8) {
      /* 세션 1 의 끝 — 조각이 곁을 떠나 하늘로 돌아간다. */
      setTimeout(() => this.startStarRise(), 700);
      setTimeout(() => this.toast(tr('다섯 조각이 곁을 떠나 하늘로 돌아갔다'), 'good'),
                 700 + (this.STAR_GATHER + this.STAR_RISE) * 1000 + 200);
      return 700 + (this.STAR_GATHER + this.STAR_RISE) * 1000 + 1200;
    }
    return 0;
  },

  /* ---- 캐릭터 렌더 ---- */
  /* ================= 별 조각 궤도 (세션 1) ================= */
  drawStarOrbit(c, p, camX, camY) {
    const n = p.starOrbits | 0;
    if (!n) return;
    const t = this.time;
    const cx = p.cx - camX, cy = p.cy - camY - 4;
    // 5장을 끝내면 다섯이 한 점으로 모였다가 다시 퍼진다 — 5장 outro 와 같은 사건이다
    const mg = this.starMerge > 0 ? Math.min(1, this.starMerge / this.STAR_MERGE) : 0;
    /* 8장 — 하늘로 돌아간다. */
    let riseY = 0, riseK = 0, riseFade = 1;
    if (this.starRise) {
      const s = this.starRise;
      if (s.t < this.STAR_GATHER) {
        riseK = s.t / this.STAR_GATHER;            // 0 → 1 로 모인다
      } else {
        riseK = 1;
        const k = (s.t - this.STAR_GATHER) / this.STAR_RISE;
        riseY = -k * k * 900;                      // 가속하며 위로
        riseFade = Math.max(0, 1 - k * k * 1.15);
      }
    }
    const gather = Math.max(mg * 0.92, riseK);
    const rx = (30 + Math.sin(t * 0.7) * 1.5) * (1 - gather);
    const ry = rx * 0.42;
    const lit = p.starLit ? 1 : 0;
    const base = p.starFade ? 0.18 : (0.5 + lit * 0.25);
    const spr = this.spritesOn && typeof Sprites !== 'undefined'
      && Sprites.img && Sprites.img.proj_starfrag && Sprites.img.proj_starfrag.width;

    c.save();
    // 그림이 있으면 제 색으로(금빛이 하얗게 날아가지 않게), 없으면 빛으로 겹쳐 그린다
    if (!spr) c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = t * 0.7 + i * TAU / Math.max(n, 1);
      let x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry + riseY;
      /* 방금 얻은 조각(마지막 하나)은 3초에 걸쳐 위에서 내려와 궤도에 앉는다 — 얻는 장면. */
      if (this.starGain && i === n - 1) {
        const gk = Math.min(1, this.starGain.t / this.starGain.dur);
        const ease = 1 - Math.pow(1 - gk, 3);        // 빨리 내려와 천천히 앉는다
        y -= (1 - ease) * 240;
        x += (1 - ease) * 40;
      }
      // 뒤로 돌 때는 옅게 — 그래야 도는 것으로 보인다.
      const back = (riseK > 0.9 || Math.sin(a) >= 0) ? 1 : 0.45;
      const r = (2.6 + mg * 2.2 + riseK * 1.6) * (0.85 + 0.15 * Math.sin(t * 3 + i));
      c.globalAlpha = (base * back * (0.7 + 0.3 * Math.sin(t * 2.4 + i * 1.7))
                       + mg * 0.35 + riseK * 0.4) * riseFade;
      if (spr) {
        // 조각마다 반짝이는 박자를 어긋나게 둔다 — 다섯이 한꺼번에 깜빡이면 기계 같다
        const fr = Math.floor(t * 6 + i * 1.7) % 4;
        const w = r * 5.4;
        Sprites.drawFx(c, 'proj_starfrag', fr, x - w / 2, y - w / 2, w);
      } else {
        const g = c.createRadialGradient(x, y, 0, x, y, r * 3.2);
        g.addColorStop(0, lit ? '#fff6d8' : '#e8dcb8');
        g.addColorStop(0.35, lit ? 'rgba(255,224,138,.55)' : 'rgba(200,190,160,.4)');
        g.addColorStop(1, 'rgba(255,224,138,0)');
        c.fillStyle = g;
        c.beginPath(); c.arc(x, y, r * 3.2, 0, TAU); c.fill();
        c.fillStyle = '#fff8e0';
        c.beginPath(); c.arc(x, y, r * 0.55, 0, TAU); c.fill();
      }
    }
    c.restore();
  },

  onLevelUp(lv) {
    this.toast(tr('레벨 {lv} 달성! 스탯 +3, 특성 +1', { lv }), 'good');
    for (let i = 0; i < 30; i++) this.parts.push(new Part(this.player.cx, this.player.cy, '#ffe08a', -80, 0.9));
    UI.refreshStatAlloc(); this.sfx('level');
  },

  /** 생활 숙련이 한 단계 올랐다. */
  onProfUp(kind, lv) {
    const P = PROFS[kind]; if (!P) return;
    const perk = P.perks.find(([at]) => at === lv);
    this.toast(tr('{P} {P2} 숙련 {lv}{v}', { P: P.i, P2: P.n, lv, v: perk ? ` — ${perk[1]}` : '' }), 'good');
    const p = this.player;
    this.ringFx(p.cx, p.cy, perk ? 74 : 46, P.c, perk ? .55 : .35);
    for (let i = 0; i < (perk ? 26 : 12); i++)
      this.parts.push(new Part(p.cx, p.cy, P.c, -70, .8));
    this.sfx(perk ? 'level' : 'learn');
    if (perk) UI.chapterCard({ sub: tr('{P} 숙련 {lv}', { P: P.n, lv }), title: perk[1], line: perk[2] });
    if (UI.open === 'skill') UI.refreshProf();
  },
  onDeath(cause) {
    if (this.state !== 'play') return;
    this.tally = this.tally || {};
    this.tally.deaths = (this.tally.deaths || 0) + 1;
    if (cause) this.tally[cause] = (this.tally[cause] || 0) + 1;
    this.checkAch();
    const p = this.player;
    /* 여럿이면 보스전은 모두 쓰러졌을 때만 끝난다(호스트 판정 — 참가자 화면의 보스는 그림자다). */
    if (!this.net || (this.net.role === 'host' && this.players.every(q => q === p || q.hp <= 0))) this.endBossFight();
    const lostXp = Math.floor(p.xp * 0.15), lostG = Math.floor(p.gold * 0.4);
    p.xp -= lostXp; p.gold -= lostG;
    // 죽은 자리를 남긴다 — 세계가 5000타일이 넘어 "어디서 죽었더라"를 기억으로 버티기 어렵다.
    /* 하드는 가방의 절반까지 비석에 함께 담는다. */
    const md = MODE_OF(this.mode);
    let lostItems = [];
    if (md.death === 'drop') {
      const filled = p.bag.map((it, i) => it ? i : -1).filter(i => i >= 0);
      // 잠근 칸(Ctrl+좌클릭)은 남긴다 — 잠금은 "이건 잃고 싶지 않다"는 표시다
      const droppable = filled.filter(i => !p.bag[i].lock);
      for (let n = Math.floor(droppable.length / 2); n > 0; n--) {
        const k = droppable.splice(Math.floor(Math.random() * droppable.length), 1)[0];
        lostItems.push(p.bag[k]); p.bag[k] = null;
      }
      UI.refreshBag();
    }
    this.deathMark = {
      x: p.cx, y: p.cy, gold: lostG, xp: lostXp, items: lostItems,
      // 게임 시간 12시간이 지나면 사라진다.
      at: this.dayCount * 1440 + this.dayT
    };
    if (md.death === 'wipe') {
      // 불가능 모드 — 이 슬롯의 기록을 지운다.
      this.deathMark = null;
      if (this.currentSlot !== null) SaveStore.remove(this.currentSlot).catch(e => console.error(e));
      $('#death-line').textContent = tr('불가능 모드였다. 이 슬롯의 기록이 지워졌다.');
      $('#death-screen').classList.add('open');
      $('#death-screen').classList.add('wipe');
      this.scenes.open(this.net ? 'mdeath' : 'death');
      this.sfx('death');
      return;
    }
    const parts = [tr('경험치 {lostXp}, 금화 {lostG}개를 잃었다.', { lostXp: fmt(lostXp), lostG: fmt(lostG) })];
    if (lostItems.length) parts.push(tr('가방에서 {lostItemsCount}칸이 떨어졌다.', { lostItemsCount: lostItems.length }));
    parts.push(tr('쓰러진 자리에 비석이 섰다 — 돌아가면 절반을 되찾는다.'));
    $('#death-line').textContent = parts.join(' ');
    $('#death-screen').classList.add('open');
    this.scenes.open(this.net ? 'mdeath' : 'death');
    this.sfx('death');
  },
  respawn() {
    const p = this.player, w = this.world;
    // 여명 마을이 드러난 뒤(세션 2)부터는 거기서 부활한다 — 그 전까지는 베이스캠프가 유일한 정착지라 거기서 부활하는 게 맞지만
    const d = w.dawnCity;
    // 광장 정중앙(cx)은 분수대 자리다(restoreDawnCity의 fountain: (cx-2)~(cx+2)) — 그 위에 그대로 부활하면 캐릭터가 분수 위에 겹쳐 보인다.
    if (this.villageUnlocked && d) { p.x = (((d.x0 + d.x1) >> 1) - 5) * TS; p.y = (d.gy - 3) * TS; }
    else { p.x = w.spawnX * TS; p.y = (w.spawnY - 3) * TS; }
    p.vx = p.vy = 0;
    p.hp = p.d.maxHp; p.mp = p.d.maxMp; p.iframe = 2; p.buffs = [];
    /* 세계의 몹·보스는 혼자일 때만 걷는다 — 여럿이면 남은 사람이 아직 싸우고 있다. */
    if (!this.net) { this.ents = []; this.corpses = []; this.boss = null; this.projs = []; }
    /* ★ 깨워 둔 둥지·메아리 표시도 같이 지운다. */
    this.pendingLair = null; this.pendingEcho = null;
    if (this.pulseEvent) this.endPulseEvent(false);   // 쓰러지면 사건도 놓친 것이다
    this.rocks = [];
    $('#death-screen').classList.remove('open');
    this.scenes.close('death'); this.scenes.close('mdeath');
  },
};

mixin(Game.prototype, LifePart, true);

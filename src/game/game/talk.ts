/* ===== game/talk.js — 대화 ===== */
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { CHAR_OF } from '../data/start.js';
import { DAWN_NPCS, NAME_CALL, NAME_CALL_P, NPCS, TALK, TALK_MOODS, VILLAGE_TALK } from '../data/npcs.js';
import { CHAPTERS, DIALOGUE, sessionOf } from '../data/story.js';
import { SIDE_POOL } from '../data/quests.js';
import { UI } from '../ui.js';
import { NONAME } from '../savefmt.js';
import { Game } from '../game.js';
/* game.js 의 G 에서 나눈 조각 — 읽히는 순간 G 에 붙는다(main.js 가 game.js 다음에 읽는다). */

export const TalkPart: Bag = {

  /* ================= NPC =================
     대사는 두 겹이다(data.js TALK 주석) — ① 이야기(DIALOGUE·VILLAGE_TALK)
     ② 상황 한 줄(죽은 자리·다친 몸·날씨·밤낮…).
     ★ ①은 "처음 듣는 것"일 때만 나온다. 한 장에 머무는 동안 몇 번을 말 걸어도 같은
       세 줄을 다시 읽게 하지 않는다(다시 듣고 싶으면 선택지가 있다). */

  /** 지금 이 사람이 보고 있는 것 — 상황 판정에 쓰는 값들을 한 번에 모은다 */
  talkCtx() {
    const p = this.player, ch = CHAPTERS[this.chapter];
    let complete = false, ready = false;
    try {
      const st = ch ? this.chapterState(ch) : null;
      complete = !!(st && st.complete);
      ready = !!(st && st.ready && !st.complete);   // 준비는 끝났고 마지막 하나만 남았다
    } catch (e) { complete = ready = false; }
    return {
      ch: this.chapter,
      session: sessionOf(this.chapter).id,
      hour: Math.floor(this.dayT / 60),
      night: this.dayT < 5 * 60 || this.dayT > 19 * 60,
      /* 날씨는 지금 발밑에서 작동 중이 아니어도 본다 — 사막에서 모래를 뒤집어쓰고
         돌아오면 기술자가 그 모래를 알아보는 편이 사람답다. */
      ev: this.event ? this.event.id : null,
      hpr: p.d.maxHp > 0 ? p.hp / p.d.maxHp : 1,
      gold: p.gold,
      grave: !!this.deathMark,
      complete, ready,
      villageLv: this.villageLv()
    };
  },

  /** 이 사람이 지금 상황에서 들고 있는 칸을 고른다. 없으면 아래 칸으로 내려간다. */
  talkMood(id: string, c: any) {
    const pool = TALK[id];
    if (!pool) return null;
    for (const m of TALK_MOODS) if (m.when(c) && pool[m.id]) return m.id;
    return null;
  },

  /** 상황 한 줄과 그에 딸린 대답을 뽑는다.
      같은 칸을 다시 만나면 다음 말로 넘어간다 — 무작위가 아니라 순번이라 반드시
      다른 말이 나온다. 순번(talkSeq)은 저장에 남아서 불러와도 이어진다. */
  talkPick(id: string) {
    const mood = this.talkMood(id, this.talkCtx());
    if (!mood) return null;
    const b = TALK[id][mood], key = id + '|' + mood;
    this.talkSeq = this.talkSeq || {};
    const t = this.talkSeq[key] || 0;
    this.talkSeq[key] = (t + 1) % 2520;    // 2520 = 1~10의 최소공배수 (칸 길이가 몇이든 균등)
    return {
      mood,
      say: b.say[t % b.say.length],
      re: (b.re && b.re.length) ? b.re[t % b.re.length] : null
    };
  },

  /** 가끔 모험가를 이름으로 부른다(NAME_CALL_P) — 이름을 비웠으면 캐릭터 이름. 부르는 말은 순번으로 돈다. */
  nameCall(id: string) {
    const a = NAME_CALL[id];
    if (!a || Math.random() >= NAME_CALL_P) return null;
    this.talkSeq = this.talkSeq || {};
    const k = id + '|name', t = this.talkSeq[k] || 0;
    this.talkSeq[k] = (t + 1) % 2520;
    const p = this.player, name = p.name && p.name !== NONAME ? p.name : CHAR_OF(p.charId).n;
    return tr(a[t % a.length], { name });
  },

  /** 대화창 아래의 선택지 = [상황 대답] + 늘 있는 것들(rest).
      대답을 고르면 대꾸를 보여 주고 rest 로 돌아온다 — 대답 한 번 했다고
      가게나 의뢰가 사라지면 안 되니까. */
  talkMenu(id: string, pick: any, rest: any) {
    if (!(pick && pick.re)) return rest;
    const re = pick.re;
    return [{ t: re.t, say: 1, fn: () => { UI.closeDialogue(); this.talkAnswer(id, re, rest); } }].concat(rest);
  },

  talkAnswer(id: string, re: any, rest: any) {
    const lines = Array.isArray(re.s) ? re.s.slice() : [re.s];
    UI.openDialogue(id, lines, rest);
    this.sfx('talk');
  },

  talkExtra(id: string) {
    const cs = [];
    if (NPCS[id].shop) cs.push({ t: tr('물건을 보여 달라'), fn: () => { UI.closeDialogue(); UI.openShop(id); } });
    if (id === 'trainer') {
      cs.push({ t: tr('스탯 재분배 · 🪙 {respecCost}', { respecCost: fmt(this.respecCost()) }), fn: () => { UI.closeDialogue(); this.respecStats(); } });
      cs.push({ t: tr('수련 · 🪙 {trainCost} · 오늘 {trainedToday}/5', { trainCost: fmt(this.trainCost()), trainedToday: this.trainedToday }), fn: () => { UI.closeDialogue(); this.trainXp(); } });
    } else if (id === 'haran') {
      cs.push({ t: tr('방을 잡는다'), fn: () => { UI.closeDialogue(); this.useInn(); } });
    } else if (id === 'seira') {
      cs.push({ t: tr('장비를 다시 벼려 달라'), fn: () => { UI.closeDialogue(); UI.openReforge(); } });
    } else if (NPCS[id].dynamicShop) {
      cs.push({ t: tr('오늘 실은 것을 보자'), fn: () => { UI.closeDialogue(); UI.openShop(id); } });
    }
    /* 하나뿐이면 묶지 않는다(한 줄을 두 번 누르게 만드는 꼴이다). */
    return cs.length > 1 ? [{ t: tr('볼일이 있다'), sub: cs }] : cs;
  },

  talkTo(id: string) {
    this.talked = this.talked || {};
    const first = !this.talked[id];
    this.talked[id] = true;
    if (DAWN_NPCS.includes(id)) { this.talkVillager(id, first); return; }

    const story = this.storyOf(id, this.chapter) || [''];
    this.storyHeard = this.storyHeard || {};
    const fresh = this.storyHeard[id] !== this.chapter;   // 이 장의 이야기를 아직 안 들었다
    this.storyHeard[id] = this.chapter;

    /* 첫 대면에는 상황 한 줄을 붙이지 않는다 — 인사보다 먼저 날씨 얘기를 꺼내는 사람은 없다. */
    const pick = (first && this.chapter === 0) ? null : this.talkPick(id);
    const lines = fresh ? story.slice() : [];
    const call = pick && !fresh ? this.nameCall(id) : null;
    if (call) lines.push(call);
    if (pick) lines.push(pick.say);
    if (!lines.length) lines.push(story[story.length - 1]);

    const rest: Bag[] = [];
    /* 이야기를 이미 들은 뒤에는 다시 듣는 길을 남겨 둔다 — 놓친 줄이 있을 수 있으니까 */
    if (!fresh) rest.push({ t: tr('다시 듣기'), replay: 1, fn: () => {
      UI.closeDialogue();
      UI.openDialogue(id, story.slice(), rest);
      this.sfx('talk');
    } });
    rest.push(...this.talkExtra(id));
    if (SIDE_POOL[id]) rest.push({
      t: this.sideActive[id] ? tr('의뢰에 대해 묻는다') : tr('부탁할 일이 있는지 묻는다'),
      quest: 1, fn: () => { UI.closeDialogue(); this.sideTalk(id); }
    });
    rest.push({ t: tr('지금 무엇을 해야 하지?'), quest: 1, fn: () => { UI.closeDialogue(); this.tellQuest(); } });
    if (id === 'elara' && this.chapter === 0) rest.push({ t: tr('(여정을 시작한다)'), quest: 1, fn: () => { UI.closeDialogue(); } });
    UI.openDialogue(id, lines, this.talkMenu(id, pick, rest));
    this.sfx('talk');
  },

  /** 그 사람이 이 장에 할 이야기. */
  storyOf(id: string, ch: any) {
    const a = DIALOGUE[id];
    if (!a || !a.length) return null;
    /* 세션 3에서 처음 만나는 사람은 대사 묶음이 15장부터 시작한다 — 앞에 빈 칸 열다섯 개를 채워 넣을 수는 없으니, NPCS[id].from(첫 등장 장)만큼 빼서 센다 — 사연:
       docs/code-history.md#h45 */
    const from = (NPCS[id] && NPCS[id].from) || 0;
    return a[clamp(ch - from, 0, a.length - 1)] || null;
  },

  /* ---- 여명 마을 주민 (종장 이후에만 세계에 존재한다) ---- */
  talkVillager(id: string, first: boolean) {
    const d = NPCS[id];
    /* ★ 여명 마을 다섯도 캠프 넷과 같은 식으로 장마다 한 번씩 이야기를 한다. */
    const story = this.storyOf(id, this.chapter);
    this.storyHeard = this.storyHeard || {};
    const fresh = !!story && this.storyHeard[id] !== this.chapter;
    if (story) this.storyHeard[id] = this.chapter;
    /* 그 사람을 처음 만나는 자리에서만 서명 같은 한 줄을 듣는다 — 매번 앞에 두면 열 번 말 걸어 열 번 같은 말이 된다. */
    const pick = (first || fresh) ? null : this.talkPick(id);
    const lines = [];
    if (first) lines.push(d.line);
    if (fresh) lines.push(...story);
    const call = pick ? this.nameCall(id) : null;
    if (call) lines.push(call);
    if (pick) lines.push(pick.say);
    /* 마을이 한 단계 자랐으면 그 사실을 한 번 알려 준다 — 매번이 아니라 바뀐 그때. */
    this.villageSeen = this.villageSeen || {};
    const lv = this.villageLv(), vt = VILLAGE_TALK[id];
    if (vt && vt[lv] && this.villageSeen[id] !== lv) { lines.push(vt[lv]); this.villageSeen[id] = lv; }
    if (!lines.length) lines.push(story ? story[story.length - 1] : d.line);
    const rest = this.talkExtra(id);
    if (story && !fresh) rest.push({ t: tr('다시 듣기'), replay: 1, fn: () => {
      UI.closeDialogue();
      UI.openDialogue(id, story.slice(), rest);
      this.sfx('talk');
    } });
    /* 마을 주민에게도 부탁을 받는다 — 이 다섯에게만 부탁이 없으면 도시가 사람이 사는 곳이 아니라 상점가로 보인다. */
    if (SIDE_POOL[id]) rest.push({
      t: this.sideActive[id] ? tr('맡은 일에 대해 묻는다') : tr('도울 일이 있는지 묻는다'),
      quest: 1, fn: () => { UI.closeDialogue(); this.sideTalk(id); }
    });
    /* 마을 주민에게도 길을 물을 수 있다 — 세션 2는 대부분의 시간을 여기서 보낸다. */
    rest.push({ t: tr('지금 무엇을 해야 하지?'), quest: 1, fn: () => { UI.closeDialogue(); this.tellQuest(); } });
    UI.openDialogue(id, lines, this.talkMenu(id, pick, rest));
    this.sfx('talk');
  },
};

mixin(Game.prototype, TalkPart, true);

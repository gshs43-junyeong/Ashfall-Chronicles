/* ===== ui/portrait.ts — 움직이는 대화 초상(눈 깜빡임 · 입 · 표정) ===== */
/* 표정 장은 tools/mknpc.py portrait 가 구운 9장 띠(npc/anim_<id>.png)다 — file:// 에서는 그림 픽셀을 읽을 수 없어 여기서 만들지 않는다.
   그리기는 CSS 배경 위치만 옮긴다(캔버스 없음). 창이 닫히면 돌림을 멈춘다 — 남겨 두면 보이지 않는 초상이 계속 돈다. */

/** 장 순서 — mknpc.py FRAMES 와 같아야 한다 */
export const PFRAME: Record<string, number> = { base: 0, half: 1, shut: 2, talk1: 3, talk2: 4, happy: 5, wow: 6, sad: 7, cry: 8 };
export const NF = 9;

/** 대사 끝의 문장부호 · 웃음으로 쉬는 표정을 고른다 — 원문이 어느 언어든 부호는 같다 */
export function moodOf(text: string): string | null {
  const t = (text || '').trim();
  if (/(흑흑|ㅠ|훌쩍|눈물|울었|울고|\*sob|sniff|tears|泣|涙|哭|泪|Träne|schluchz|lágrima|sollozo|llor)/i.test(t)) return 'cry';
  if (/(하하|후후|헤헤|ㅎㅎ|♪|haha|hehe|jaja|ふふ|はは|哈哈)/i.test(t)) return 'happy';
  if (/(…|\.\.\.)\s*$/.test(t)) return 'sad';
  if (/[!！]\s*$/.test(t)) return 'wow';
  return null;
}

export class Face {
  declare el: HTMLElement; declare on: boolean; declare talk: boolean; declare mood: string | null; declare moodEnd: number;
  declare blinkAt: number; declare mouthAt: number; declare mouth: number; declare f: number; declare raf: number;
  constructor(el: HTMLElement) {
    this.el = el; this.on = false; this.talk = false; this.mood = null; this.moodEnd = 0;
    this.blinkAt = 0; this.mouthAt = 0; this.mouth = 0; this.f = -1; this.raf = 0;
  }
  /** url 이 있으면 표정 띠로, 없으면 정지 그림(부르는 쪽이 setIcon) */
  set(url: string | null) {
    this.stop();
    this.el.classList.toggle('anim', !!url);
    if (!url) return;
    this.el.style.backgroundImage = `url(${url})`;
    this.f = -1; this.mood = null; this.talk = false;
    this.blinkAt = performance.now() + 900 + Math.random() * 1600;
    this.on = true;
    this.draw(0);
    const loop = (now: number) => { if (!this.on) return; this.tick(now); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.on = false; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
  /** 쉬는 표정 — ms 가 있으면 그만큼만 */
  setMood(m: string | null, ms = 0) { this.mood = m; this.moodEnd = ms ? performance.now() + ms : 0; }
  setTalk(on: boolean) { this.talk = on; if (on) this.mouthAt = 0; }
  tick(now: number) {
    if (this.moodEnd && now > this.moodEnd) { this.mood = null; this.moodEnd = 0; }
    /* 깜빡임 — 반 감음 → 감음 → 반 감음(0.22초), 2.4~5초마다. 가끔 두 번 */
    let eye = '';
    const b = now - this.blinkAt;
    if (b >= 0) {
      eye = b < 60 ? 'half' : b < 140 ? 'shut' : b < 210 ? 'half' : '';
      if (b >= 210) this.blinkAt = now + (Math.random() < 0.15 ? 120 : 2400 + Math.random() * 2600);
    }
    let f = 'base';
    if (this.talk) {
      /* 입은 박자가 고르면 기계 같다 — 70~150ms 마다 셋 중 하나(같은 장이 이어지지 않게) */
      if (now > this.mouthAt) { this.mouth = (this.mouth + 1 + (Math.random() * 2 | 0)) % 3; this.mouthAt = now + 70 + Math.random() * 80; }
      f = ['base', 'talk1', 'talk2'][this.mouth];
      if (f === 'base' && this.mood === 'happy') f = 'happy';
    } else if (this.mood) f = this.mood;
    if (this.talk && this.mouth === 0 && (this.mood === 'cry' || this.mood === 'sad')) f = this.mood;   // 울며 · 처진 채로 말한다 — 입이 닫히는 박자에 웃는 입이 끼지 않게
    if (eye && (f === 'base' || f === 'talk1' || f === 'talk2' || f === 'wow')) f = eye;   // 웃는 눈 · 처진 눈은 이미 감겨 있다
    this.draw(PFRAME[f]);
  }
  draw(i: number) {
    if (i === this.f) return;
    this.f = i;
    this.el.style.backgroundPosition = `${i * 100 / (NF - 1)}% 0`;
  }
}

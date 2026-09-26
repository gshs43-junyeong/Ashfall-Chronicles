/* ===== ui/tip.js — 툴팁 ===== */
import { app as G } from '../ctx.js';
import { clamp } from '../../engine/core/math.js';
import { mixin } from '../../engine/core/mixin.js';
import { fmt, tr } from '../lang.js';
import { BUFFS, MACHINE, MULTI_FALLOFF, PETS, PET_LV_MAX, RARITY, RARITY_MULT, idef, petAtkMul, petLvMul, petXpNext } from '../data.js';
import { TS } from '../world.js';
import { Art } from '../itemart.js';
import { enhMul, equipReqLv, isGear, itemDamage, itemName, itemSpeed, itemStats } from '../entity.js';
import { UI } from '../ui.js';
/* ui.js 의 UI 에서 나눈 조각 — 읽히는 순간 UI 에 붙는다(main.js 가 ui.js 다음에 읽는다). */

export const TipUIPart = {

  /* 펫 목록 패널은 없다 — 펫이 인벤토리 아이템이라, 가방에서 바로 장비창의 펫 칸으로 끼우면 된다(다른 장비와 똑같은 조작). */

  /* ---------------- 툴팁 ---------------- */
  /** 같은 자리에 차고 있는 장비와 견준 한 줄. */
  compareLine(it) {
    const p = G.player;
    if (!p || !it) return null;
    const d = idef(it);
    let key = null;
    if (d.type === 'weapon') key = 'weapon';
    else if (d.type === 'armor') key = d.slot;
    else if (d.type === 'bag') key = 'bag';
    else if (d.type === 'acc') {
      // 두 칸 중 약한 쪽과 견준다 — 실제로 갈아 끼우게 되는 쪽이 그쪽이다
      const score = q => { if (!q) return -1; const s = itemStats(q); let v = 0; for (const k in s) v += s[k]; return v; };
      key = score(p.equip.acc1) <= score(p.equip.acc2) ? 'acc1' : 'acc2';
    }
    if (!key) return null;
    const cur = p.equip[key];
    if (!cur) return `<div class="tcmp new">${tr('빈 자리에 낄 수 있다')}</div>`;
    if (cur === it) return `<div class="tcmp same">${tr('지금 차고 있는 것')}</div>`;
    const rows = [];
    const push = (label, a, b, unit) => {
      const dv = Math.round((a - b) * 10) / 10;
      if (!dv) return;
      rows.push(`<span class="${dv > 0 ? 'up' : 'down'}">${dv > 0 ? '▲' : '▼'} ${label} ${dv > 0 ? '+' : ''}${dv}${unit || ''}</span>`);
    };
    if (d.dmg || idef(cur).dmg) push(tr('공격력'), Math.round(itemDamage(it)), Math.round(itemDamage(cur)));
    if (d.def || idef(cur).def) push(tr('방어'), Math.round((d.def || 0) * RARITY_MULT[it.r]), Math.round((idef(cur).def || 0) * RARITY_MULT[cur.r]));
    if (d.type === 'bag' && (d.slots || idef(cur).slots)) push(tr('가방 칸'), d.slots || 0, idef(cur).slots || 0);
    const sa = itemStats(it), sb = itemStats(cur);
    const NM = { hp: tr('생명'), mp: tr('마나'), def: tr('방어'), ms: tr('이속'), crit: tr('치명'), critD: tr('치명피해'), cdr: tr('쿨감'), lifesteal: tr('흡혈'), str: tr('힘'), dex: tr('민첩'), int: tr('지능'), vit: tr('체력'), jump: tr('점프'), mpreg: tr('마나재생'), hpreg: tr('생명재생'),
      // 산소통·잠수 장비.
      oxyMax: tr('숨(초)'), oxyReg: tr('숨 회복'), charge: tr('전하') };
    for (const k in NM) {
      const a = sa[k] || 0, b = sb[k] || 0;
      if (a || b) push(NM[k], a, b);
    }
    if (!rows.length) return `<div class="tcmp same">${tr('차고 있는 것과 큰 차이 없다')}</div>`;
    return `<div class="tcmp"><span class="cmp-h">${tr('지금 낀 것과 비교')}</span>${rows.join('')}</div>`;
  },

  showTip(it, e, extra) {
    if (!it) { this.hideTip(); return; }
    const d = idef(it), st = itemStats(it);
    let h = `<div class="thead"><span class="tip-ic" style="background-image:url(${Art.itemUrl(it.id)})"></span>` +
      `<span class="tname c${it.r}">${itemName(it)}</span></div>`;
    const typeName = d.type === 'weapon' ? ({ melee: tr('근접 무기'), ranged: tr('원거리 무기'), magic: tr('마법 무기') })[d.wc]
      : d.type === 'armor' ? tr('방어구') : d.type === 'acc' ? tr('장신구') : d.type === 'tool' ? tr('도구')
        : d.type === 'rod' ? tr('낚싯대') : d.type === 'pet' ? tr('펫') : d.type === 'station' ? tr('설치물')
          : d.type === 'door' ? tr('문')
          : d.type === 'bag' ? tr('가방') : d.type === 'consum' ? tr('소비품') : d.type === 'block' ? tr('설치물')
            : d.type === 'machine' ? tr('기계') : d.type === 'seed' ? (d.fert ? tr('비료') : tr('씨앗'))
              : d.type === 'summon' ? tr('소환') : tr('재료');
    h += `<div class="ttype">${RARITY[it.r]} · ${typeName}</div>`;
    if (d.dmg) {
      h += `<div class="tstat">${tr('공격력 <b>{itemDamage}</b> · 속도 <b>{itemSpeed}/초</b>', { itemDamage: Math.round(itemDamage(it)), itemSpeed: itemSpeed(it).toFixed(2) })}</div>`;
      /* ★ 초당 피해를 같이 적는다. */
      const n = d.multi || 1;
      const one = itemDamage(it) * itemSpeed(it);
      const eff = one * (n > 1 ? 1 + MULTI_FALLOFF * (n - 1) : 1);
      h += `<div class="tstat">${tr('초당 피해 <b>{eff}</b>', { eff: Math.round(eff) })}` +
        (n > 1 ? ` <span class="thint">${tr('(한 몸에 다 맞을 때 · 흩어지면 {n})', { n: Math.round(one * n) })}</span>` : '') +
        `</div>`;
    }
    if (d.def) h += `<div class="tstat">${tr('방어 <b>{n}</b>', { n: Math.round(d.def * enhMul(it)) })}</div>`;
    if (it.e) h += `<div class="tstat">${tr('강화 <b>+{e}</b>', { e: it.e })} <span class="thint">${tr('(공격·방어 +{n}%p)', { n: it.e * 5 })}</span></div>`;
    /* 펫은 레벨이 곧 값어치다 — 패시브가 통째로 커지므로 지금 몇 레벨이고 다음까지 얼마나 남았는지가 한눈에 보여야 한다. */
    if (d.type === 'pet') {
      const lv = it.lv || 1, max = lv >= PET_LV_MAX;
      h += `<div class="tstat">${tr('레벨 <b>{lv}</b> / {petLvMax}', { lv, petLvMax: PET_LV_MAX })}` +
        (max ? ` <span class="thint">${tr('(끝까지 키웠다)')}</span>` : ` <span class="thint">${tr('패시브 ×{petLvMul} · 공격 ×{petAtkMul}', { petLvMul: petLvMul(lv).toFixed(2), petAtkMul: petAtkMul(lv).toFixed(2) })}</span>`) +
        `</div>`;
      if (!max) {
        const need = petXpNext(lv), cur = it.xp || 0;
        h += `<div class="petxp"><i style="width:${Math.round(clamp(cur / need, 0, 1) * 100)}%"></i></div>` +
          `<div class="thint">${tr('다음 레벨까지 {n}', { n: fmt(need - cur) })}</div>`;
      }
    }
    if (d.power) h += `<div class="tstat">${tr('채굴 등급 <b>{power}</b>', { power: d.power })}</div>`;
    if (d.type === 'tool') h += `<div class="tstat">${tr('필요 레벨 <b>Lv.{equipReqLv}</b>', { equipReqLv: equipReqLv(it.id) })}</div>`;
    if (d.pw) h += `<div class="tstat">${tr('전하 소모 <b>{pw}</b> / 사용', { pw: d.pw })}</div>`;
    // 기계는 정보를 MACHINE 표가 들고 있다 — 아이템 쪽에 같은 내용을 또 쓰지 않는다
    if (d.mach) {
      const M = MACHINE[d.mach];
      if (M.power) h += `<div class="tstat">${tr('전력 <b>{power}</b>/틱', { power: M.power })}</div>`;
      if (M.gen) h += `<div class="tstat">${tr('발전 <b>{gen}</b>/틱', { gen: M.gen })}</div>`;
      if (M.store) h += `<div class="tstat">${tr('축전 <b>{store}</b>', { store: M.store })}</div>`;
      if (M.fuelIn) h += `<div class="tstat">${tr('연료를 직접 태운다')}</div>`;
      if (M.mine) h += `<div class="tstat">${tr('채굴 등급 <b>{mine}</b> · 반경 <b>{range}</b>칸', { mine: M.mine, range: M.range })}</div>`;
      h += `<div class="tdesc">"${M.d}"</div>`;
    }
    // 펫 — 고유 자동 공격이 이 펫의 정체성이라 수치를 그대로 보여 준다
    if (d.pet && PETS[d.pet] && PETS[d.pet].atk) {
      const a = PETS[d.pet].atk;
      h += `<div class="tstat">${tr('고유 공격 <b>{v}</b> · 피해 <b>{dmg}</b>', { v: a.k === 'melee' ? tr('물어뜯기') : tr('투사체'), dmg: a.dmg })}` +
        ` ${tr('· {cd}초마다 · 사거리 <b>{n}</b>칸', { cd: a.cd, n: Math.round(a.range / TS) })}</div>`;
      h += `<div class="tstat">${tr('필요 레벨 <b>Lv.{equipReqLv}</b>', { equipReqLv: equipReqLv(it.id) })}</div>`;
    }
    if (d.mana) h += `<div class="tstat">${tr('소모 마나 <b>{mana}</b>', { mana: d.mana })}</div>`;
    if (d.multi) h += `<div class="tstat">${tr('투사체 <b>{multi}발</b>', { multi: d.multi })}</div>`;
    /* 칸 수 표기 — 가방은 "가방이 몇 칸 늘어난다", 저장 상자는 "상자에 몇 칸이 있다"로 뜻이 다르다 — 사연: docs/code-history.md#h99 */
    // 심연용 산소통만 가진 값 — 배수라 위 표(+n)로는 뜻이 안 통한다
    if (st.oxyReg) h += `<div class="taff">${tr('물 밖 숨 회복 {n}배', { n: 1 + st.oxyReg })}</div>`;
    if (d.slots) h += d.type === 'bag'
      ? `<div class="taff">${tr('+{slots} 가방 칸', { slots: d.slots })}</div>`
      : `<div class="taff">${tr('{slots}개 칸', { slots: d.slots })}</div>`;
    const NAME = { hp: tr('최대 생명'), mp: tr('최대 마나'), def: tr('방어'), ms: tr('이동 속도'), crit: tr('치명타'), critD: tr('치명 피해'), cdr: tr('재사용 감소'), lifesteal: tr('흡혈'), jump: tr('추가 점프'), str: tr('힘'), dex: tr('민첩'), int: tr('지능'), vit: tr('체력'), dmgP: tr('피해'), spdP: tr('공격 속도'), fire: tr('화염 부여'), frost: tr('냉기 부여'), mpreg: tr('마나 재생'), hpreg: tr('생명 재생'), magicP: tr('마법 피해'),
      // 산소통·잠수 장비가 늘려 주는 값.
      oxyMax: tr('숨 참는 시간'), charge: tr('전하') };
    for (const k in st) {
      if (!NAME[k] || !st[k]) continue;
      const pct = (k === 'ms' || k === 'crit' || k === 'critD' || k === 'cdr' || k === 'lifesteal' || k === 'mpreg' || k === 'magicP');
      const v = (k === 'dmgP' || k === 'spdP') ? Math.round(st[k] * 100) + '%'
        : k === 'oxyMax' ? st[k] + tr('초') : st[k] + (pct ? '%' : '');
      h += `<div class="taff">${st[k] < 0 ? '' : '+'}${v} ${NAME[k]}</div>`;
    }
    if (d.use) {
      if (d.use.hp) h += `<div class="taff">${tr('생명 {hp} 회복', { hp: d.use.hp })}</div>`;
      if (d.use.mp) h += `<div class="taff">${tr('마나 {mp} 회복', { mp: d.use.mp })}</div>`;
      if (d.use.buff) h += `<div class="taff">${tr('{buff} 효과', { buff: BUFFS[d.use.buff].n })}</div>`;
    }
    /* 같은 자리에 낀 것과 견줘 증감만 보여 준다. */
    const cmp = this.compareLine(it);
    if (cmp) h += cmp;
    if (d.d) h += `<div class="tdesc">"${d.d}"</div>`;
    if (extra) h += `<div class="thint">${extra}</div>`;
    else if (d.type === 'tool') h += `<div class="thint">${tr('핫바에 두고 좌클릭으로 채굴')}</div>`;
    else if (d.type === 'rod') h += `<div class="thint">${tr('핫바에 두고 물 블록에 우클릭 — 입질 중 우클릭하면 즉시 챔질(보너스)')}</div>`;
    else if (d.type === 'pet') h += `<div class="thint">${tr('우클릭으로 펫 칸에 장착 — 두 마리까지 데리고 다닐 수 있다')}</div>`;
    else if (d.type === 'station') h += `<div class="thint">${tr('핫바에 두고 빈 자리에 우클릭해 설치 · 설치한 것은 좌클릭으로 회수(내용물째)')}</div>`;
    else if (d.type === 'door') h += `<div class="thint">${tr('바닥 바로 위 칸에 우클릭 — 위로 두 칸을 쓴다 · <b>바라본 쪽으로 열린다</b> · 좌클릭으로 회수')}</div>`;
    else if (isGear(it)) h += `<div class="thint">${tr('우클릭으로 장착')}</div>`;
    else if (d.type === 'consum' || d.type === 'summon') h += `<div class="thint">${tr('우클릭으로 사용')}</div>`;
    else if (d.type === 'machine') h += `<div class="thint">${tr('우클릭으로 설치 (보는 방향으로) · 설치된 것을 우클릭하면 설정')}</div>`;
    else if (d.type === 'seed') h += `<div class="thint">${d.fert ? tr('자라는 중인 작물에 우클릭') : tr('갈아 둔 밭 위에 우클릭해 심기')}</div>`;
    else if (d.hoe) h += `<div class="thint">${tr('흙이나 풀에 우클릭해 밭 갈기')}</div>`;
    else if (d.scythe) h += `<div class="thint">${tr('다 여문 작물을 좌클릭해 거두기 — 다른 연장으로 치면 아무것도 안 나온다')}</div>`;
    this.tip.show(h, e.clientX, e.clientY);
    this.tipTarget = true;
  },
  placeTip(x, y) { this.tip.place(x, y); },
  hideTip() { this.tip.hide(); this.tipTarget = false; },
};
mixin(UI, TipUIPart);

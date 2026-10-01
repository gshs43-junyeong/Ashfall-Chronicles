/* 게임 공용 타입(전역) — 타입만, 번들에 안 들어간다.
   표 모양은 실제 표 값에서 뽑은 칸 전부를 적는다(열린 칸 [k: string]: any 없음 — 모르는 칸을 읽으면 타입 검사가 잡는다).
   표에 새 칸을 더하면 여기에도 적을 것. */

/** 타입을 다 입히기 전의 큰 객체(G · UI · Factory · 그림 표와 그 조각) — 아무 이름이나 읽고 쓸 수 있다. */
type Bag = Record<string, any>;

/** 세계 한 벌의 치수 — World 인스턴스가 제 것을 들고 다닌다(`world.dims`). 필드 이름은 예전 모듈 전역과 같다. */
interface WorldDims {
  WSIZE: string; WSX: number; WSY: number;
  SX: (x: number) => number; SY: (y: number) => number; SYB: (y: number) => number;
  WW: number; WH: number; WORLD_BOT: number; SURF_BASE: number; HELL_Y: number; DEEP_Y: number; SKY_Y: number;
  CAMP_X0: number; CAMP_X1: number; CAMP_GX1: number; SEA_X1: number; GLACIER_X1: number;
  BIOMES: Bag[];
}

/** TILE_DEF 한 칸 — 인덱스가 타일 번호(세이브가 번호 그대로 담는다). */
interface TileDef {
  n: string; c: string | null; solid: number; hard: number;
  drop?: string | null; light?: number; mach?: string; lc?: string;
  tree?: number; leaf?: number; leafDrop?: any[]; ore?: number; hurt?: number; clear?: number; soft?: number; farm?: number;
  crop?: Record<string, any>; tdart?: number; tvent?: number; crumble?: number; liquid?: number; flow?: number; tcoil?: number;
  tgas?: number; tgrind?: number; a?: number; air?: number; sea?: number; tbrine?: number; tmine?: number; plant?: number; fluid?: number;
  dropN?: any[]; rich?: number;
}

/** ITEMS 한 항목 — type 으로 갈래를 가른다(weapon · armor · tool · block · …). */
interface ItemDef {
  n: string; i?: string; d?: string; type?: string; tier?: number;
  dmg?: number; spd?: number; kb?: number; reach?: number; wc?: string;
  lifesteal?: number; fire?: number; proj?: string; multi?: number; mana?: number; power?: number; lvReq?: number; chop?: number;
  fishWait?: number; fishBonus?: number; fishItemChance?: number; use?: Record<string, any>; cd?: number; stack?: number;
  b?: Record<string, any>; price?: number; slot?: string; def?: number; slots?: number; instant?: number; fixed?: number; det?: string;
  act?: string; tile?: number; poison?: number; frost?: number; deco?: number; seal?: string; ruin?: string; boss?: string; mach?: string;
  obj?: string; gold?: number; pw?: number; hoe?: number; water?: number; scythe?: number; reap?: number; fert?: number; pierce?: number;
  r?: number; mine?: number; fuse?: number; look?: string; pet?: string;
}

/** ENEMIES 한 몹 — drops 는 [아이템, 최소, 최대, 확률]. */
interface EnemyDef {
  n: string; hp: number; dmg: number; def?: number; spd?: number; ai: string;
  w: number; h: number; c?: string; xp?: number; gold?: number;
  drops?: [string, number, number, number][];
  passive?: number; squish?: number; biome?: string; aggro?: number; lvScale?: number; range?: number; cw?: string; d?: string;
  proj?: string; tier?: number; ph?: number; boss?: number; minion?: string;
}

/** 유적(RUIN_SPEC · STORY_RUIN) — rooms 가 목표 방 수, bsp 가 [깊이, 최소 가로, 최소 세로]. */
interface RuinDef {
  id?: string; n: string; plan?: string; arch?: string; rooms?: number; bsp?: number[];
  decor?: (string | number)[][]; mobs?: string[]; rank?: number; sig?: string; event?: string;
  x?: number; y?: number; w?: number; h?: number; wall?: number; floor?: number; bg?: number; torch?: number; traps?: string[];
  boss?: string; tier?: number; trapRate?: number; spikeRate?: number; chestRate?: number; mobMul?: number; bonus?: string;
  bonus2?: string; maze?: number; entryKind?: string;
  /** 세계를 만들 때 그 세계의 복사본(`world.ruinSpec`)에 써 넣는다 — 표에는 없다. */
  mystic?: string;
}

interface AchDef { id: string; cat: string; i: string; n: string; d: string; check?: (g: any) => boolean; lv?: number; t?: string; h?: number; }
interface ChapterDef {
  id: number; title: string; sub?: string; art?: string; line?: string; intro?: string; basics?: any[]; needBasics?: number;
  require?: any[]; goal?: Record<string, any>; rw?: Record<string, any>; outro?: string; hook?: string;
}
interface RecipeDef { out: string; n: number; need: Record<string, number>; station?: string; lv?: number; }
interface MachineDef {
  n: string; tile?: number; item?: string; d?: string; rot?: number; reach?: number; slots?: number; feed?: number; fuelIn?: number;
  gen?: number; cap?: number; store?: number; proc?: string; power?: number; mine?: number; cycle?: number; range?: number;
  filter?: number; ammo?: string; dmg?: number; proj?: string; burn?: number; slow?: number; fast?: number; sky?: number; wetR?: any[];
  wetMax?: number;
}
interface SkillDef {
  n: string; i: string; br?: string; tier?: number; max?: number; type?: string; col?: number; mana?: number; cd?: number; d?: string;
  v?: (r: number) => any; b?: (r: number) => Record<string, any>; req?: any[];
}
interface BuffDef { n: string; i: string; dur?: number; b?: Record<string, number>; debuff?: number; }
interface NpcDef {
  n: string; i?: string; c?: string; role?: string; art?: string; shop?: string[]; disc?: number; pets?: boolean; line?: string;
  dynamicShop?: boolean; from?: number;
}
interface PetDef {
  n: string; i?: string; r?: number; c?: string; b?: Record<string, number>; atk?: Record<string, any>; d?: string; dragon?: string;
}

/** 아래층(world · entity · factory · ui)이 ctx.ts 로 쓰는 G 의 칸 — tests/baseline/ctx.json 계약과 같은 목록. 새로 쓰면 둘 다 더할 것. */
interface AppCtx {
  ENH_MAX: number; addCorpse: (...a: any[]) => any; aoe: (...a: any[]) => any; applySettings: (...a: any[]) => any;
  bandFx: (...a: any[]) => any; boltFx: (...a: any[]) => any; bossLine: (...a: any[]) => any; bounties: any[];
  bountyPay: (...a: any[]) => any; bountyProgress: (...a: any[]) => any; breakFx: (...a: any[]) => any; burst: (...a: any[]) => any;
  buy: (...a: any[]) => any; buyPrice: (...a: any[]) => any; buyStock: (...a: any[]) => any; chapter: number;
  chapterState: (...a: any[]) => any; objTask: (o: any) => string; checkAch: (...a: any[]) => any; claimBounty: (...a: any[]) => any; craft: (...a: any[]) => any;
  dayCount: number; dayT: number; deathBurst: (...a: any[]) => any; drops: any[]; edgeFx: (...a: any[]) => any;
  enhBreak: (...a: any[]) => any; enhCost: (...a: any[]) => any; enhFail: (...a: any[]) => any; enhMat: (...a: any[]) => any;
  enhanceSlot: (...a: any[]) => any; ents: any[]; exportSaves: (...a: any[]) => any; fallFx: (...a: any[]) => any;
  flashFx: (...a: any[]) => any; goldRate: number; hitFx: (...a: any[]) => any; hitStop: (...a: any[]) => any;
  importSaves: (...a: any[]) => any; keysFor: (...a: any[]) => any; killMult: (...a: any[]) => any; mapAtlas: any;
  marketRate: (...a: any[]) => any; merchantOf: (...a: any[]) => any; modeMul: (...a: any[]) => any; nearSt: any; nearStObj: any;
  objLabel: (...a: any[]) => any; onBossDown: (...a: any[]) => any; onDeath: (...a: any[]) => any; onKill: (...a: any[]) => any;
  onLevelUp: (...a: any[]) => any; onPickup: (...a: any[]) => any; onProfUp: (...a: any[]) => any; parts: any[]; pending: any[];
  player: any; price: (...a: any[]) => any; projs: any[]; reforgeCost: (...a: any[]) => any; reforgeSlot: (...a: any[]) => any;
  ringFx: (...a: any[]) => any; rng: any; rollBounties: (...a: any[]) => any; saveSettings: (...a: any[]) => any;
  scale: (...a: any[]) => any; sellItem: (...a: any[]) => any; setOpt: (...a: any[]) => any; setPause: (...a: any[]) => any;
  settings: any; sfx: (...a: any[]) => any; sfxAt: (...a: any[]) => any; shake: number; shopBundle: (...a: any[]) => any; sideActive: any;
  sideDone: any; sidePay: (...a: any[]) => any; sideProgress: (...a: any[]) => any; sigilFx: (...a: any[]) => any;
  skillDeny: (...a: any[]) => any; spritesOn: boolean; state: string; stockOf: (...a: any[]) => any; strokeRate: (...a: any[]) => any;
  surfacePx: (...a: any[]) => any; texts: any[]; time: number; toast: (...a: any[]) => any; triggerFault: (...a: any[]) => any;
  uiOpen: boolean; upgradeStation: (...a: any[]) => any; upgradeVillage: (...a: any[]) => any; useConsumable: (...a: any[]) => any;
  useSummon: (...a: any[]) => any; useUtil: (...a: any[]) => any; utilLeft: (...a: any[]) => any; vault: any[]; vaultGold: number;
  villageLv: (...a: any[]) => any; warnFx: (...a: any[]) => any; world: any; achievements: any; ruinSpec: (...a: any[]) => any; surveyScore: (...a: any[]) => any;
}
/** 아래층이 쓰는 UI 의 칸. */
interface UiCtx {
  refreshBag: (...a: any[]) => any; refreshEquip: (...a: any[]) => any;
}
/** 아래층이 쓰는 Factory 의 칸. */
interface FactoryCtx {
  canPlace: (...a: any[]) => any; place: (...a: any[]) => any;
}

/** 창구에 싣는 부팅 표식(테스트가 읽는다) · 옛 사파리 오디오. */
interface Window {
  __acBooting?: number; __acDeadline?: number; __acBooted?: number; SPRITE_MANIFEST?: any; webkitAudioContext?: typeof AudioContext;
}

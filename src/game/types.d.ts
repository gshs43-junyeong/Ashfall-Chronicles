/* 게임 공용 타입(전역) — 타입만, 번들에 안 들어간다.
   표 모양은 실제 표 값에서 뽑은 칸 전부를 적는다(열린 칸 [k: string]: any 없음 — 모르는 칸을 읽으면 타입 검사가 잡는다).
   표에 새 칸을 더하면 여기에도 적을 것. */

/** 타입을 다 입히기 전의 큰 객체(G · UI · Factory · 그림 표와 그 조각) — 아무 이름이나 읽고 쓸 수 있다. */
type Bag = Record<string, any>;

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
  /** 실행 중에 붙는 칸 — bx·by 는 setWorldSize 가 적는 소형 기준 좌표, mystic 은 세계를 만들 때마다 써 넣는다(전역 표를 고쳐 쓴다 — 엔진화 2차에서 World 로). */
  bx?: number; by?: number; mystic?: string;
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

/** 창구에 싣는 부팅 표식(테스트가 읽는다) · 옛 사파리 오디오. */
interface Window {
  __acBooting?: number; __acDeadline?: number; __acBooted?: number; SPRITE_MANIFEST?: any; webkitAudioContext?: typeof AudioContext;
}

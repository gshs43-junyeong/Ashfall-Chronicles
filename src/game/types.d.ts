/* 게임 공용 타입(전역) — 타입만, 번들에 안 들어간다.
   표 모양은 자주 읽는 칸만 적고 나머지는 [k: string]: any 로 연다 — 드물게 쓰는 칸이 표마다 달라서다. 차례로 좁힌다. */

/** 타입을 다 입히기 전의 큰 객체(G · UI · Factory · 그림 표와 그 조각) — 아무 이름이나 읽고 쓸 수 있다. */
type Bag = Record<string, any>;

/** TILE_DEF 한 칸 — 인덱스가 타일 번호(세이브가 번호 그대로 담는다). */
interface TileDef {
  n: string; c: string | null; solid: number; hard: number;
  drop?: string | null; light?: number; mach?: string; lc?: string;
  [k: string]: any;
}

/** ITEMS 한 항목 — type 으로 갈래를 가른다(weapon · armor · tool · block · …). */
interface ItemDef {
  n: string; i?: string; d?: string; type?: string; tier?: number;
  dmg?: number; spd?: number; kb?: number; reach?: number; wc?: string;
  [k: string]: any;
}

/** ENEMIES 한 몹 — drops 는 [아이템, 최소, 최대, 확률]. */
interface EnemyDef {
  n: string; hp: number; dmg: number; def?: number; spd?: number; ai: string;
  w: number; h: number; c?: string; xp?: number; gold?: number;
  drops?: [string, number, number, number][];
  [k: string]: any;
}

/** 유적(RUIN_SPEC · STORY_RUIN) — rooms 가 목표 방 수, bsp 가 [깊이, 최소 가로, 최소 세로]. */
interface RuinDef {
  id?: string; n: string; plan?: string; arch?: string; rooms?: number; bsp?: number[];
  decor?: (string | number)[][]; mobs?: string[]; rank?: number; sig?: string; event?: string;
  [k: string]: any;
}

interface AchDef { id: string; cat: string; i: string; n: string; d: string; check?: (g: any) => boolean; lv?: number; [k: string]: any; }
interface ChapterDef { id: number; title: string; sub?: string; art?: string; [k: string]: any; }
interface RecipeDef { out: string; n: number; need: Record<string, number>; station?: string; [k: string]: any; }
interface MachineDef { n: string; tile?: number; item?: string; d?: string; [k: string]: any; }
interface SkillDef { n: string; i: string; br?: string; tier?: number; max?: number; type?: string; [k: string]: any; }
interface BuffDef { n: string; i: string; dur?: number; b?: Record<string, number>; [k: string]: any; }
interface NpcDef { n: string; i?: string; c?: string; role?: string; art?: string; shop?: string[]; [k: string]: any; }
interface PetDef { n: string; i?: string; r?: number; c?: string; b?: Record<string, number>; [k: string]: any; }

/** 창구에 싣는 부팅 표식(테스트가 읽는다) · 옛 사파리 오디오. */
interface Window { __acBooting?: number; __acDeadline?: number; __acBooted?: number; SPRITE_MANIFEST?: any; webkitAudioContext?: typeof AudioContext; }

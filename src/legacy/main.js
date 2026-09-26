/* ===== main.js — 묶는 입구: 모듈을 읽는 순서 + 디버그 창구 ===== */
/* ★ 순서가 곧 읽히는 순서다 — 각 모듈은 앞 모듈만 import 하므로(tests/modules.mjs 가 막는다) 이 줄 순서대로 돈다. */
import * as e_math from '../engine/core/math.js';
import * as e_rng from '../engine/core/rng.js';
import * as e_noise from '../engine/core/noise.js';
import * as e_color from '../engine/core/color.js';
import * as e_rle from '../engine/save/rle.js';
import * as e_seal from '../engine/save/seal.js';
import * as e_upgrade from '../engine/save/upgrade.js';
import * as e_store from '../engine/save/store.js';
import * as e_aurl from '../engine/audio/url.js';
import * as e_music from '../engine/audio/music.js';
import * as e_sfx from '../engine/audio/sfx.js';
import * as e_amb from '../engine/audio/ambient.js';
import * as e_image from '../engine/assets/image.js';
import * as e_loop from '../engine/core/loop.js';
import * as e_view from '../engine/platform/viewport.js';
import * as e_actions from '../engine/input/actions.js';
import * as e_pointer from '../engine/input/pointer.js';
import * as e_touch from '../engine/input/touch.js';
import * as e_tilemap from '../engine/tilemap/tilemap.js';
import * as util from './util.js';
import * as size from './size.js';
import * as data from './data.js';
import * as world from './world.js';
import * as tileart from './tileart.js';
import * as itemart from './itemart.js';
import * as sprites from './sprites.js';
import * as titlebg from './titlebg.js';
import * as entity from './entity.js';
import * as factory from './factory.js';
import * as ui from './ui.js';
import * as music from './music.js';
import * as game from './game.js';

/* 디버그 창구 — 콘솔·?debug 도구·tests·tools/*.py 가 예전처럼 G · World · T · WW … 를 이름으로 읽는다.
   ★ 읽기 전용이고 살아 있는 값이다(WW 는 setWorldSize 뒤에 바뀐 값). 게임 코드는 이것을 읽지 말고 import 할 것.
   브라우저가 이미 가진 이름은 덮지 않는다. */
for (const m of [e_math, e_rng, e_noise, e_color, e_rle, e_seal, e_upgrade, e_store, e_aurl, e_music, e_sfx, e_amb, e_image, e_loop, e_view, e_actions, e_pointer, e_touch, e_tilemap, util, size, data, world, tileart, itemart, sprites, titlebg, entity, factory, ui, music, game]) {
  for (const k of Object.keys(m)) {
    if (k in window) continue;
    Object.defineProperty(window, k, { get: () => m[k], configurable: true });
  }
}

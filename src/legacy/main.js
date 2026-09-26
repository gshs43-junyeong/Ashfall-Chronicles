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
import * as e_light from '../engine/tilemap/light.js';
import * as e_pipeline from '../engine/render/pipeline.js';
import * as e_atlas from '../engine/render/atlas.js';
import * as e_conn from '../engine/render/conn.js';
import * as e_entity from '../engine/entity/entity.js';
import * as e_scenes from '../engine/scene/scenes.js';
import * as e_panels from '../engine/ui/panels.js';
import * as e_tooltip from '../engine/ui/tooltip.js';
import * as e_slots from '../engine/ui/slots.js';
import * as e_ko from '../engine/i18n/ko.js';
import * as e_format from '../engine/i18n/format.js';
import * as e_i18n from '../engine/i18n/i18n.js';
import * as e_mixin from '../engine/core/mixin.js';
import * as util from './util.js';
import * as lang from './lang.js';
import * as size from './size.js';
import * as data from './data.js';
import * as world from './world.js';
/* world.js World 의 메서드 조각 — 읽히는 순간 World.prototype 에 붙는다(클래스처럼 비열거) */
import * as w_plants from './world/plants.js';
import * as w_village from './world/village.js';
import * as w_sky from './world/sky.js';
import * as w_dungeon from './world/dungeon.js';
import * as w_traps from './world/traps.js';
import * as w_ruins from './world/ruins.js';
import * as w_ruin_site from './world/ruin-site.js';
import * as w_caves from './world/caves.js';
import * as w_sea from './world/sea.js';
import * as w_water from './world/water.js';
import * as tileart from './tileart.js';
/* tileart.js TileArt.paint 의 질감 갈래 — 읽히는 순간 TILE_PAINT 에 붙는다 */
import * as tp_ground from './art/tiles/ground.js';
import * as tp_misc from './art/tiles/misc.js';
import * as tp_factory from './art/tiles/factory.js';
import * as tp_water from './art/tiles/water.js';
import * as tp_village from './art/tiles/village.js';
import * as tp_ruins from './art/tiles/ruins.js';
import * as tp_cave from './art/tiles/cave.js';
import * as itemart from './itemart.js';
/* itemart.js Art.paint 의 그림 갈래 — 읽히는 순간 ITEM_PAINT 에 붙는다 */
import * as ip_glyphs from './art/items/glyphs.js';
import * as ip_gear from './art/items/gear.js';
import * as ip_goods from './art/items/goods.js';
import * as ip_farm from './art/items/farm.js';
import * as ip_loot from './art/items/loot.js';
import * as ip_skills from './art/items/skills.js';
import * as ip_ui from './art/items/ui.js';
import * as ip_misc from './art/items/misc.js';
import * as sprites from './sprites.js';
import * as titlebg from './titlebg.js';
import * as entity from './entity.js';
import * as factory from './factory.js';
import * as ui from './ui.js';
/* ui.js 의 UI 를 나눈 조각 */
import * as u_tree from './ui/tree.js';
import * as u_quest from './ui/quest.js';
import * as u_craft from './ui/craft.js';
import * as u_machine from './ui/machine.js';
import * as u_shop from './ui/shop.js';
import * as u_tip from './ui/tip.js';
import * as u_dialogue from './ui/dialogue.js';
import * as u_hud from './ui/hud.js';
import * as music from './music.js';
import * as game from './game.js';
/* game.js 의 G 를 영역별로 나눈 조각 — 읽히는 순간 G 에 붙는다(순서는 원래 소스 순서) */
import * as g_act from './game/act.js';
import * as g_fishing from './game/fishing.js';
import * as g_village from './game/village.js';
import * as g_altar from './game/altar.js';
import * as g_spawn from './game/spawn.js';
import * as g_progress from './game/progress.js';
import * as g_save from './game/save.js';
import * as g_sound from './game/sound.js';
import * as g_render from './game/render.js';
import * as g_render_far from './game/render-far.js';
import * as g_render_fx from './game/render-fx.js';
import * as g_ruin_pulse from './game/ruin-pulse.js';
import * as g_meteor from './game/meteor.js';
import * as g_ruin_map from './game/ruin-map.js';
import * as g_corpse from './game/corpse.js';

/* 원본 언어(ko)가 아니면 — 표(아이템 이름 따위)를 그 언어로 덮고 정적 HTML 글을 옮긴다.
   ★ 게임이 켜지기(DOMContentLoaded → G.init) 전, 표를 읽는 누구보다 먼저여야 한다. 표 경로의 뿌리 순서는
   tools/i18n.mjs extract 와 같아야 한다(같은 물건을 두 표가 나눠 가지면 먼저 만난 경로로 적힌다). */
if (!lang.I18N.isSource) {
  lang.I18N.applyTables(Object.assign({}, size, data, world, factory));
  lang.localizeDom(document.documentElement);
  document.documentElement.lang = lang.LANG;
}

/* 디버그 창구 — 콘솔·?debug 도구·tests·tools/*.py 가 예전처럼 G · World · T · WW … 를 이름으로 읽는다.
   ★ 읽기 전용이고 살아 있는 값이다(WW 는 setWorldSize 뒤에 바뀐 값). 게임 코드는 이것을 읽지 말고 import 할 것.
   브라우저가 이미 가진 이름은 덮지 않는다. */
for (const m of [e_math, e_rng, e_noise, e_color, e_rle, e_seal, e_upgrade, e_store, e_aurl, e_music, e_sfx, e_amb, e_image, e_loop, e_view, e_actions, e_pointer, e_touch, e_tilemap, e_light, e_pipeline, e_atlas, e_conn, e_entity, e_scenes, e_panels, e_tooltip, e_slots, e_ko, e_format, e_i18n, e_mixin, util, lang, size, data, world, w_plants, w_village, w_sky, w_dungeon, w_traps, w_ruins, w_ruin_site, w_caves, w_sea, w_water, tileart, tp_ground, tp_misc, tp_factory, tp_water, tp_village, tp_ruins, tp_cave, itemart, ip_glyphs, ip_gear, ip_goods, ip_farm, ip_loot, ip_skills, ip_ui, ip_misc, sprites, titlebg, entity, factory, ui, u_tree, u_quest, u_craft, u_machine, u_shop, u_tip, u_dialogue, u_hud, music, game, g_act, g_fishing, g_village, g_altar, g_spawn, g_progress, g_save, g_sound, g_render, g_render_far, g_render_fx, g_ruin_pulse, g_meteor, g_ruin_map, g_corpse]) {
  for (const k of Object.keys(m)) {
    if (k in window) continue;
    Object.defineProperty(window, k, { get: () => m[k], configurable: true });
  }
}

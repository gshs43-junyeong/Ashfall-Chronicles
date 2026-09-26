/* ===== sprites.js — 손그림 애셋 로더(매니페스트 · 발 여백) — 없어도 절차 생성 그림으로 돈다 ===== */
import { ASSET_VER, imageJob, measurePad } from '../engine/assets/image.js';
export const Sprites: Bag = {
  base: 'assets/',
  scale: 4,           // 시트가 4배로 구워져 있다
  gap: 0,             // 문자 시트는 간격 0, 보스/이펙트 시트는 4
  img: {}, meta: null, loaded: 0, total: 0,
  _ver: ASSET_VER,
  /** CSS·DOM 에서 그림을 부를 때도 같은 ?v= 를 붙인다 — 배포는 /play/assets/*.png 를 1년 immutable 로 캐시해서,
      ?v= 없는 주소는 시트를 다시 구워도 옛 그림이 나온다(옛 32칸 시트가 36칸 자리로 늘어나 뚱뚱해 보였다). */
  url(path) { return path + (this._ver ? '?' + this._ver : ''); },

  async ready() {
    /* 매니페스트는 <script> 로 미리 들어와 있다(assets/sprites-manifest.js) — 사연: docs/code-history.md#h137 */
    this.meta = (typeof window !== 'undefined' && window.SPRITE_MANIFEST) || null;
    if (!this.meta) {
      this.meta = await (await fetch(this.base + 'manifest.json', { cache: 'no-cache' })).json();
    }
    const jobs = [];
    const add = (key, file) => jobs.push(imageJob(this.base + file + (this._ver ? '?' + this._ver : ''), im => { this.img[key] = im; }));
    const C = this.meta.characters.sheets, B = this.meta.bosses.sheets;
    for (const k in C) add(k, C[k].file);
    for (const k in B) add(k, B[k].file);
    for (const k in this.meta.fx.projectiles.files) add('proj_' + k, this.meta.fx.projectiles.files[k]);
    for (const k in this.meta.fx.bursts.files) add('burst_' + k, this.meta.fx.bursts.files[k]);
    // 연기(용광로 굴뚝) — 투사체·폭발과 규격만 다른 세 번째 이펙트 무리
    if (this.meta.fx.smoke) for (const k in this.meta.fx.smoke.files) add('smoke_' + k, this.meta.fx.smoke.files[k]);
    for (const k in this.meta.npc.files) add('npc_' + k, this.meta.npc.files[k]);
    this.meta.backgrounds.parallax.files.forEach(f => add(f.split('/')[1].replace('.png',''), f));
    add('title', this.meta.backgrounds.title.file);
    this.meta.backgrounds.chapters.files.forEach(f => add(f.split('/')[1].replace('.png',''), f));
    // 구름 — 절이 있을 때만 읽는다(옛 매니페스트에는 없다)
    if (this.meta.backgrounds.clouds)
      this.meta.backgrounds.clouds.files.forEach(f => add(f.split('/')[1].replace('.png', ''), f));
    // 하늘의 해·운석(tools/mksky.py) — 없으면 게임이 절차 그림으로 떨어진다
    if (this.meta.backgrounds.sky)
      this.meta.backgrounds.sky.files.forEach(f => add(f.split('/')[1].replace('.png', ''), f));
    // 여명 마을 시설물 (한 장짜리 정지 이미지, 상태별 변형 파일이 있을 수 있다)
    if (this.meta.objects) for (const k in this.meta.objects.files) {
      const o = this.meta.objects.files[k];
      add('obj_' + k, o.file);
      if (o.off) add('obj_' + k + '_off', o.off);
      if (o.read) add('obj_' + k + '_read', o.read);
    }
    // 손그림 타일 텍스처 (22×22, 절차 생성 아틀라스를 대체)
    if (this.meta.tiles) for (const k in this.meta.tiles.files) add('tile_' + k, this.meta.tiles.files[k]);
    // 손그림 아이템 아이콘 (32×32, 절차 생성 아이콘 아틀라스를 대체)
    if (this.meta.items) for (const k in this.meta.items.files) add('item_' + k, this.meta.items.files[k]);
    await Promise.all(jobs);
    /* 프레임 0의 알파 채널을 실측해 진짜 여백을 한 번만 재고 캐시해 둔다. */
    /* ★ file:// 에서는 이 측정이 통째로 막힌다 — 사연: docs/code-history.md#h138 */
    this.footInset = {};
    this.sideInset = {};   // 시트별 그림의 가로 치우침(게임픽셀)
    for (const k in { ...this.meta.characters.sheets, ...this.meta.bosses.sheets }) {
      const m = this.meta.characters.sheets[k] || this.meta.bosses.sheets[k];
      const im = this.img[k];
      if (!im || !im.width) continue;
      try {
        const pad = this._measurePad(im, m);
        this.footInset[k] = pad.foot; this.sideInset[k] = pad.side;
      } catch (e) {
        /* ★ 못 잴 때는 0 이 아니라 **매니페스트에 적어 둔 값**을 쓴다. */
        this.footInset[k] = m.foot || 0; this.sideInset[k] = m.side || 0;
        this.tainted = 1;
      }
    }
    return this;
  },

  /** 시트 프레임 0의 알파 채널을 한 번 훑어 두 가지를 잰다(engine/assets/image.js). */
  _measurePad(im, m) { return measurePad(im, m.frameW, m.frameH, this.scale); },


  /* ================= 개조 시트 ================= */
  mechSheet(key) {
    const have = this.img['mech_' + key];
    if (have !== undefined) return have;
    const im = this.img[key];
    const m = this.meta && (this.meta.characters.sheets[key] || this.meta.bosses.sheets[key]);
    if (!im || !im.width || !m) return (this.img['mech_' + key] = null);

    const cv = document.createElement('canvas');
    cv.width = im.naturalWidth || im.width; cv.height = im.naturalHeight || im.height;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(im, 0, 0);

    const S = this.scale, W = cv.width, H = cv.height;
    g.globalCompositeOperation = 'source-atop';

    // 1.
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#7d8896');
    grad.addColorStop(0.5, '#4d555f');
    grad.addColorStop(1, '#333a43');
    g.globalAlpha = 0.66;
    g.fillStyle = grad; g.fillRect(0, 0, W, H);

    /* 2. */
    g.globalAlpha = 0.22; g.fillStyle = '#171c23';
    for (let y = 7 * S; y < H; y += 13 * S) g.fillRect(0, y, W, S);
    g.globalAlpha = 0.55; g.fillStyle = '#cfd8e2';
    for (let y = 5 * S; y < H; y += 13 * S)
      for (let x = 3 * S; x < W; x += 9 * S) g.fillRect(x, y, S, S);

    /* 화로 불빛은 여기서 굽지 않는다. */
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    /* 매니페스트에도 같은 규격으로 등록해 둔다 — draw() 는 여기서 프레임 칸을 읽는다. */
    this.meta.characters.sheets['mech_' + key] = m;
    this.footInset['mech_' + key] = this.footInset[key] || 0;
    this.sideInset['mech_' + key] = this.sideInset[key] || 0;
    return (this.img['mech_' + key] = cv);
  },

  /* 시트 한 프레임을 캔버스 좌표(x,y)에 게임 픽셀 크기로 그린다. */
  draw(c, key, frame, x, y, flip) {
    const im = this.img[key]; if (!im || !im.width) return false;
    const m = (this.meta.characters.sheets[key] || this.meta.bosses.sheets[key]);
    if (!m) return false;
    /* 시트가 제 gap을 들고 있으면 그것을 쓰고, 없을 때만 무리 기본값으로 떨어진다 — 사연: docs/code-history.md#h139 */
    const S = this.scale;
    const isBoss = !!this.meta.bosses.sheets[key];
    const gap = m.gap !== undefined ? m.gap : (isBoss ? this.meta.bosses.gap : 0);
    let fw = m.frameW, fh = m.frameH, ox = m.ox || 0, oy = m.oy || 0;
    /* 시트를 다시 구워 프레임 크기가 바뀌었는데 브라우저가 옛 그림을 캐시에서 내주면 (매니페스트는 no-cache라 새것, 그림은 ?v= 그대로라 옛것) 칸이 어긋나 그림이 썰려 보인다. */
    if (!gap && im.naturalWidth && m.count &&
        Math.round(im.naturalWidth / S / m.count) !== fw) {
      fw = Math.round(im.naturalWidth / S / m.count);
      fh = Math.round(im.naturalHeight / S);
      ox = oy = 0;
    }
    const sw = fw * S, sh = fh * S;
    const sx = frame * (sw + gap);
    c.save();
    c.imageSmoothingEnabled = false;
    if (flip) { c.translate(Math.round(x) + ox + fw, Math.round(y) + oy); c.scale(-1, 1); }
    else c.translate(Math.round(x) + ox, Math.round(y) + oy);
    c.drawImage(im, sx, 0, sw, sh, 0, 0, fw, fh);
    c.restore();
    return true;
  },

  /* 이펙트 시트(투사체 16×16 / 폭발 64×64) 한 프레임을 size 크기로 그린다. */
  drawFx(c, key, frame, x, y, size) {
    const im = this.img[key]; if (!im || !im.width || !this.meta) return false;
    const m = key.startsWith('proj_') ? this.meta.fx.projectiles
            : key.startsWith('smoke_') ? this.meta.fx.smoke
            : this.meta.fx.bursts;
    if (!m) return false;
    if (frame < 0 || frame >= m.count) return false;
    const S = m.scale, sw = m.frameW * S, sh = m.frameH * S;
    const sx = frame * (sw + m.gap);
    const prev = c.imageSmoothingEnabled;
    c.imageSmoothingEnabled = false;
    c.drawImage(im, sx, 0, sw, sh, x, y, size, size);
    c.imageSmoothingEnabled = prev;
    return true;
  },

  /* 시설물을 게임 좌표(x,y)에 w×h 크기로 그린다. */
  drawObj(c, key, x, y, w, h) {
    const im = this.img[key]; if (!im || !im.width) return false;
    const want = w / h;
    const frames = Math.abs(im.width / im.height - want) < 0.03 ? 1
      : Math.abs(im.width / 2 / im.height - want) < 0.03 ? 2 : 1;
    const fw = im.width / frames;
    const t = 0;                     // 두 장짜리도 첫 장만 — 사연: docs/code-history.md#h140
    const fr = frames > 1 ? (((t * 3.5) | 0) % frames) : 0;
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(im, fr * fw, 0, fw, im.height, Math.round(x), Math.round(y), w, h);
    c.restore();
    return true;
  },

  /* 적 상태 → 프레임 인덱스 (기본 7프레임 규격: idle1 idle2 move1 move2 atk death1 death2) */
  enemyFrame(e, t) {
    if (e.dying) return e.dying > .12 ? 5 : 6;
    if (e.attacking) return 4;
    if (Math.abs(e.vx) > 6) return 2 + (Math.floor(t * 7) % 2);
    return Math.floor(t * 2.4) % 2;
  },

  /* 플레이어 상태 → 프레임 인덱스 (13프레임) */
  playerFrame(p, t) {
    if (p.iframe > 0 && p.hurtT > 0) return 12;
    if (p.dashT > 0) return 8;
    if (p.swing > 0) return 9 + Math.min(2, Math.floor((0.24 - p.swing) / 0.08));
    if (!p.onGround) return p.vy < 0 ? 6 : 7;
    if (Math.abs(p.vx) > 20) return 2 + (Math.floor(t * 9) % 4);
    return Math.floor(t * 2) % 2;
  }
};

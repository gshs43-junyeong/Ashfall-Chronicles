/* assets/sprites.js — 손그림 애셋 로더 (선택 사용)
   index.html의 js/itemart.js 뒤에 <script src="assets/sprites.js"></script> 로 추가.
   Sprites.ready() 이후 Sprites.draw(...)를 game.js의 drawPlayer/drawEnemy에서 호출하면 된다. */
const Sprites = {
  base: 'assets/',
  scale: 4,           // 시트가 4배로 구워져 있다
  gap: 0,             // 문자 시트는 간격 0, 보스/이펙트 시트는 4
  img: {}, meta: null, loaded: 0, total: 0,
  // index.html의 <script src=".../sprites.js?v=NNN">에서 버전을 그대로 물려받는다.
  // 같은 파일명으로 그림을 교체했을 때 브라우저가 옛 캐시 바이트를 계속 내려주는 걸 막기 위함.
  _ver: (document.currentScript && document.currentScript.src.split('?')[1]) || '',

  async ready() {
    /* 매니페스트는 <script> 로 미리 들어와 있다(assets/sprites-manifest.js).
       예전에는 여기서 manifest.json 을 fetch 했는데, 크롬은 file:// 에서 fetch 를
       막는다 — zip 을 풀어 index.html 을 더블클릭하면 그림이 하나도 안 붙었고,
       그걸 우회하려고 런처가 파이썬 서버를 띄우고 있었다. 게임을 하려고 파이썬을
       깔게 만드는 셈이었다. 이 한 줄이 그 서버의 유일한 이유였다.
       fetch 는 <script> 가 없을 때를 위한 뒷문으로만 남긴다. */
    this.meta = (typeof window !== 'undefined' && window.SPRITE_MANIFEST) || null;
    if (!this.meta) {
      this.meta = await (await fetch(this.base + 'manifest.json', { cache: 'no-cache' })).json();
    }
    const jobs = [];
    const add = (key, file) => jobs.push(new Promise(res => {
      const im = new Image(); im.onload = im.onerror = () => res();
      im.src = this.base + file + (this._ver ? '?' + this._ver : ''); this.img[key] = im;
    }));
    const C = this.meta.characters.sheets, B = this.meta.bosses.sheets;
    for (const k in C) add(k, C[k].file);
    for (const k in B) add(k, B[k].file);
    for (const k in this.meta.fx.projectiles.files) add('proj_' + k, this.meta.fx.projectiles.files[k]);
    for (const k in this.meta.fx.bursts.files) add('burst_' + k, this.meta.fx.bursts.files[k]);
    for (const k in this.meta.npc.files) add('npc_' + k, this.meta.npc.files[k]);
    this.meta.backgrounds.parallax.files.forEach(f => add(f.split('/')[1].replace('.png',''), f));
    add('title', this.meta.backgrounds.title.file);
    this.meta.backgrounds.chapters.files.forEach(f => add(f.split('/')[1].replace('.png',''), f));
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
    /* 발 밀착 보정 — "프레임 맨 아래 줄 = 그림 발끝"이라고 가정하고 dy를 계산했더니,
       실제로는 시트마다 그림 아래에 몇 px씩 투명 여백이 남아 있어(들토끼류 실측 2.25px)
       판정 박스가 작은 몹일수록 그 여백이 상대적으로 크게 보여 "공중에 뜬" 것처럼
       보였다. 프레임 0의 알파 채널을 실측해 진짜 여백을 한 번만 재고 캐시해 둔다. */
    /* ★ file:// 에서는 이 측정이 통째로 막힌다. 디스크에서 온 그림을 캔버스에 그리면
       캔버스가 "오염"되어 getImageData 가 SecurityError 를 던지기 때문이다. 예전에는
       그 앞의 fetch 에서 이미 죽어서 여기까지 오지도 않았는데, fetch 를 없애고 나니
       이 줄이 새 걸림돌이 되었다 — 그림은 다 붙었는데 ready() 가 거부되어
       spritesOn 이 켜지지 않았다(그림이 있는데도 절차 생성으로 그렸다).
       여백 보정은 발끝이 몇 px 뜨느냐는 곁다리라, 못 재면 0으로 두고 넘어간다. */
    this.footInset = {};
    for (const k in { ...this.meta.characters.sheets, ...this.meta.bosses.sheets }) {
      const m = this.meta.characters.sheets[k] || this.meta.bosses.sheets[k];
      const im = this.img[k];
      if (!im || !im.width) continue;
      try { this.footInset[k] = this._measureFootPad(im, m); }
      catch (e) { this.footInset[k] = 0; this.tainted = 1; }
    }
    return this;
  },

  /** 시트 프레임 0의 알파 채널을 스캔해, 그림 맨 아래 불투명 줄이 프레임 바닥에서
      몇 게임픽셀 위에 있는지(여백)를 잰다. */
  _measureFootPad(im, m) {
    const S = this.scale, fw = m.frameW * S, fh = m.frameH * S;
    const cv = document.createElement('canvas'); cv.width = fw; cv.height = fh;
    const ctx = cv.getContext('2d');
    ctx.drawImage(im, 0, 0, fw, fh, 0, 0, fw, fh);
    const data = ctx.getImageData(0, 0, fw, fh).data;
    for (let y = fh - 1; y >= 0; y--) {
      for (let x = 0; x < fw; x++) {
        if (data[(y * fw + x) * 4 + 3] > 10) return m.frameH - (y / S) - 1;
      }
    }
    return 0;
  },

  /* 시트 한 프레임을 캔버스 좌표(x,y)에 게임 픽셀 크기로 그린다.
     flip=true면 좌우 반전(왼쪽을 볼 때). */
  draw(c, key, frame, x, y, flip) {
    const im = this.img[key]; if (!im || !im.width) return false;
    const m = (this.meta.characters.sheets[key] || this.meta.bosses.sheets[key]);
    if (!m) return false;
    /* 프레임 간격은 시트마다 다르다 — 보스 20장 중 11장은 간격 없이 구워져 있는데
       예전에는 bosses.gap(4)을 전부에 적용해서, 그 열한 마리는 프레임 하나 넘어갈 때마다
       1게임픽셀씩 오른쪽으로 밀려 옆 프레임을 물고 잘렸다(마지막 프레임은 5px이 날아갔다).
       시트가 제 gap을 들고 있으면 그것을 쓰고, 없을 때만 무리 기본값으로 떨어진다. */
    const S = this.scale;
    const isBoss = !!this.meta.bosses.sheets[key];
    const gap = m.gap !== undefined ? m.gap : (isBoss ? this.meta.bosses.gap : 0);
    let fw = m.frameW, fh = m.frameH, ox = m.ox || 0, oy = m.oy || 0;
    /* 시트를 다시 구워 프레임 크기가 바뀌었는데 브라우저가 옛 그림을 캐시에서 내주면
       (매니페스트는 no-cache라 새것, 그림은 ?v= 그대로라 옛것) 칸이 어긋나 그림이
       썰려 보인다. 실제 그림 크기가 매니페스트와 다르면 그림 쪽을 믿는다 — 옛 그림은
       여백이 없으니 ox/oy 도 0으로 되돌린다. (간격 없는 시트에만 쓸 수 있다) */
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

  /* 이펙트 시트(투사체 16×16 / 폭발 64×64) 한 프레임을 size 크기로 그린다.
     현재 변환(회전 등)이 걸린 상태에서 호출해도 되도록 x,y는 그대로 쓴다. */
  drawFx(c, key, frame, x, y, size) {
    const im = this.img[key]; if (!im || !im.width || !this.meta) return false;
    const isProj = key.startsWith('proj_');
    const m = isProj ? this.meta.fx.projectiles : this.meta.fx.bursts;
    if (frame < 0 || frame >= m.count) return false;
    const S = m.scale, sw = m.frameW * S, sh = m.frameH * S;
    const sx = frame * (sw + m.gap);
    const prev = c.imageSmoothingEnabled;
    c.imageSmoothingEnabled = false;
    c.drawImage(im, sx, 0, sw, sh, x, y, size, size);
    c.imageSmoothingEnabled = prev;
    return true;
  },

  /* 시설물(한 장짜리 정지 이미지)을 게임 좌표(x,y)에 w×h 크기로 그린다. */
  drawObj(c, key, x, y, w, h) {
    const im = this.img[key]; if (!im || !im.width) return false;
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(im, Math.round(x), Math.round(y), w, h);
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
window.Sprites = Sprites;

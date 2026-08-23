/* pixlib — tiny pixel-art buffer used to bake Ashfall assets.
   Loaded inside run_script via: eval(await readFile('uploads/file.1/assets/_gen/pixlib.js')) */
(function (root) {
  const P = {
    ash: '#5d5d63', ashD: '#3a3a40', ashL: '#8a8a92',
    dirt: '#6b4a2f', gold: '#d8a94b', goldD: '#8a6a24', goldL: '#f2d98a',
    rot: '#6a4a92', rotD: '#3d2a54', rotL: '#a878e0',
    hell: '#e0561c', hellD: '#8c2f0c', hellL: '#ffb054',
    frost: '#9fe0ff', frostD: '#3f6f92', frostL: '#e8fbff',
    myth: '#5fd0c0',
    ink: '#14141b', ink2: '#0b0b10',
    bone: '#ded6bd', boneD: '#8d846c',
    skin: '#e0b184', skinD: '#a97a52',
    cloth: '#4a6fa8', clothD: '#2c4570',
    leaf: '#4a6b3a', blood: '#a03038',
  };
  const hex = c => {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const lighten = (c, t) => mix(c, '#ffffff', t);
  const darken = (c, t) => mix(c, '#000000', t);

  let _s = 1234567;
  const srand = s => { _s = s >>> 0 || 1; };
  const rnd = () => { _s ^= _s << 13; _s >>>= 0; _s ^= _s >> 17; _s ^= _s << 5; _s >>>= 0; return _s / 4294967296; };
  const rr = (a, b) => a + rnd() * (b - a);
  const ri = (a, b) => Math.floor(rr(a, b + 1));

  class Grid {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
    idx(x, y) { return y * this.w + x; }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    get(x, y) { return this.inb(x, y) ? this.d[this.idx(x, y)] : null; }
    px(x, y, c) { if (c && this.inb(x | 0, y | 0)) this.d[this.idx(x | 0, y | 0)] = c; return this; }
    clear(x, y) { if (this.inb(x, y)) this.d[this.idx(x, y)] = null; return this; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); return this; }
    rectOut(x, y, w, h, c) { for (let i = 0; i < w; i++) { this.px(x + i, y, c); this.px(x + i, y + h - 1, c); } for (let j = 0; j < h; j++) { this.px(x, y + j, c); this.px(x + w - 1, y + j, c); } return this; }
    ell(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const dx = (x + .5 - cx) / (rx + .001), dy = (y + .5 - cy) / (ry + .001);
          if (dx * dx + dy * dy <= 1) this.px(x, y, c);
        }
      return this;
    }
    ellIf(cx, cy, rx, ry, c, pred) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const dx = (x + .5 - cx) / (rx + .001), dy = (y + .5 - cy) / (ry + .001);
          if (dx * dx + dy * dy <= 1 && pred(x, y, this.get(x, y))) this.px(x, y, c);
        }
      return this;
    }
    line(x0, y0, x1, y1, c, thick) {
      x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; thick = thick || 1;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        if (thick === 1) this.px(x0, y0, c);
        else this.ell(x0 + .5, y0 + .5, thick / 2, thick / 2, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }
    poly(pts, c) {
      let miny = 1e9, maxy = -1e9;
      pts.forEach(p => { miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
      for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++) {
        const xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= y + .5 && b[1] > y + .5) || (b[1] <= y + .5 && a[1] > y + .5))
            xs.push(a[0] + (y + .5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2)
          for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.px(x, y, c);
      }
      return this;
    }
    /* ascii map: rows of chars, key = {ch: color} ; ' ' and '.' = transparent */
    ascii(x, y, rows, key) {
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          if (ch === ' ' || ch === '.') continue;
          const c = key[ch];
          if (c) this.px(x + i, y + j, c);
        }
      });
      return this;
    }
    map(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = this.d[this.idx(x, y)]; const n = fn(c, x, y); if (n !== undefined) this.d[this.idx(x, y)] = n; } return this; }
    replace(from, to) { return this.map(c => (c === from ? to : undefined)); }
    /* speckle noise inside existing pixels */
    speckle(c, prob, pred) { return this.map((cur, x, y) => { if (cur && rnd() < prob && (!pred || pred(x, y, cur))) return typeof c === 'function' ? c(cur) : c; }); }
    mirrorX(fromLeft) {
      const half = Math.floor(this.w / 2);
      for (let y = 0; y < this.h; y++) for (let i = 0; i < half; i++) {
        if (fromLeft !== false) this.d[this.idx(this.w - 1 - i, y)] = this.d[this.idx(i, y)];
        else this.d[this.idx(i, y)] = this.d[this.idx(this.w - 1 - i, y)];
      }
      return this;
    }
    /* top-lit volume: lighten pixels with empty above, darken those with empty below */
    volume(lt, dk) {
      lt = lt == null ? .16 : lt; dk = dk == null ? .22 : dk;
      const src = this.d.slice();
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const c = src[this.idx(x, y)]; if (!c) continue;
        const up = y > 0 && src[this.idx(x, y - 1)];
        const dn = y < this.h - 1 && src[this.idx(x, y + 1)];
        if (!up && lt) this.d[this.idx(x, y)] = lighten(c, lt);
        else if (!dn && dk) this.d[this.idx(x, y)] = darken(c, dk);
      }
      return this;
    }
    /* 1px dark outline outside the silhouette */
    outline(c, diag) {
      c = c || '#0d0d13';
      const src = this.d.slice();
      const at = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? null : src[this.idx(x, y)]);
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (at(x, y)) continue;
        let n = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1);
        if (!n && diag) n = at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1);
        if (n) this.d[this.idx(x, y)] = c;
      }
      return this;
    }
    shift(dx, dy) { const g = new Grid(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.px(x + dx, y + dy, this.get(x, y)); return g; }
    clone() { const g = new Grid(this.w, this.h); g.d = this.d.slice(); return g; }
    blit(src, x, y) { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const c = src.get(i, j); if (c) this.px(x + i, y + j, c); } return this; }
    /* squash/stretch resample (nearest) into a new grid of same canvas size, anchored bottom-center */
    squash(sx, sy) {
      const g = new Grid(this.w, this.h);
      const cx = this.w / 2, by = this.h;
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const u = (x + .5 - cx) / sx + cx, v = (y + .5 - by) / sy + by;
        const c = this.get(Math.floor(u), Math.floor(v));
        if (c) g.px(x, y, c);
      }
      return g;
    }
  }

  /* draw grids into a canvas. cells: array of grids (same w/h) laid out horizontally */
  function bake(grids, scale, gap) {
    scale = scale || 4; gap = gap || 0;
    const w = grids[0].w, h = grids[0].h;
    const mk = root.PX && root.PX.mk ? root.PX.mk : root.createCanvas;
    const cv = mk((w * scale + gap) * grids.length - gap, h * scale);
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    grids.forEach((gr, n) => {
      const ox = n * (w * scale + gap);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = gr.get(x, y); if (!c) continue;
        g.fillStyle = c; g.fillRect(ox + x * scale, y * scale, scale, scale);
      }
    });
    return cv;
  }

  root.PX = { mk: null, P, Grid, bake, mix, lighten, darken, hex, toHex, srand, rnd, rr, ri };
})(typeof globalThis !== 'undefined' ? globalThis : window);

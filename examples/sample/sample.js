'use strict';
/* 엔진 예제 — 자동 생성물(tools/bundle.mjs). 원본은 examples/sample/src/ · src/engine/ */
"use strict";
(() => {
  // src/engine/core/math.ts
  var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  var lerp = (a, b, t) => a + (b - a) * t;
  var inv = (a, b, v) => (v - a) / (b - a || 1);
  var TAU = Math.PI * 2;
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function dist2(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    return dx * dx + dy * dy;
  }
  function dist(ax, ay, bx, by) {
    return Math.sqrt(dist2(ax, ay, bx, by));
  }
  function angleTo(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  }

  // src/engine/core/loop.ts
  function startLoop(frame, maxDt) {
    let last = 0;
    const tick = (t) => {
      requestAnimationFrame(tick);
      const now = t / 1e3;
      const rawDt = now - (last || now);
      last = now;
      frame(Math.min(maxDt, rawDt), rawDt);
    };
    requestAnimationFrame(tick);
  }

  // src/engine/entity/entity.ts
  var Entity = class {
    // 마지막 가로 이동이 벽에 막혔나(계단을 올랐으면 그대로 둔다)
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.vx = 0;
      this.vy = 0;
      this.dead = false;
      this.onGround = false;
    }
    get cx() {
      return this.x + this.w / 2;
    }
    get cy() {
      return this.y + this.h / 2;
    }
    rect() {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
    /** 가로로 nx 까지. 막히면 바닥에 선 채로 step 픽셀 올라 retry 로 다시 가 보고(step 0 이면 안 오름),
        그래도 막히면 한 픽셀씩 붙고 멈춘다. ★ 올라선 뒤 막혀도 올라선 높이는 그대로다. */
    moveX(map2, nx, step, retry) {
      if (map2.hitSolid(nx, this.y, this.w, this.h)) {
        let stepped = false;
        if (this.onGround && step > 0 && !map2.hitSolid(nx, this.y - step, this.w, this.h)) {
          this.y -= step;
          nx = retry;
          stepped = true;
        }
        if (!stepped || map2.hitSolid(nx, this.y, this.w, this.h)) {
          const dir = Math.sign(this.vx);
          while (!map2.hitSolid(this.x + dir, this.y, this.w, this.h) && Math.abs(this.x - nx) > 1) this.x += dir;
          this.vx = 0;
          nx = this.x;
          this.hitWall = true;
        }
      } else this.hitWall = false;
      this.x = nx;
    }
    /** 중력 — 위로는 up, 아래로는 cap 까지 */
    fall(dt, grav, up, cap) {
      this.vy = clamp(this.vy + grav * dt, up, cap);
    }
    /** 세로로 ny 까지. 막히면 한 픽셀씩 붙고(내려가다 막히면 땅), 아니면 내려갈 때 발판(platforms)에 선다. */
    moveY(map2, ny, prevBottom, platforms) {
      this.onGround = false;
      if (map2.hitSolid(this.x, ny, this.w, this.h)) {
        const dir = Math.sign(this.vy);
        while (!map2.hitSolid(this.x, this.y + dir, this.w, this.h) && Math.abs(this.y - ny) > 1) this.y += dir;
        if (this.vy > 0) this.onGround = true;
        this.vy = 0;
        ny = this.y;
      } else if (this.vy >= 0 && platforms) {
        const top = map2.hitPlatform(this.x, ny, this.w, this.h, prevBottom);
        if (top >= 0) {
          ny = top - this.h;
          this.vy = 0;
          this.onGround = true;
        }
      }
      this.y = ny;
    }
    /** 세계 안에 가둔다 — x 는 [x0, x1 - w], 바닥 yMax 아래로 빠지면 거기 멈춘다 */
    keepIn(x0, x1, yMax) {
      this.x = clamp(this.x, x0, x1 - this.w);
      if (this.y > yMax) {
        this.y = yMax;
        this.vy = 0;
      }
    }
  };

  // src/engine/input/actions.ts
  function createInput({ actions, custom }) {
    const keys = {};
    const virt = {};
    const input2 = {
      keys,
      virt,
      /** 이 액션에 걸린 키 목록. */
      keysFor(id) {
        const c = custom(), mine = c && c[id];
        if (mine && mine.length) return mine;
        const a = actions.find((k) => k.id === id);
        return a ? a.def : [];
      },
      /** 지금 눌려 있는가(키 또는 가상 입력) */
      held(id) {
        return !!virt[id] || input2.keysFor(id).some((c) => keys[c]);
      },
      /** 방금 눌린 code 가 이 액션인가 */
      isKey(id, code) {
        return input2.keysFor(id).indexOf(code) >= 0;
      },
      /** 창에 키보드를 건다. */
      bindKeyboard(hooks) {
        addEventListener("keydown", (e) => {
          if (e.repeat) {
            keys[e.code] = 1;
            return;
          }
          if (hooks.capture && hooks.capture(e)) {
            e.preventDefault();
            return;
          }
          keys[e.code] = 1;
          if (hooks.down) hooks.down(e);
        });
        addEventListener("keyup", (e) => {
          keys[e.code] = 0;
        });
        addEventListener("blur", () => {
          for (const k in keys) keys[k] = 0;
          if (hooks.blur) hooks.blur();
        });
      }
    };
    return input2;
  }

  // src/engine/input/pointer.ts
  function bindPointer(cv2, st, hooks) {
    cv2.addEventListener("mousedown", (e) => {
      e.preventDefault();
      if (e.button === 0) st.m1 = 1;
      if (e.button === 2) st.m2 = 1;
      if (e.button === 2 && hooks.rightDown) hooks.rightDown();
    });
    addEventListener("mouseup", (e) => {
      if (e.button === 0) st.m1 = 0;
      if (e.button === 2) st.m2 = 0;
    });
    addEventListener("mousemove", (e) => {
      st.mx = e.clientX;
      st.my = e.clientY;
    });
    cv2.addEventListener("contextmenu", (e) => e.preventDefault());
    cv2.addEventListener("wheel", (e) => {
      if (hooks.wheel) hooks.wheel(e);
    }, { passive: true });
  }

  // src/engine/input/touch.ts
  var STICK_R = 56;
  var DEAD = 18;
  var CSS = `
#touchpad{--ti-bottom:24px;position:fixed;inset:0;pointer-events:none;z-index:40;user-select:none;-webkit-user-select:none}
#touchpad .ti-stick{position:absolute;left:calc(24px + env(safe-area-inset-left,0px));bottom:calc(24px + env(safe-area-inset-bottom,0px));width:${STICK_R * 2 + 40}px;height:${STICK_R * 2 + 40}px;pointer-events:auto;touch-action:none}
#touchpad .ti-base{position:absolute;inset:20px;border-radius:50%;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.25)}
#touchpad .ti-knob{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:rgba(255,255,255,.35)}
#touchpad .ti-btns{position:absolute;right:calc(24px + env(safe-area-inset-right,0px));bottom:var(--ti-bottom);display:flex;gap:14px;pointer-events:auto}
#touchpad .ti-btn{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;white-space:nowrap;overflow:hidden;font:600 15px system-ui,sans-serif;color:#fff;
  background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.3);touch-action:none}
#touchpad .ti-btn.on,#touchpad .ti-alt.on{background:rgba(255,255,255,.35)}
#touchpad .ti-alt{position:absolute;right:calc(24px + env(safe-area-inset-right,0px));bottom:calc(var(--ti-bottom) + 84px);width:64px;height:40px;border-radius:12px;display:grid;place-items:center;white-space:nowrap;overflow:hidden;
  font:600 13px system-ui,sans-serif;color:#fff;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.3);pointer-events:auto;touch-action:none}
@media (max-height:540px){
  #touchpad .ti-stick{left:calc(16px + env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:scale(.8);transform-origin:left bottom}
  #touchpad .ti-btns{right:calc(16px + env(safe-area-inset-right,0px));gap:10px}
  #touchpad .ti-btn{width:52px;height:52px;font-size:13px}
  #touchpad .ti-alt{right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(var(--ti-bottom) + 66px);width:56px;height:34px;font-size:12px}
}
`;
  function mountTouch({ input: input2, ptr: ptr2, surface, buttons, altLabel, rightDown }) {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    const el = document.createElement("div");
    el.id = "touchpad";
    el.innerHTML = '<div class="ti-stick"><div class="ti-base"></div><div class="ti-knob"></div></div><div class="ti-btns"></div><div class="ti-alt"></div>';
    document.body.appendChild(el);
    const stick = el.querySelector(".ti-stick"), knob = el.querySelector(".ti-knob");
    const V = input2.virt;
    const off = [];
    const on = (t, type, fn) => {
      t.addEventListener(type, fn);
      off.push(() => t.removeEventListener(type, fn));
    };
    let sid = -1, cx = 0, cy = 0;
    const setStick = (dx, dy) => {
      const d = Math.hypot(dx, dy), k = d > STICK_R ? STICK_R / d : 1;
      knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
      V.left = dx < -DEAD ? 1 : 0;
      V.right = dx > DEAD ? 1 : 0;
      V.down = dy > DEAD * 1.6 ? 1 : 0;
    };
    on(stick, "pointerdown", (e) => {
      e.preventDefault();
      sid = e.pointerId;
      stick.setPointerCapture(sid);
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      setStick(e.clientX - cx, e.clientY - cy);
    });
    on(stick, "pointermove", (e) => {
      if (e.pointerId === sid) setStick(e.clientX - cx, e.clientY - cy);
    });
    const stickUp = (e) => {
      if (e.pointerId !== sid) return;
      sid = -1;
      setStick(0, 0);
    };
    on(stick, "pointerup", stickUp);
    on(stick, "pointercancel", stickUp);
    const box = el.querySelector(".ti-btns");
    for (const b of buttons) {
      const btn = document.createElement("div");
      btn.className = "ti-btn";
      btn.dataset.id = b.id;
      btn.textContent = b.label;
      box.appendChild(btn);
      on(btn, "pointerdown", (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        V[b.id] = 1;
        btn.classList.add("on");
      });
      const up = () => {
        V[b.id] = 0;
        btn.classList.remove("on");
      };
      on(btn, "pointerup", up);
      on(btn, "pointercancel", up);
    }
    const alt = el.querySelector(".ti-alt");
    alt.textContent = altLabel;
    let altOn = false;
    on(alt, "pointerdown", (e) => {
      e.preventDefault();
      altOn = !altOn;
      alt.classList.toggle("on", altOn);
    });
    const labels = [...box.querySelectorAll(".ti-btn"), alt];
    const fit = () => {
      for (const l of labels) {
        l.style.fontSize = "";
        let px = parseFloat(getComputedStyle(l).fontSize);
        while (px > 9 && l.scrollWidth > l.clientWidth - 6) {
          px -= 1;
          l.style.fontSize = px + "px";
        }
      }
    };
    fit();
    requestAnimationFrame(fit);
    const onResize = () => fit();
    addEventListener("resize", onResize);
    off.push(() => removeEventListener("resize", onResize));
    let tid = -1;
    on(surface, "pointerdown", (e) => {
      if (e.pointerType === "mouse" || tid >= 0) return;
      e.preventDefault();
      tid = e.pointerId;
      ptr2.mx = e.clientX;
      ptr2.my = e.clientY;
      if (altOn) {
        ptr2.m2 = 1;
        if (rightDown) rightDown();
      } else ptr2.m1 = 1;
    });
    on(surface, "pointermove", (e) => {
      if (e.pointerId === tid) {
        ptr2.mx = e.clientX;
        ptr2.my = e.clientY;
      }
    });
    const tapUp = (e) => {
      if (e.pointerId !== tid) return;
      tid = -1;
      ptr2.m1 = 0;
      ptr2.m2 = 0;
    };
    on(surface, "pointerup", tapUp);
    on(surface, "pointercancel", tapUp);
    surface.style.touchAction = "none";
    return {
      el,
      destroy() {
        off.forEach((f) => f());
        el.remove();
        st.remove();
        for (const b of buttons) V[b.id] = 0;
        V.left = V.right = V.down = 0;
      }
    };
  }

  // src/engine/platform/viewport.ts
  function fitCanvas(cv2, ctx2, zoom2, dprMax = 2) {
    const dpr = Math.min(dprMax, devicePixelRatio || 1);
    cv2.width = innerWidth * dpr;
    cv2.height = innerHeight * dpr;
    const W = innerWidth / zoom2, H = innerHeight / zoom2;
    ctx2.setTransform(dpr * zoom2, 0, 0, dpr * zoom2, 0, 0);
    ctx2.imageSmoothingEnabled = false;
    return { W, H };
  }

  // src/engine/render/pipeline.ts
  function createPipeline(names) {
    const stages = names.map((name) => ({ name, fns: [], ms: 0 }));
    let profile = false;
    return {
      /** 그 단계 끝에 그리기 함수를 하나 건다 — 없는 단계 이름이면 바로 알린다(조용히 안 그려지는 것을 막는다). */
      add(name, fn) {
        const s = stages.find((x) => x.name === name);
        if (!s) throw new Error("렌더 단계가 없다: " + name);
        s.fns.push(fn);
      },
      /** 한 프레임 — 단계 순서대로 전부 */
      run(frame) {
        if (!profile) {
          for (const s of stages) for (const fn of s.fns) fn(frame);
          return;
        }
        for (const s of stages) {
          const t = performance.now();
          for (const fn of s.fns) fn(frame);
          s.ms += (performance.now() - t - s.ms) * 0.05;
        }
      },
      /** 단계별 시간 재기 — 켜 둔 동안만 잰다(평소에는 시계를 부르지 않는다) */
      profile(on) {
        profile = on;
        if (!on) for (const s of stages) s.ms = 0;
      },
      /** 단계 이름 → 최근 평균 ms */
      stats() {
        const o = {};
        for (const s of stages) o[s.name] = +s.ms.toFixed(2);
        return o;
      },
      names() {
        return stages.map((s) => s.name);
      }
    };
  }
  function tileView(camX, camY, W, H, ts) {
    return { tx0: Math.floor(camX / ts), tx1: Math.ceil((camX + W) / ts), ty0: Math.floor(camY / ts), ty1: Math.ceil((camY + H) / ts) };
  }

  // src/engine/render/atlas.ts
  function clipCell(g, ox, oy, ts, fn) {
    g.save();
    g.beginPath();
    g.rect(ox, oy, ts, ts);
    g.clip();
    fn();
    g.restore();
  }
  function bakeAtlas(ts, cols, rows, paint) {
    const cv2 = document.createElement("canvas");
    cv2.width = cols * ts;
    cv2.height = rows * ts;
    const g = cv2.getContext("2d");
    for (let r = 0; r < rows; r++) for (let v = 0; v < cols; v++) clipCell(g, v * ts, r * ts, ts, () => paint(g, v * ts, r * ts, r, v));
    return cv2;
  }
  function blitCell(c, atlas2, ts, col, row, sx, sy, h) {
    c.drawImage(atlas2, col * ts, row * ts, ts, h || ts, sx, sy, ts, h || ts);
  }
  function cacheGet(m, key, make, max = 2500) {
    let hit = m.get(key);
    if (hit) return hit;
    if (m.size > max) m.clear();
    hit = make();
    m.set(key, hit);
    return hit;
  }

  // src/engine/scene/scenes.ts
  function createScenes({ scenes: scenes2, layers, start }) {
    let cur = start;
    const stack = [];
    const any = (k) => stack.some((l) => layers[l][k]);
    const open = (l) => {
      if (!stack.includes(l)) stack.push(l);
    };
    const close = (l) => {
      const i = stack.indexOf(l);
      if (i >= 0) stack.splice(i, 1);
    };
    return {
      get current() {
        return cur;
      },
      /** 바닥 씬을 바꾼다 — 얹힌 겹은 그대로 둔다(걷는 것은 부르는 쪽이 정한다) */
      go(s) {
        cur = s;
      },
      open,
      close,
      set(l, on) {
        if (on) open(l);
        else close(l);
      },
      has(l) {
        return stack.includes(l);
      },
      top() {
        return stack[stack.length - 1];
      },
      paused() {
        return any("pause");
      },
      inputBlocked() {
        return any("input");
      },
      /** 한 프레임 — 멈춤 겹이 없으면 갱신, 그리고 그리기 */
      frame(dt) {
        const s = scenes2[cur];
        if (s.update && !any("pause")) s.update(dt);
        if (s.render) s.render();
      }
    };
  }

  // src/engine/tilemap/light.ts
  function sweepLight(L2, w, h, x0, y0, passes, dec) {
    for (let pass = 0; pass < passes; pass++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = y * w + x;
        let v = L2[k];
        if (x > 0) v = Math.max(v, L2[k - 1] - dec(x0 + x, y0 + y));
        if (y > 0) v = Math.max(v, L2[k - w] - dec(x0 + x, y0 + y));
        L2[k] = v;
      }
      for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
        const k = y * w + x;
        let v = L2[k];
        if (x < w - 1) v = Math.max(v, L2[k + 1] - dec(x0 + x, y0 + y));
        if (y < h - 1) v = Math.max(v, L2[k + w] - dec(x0 + x, y0 + y));
        L2[k] = v;
      }
    }
  }

  // src/engine/i18n/format.ts
  function parse(s, i, stop) {
    const out = [];
    let buf = "";
    while (i < s.length) {
      const c = s[i];
      if (c === "}" && stop) break;
      if (c !== "{") {
        buf += c;
        i++;
        continue;
      }
      if (buf) {
        out.push(buf);
        buf = "";
      }
      const end = s.indexOf("}", i), comma = s.indexOf(",", i);
      if (end < 0) throw new Error("닫는 } 가 없다: " + s);
      if (comma < 0 || comma > end) {
        const [v2, hook] = s.slice(i + 1, end).split("|").map((x) => x.trim());
        out.push(hook ? { v: v2, hook } : { v: v2 });
        i = end + 1;
        continue;
      }
      const v = s.slice(i + 1, comma).trim();
      const k2 = s.indexOf(",", comma + 1);
      const kind = s.slice(comma + 1, k2).trim();
      if (kind !== "plural" && kind !== "select") throw new Error("모르는 형식 " + kind + ": " + s);
      const opts = {};
      i = k2 + 1;
      for (; ; ) {
        while (/\s/.test(s[i])) i++;
        if (s[i] === "}") {
          i++;
          break;
        }
        const b = s.indexOf("{", i);
        if (b < 0) throw new Error("갈래가 끊겼다: " + s);
        const key = s.slice(i, b).trim();
        const [body, j] = parse(s, b + 1, true);
        opts[key] = body;
        i = j + 1;
      }
      if (!opts.other) throw new Error("other 갈래가 없다: " + s);
      out.push({ v, kind, opts });
    }
    if (buf) out.push(buf);
    return [out, i];
  }
  var cache = /* @__PURE__ */ new Map();
  function compile(msg2) {
    let n = cache.get(msg2);
    if (!n) {
      n = parse(msg2, 0, false)[0];
      cache.set(msg2, n);
    }
    return n;
  }
  function render(nodes, p, lang2, hook, num) {
    let out = "";
    for (const n of nodes) {
      if (typeof n === "string") {
        out += num === void 0 ? n : n.replace(/#/g, String(num));
        continue;
      }
      const v = p[n.v];
      if (!("kind" in n)) {
        if (n.hook) {
          const r = hook ? hook(v, n.hook) : null;
          out += r === null ? String(v) : r;
        } else out += String(v);
        continue;
      }
      if (n.kind === "select") {
        out += render(n.opts[String(v)] || n.opts.other, p, lang2, hook, num);
        continue;
      }
      const x = Number(v);
      const exact = n.opts["=" + x];
      const body = exact || n.opts[new Intl.PluralRules(lang2).select(x)] || n.opts.other;
      out += render(body, p, lang2, hook, x);
    }
    return out;
  }
  function placeholders(msg2) {
    const names = /* @__PURE__ */ new Set();
    (function walk(ns) {
      for (const n of ns) {
        if (typeof n === "string") continue;
        names.add(n.v);
        if ("kind" in n) for (const k in n.opts) walk(n.opts[k]);
      }
    })(compile(msg2));
    return [...names].sort();
  }

  // src/engine/i18n/i18n.ts
  function createI18n({ source, lang: lang2, locales, fallback = [], hooks = {} }) {
    const chain = [lang2, ...fallback].filter((l, i, a) => l !== source && a.indexOf(l) === i);
    const isSource = lang2 === source;
    return {
      lang: lang2,
      source,
      isSource,
      tr(src, p) {
        let msg2 = src, ml = source;
        if (!isSource) for (const l of chain) {
          const m = locales[l] && locales[l].msgs && locales[l].msgs[src];
          if (m !== void 0) {
            msg2 = m;
            ml = l;
            break;
          }
        }
        if (!p && msg2.indexOf("{") < 0) return msg2;
        return render(compile(msg2), p || {}, ml, hooks[ml] || null);
      },
      /** 표의 글을 그 언어로 덮어쓴다 — roots 는 { ITEMS, ENEMIES, … }. 원본 언어면 아무것도 안 한다. 덮은 수를 돌려준다. */
      applyTables(roots) {
        if (isSource) return 0;
        let n = 0;
        for (const l of [...chain].reverse()) {
          const t = locales[l] && locales[l].tables;
          if (!t) continue;
          for (const path in t) {
            const keys = path.split(".");
            let o = roots[keys[0]];
            for (let i = 1; i < keys.length - 1 && o; i++) o = o[keys[i]];
            const last = keys[keys.length - 1];
            if (o && typeof o[last] === "string") {
              o[last] = t[path];
              n++;
            }
          }
        }
        return n;
      }
    };
  }
  function collectTables(roots, keep) {
    const out = {};
    const seen = /* @__PURE__ */ new Set();
    (function walk(o, path) {
      if (typeof o === "string") {
        if (keep(o)) out[path] = o;
        return;
      }
      if (!o || typeof o !== "object" || seen.has(o)) return;
      seen.add(o);
      for (const k of Object.keys(o)) {
        if (k.indexOf(".") >= 0) continue;
        walk(o[k], path ? path + "." + k : k);
      }
    })(roots, "");
    return out;
  }

  // src/engine/i18n/ko.ts
  function josa(word, withJong, noJong) {
    const s = String(word), ch = s.charCodeAt(s.length - 1) - 44032;
    if (ch < 0 || ch > 11171) return noJong;
    return ch % 28 ? withJong : noJong;
  }
  function josaRo(word) {
    const ch = word.charCodeAt(word.length - 1) - 44032;
    if (ch < 0 || ch > 11171) return "로";
    const jong = ch % 28;
    return jong === 0 || jong === 8 ? "로" : "으로";
  }
  var iga = (w) => w + josa(w, "이", "가");
  var eulreul = (w) => w + josa(w, "을", "를");
  var eunneun = (w) => w + josa(w, "은", "는");
  var PAIRS = [["을", "를"], ["이", "가"], ["은", "는"], ["과", "와"], ["아", "야"], ["이나", "나"], ["이랑", "랑"]];
  function koParticle(v, p) {
    const s = String(v), only = p[0] === "-", q = only ? p.slice(1) : p, w = only ? "" : s;
    if (q === "로" || q === "으로") return w + josaRo(s);
    for (const [a, b] of PAIRS) if (q === a || q === b) return w + josa(s, a, b);
    return null;
  }

  // src/engine/save/store.ts
  function createSaveStore({ dbName, slots: SAVE_SLOTS, slotKey, sigKey, sign: saveSign, head: saveHead, sealOk: saveSealOk }) {
    return {
      mode: "ls",
      db: null,
      ready: null,
      start() {
        return this.ready || (this.ready = this.init());
      },
      async init() {
        try {
          if (typeof indexedDB === "undefined") throw new Error("no indexedDB");
          this.db = await new Promise((res, rej) => {
            const q = indexedDB.open(dbName, 1);
            q.onupgradeneeded = () => {
              q.result.createObjectStore("data");
              q.result.createObjectStore("head");
            };
            q.onsuccess = () => res(q.result);
            q.onerror = () => rej(q.error);
            q.onblocked = () => rej(new Error("blocked"));
            setTimeout(() => rej(new Error("timeout")), 4e3);
          });
          this.db.onversionchange = () => {
            this.db.close();
          };
          this.mode = "idb";
        } catch (e) {
          console.warn("IndexedDB 를 못 열어 localStorage 에 저장한다:", e);
          this.mode = "ls";
          return;
        }
        try {
          await this.migrate();
        } catch (e) {
          console.error(e);
        }
        try {
          if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
        } catch (e) {
        }
      },
      _req(r) {
        return new Promise((res, rej) => {
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      },
      _tx(stores, mode, fn) {
        return new Promise((res, rej) => {
          const tx = this.db.transaction(stores, mode);
          let out;
          Promise.resolve(fn(tx)).then((v) => {
            out = v;
          }, rej);
          tx.oncomplete = () => res(out);
          tx.onerror = () => rej(tx.error);
          tx.onabort = () => rej(tx.error || new Error("abort"));
        });
      },
      async _gz(text) {
        if (typeof CompressionStream === "undefined") return null;
        return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
      },
      async _ungz(buf) {
        return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
      },
      /** 슬롯에 글자열을 넣으면서 서명도 같이 적는다. */
      async put(slot, text, head, sig) {
        await this.start();
        return this._put(slot, text, head, sig);
      },
      /* ★ init·migrate 안에서는 put/get 이 아니라 _put/_get 을 쓴다 — put 은 init 이 끝나기를 기다리므로 init 안에서 부르면 서로를 기다리며 멈춘다(타이틀
         목록이 영영 안 뜬다). */
      async _put(slot, text, head, sig) {
        if (sig === void 0) sig = saveSign(text);
        if (this.mode === "ls") {
          localStorage.setItem(slotKey(slot), text);
          try {
            if (sig) localStorage.setItem(sigKey(slot), sig);
            else localStorage.removeItem(sigKey(slot));
          } catch (e) {
          }
          return;
        }
        const gz = await this._gz(text);
        const rec = gz ? { gz, sig } : { text, sig };
        await this._tx(["data", "head"], "readwrite", (tx) => {
          tx.objectStore("data").put(rec, slotKey(slot));
          tx.objectStore("head").put(head, slotKey(slot));
        });
      },
      /** { raw, sig } 또는 null */
      async get(slot) {
        await this.start();
        return this._get(slot);
      },
      async _get(slot) {
        if (this.mode === "ls") {
          const raw = localStorage.getItem(slotKey(slot));
          if (!raw) return null;
          let sig = null;
          try {
            sig = localStorage.getItem(sigKey(slot));
          } catch (e) {
          }
          return { raw, sig };
        }
        const rec = await this._tx(["data"], "readonly", (tx) => this._req(tx.objectStore("data").get(slotKey(slot))));
        if (!rec) return null;
        return { raw: rec.gz ? await this._ungz(rec.gz) : rec.text, sig: rec.sig || null };
      },
      async remove(slot) {
        await this.start();
        localStorage.removeItem(slotKey(slot));
        localStorage.removeItem(sigKey(slot));
        if (this.mode === "idb") await this._tx(["data", "head"], "readwrite", (tx) => {
          tx.objectStore("data").delete(slotKey(slot));
          tx.objectStore("head").delete(slotKey(slot));
        });
      },
      /** 슬롯 요약 SAVE_SLOTS 개(빈 칸은 null). */
      async list() {
        await this.start();
        const out = [];
        for (let i = 0; i < SAVE_SLOTS; i++) {
          if (this.mode === "idb") {
            out.push(await this._tx(["head"], "readonly", (tx) => this._req(tx.objectStore("head").get(slotKey(i)))) || null);
            continue;
          }
          const raw = localStorage.getItem(slotKey(i));
          if (!raw) {
            out.push(null);
            continue;
          }
          try {
            const d = JSON.parse(raw);
            let sig = null;
            try {
              sig = localStorage.getItem(sigKey(i));
            } catch (e) {
            }
            out.push(Object.assign(saveHead(d), { bad: !saveSealOk(raw, d, sig) }));
          } catch (e) {
            out.push(null);
          }
        }
        return out;
      },
      async migrate() {
        for (let i = 0; i < SAVE_SLOTS; i++) {
          const raw = localStorage.getItem(slotKey(i));
          if (!raw) continue;
          const have = await this._tx(["head"], "readonly", (tx) => this._req(tx.objectStore("head").get(slotKey(i))));
          if (have) continue;
          let d;
          try {
            d = JSON.parse(raw);
          } catch (e) {
            continue;
          }
          const sig = localStorage.getItem(sigKey(i));
          await this._put(i, raw, saveHead(d), sig);
          const back = await this._get(i);
          if (back && back.raw === raw && back.sig === sig) {
            localStorage.removeItem(slotKey(i));
            localStorage.removeItem(sigKey(i));
          }
        }
      }
    };
  }

  // src/engine/save/seal.ts
  function makeSigner(SAVE_SALT) {
    return function saveSign(text) {
      let a = 2166136261, b = 16777619;
      const t = text + SAVE_SALT;
      for (let i = 0; i < t.length; i++) {
        const c = t.charCodeAt(i);
        a ^= c;
        a = a + ((a << 1) + (a << 4) + (a << 7) + (a << 8) + (a << 24)) >>> 0;
        b = (b ^ c) * 16777619 >>> 0;
      }
      return a.toString(36) + "." + b.toString(36) + "." + (t.length % 1e6).toString(36);
    };
  }

  // src/engine/save/upgrade.ts
  function upgrade(d, steps) {
    const SAVE_VERSION = steps.length + 1;
    let v = d.v || 1;
    while (v < SAVE_VERSION) {
      steps[v - 1](d);
      v++;
    }
    d.v = SAVE_VERSION;
    return d;
  }

  // src/engine/save/rle.ts
  var RLE_V = 256, RLE_N = 4096, RLE_MAX = 28671;
  function rleEncode(arr) {
    const out = ["r1"];
    let buf = "";
    let cur = arr[0], run = 1;
    const put = () => {
      buf += String.fromCharCode(RLE_V + cur, RLE_N + run);
      if (buf.length > 8192) {
        out.push(buf);
        buf = "";
      }
    };
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === cur && run < RLE_MAX) run++;
      else {
        put();
        cur = arr[i];
        run = 1;
      }
    }
    put();
    out.push(buf);
    return out.join("");
  }
  function rleDecode(pairs, len, Ctor) {
    const out = new Ctor(len);
    let i = 0;
    if (typeof pairs === "string") {
      for (let p = 2; p + 1 < pairs.length; p += 2) {
        const v = pairs.charCodeAt(p) - RLE_V, n = pairs.charCodeAt(p + 1) - RLE_N;
        for (let k = 0; k < n && i < len; k++) out[i++] = v;
      }
      return out;
    }
    for (let p = 0; p < pairs.length; p += 2) {
      const v = pairs[p], n = pairs[p + 1];
      for (let k = 0; k < n && i < len; k++) out[i++] = v;
    }
    return out;
  }

  // src/engine/core/rng.ts
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  var RNG = class {
    // declare — 필드 정의를 따로 내지 않는다(예전 JS 와 같은 모양)
    constructor(seed) {
      this.s = (typeof seed === "string" ? hashStr(seed) : seed >>> 0) || 1;
    }
    next() {
      this.s = this.s + 1831565813 >>> 0;
      let t = this.s;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    range(a, b) {
      return a + this.next() * (b - a);
    }
    int(a, b) {
      return Math.floor(this.range(a, b + 1));
    }
    chance(p) {
      return this.next() < p;
    }
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }
    /** 가중치 배열 [[값, 가중치], ...] */
    weighted(pairs) {
      let total = 0;
      for (const p of pairs) total += p[1];
      let r = this.next() * total;
      for (const p of pairs) {
        r -= p[1];
        if (r <= 0) return p[0];
      }
      return pairs[pairs.length - 1][0];
    }
  };
  function tileHash(x, y) {
    let h = x * 73856093 ^ y * 19349663;
    h = (h ^ h >>> 13) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return (h >>> 8) / 16777216;
  }

  // src/engine/core/noise.ts
  function makeNoise1D(rng, octaves = 4) {
    const tables = [];
    for (let o = 0; o < octaves; o++) {
      const t = new Float32Array(512);
      for (let i = 0; i < 512; i++) t[i] = rng.next();
      tables.push(t);
    }
    return function(x, freq = 0.02, persist = 0.5) {
      let sum = 0, amp = 1, max = 0, f = freq;
      for (let o = 0; o < tables.length; o++) {
        const t = tables[o], p = x * f, i = Math.floor(p), fr = p - i;
        const a = t[i & 511], b = t[i + 1 & 511];
        const s = fr * fr * (3 - 2 * fr);
        sum += lerp(a, b, s) * amp;
        max += amp;
        amp *= persist;
        f *= 2;
      }
      return sum / max;
    };
  }
  function makeNoise2D(rng) {
    const P = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const t = perm[i];
      perm[i] = perm[j];
      perm[j] = t;
    }
    for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
    const grad = (h, x, y) => {
      switch (h & 3) {
        case 0:
          return x + y;
        case 1:
          return -x + y;
        case 2:
          return x - y;
        default:
          return -x - y;
      }
    };
    const raw = (x, y) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const aa = P[P[X] + Y], ab = P[P[X] + Y + 1], ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
      const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
      const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
      return (lerp(x1, x2, v) + 1) * 0.5;
    };
    return function(x, y, freq = 0.05, oct = 3, persist = 0.5) {
      let sum = 0, amp = 1, max = 0, f = freq;
      for (let o = 0; o < oct; o++) {
        sum += raw(x * f, y * f) * amp;
        max += amp;
        amp *= persist;
        f *= 2;
      }
      return sum / max;
    };
  }

  // src/engine/core/color.ts
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    r = clamp(Math.round(r * amt), 0, 255);
    g = clamp(Math.round(g * amt), 0, 255);
    b = clamp(Math.round(b * amt), 0, 255);
    return "#" + (r << 16 | g << 8 | b).toString(16).padStart(6, "0");
  }
  function mixHex(h1, h2, t) {
    const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    const r = Math.round(lerp(a >> 16 & 255, b >> 16 & 255, t));
    const g = Math.round(lerp(a >> 8 & 255, b >> 8 & 255, t));
    const bl = Math.round(lerp(a & 255, b & 255, t));
    return "#" + (r << 16 | g << 8 | bl).toString(16).padStart(6, "0");
  }

  // src/engine/tilemap/tilemap.ts
  var TileMap = class {
    // 한 번이라도 보인 칸 — 지도의 안개
    constructor(w, h, ts, defs, edge) {
      this.w = w;
      this.h = h;
      this.ts = ts;
      this.defs = defs;
      this.edge = edge;
      this.tiles = new Uint8Array(w * h);
      this.walls = new Uint8Array(w * h);
      this.explored = new Uint8Array(w * h);
    }
    i(x, y) {
      return y * this.w + x;
    }
    inB(x, y) {
      return x >= 0 && y >= 0 && x < this.w && y < this.h;
    }
    /* ★ inB 를 부르지 말고 경계를 여기서 따진다 — inB 를 거치면 세계 생성(소형 d1)이 3.7 → 4.3초로 느려졌다(이렇게 하면 3.45초). */
    get(x, y) {
      const w = this.w;
      return x >= 0 && y >= 0 && x < w && y < this.h ? this.tiles[y * w + x] : this.edge;
    }
    wall(x, y) {
      return this.inB(x, y) ? this.walls[y * this.w + x] : 0;
    }
    /** ★ 타일은 이것으로만 바꾼다 — 게임이 덮어써서 바뀐 칸을 알아챈다(조명·유체·지도). */
    set(x, y, t) {
      if (this.inB(x, y)) this.tiles[y * this.w + x] = t;
    }
    setWall(x, y, w) {
      if (this.inB(x, y)) this.walls[y * this.w + x] = w;
    }
    solid(x, y) {
      const d = this.defs[this.get(x, y)];
      return d.solid === 1;
    }
    platform(x, y) {
      return this.defs[this.get(x, y)].solid === 2;
    }
    liquid(x, y) {
      return !!this.defs[this.get(x, y)].liquid;
    }
    /** 사각형(픽셀)이 막힌 칸과 겹치는지 */
    hitSolid(px, py, w, h) {
      const TS2 = this.ts;
      const x0 = Math.floor(px / TS2), x1 = Math.floor((px + w - 0.01) / TS2);
      const y0 = Math.floor(py / TS2), y1 = Math.floor((py + h - 0.01) / TS2);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (this.solid(x, y)) return true;
      return false;
    }
    /** 발판(위에서만 막힘) 검사: 이전 아랫변이 발판 위에 있었어야 한다 — 걸리면 발판 윗변 y, 아니면 −1 */
    hitPlatform(px, py, w, h, prevBottom) {
      const TS2 = this.ts;
      const x0 = Math.floor(px / TS2), x1 = Math.floor((px + w - 0.01) / TS2);
      const y0 = Math.floor(py / TS2), y1 = Math.floor((py + h - 0.01) / TS2);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        if (!this.platform(x, y)) continue;
        const top = y * TS2;
        if (prevBottom <= top + 2 && py + h > top) return top;
      }
      return -1;
    }
  };

  // examples/sample/src/tiles.ts
  var TS = 16;
  var WW = 240, WH = 90;
  var T = { AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, PLANK: 4, BEDROCK: 5, TORCH: 6 };
  var DEFS = [
    { name: "공기", col: "#000000", hard: 0 },
    { name: "흙", col: "#8a5a36", hard: 0.25, solid: 1 },
    { name: "풀", col: "#5f9a3a", hard: 0.25, solid: 1 },
    { name: "돌", col: "#77787f", hard: 0.6, solid: 1 },
    { name: "나무 발판", col: "#b58a52", hard: 0.2, solid: 2 },
    { name: "기반암", col: "#2d2a33", hard: 0, solid: 1 },
    { name: "횃불", col: "#ffcf6a", hard: 0.05, light: 14 }
  ];
  var PLACEABLE = [T.DIRT, T.STONE, T.PLANK, T.TORCH];
  function generate(seed) {
    const map2 = new TileMap(WW, WH, TS, DEFS, T.BEDROCK);
    const rng = new RNG(seed);
    const hill = makeNoise1D(rng), cave = makeNoise2D(rng);
    const surf = [];
    for (let x = 0; x < WW; x++) {
      const s = Math.floor(34 + hill(x, 0.03) * 16 - 8);
      surf.push(s);
      for (let y = s; y < WH; y++) {
        const deep = y - s;
        let t = deep === 0 ? T.GRASS : deep < 5 ? T.DIRT : T.STONE;
        if (deep > 6 && cave(x, y, 0.07) > 0.62) t = T.AIR;
        if (y >= WH - 2) t = T.BEDROCK;
        map2.set(x, y, t);
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = rng.int(4, WW - 12), y = surf[x] - rng.int(5, 9), n = rng.int(4, 8);
      for (let k = 0; k < n; k++) if (map2.get(x + k, y) === T.AIR) map2.set(x + k, y, T.PLANK);
    }
    for (let i = 0; i < 60; i++) {
      const x = rng.int(1, WW - 2), y = rng.int(surf[x] + 8, WH - 4);
      if (map2.get(x, y) === T.AIR && map2.solid(x, y + 1)) map2.set(x, y, T.TORCH);
    }
    return map2;
  }
  function makeAtlas() {
    return bakeAtlas(TS, 4, DEFS.length, (g, ox, oy, row, col) => {
      const d = DEFS[row];
      if (row === T.AIR) return;
      if (row === T.TORCH) {
        g.fillStyle = "#6b4a2a";
        g.fillRect(ox + 7, oy + 6, 2, 10);
        g.fillStyle = d.col;
        g.fillRect(ox + 6, oy + 3, 4, 4);
        g.fillStyle = "#fff4c8";
        g.fillRect(ox + 7, oy + 4, 2, 2);
        return;
      }
      if (row === T.PLANK) {
        g.fillStyle = d.col;
        g.fillRect(ox, oy, TS, 5);
        g.fillStyle = shade(d.col, -30);
        g.fillRect(ox, oy + 5, TS, 1);
        g.fillRect(ox + 3 + col, oy + 1, 1, 3);
        return;
      }
      const base = row === T.GRASS ? DEFS[T.DIRT].col : d.col;
      g.fillStyle = base;
      g.fillRect(ox, oy, TS, TS);
      for (let y = 0; y < TS; y += 2) for (let x = 0; x < TS; x += 2) {
        const h = tileHash(x + col * 31, y + row * 17);
        if (h < 0.09) {
          g.fillStyle = shade(base, -14);
          g.fillRect(ox + x, oy + y, 2, 2);
        } else if (h > 0.95) {
          g.fillStyle = shade(base, 12);
          g.fillRect(ox + x, oy + y, 2, 2);
        }
      }
      if (row === T.GRASS) {
        g.fillStyle = d.col;
        g.fillRect(ox, oy, TS, 4);
        g.fillStyle = "#7cc04a";
        g.fillRect(ox, oy, TS, 2);
        g.fillStyle = d.col;
        for (let x = col; x < TS; x += 3) g.fillRect(ox + x, oy + 4, 1, 1 + (x + col & 1));
      }
    });
  }

  // examples/sample/src/main.ts
  var EN = {
    "←→ 이동 · 스페이스 점프 · ↓ 발판 내려가기": "←→ move · Space jump · ↓ drop through",
    "왼쪽 클릭 캐기 · 오른쪽 클릭 놓기 · 1~4 블록 · P 멈춤 · S 저장 · L 불러오기": "Left click dig · Right click place · 1–4 block · P pause · S save · L load",
    "{name|을} 들었다": "Holding {name}",
    "저장했다": "Saved",
    "불러왔다": "Loaded",
    "저장된 게임이 없다": "No saved game",
    "저장이 고쳐졌다 — 불러오지 않는다": "Save was tampered with — not loading",
    "멈춤": "Paused",
    "점프": "Jump",
    "놓기": "Place",
    "흙": "Dirt",
    "풀": "Grass",
    "돌": "Stone",
    "나무 발판": "Plank",
    "기반암": "Bedrock",
    "횃불": "Torch",
    "공기": "Air"
  };
  var qs = new URLSearchParams(location.search);
  var lang = qs.get("lang") || (navigator.language.startsWith("ko") ? "ko" : "en");
  var { tr } = createI18n({ source: "ko", lang, locales: { en: { msgs: EN } }, fallback: ["en"], hooks: { ko: koParticle } });
  var map = generate("sample");
  var atlas = makeAtlas();
  var cv = document.getElementById("game");
  var ctx = cv.getContext("2d");
  var view = { W: 0, H: 0 };
  var zoom = () => innerHeight > 700 ? 2 : 1.5;
  var resize = () => {
    view = fitCanvas(cv, ctx, zoom());
  };
  addEventListener("resize", resize);
  resize();
  var input = createInput({
    actions: [
      { id: "left", def: ["ArrowLeft", "KeyA"] },
      { id: "right", def: ["ArrowRight", "KeyD"] },
      { id: "jump", def: ["Space", "ArrowUp", "KeyW"] },
      { id: "down", def: ["ArrowDown"] },
      { id: "pause", def: ["KeyP", "Escape"] },
      { id: "save", def: ["KeyS"] },
      { id: "load", def: ["KeyL"] }
    ],
    custom: () => null
  });
  var ptr = { m1: 0, m2: 0, mx: 0, my: 0 };
  var GRAV = 1500, JUMP = -520, SPEED = 170, FALL_CAP = 900;
  var Player = class extends Entity {
    constructor(x, y) {
      super(x, y, 10, 22);
      this.face = 1;
    }
    update(dt, m, ctl) {
      const dir = ctl ? (input.held("right") ? 1 : 0) - (input.held("left") ? 1 : 0) : 0;
      this.vx = dir * SPEED;
      if (dir) this.face = dir;
      if (ctl && input.held("jump") && this.onGround) this.vy = JUMP;
      const nx = this.x + this.vx * dt;
      this.moveX(m, nx, TS, nx);
      this.fall(dt, GRAV, -FALL_CAP, FALL_CAP);
      const prevBottom = this.y + this.h;
      this.moveY(m, this.y + this.vy * dt, prevBottom, !(ctl && input.held("down")));
      this.keepIn(0, WW * TS, (WH - 3) * TS);
    }
  };
  var spawn = () => {
    let y = 0;
    const x = WW >> 1;
    while (y < WH && !map.solid(x, y)) y++;
    return new Player(x * TS + 3, (y - 3) * TS);
  };
  var player = spawn();
  var cam = { x: 0, y: 0 };
  var sel = 0, msg = "", msgT = 0;
  var say = (s) => {
    msg = s;
    msgT = 2.5;
  };
  var dig = { x: -1, y: -1, t: 0 };
  var cursorTile = () => ({ x: Math.floor((ptr.mx / zoom() + cam.x) / TS), y: Math.floor((ptr.my / zoom() + cam.y) / TS) });
  var inReach = (x, y) => Math.hypot((x + 0.5) * TS - player.cx, (y + 0.5) * TS - player.cy) < TS * 6;
  function place() {
    const { x, y } = cursorTile(), id = PLACEABLE[sel];
    if (!inReach(x, y) || map.get(x, y) !== T.AIR) return;
    map.set(x, y, id);
    if (DEFS[id].solid === 1 && map.hitSolid(player.x, player.y, player.w, player.h)) map.set(x, y, T.AIR);
  }
  function digTick(dt) {
    if (!ptr.m1) {
      dig.t = 0;
      return;
    }
    const { x, y } = cursorTile(), d = DEFS[map.get(x, y)];
    if (!inReach(x, y) || !d.hard) {
      dig.t = 0;
      return;
    }
    if (x !== dig.x || y !== dig.y) {
      dig.x = x;
      dig.y = y;
      dig.t = 0;
    }
    dig.t += dt;
    if (dig.t >= d.hard) {
      map.set(x, y, T.AIR);
      dig.t = 0;
    }
  }
  var STEPS = [(d) => {
    if (d.sel === void 0) d.sel = 0;
  }];
  var sign = makeSigner("engine-sample");
  var store = createSaveStore({
    dbName: "ashfall-engine-sample",
    slots: 1,
    slotKey: (i) => "sample_save_" + i,
    sigKey: (i) => "sample_sig_" + i,
    sign,
    head: (d) => ({ v: d.v }),
    sealOk: (raw, _d, sig) => sig === sign(raw)
  });
  async function save() {
    const d = { v: STEPS.length + 1, tiles: rleEncode(map.tiles), px: player.x, py: player.y, sel };
    const raw = JSON.stringify(d);
    await store.put(0, raw, { v: d.v }, sign(raw));
    say(tr("저장했다"));
  }
  async function load() {
    const got = await store.get(0);
    if (!got) {
      say(tr("저장된 게임이 없다"));
      return;
    }
    if (got.sig !== sign(got.raw)) {
      say(tr("저장이 고쳐졌다 — 불러오지 않는다"));
      return;
    }
    const d = upgrade(JSON.parse(got.raw), STEPS);
    const m = generate("sample");
    m.tiles = rleDecode(d.tiles, WW * WH, Uint8Array);
    map = m;
    player = new Player(d.px, d.py);
    sel = d.sel || 0;
    say(tr("불러왔다"));
  }
  var scenes = createScenes({
    scenes: {
      play: {
        update(dt) {
          const ctl = !scenes.inputBlocked();
          player.update(dt, map, ctl);
          if (ctl) digTick(dt);
          cam.x = clamp(player.cx - view.W / 2, 0, WW * TS - view.W);
          cam.y = clamp(player.cy - view.H / 2, 0, WH * TS - view.H);
          msgT = Math.max(0, msgT - dt);
        },
        render() {
          pipe.run({ c: ctx, camX: Math.round(cam.x), camY: Math.round(cam.y), W: view.W, H: view.H });
        }
      }
    },
    layers: { pause: { pause: true, input: true } },
    start: "play"
  });
  input.bindKeyboard({
    down(e) {
      if (input.isKey("pause", e.code)) scenes.set("pause", !scenes.has("pause"));
      else if (input.isKey("save", e.code)) void save();
      else if (input.isKey("load", e.code)) void load();
      else if (/^Digit[1-4]$/.test(e.code)) {
        sel = +e.code.slice(5) - 1;
        say(tr("{name|을} 들었다", { name: tr(DEFS[PLACEABLE[sel]].name) }));
      }
    }
  });
  bindPointer(cv, ptr, {
    rightDown: place,
    wheel: (e) => {
      sel = (sel + (e.deltaY > 0 ? 1 : PLACEABLE.length - 1)) % PLACEABLE.length;
    }
  });
  if (qs.get("touch") === "1" || qs.get("touch") !== "0" && matchMedia("(pointer: coarse)").matches)
    mountTouch({ input, ptr, surface: cv, buttons: [{ id: "jump", label: tr("점프") }], altLabel: tr("놓기"), rightDown: place });
  var pipe = createPipeline(["sky", "tiles", "actors", "light", "hud"]);
  pipe.add("sky", ({ c, W, H }) => {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2b3c6b");
    g.addColorStop(1, "#8a6a7a");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  });
  pipe.add("tiles", ({ c, camX, camY, W, H }) => {
    const v = tileView(camX, camY, W, H, TS);
    for (let y = v.ty0; y <= v.ty1; y++) for (let x = v.tx0; x <= v.tx1; x++) {
      const id = map.get(x, y);
      if (id === T.AIR) continue;
      blitCell(c, atlas, TS, x * 7 + y * 3 & 3, id, x * TS - camX, y * TS - camY);
    }
    if (dig.t > 0) {
      const d = DEFS[map.get(dig.x, dig.y)];
      c.fillStyle = "rgba(0,0,0,.45)";
      c.fillRect(dig.x * TS - camX, dig.y * TS - camY + TS * (1 - dig.t / d.hard), TS, TS * dig.t / d.hard);
    }
    const k = cursorTile();
    c.strokeStyle = inReach(k.x, k.y) ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.2)";
    c.strokeRect(k.x * TS - camX + 0.5, k.y * TS - camY + 0.5, TS - 1, TS - 1);
  });
  pipe.add("actors", ({ c, camX, camY }) => {
    const x = Math.round(player.x - camX), y = Math.round(player.y - camY);
    c.fillStyle = "#e8d8b0";
    c.fillRect(x, y, player.w, player.h);
    c.fillStyle = "#c0392b";
    c.fillRect(x - 1, y + 7, player.w + 2, 3);
    c.fillStyle = "#1a1420";
    c.fillRect(x + (player.face > 0 ? 6 : 2), y + 3, 2, 2);
  });
  var MARGIN = 14;
  var L = new Float32Array(0);
  pipe.add("light", ({ c, camX, camY, W, H }) => {
    const v = tileView(camX, camY, W, H, TS);
    const x0 = v.tx0 - MARGIN, y0 = v.ty0 - MARGIN, w = v.tx1 - v.tx0 + 1 + MARGIN * 2, h = v.ty1 - v.ty0 + 1 + MARGIN * 2;
    if (L.length !== w * h) L = new Float32Array(w * h);
    for (let x = 0; x < w; x++) {
      let sky = true;
      for (let yy = Math.min(0, y0); yy < y0; yy++) if (map.solid(x0 + x, yy)) {
        sky = false;
        break;
      }
      for (let y = 0; y < h; y++) {
        const id = map.get(x0 + x, y0 + y);
        if (sky && DEFS[id].solid === 1) sky = false;
        L[y * w + x] = sky ? 15 : DEFS[id].light || 0;
      }
    }
    sweepLight(L, w, h, x0, y0, 2, (x, y) => map.solid(x, y) ? 3 : 1);
    for (let y = MARGIN; y < h - MARGIN; y++) for (let x = MARGIN; x < w - MARGIN; x++) {
      const a = 1 - L[y * w + x] / 15;
      if (a <= 0.02) continue;
      c.fillStyle = `rgba(6,4,12,${a.toFixed(2)})`;
      c.fillRect((x0 + x) * TS - camX, (y0 + y) * TS - camY, TS, TS);
    }
  });
  pipe.add("hud", ({ c, W, H }) => {
    c.font = "8px system-ui, sans-serif";
    c.textBaseline = "top";
    c.fillStyle = "rgba(0,0,0,.45)";
    c.fillRect(0, 0, W, 24);
    c.fillStyle = "#f0e6cc";
    c.fillText(tr("←→ 이동 · 스페이스 점프 · ↓ 발판 내려가기"), 4, 3);
    c.fillText(tr("왼쪽 클릭 캐기 · 오른쪽 클릭 놓기 · 1~4 블록 · P 멈춤 · S 저장 · L 불러오기"), 4, 13);
    PLACEABLE.forEach((id, i) => {
      const x = 4 + i * 20, y = H - 22;
      c.fillStyle = i === sel ? "rgba(255,220,140,.9)" : "rgba(0,0,0,.5)";
      c.fillRect(x - 2, y - 2, TS + 4, TS + 4);
      blitCell(c, atlas, TS, 0, id, x, y);
    });
    if (msgT > 0) {
      c.fillStyle = `rgba(255,240,200,${Math.min(1, msgT)})`;
      c.fillText(msg, 4, H - 36);
    }
    if (scenes.has("pause")) {
      c.fillStyle = "rgba(0,0,0,.5)";
      c.fillRect(0, 0, W, H);
      c.font = "bold 16px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillStyle = "#fff";
      c.fillText(tr("멈춤"), W / 2, H / 2 - 8);
      c.textAlign = "left";
    }
  });
  startLoop((dt) => scenes.frame(dt), 1 / 20);
  Object.assign(window, { SAMPLE: { get map() {
    return map;
  }, get player() {
    return player;
  }, input, ptr, scenes, cam, save, load } });
})();

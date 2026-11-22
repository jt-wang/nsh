// nsh.js's host channel without a browser or nsh.wasm:
// `node --test crates/nsh-platform-web/web/nsh.test.mjs`. A fake engine
// records what reaches it through the real `call` / `withStrings` path.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("nsh.js", import.meta.url), "utf8");
// `Player` is not exported; the page only gets it from `createPlayer`.
const { Player } = await import(
  `data:text/javascript,${encodeURIComponent(`${source}\nexport { Player };`)}`
);

test("text props store and clear shimmer without glyph updates", () => {
  const el = {
    _kind: "text",
    dataset: {},
    classList: { toggle() {} },
  };
  const player = Object.create(Player.prototype);
  player.view = () => el;
  player.updateFocusable = () => {};
  player.updateTouchAction = () => {};
  player.syncShimmer = () => {};
  for (const props of [{}, { shimmer: true }, { shimmer: false }, { shimmer: true }, {}]) {
    player.op_vp(["vp", 2, props]);
    assert.equal(el._shimmer, !!props.shimmer);
  }
  player.op_vp(["vp", 2, { shimmer: true, shimmerColor: "#123456" }]);
  assert.equal(el._shimmerColor, "#123456");
  player.op_vp(["vp", 2, {}]);
  assert.equal(el._shimmerColor, undefined);
  el._kind = "view";
  player.op_vp(["vp", 2, { shimmer: true }]);
  assert.equal(el._shimmer, false);
});

test("shimmer shares one mask, pauses when hidden, and releases observers", () => {
  const listeners = new Map();
  const observed = new Set();
  let intersection;
  let disconnected = false;
  const document = {
    hidden: false,
    createElement: () => ({
      style: { setProperty(name, value) { this[name] = value; } },
      setAttribute(name, value) { this[name] = value; },
      replaceChildren(...children) { this.children = children; },
      remove() { this.removed = true; },
    }),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => {
      assert.equal(listeners.get(name), callback);
      listeners.delete(name);
    },
  };
  globalThis.document = document;
  globalThis.IntersectionObserver = class {
    constructor(callback) { intersection = callback; }
    observe(el) { observed.add(el); }
    unobserve(el) { observed.delete(el); }
    disconnect() { disconnected = true; }
  };
  try {
    const runs = ["Working", "…"].map((textContent) => ({
      textContent,
      cloneNode: () => ({ textContent, classList: { replace() {} } }),
    }));
    const el = {
      _kind: "text", _shimmer: true, _shimmerColor: "#b8b8b8", isConnected: true,
      _props: { shimmerPaint: "animation-duration:2800ms" },
      querySelectorAll: () => runs,
      append(overlay) { this.overlay = overlay; },
    };
    const player = Object.create(Player.prototype);
    let reduced = false;
    player.reduceMotion = () => reduced;
    player.syncShimmer(el);
    const overlay = el.overlay;
    assert.equal(overlay["aria-hidden"], "true");
    assert.equal(overlay.inert, true);
    assert.deepEqual(overlay.children.map((r) => r.textContent), ["Working", "…"]);
    assert.equal(observed.size, 1);
    assert.equal(overlay.style.animationPlayState, "paused", "wait for intersection");
    intersection([{ target: el, isIntersecting: true }]);
    assert.equal(overlay.style.animationPlayState, "running");
    intersection([{ target: el, isIntersecting: false }]);
    assert.equal(overlay.style.animationPlayState, "paused");
    intersection([{ target: el, isIntersecting: true }]);
    document.hidden = true;
    listeners.get("visibilitychange")();
    assert.equal(overlay.style.animationPlayState, "paused");
    document.hidden = false;
    listeners.get("visibilitychange")();
    assert.equal(overlay.style.animationPlayState, "running");
    reduced = true;
    player.shimmerMotion(el);
    assert.equal(overlay.hidden, true);
    assert.equal(overlay.style.animationPlayState, "paused");
    reduced = false;
    player.shimmerMotion(el);
    assert.equal(overlay.hidden, false);
    el._shimmerColor = "#424242";
    player.syncShimmer(el, true);
    assert.equal(el.overlay, overlay, "content updates preserve the animation");
    assert.equal(overlay.style["--nsh-shimmer-color"], "#424242");
    el._shimmer = false;
    player.syncShimmer(el);
    assert.equal(overlay.removed, true);
    assert.equal(observed.size, 0);
    assert.equal(listeners.size, 0);
    assert.equal(disconnected, true);
    el._shimmer = true;
    player.syncShimmer(el);
    const mounted = el.overlay;
    player.views = new Map([[2, el]]);
    player.mouseTracked = new Set();
    player.detach = () => {};
    player.screenGone = () => {};
    el.contains = () => false;
    player.op_d(["d", 2]);
    assert.equal(mounted.removed, true, "unmount removes the overlay");
    assert.equal(observed.size, 0);
    assert.equal(listeners.size, 0);
    el.querySelectorAll = () => [];
    player.syncShimmer(el);
    assert.equal(el._shimmerOverlay, null, "empty text has no overlay");
  } finally {
    delete globalThis.document;
    delete globalThis.IntersectionObserver;
  }
});

/** A player on a fake engine; `sent` holds `[name, payload]` of the events it got. */
function fakePlayer(options = {}) {
  const sent = [];
  const memory = { buffer: new ArrayBuffer(1 << 16) };
  let next = 8;
  const text = (ptr, len) => new TextDecoder().decode(new Uint8Array(memory.buffer, ptr, len));
  const player = Object.create(Player.prototype);
  Object.assign(player, {
    // What the constructor sets that these paths read.
    options: { idiom: "phone", ...options },
    hostEvents: [],
    fileOperations: new Map(),
    requests: new Map(),
    websockets: new Map(),
    environment: () => ({}),
    updateRootClasses() {},
    wasm: {
      memory,
      nsh_alloc(len) {
        const ptr = next;
        next += len;
        return ptr;
      },
      nsh_dealloc() {},
      nsh_stop() {},
      nsh_event(_id, np, nl, pp, pl) {
        sent.push([text(np, nl), JSON.parse(text(pp, pl))]);
        return -1;
      },
    },
  });
  return { player, sent };
}

const started = () => -1;
const failing = () => {
  throw new Error("unreachable");
};
const events = (sent) =>
  sent.filter(([name, p]) => name === "onHost" && p.type === "event").map(([, p]) => p.event);

test("events sent before the app runs reach it in order once it starts, later ones at once", () => {
  const { player, sent } = fakePlayer();
  player.hostEvent("a", 1);
  player.hostEvent("b", 2);
  assert.deepEqual(sent, []);
  player.begin(390, started);
  assert.deepEqual(sent, [
    ["onHost", { type: "event", event: "a", payload: 1 }],
    ["onHost", { type: "event", event: "b", payload: 2 }],
  ]);
  player.hostEvent("c");
  assert.deepEqual(events(sent), ["a", "b", "c"]);
});

test("events for an app that failed to start reach neither it nor the next app", () => {
  const { player, sent } = fakePlayer();
  player.hostEvent("before");
  assert.throws(() => player.begin(390, failing));
  player.hostEvent("after");
  player.begin(390, started);
  player.hostEvent("next");
  assert.deepEqual(events(sent), ["next"]);
});

test("a replacing app that fails to start gets no events", () => {
  const { player, sent } = fakePlayer();
  player.begin(390, started);
  assert.throws(() => player.begin(390, failing));
  player.hostEvent("lost");
  assert.deepEqual(events(sent), []);
});

test("events sent while a replacing app starts reach it once it has started", () => {
  const { player, sent } = fakePlayer();
  player.begin(390, started);
  let during;
  player.begin(390, () => {
    player.hostEvent("early");
    during = events(sent).length;
    return -1;
  });
  assert.equal(during, 0);
  assert.deepEqual(events(sent), ["early"]);
});

test("events sent after the app stopped wait for the next app", () => {
  // `stop` cancels the frame it asked for; node has no frames.
  globalThis.cancelAnimationFrame ??= () => {};
  const { player, sent } = fakePlayer();
  player.begin(390, started);
  player.hostEvent("running");
  player.stop();
  player.hostEvent("stopped");
  assert.deepEqual(events(sent), ["running"]);
  player.begin(390, started);
  assert.deepEqual(events(sent), ["running", "stopped"]);
});

async function reply(host) {
  const { player, sent } = fakePlayer(host === undefined ? {} : { host });
  player.app = 1;
  await player.hostCall(7, "echo", ["x"]);
  return sent;
}

test("a host call that returns answers ok with its value", async () => {
  assert.deepEqual(await reply({ call: async (name, args) => ({ name, args }) }), [
    ["onHost", { type: "reply", id: 7, ok: true, value: { name: "echo", args: ["x"] } }],
  ]);
});

test("a host call that throws answers not ok with its message", async () => {
  const host = {
    call() {
      throw new Error("boom");
    },
  };
  assert.deepEqual(await reply(host), [["onHost", { type: "reply", id: 7, ok: false, error: "boom" }]]);
});

test("a host call that rejects answers not ok with its message", async () => {
  const host = { call: () => Promise.reject(new Error("denied")) };
  assert.deepEqual(await reply(host), [["onHost", { type: "reply", id: 7, ok: false, error: "denied" }]]);
});

test("a host call that rejects with a non-Error answers its string", async () => {
  const host = { call: () => Promise.reject("nope") };
  assert.deepEqual(await reply(host), [["onHost", { type: "reply", id: 7, ok: false, error: "nope" }]]);
});

test("a host call whose result is not JSON answers not ok", async () => {
  const [[name, payload]] = await reply({ call: () => 1n });
  assert.equal(name, "onHost");
  assert.equal(payload.type, "reply");
  assert.equal(payload.ok, false);
  assert.match(payload.error, /BigInt/);
});

test("a page without a host answers not ok", async () => {
  assert.deepEqual(await reply(undefined), [
    ["onHost", { type: "reply", id: 7, ok: false, error: "this page has no host (createPlayer's `host`)" }],
  ]);
});

test("a host reply for an app that was replaced is dropped", async () => {
  const { player, sent } = fakePlayer({ host: { call: () => Promise.reject(new Error("late")) } });
  player.app = 1;
  const pending = player.hostCall(7, "echo", []);
  player.app = 2;
  await pending;
  assert.deepEqual(sent, []);
});

test("a browser-cancelled pan reports cancellation rather than a release", () => {
  for (const [cancelled, phase] of [[true, 3], [false, 2]]) {
    const { player } = fakePlayer();
    const sent = [];
    player.pointers = new Map([[7, {
      mode: "pan", pan: { _id: 12 }, touchPath: [], states: [],
      startX: 10, startY: 20, x: 10, y: 120,
    }]]);
    player.track = () => {};
    player.velocity = () => [0, 400];
    player.call = (f) => f({ nsh_pan: (...args) => sent.push(args) });
    player.pointerUp({ pointerId: 7 }, cancelled);
    assert.deepEqual(sent, [[12, phase, 0, 100, 0, 400]]);
    assert.equal(player.pointers.size, 0);
  }
});

test("run stages static source and bytecode chunks before starting the entry", () => {
  const { player } = fakePlayer();
  const calls = [];
  const text = (ptr, len) => new TextDecoder().decode(new Uint8Array(player.wasm.memory.buffer, ptr, len));
  player.reset = () => [800, 600];
  player.begin = () => calls.push(["start"]);
  player.wasm.nsh_bundle_options = () => calls.push(["options"]);
  player.wasm.nsh_bundle_chunk = (np, nl, cp, cl, bytecode) => {
    calls.push([text(np, nl), bytecode, [...new Uint8Array(player.wasm.memory.buffer, cp, cl)]]);
  };
  player.run("entry", {
    chunkBase: "https://example.test/",
    preloadedChunks: {
      "source.js": "export {}",
      "bytecode.js": new Uint8Array([1, 2, 3]).buffer,
    },
  });
  assert.deepEqual(calls, [
    ["options"],
    ["source.js", 0, [...new TextEncoder().encode("export {}")]],
    ["bytecode.js", 1, [1, 2, 3]],
    ["start"],
  ]);
});

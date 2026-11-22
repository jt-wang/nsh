import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inflateSync } from "node:zlib";

let chromium;
for (const candidate of [process.env.CHROME, "chromium", "chromium-browser", "google-chrome"].filter(Boolean)) {
  try { execFileSync(candidate, ["--version"], { stdio: "ignore" }); chromium = candidate; break; } catch {}
}

// Chrome screenshots are non-interlaced, eight-bit RGB or RGBA PNGs.
function pixels(png) {
  const chunks = [];
  let width, height, channels;
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    const kind = png.toString("ascii", at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + length);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      assert.equal(data[8], 8);
      assert.ok(data[9] === 2 || data[9] === 6);
      channels = data[9] === 2 ? 3 : 4;
    }
    if (kind === "IDAT") chunks.push(data);
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x;
      const a = x >= channels ? out[at - channels] : 0;
      const b = y ? out[at - stride] : 0;
      const c = y && x >= channels ? out[at - stride - channels] : 0;
      const p = a + b - c;
      const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c)
        ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      out[at] = raw[y * (stride + 1) + 1 + x] + [0, a, b, Math.floor((a + b) / 2), paeth][filter];
    }
  }
  return { width, height, channels, data: out };
}

test("a single moving mask highlights positioned runs without changing base pixels", { skip: !chromium, timeout: 60000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "nsh-shimmer-browser-"));
  const browser = spawn(chromium, ["--headless", "--no-sandbox", "--disable-dev-shm-usage",
    "--no-first-run", "--remote-debugging-port=0", "--user-data-dir=" + dir, "about:blank"],
  { stdio: ["ignore", "ignore", "pipe"] });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => reject(Error("Chrome did not start: " + output)), 20000);
      browser.once("error", reject);
      browser.stderr.on("data", (data) => {
        output += data;
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timeout); resolve(new URL(match[1])); }
      });
    });
    const pages = await (await fetch(`http://${endpoint.host}/json/list`)).json();
    socket = new WebSocket(pages.find((p) => p.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
      const result = JSON.parse(data);
      if (!result.id) return;
      const { resolve, reject } = pending.get(result.id);
      pending.delete(result.id);
      if (result.error) reject(Error(JSON.stringify(result.error)));
      else resolve(result.result);
    };
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const source = await readFile(new URL("nsh.js", import.meta.url), "utf8");
    const module = "data:text/javascript;base64," + Buffer.from(source + "\nexport { Player, KEYFRAMES };").toString("base64");
    await call("Emulation.setDeviceMetricsOverride", { width: 384, height: 100, deviceScaleFactor: 1, mobile: false });
    await evaluate(`(async () => {
      const {Player, KEYFRAMES} = await import(${JSON.stringify(module)});
      const style = document.createElement('style'); style.textContent = KEYFRAMES; document.head.append(style);
      document.body.style.margin = '0';
      window.root = document.createElement('div'); root.className = 'nsh-root'; root.style.cssText = 'width:384px;height:100px;background:black'; document.body.append(root);
      window.el = document.createElement('div'); el.className = 'nsh-v'; el.style.cssText = 'width:384px;height:100px;color:#929292;font:80px monospace'; root.append(el);
      for (const left of [0, 192]) { const run = document.createElement('span'); run.className = 'nsh-run'; run.textContent = 'MMMM'; run.style.left = left + 'px'; el.append(run); }
      window.player = Object.create(Player.prototype); player.reducedMotion = {matches:true};
      el._kind = 'text'; el._shimmer = true; el._shimmerColor = '#b8b8b8';
      el._props = {shimmerPaint:'animation-duration:2800ms;mask-size:33.333333% 100%;mask-image:linear-gradient(to right,transparent,black,transparent);--nsh-shimmer-start:-50%;--nsh-shimmer-end:150%;'};
      player.syncShimmer(el);
    })()`);
    const screenshot = async () => pixels(Buffer.from((await call("Page.captureScreenshot", { format: "png" })).data, "base64"));
    const base = await screenshot();
    assert.equal(await evaluate("el._shimmerOverlay.hidden"), true);
    await evaluate(`player.reducedMotion.matches=false; el._shimmerVisible=true; player.shimmerMotion(el);
      window.animation=el._shimmerOverlay.getAnimations()[0]; animation.pause(); animation.currentTime=1050;`);
    const first = await screenshot();
    await evaluate("animation.currentTime=1750");
    const second = await screenshot();
    const verifyBand = (image, from, to) => {
      let changed = 0, fullBase = 0;
      for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
        const at = (y * image.width + x) * image.channels;
        const delta = image.data[at] - base.data[at];
        if (x < from || x >= to) {
          assert.equal(delta, 0, `base pixel changed outside band at ${x},${y}`);
          if (base.data[at] === 146) fullBase++;
        } else if (delta > 10) changed++;
      }
      assert.ok(changed > 200, "the moving band must repaint glyph pixels");
      assert.ok(fullBase > 500, "normal-color glyph pixels remain outside the band");
    };
    verifyBand(first, 63, 193);
    verifyBand(second, 191, 321);
    assert.equal(await evaluate("getComputedStyle(el).color"), "rgb(146, 146, 146)");
    assert.equal(await evaluate("el.querySelectorAll(':scope > .nsh-run').length"), 2);
    assert.equal(await evaluate("el._shimmerOverlay.children.length"), 2);
    await evaluate("root.classList.add('nsh-reduce')");
    const reduced = await screenshot();
    assert.deepEqual(reduced.data, base.data, "reduced motion shows base pixels only");
    await evaluate("player.removeShimmer(el)");
    assert.equal(await evaluate("player.shimmerViews.size"), 0);
  } finally {
    socket?.close();
    browser.kill();
    await new Promise((resolve) => browser.exitCode !== null ? resolve() : browser.once("exit", resolve));
    await rm(dir, { recursive: true, force: true });
  }
});

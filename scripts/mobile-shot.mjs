/** Mobile viewport screenshots for header responsiveness check. */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.resolve("docs/screenshots");
const PORT = 9225;
const USER_DIR = path.resolve(".chrome-shot-profile");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForJson(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch {}
    await sleep(250);
  }
  throw new Error(`Timeout ${url}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}, timeoutMs = 15000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result?.value;
  }
  async shot(file) {
    const { data } = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(path.join(OUT, file), Buffer.from(data, "base64"));
    console.log("✓", file);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${USER_DIR}`,
      "--no-first-run",
      "--hide-scrollbars",
      "--window-size=390,844",
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  let ws;
  try {
    const targets = await waitForJson(`http://127.0.0.1:${PORT}/json/list`);
    const page = targets.find((t) => t.type === "page");
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", rej, { once: true });
    });
    const cdp = new Cdp(ws);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await cdp.send("Page.navigate", { url: `${BASE}/snap` });
    await sleep(3000);

    // Onboard if needed
    const hasOnboard = await cdp.evaluate(
      `!!document.querySelector('input[placeholder="e.g. Neon_Runner"]')`
    );
    if (hasOnboard) {
      await cdp.evaluate(`
        (() => {
          const input = document.querySelector('input[placeholder="e.g. Neon_Runner"]');
          const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
          s.call(input, "Neon_Judge");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          return "ok";
        })()
      `);
      await sleep(200);
      await cdp.evaluate(`
        (() => {
          const b = [...document.querySelectorAll("button")];
          b.find((x) => x.textContent?.includes("Photographer"))?.click();
          b.find((x) => x.textContent?.includes("Smooth & Witty"))?.click();
          return "ok";
        })()
      `);
      await sleep(200);
      await cdp.evaluate(`
        (() => {
          [...document.querySelectorAll("button")]
            .find((x) => x.textContent?.includes("CREATE IDENTITY"))?.click();
          return "ok";
        })()
      `);
      await sleep(2500);
    }

    await cdp.shot("09-mobile-feed.png");

    // Verify profile avatar is visible in header
    const profileVisible = await cdp.evaluate(`
      (() => {
        const header = document.querySelector("header");
        if (!header) return "no-header";
        const img = header.querySelector('img[alt=""]');
        if (!img) return "no-avatar";
        const r = img.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0 && r.right <= window.innerWidth + 1 && r.left >= -1;
        return JSON.stringify({ visible, left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth });
      })()
    `);
    console.log("profile avatar:", profileVisible);

    // Studio header check
    await cdp.evaluate(`
      (() => {
        [...document.querySelectorAll("button")]
          .find((x) => x.textContent?.includes("CREATE"))?.click();
        return "ok";
      })()
    `);
    await sleep(1200);
    await cdp.shot("10-mobile-studio.png");
    console.log("done");
  } finally {
    try {
      ws?.close();
    } catch {}
    chrome.kill("SIGTERM");
    await sleep(400);
    try {
      process.kill(chrome.pid);
    } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

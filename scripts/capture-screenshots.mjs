/**
 * Capture submission screenshots via Chrome DevTools Protocol.
 * No extra deps — Node 18+ has a global WebSocket.
 *
 * Usage: node scripts/capture-screenshots.mjs
 * Requires: production server on :3000, Chrome installed.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("docs/screenshots");
const PORT = 9223;
const USER_DIR = path.resolve(".chrome-shot-profile");
const CHROME =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForJson(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  throw new Error(`Timeout waiting for ${url}`);
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

  async evaluate(expression, awaitPromise = true) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.text ?? "evaluate failed");
    }
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
  console.log("launching chrome…");

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${USER_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  try {
    console.log("waiting for devtools…");
    const targets = await waitForJson(`http://127.0.0.1:${PORT}/json/list`);
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("No page target");
    console.log("connecting ws…");

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", rej, { once: true });
    });

    const cdp = new Cdp(ws);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    console.log("cdp ready");

    /* 1 — Splash */
    console.log("→ splash");
    await cdp.send("Page.navigate", { url: `${BASE}/` });
    await sleep(1800);
    await cdp.shot("01-splash.png");

    /* 2 — Onboarding (fresh profile → onboarding gate) */
    console.log("→ onboarding");
    await cdp.send("Page.navigate", { url: `${BASE}/snap` });
    await sleep(2500);
    await cdp.shot("02-onboarding.png");

    /* Complete onboarding via React-friendly input events */
    await cdp.evaluate(`
      (() => {
        const input = document.querySelector('input[placeholder="e.g. Neon_Runner"]');
        if (!input) return "no-input";
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        setter.call(input, "Neon_Judge");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return "ok";
      })()
    `);
    await sleep(300);
    await cdp.evaluate(`
      (() => {
        const btns = [...document.querySelectorAll("button")];
        const arch = btns.find((b) => b.textContent?.includes("Photographer"));
        const pers = btns.find((b) => b.textContent?.includes("Smooth & Witty") || b.textContent?.includes("Smooth"));
        if (arch) arch.click();
        if (pers) pers.click();
        return arch && pers ? "ok" : "missing";
      })()
    `);
    await sleep(300);
    await cdp.evaluate(`
      (() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          b.textContent?.includes("CREATE IDENTITY")
        );
        if (btn) btn.click();
        return btn ? "ok" : "missing";
      })()
    `);
    await sleep(2800);
    await cdp.shot("03-feed.png");

    /* 3 — Open Studio */
    console.log("→ studio");
    await cdp.evaluate(`
      (() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          b.textContent?.includes("CREATE MOMENT")
        );
        if (btn) btn.click();
        return btn ? "ok" : "missing";
      })()
    `);
    await sleep(1200);
    await cdp.shot("04-studio-dropzone.png");

    /* Load sample shot → Unlayer editor mounts */
    console.log("→ sample + editor");
    await cdp.evaluate(`
      (() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          b.textContent?.includes("LOAD A VICE CITY SAMPLE")
        );
        if (btn) btn.click();
        return btn ? "ok" : "missing";
      })()
    `);
    /* Wait for editor LIVE badge (CDN load can take a few seconds) */
    for (let i = 0; i < 40; i++) {
      const ready = await cdp.evaluate(`
        document.body.innerText.includes("UNLAYER EDITOR // LIVE")
      `);
      if (ready) break;
      await sleep(500);
    }
    await sleep(800);
    await cdp.shot("05-editor.png");

    /* Type a caption if empty */
    await cdp.evaluate(`
      (() => {
        const ta = document.querySelector("textarea");
        if (ta && !ta.value) {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
          setter.call(ta, "Neon nights on Ocean Drive #vicecity");
          ta.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return "ok";
      })()
    `);
    await sleep(200);

    /* 4 — Publish → Reveal scan */
    console.log("→ publish");
    await cdp.evaluate(`
      (() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /^PUBLISH/.test(b.textContent?.trim() ?? "")
        );
        if (btn) btn.click();
        return btn ? "ok" : "missing";
      })()
    `);
    await sleep(700);
    await cdp.shot("06-reveal-scan.png");

    /* Wait for live stage */
    for (let i = 0; i < 40; i++) {
      const live = await cdp.evaluate(`
        document.body.innerText.includes("EDIT AGAIN") || document.body.innerText.includes("NETWORK ACTIVITY")
      `);
      if (live) break;
      await sleep(400);
    }
    await sleep(6000); /* let first engagement land */
    await cdp.shot("07-reveal-live.png");

    /* 5 — Back to feed (focus highlight on own post) */
    console.log("→ feed focus");
    await cdp.evaluate(`
      (() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          b.textContent?.includes("BACK TO FEED")
        );
        if (btn) btn.click();
        return btn ? "ok" : "missing";
      })()
    `);
    await sleep(1600);
    await cdp.shot("08-feed-own-moment.png");

    console.log("All screenshots written to", OUT);
  } finally {
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    chrome.kill("SIGTERM");
    await sleep(500);
    try {
      process.kill(chrome.pid);
    } catch {
      /* already dead */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

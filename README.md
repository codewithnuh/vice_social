# VICE SOCIAL

A fan-made, GTA VI–inspired in-game social network for the web — a neon-soaked "phone app" from Vice City that runs entirely in your browser. Post moments, build crew status, earn REP, and watch the city react to you in real time.

> This is a fan-made project inspired by Rockstar Games' Grand Theft Auto series. Not affiliated with or endorsed by Rockstar Games.

---

## 📸 The Image Editor (the main thing)

The heart of the app is the **[Unlayer Image Editor](https://unlayer.com)** (`@unlayer/react-image-editor`) — it powers the entire content-creation flow. You upload a photo and edit it with a full production-grade editor, exactly like the in-game Snapmatic camera:

**What it does:**

- **Crop & Resize** — frame your shot before it hits the feed
- **Filters** — cinematic color grades in one tap
- **Draw** — freehand markup directly on the image
- **Text** — overlay captions and typography
- **Shapes & Stickers** — decorate your moment
- **Frames** — finishing touches
- **Dark theme** — matches the Vice HUD aesthetic

**How it works in the app:**

1. **CREATE MOMENT** (pink FAB on the feed) opens the Creation Studio
2. **Upload** — file browser or drag-and-drop (PNG / JPEG / WebP, max 10MB), validated client-side
3. **Edit** — the Unlayer editor mounts with the dark theme and all tools enabled (crop, resize, filter, draw, text, shapes, stickers, frame). A "LOADING EDITOR..." overlay covers the mount until `onLoad` fires
4. **Caption** — a live sidebar holds your post caption (200 chars, hashtag-aware)
5. **Proceed →** the edited render is captured via the editor's `onSave` callback (`dataUrl`) and sent to the cinematic **Reveal screen** (scan animation → publish to feed)

There is **no pre-made template selection** — upload goes straight into the editor by design. The "EDIT AGAIN" flow re-opens the studio with your previous render pre-loaded so you can iterate.

**Integration details** are in `components/vice/vice-studio.tsx` — the editor is a controlled component (`image={rawImage}`) wrapped in the HUD chrome, with `onSave` / `onCancel` / `onError` / `onLoadError` wired to app state.

---

## 🌴 What Else Is Inside

### The Feed (`/snap`)

A three-column HUD layout straight out of the reference HTML: profile card + hot districts on the left, the moment stream in the center, live network ticker + crew + creators directory on the right.

- **Working tabs** — TRENDING (engagement-sorted), NEARBY (filters to your district), CREW FEED (only you + who you follow)
- **Real interactions** — like, repost, comment (persisted), follow, delete your own posts
- **Clickable everything** — usernames/avatars open player profiles; hashtags filter the stream with a removable chip
- **Live FPS counter** — measured via `requestAnimationFrame`, not faked
- **Live Vice City clock** (UTC)

### The Simulation — the city is alive

This is not a static mockup. A client-side simulation makes Vice City feel populated:

- **Reaction waves** — publish a moment and NPCs notice over the next minute: 3–6 likes (+15 REP each), 1–2 comments from 14 templates with `{name}`/`{district}` interpolation (+40 REP), a 40% chance of a crew recruit, a 35% chance of a +250 REP bounty
- **NPC uploads** — every 90s a creator posts a *new* moment into the feed (drawn from `data/vice/npc-moments.json`, ±30% engagement variance), with a ticker event. Only creators you follow ping your inbox
- **Ambient ticker** — drift spottings, turf claims, weather nets every 45s
- **Notifications** — every NPC action produces both an ephemeral game-style toast (with avatar, auto-dismiss, click-to-profile) and a **persistent inbox entry** (bell icon → slide-over panel, unread badge, mark-all-read, clear)

### Identity & Progression

- **Fully configurable player profile** — name, crew tag, avatar (upload or URL), bio, home district. Click your card in the header
- **REP system** — score, levels (1 per 620 REP), district rank, progress bar; gains are animated toasts
- **Reset** — wipe everything back to the file-backed seed state

### Persistence

**IndexedDB** (via a hand-rolled, transaction-safe layer — no wrapper libraries). Everything survives reloads: posts, likes, comments, follows, profile, REP, notifications, ticker events. Seed data is only injected into an empty database; your data always wins. If IndexedDB is unavailable, the app degrades gracefully to in-memory seed data.

### File-backed seed content

All initial content lives in **real JSON files** under `data/vice/` — edit them and reset to reshape the city:

| File | Contents |
|---|---|
| `players.json` | Creator directory + your default identity (`defaultPlayer: true`) |
| `posts.json` | Seed moments (timestamps as `minutesAgo`) |
| `comments.json` | Seed comments |
| `notifications.json` | Seed inbox entries |
| `events.json` | Seed ticker events |
| `npc-moments.json` | 12-moment pool NPCs post from over time |

---

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) → splash → **ENTER VICE SOCIAL** → `/snap`.

```bash
pnpm build   # production build
pnpm start   # serve production build
```

## Project Structure

```
data/vice/               # ← Seed content as real JSON files (editable)
  players.json             Creator directory + default player
  posts.json               Seed moments
  comments.json            Seed comments
  notifications.json       Seed inbox entries
  events.json              Seed ticker events
  npc-moments.json         NPC upload pool

lib/
  vice-data.ts             Types, JSON→typed seed normalization, helpers
  vice-db.ts               Typed IndexedDB layer (transaction-safe)
  vice-...                 (provider in components/vice)
  sfx.ts                   Web Audio SFX engine (click/shutter/beep)

components/vice/
  vice-app.tsx             Orchestrator: screens, provider, modals
  vice-provider.tsx        The store: state + mutations + NPC simulation
  vice-feed.tsx            Feed screen (3-column HUD, tabs, FPS, clock)
  vice-post-card.tsx       Post card (likes, comments, repost, follow)
  vice-studio.tsx          ← Unlayer editor integration (see above)
  vice-reveal.tsx          Scan animation → publish/share/export
  player-modal.tsx         Creator profile modal
  profile-editor.tsx       Your identity editor
  notification-inbox.tsx   Bell + slide-over inbox
  toast-stack.tsx          Ephemeral game-style toasts
  hud-controls.tsx         REP pill + clock + audio toggle
  ambient-canvas.tsx       Floating particle canvas
  chrome.tsx               CRT scanline overlay

app/
  page.tsx                 Entry splash (server component)
  snap/page.tsx            Vice Social experience (client)
  layout.tsx               Fonts + metadata
  globals.css              Design tokens, neon utilities, keyframes
```

---

## Tech Details

**Stack**

- **Next.js 16** (App Router) + **React 19** + **TypeScript (strict, zero `any`)**
- **Tailwind CSS v4** — design tokens as CSS custom properties in a `@theme` block (`void-black`, `urban-graphite`, `night-steel`, `neon-pink #FF3B81`, `neon-cyan #00E5FF`, `amber-gold #FFB84D`); custom utilities (`.hud-glass`, `.crt-overlay`, `.gradient-vice-text`, `.scanline-y`) and keyframes (`float`, `toastIn`, `slideInRight`) live alongside
- **Fonts** — Space Grotesk (display), Inter (UI), JetBrains Mono (HUD numerics) via `next/font`, exposed as CSS variables wired into the theme tokens
- **Unlayer** `@unlayer/react-image-editor` — the content-creation engine (see top of this file)
- **lucide-react** icons; **pnpm** package manager

**Architecture**

- **Single store, no state library** — `ViceProvider` is one React context owning all social state (profile, posts, comments, events, players, notifications, toasts). Mutations are `useCallback` functions that update state optimistically and persist to IndexedDB fire-and-forget. The screen tree (`feed` → `studio` → `reveal`) is plain component state in `vice-app.tsx`
- **Typed JSON seed pipeline** — `vice-data.ts` declares the on-disk JSON shapes (`PlayerFileEntry`, …), imports the files via `resolveJsonModule`, validates districts against a whitelist, resolves avatars via an author→avatar map, converts `minutesAgo` → epoch timestamps, and exports runtime seeds. This runs at module load on the client
- **IndexedDB layer** — versioned schema (v3, six stores), strict transaction discipline: issue all requests synchronously, await transaction completion once, never request on a committed transaction (the classic IndexedDB foot-gun — see the comment block in `vice-db.ts`). Full reset reseeds from the JSON files
- **Simulation** — three timers in the provider: the reaction-wave scheduler (per-publish `setTimeout`s tracked in a ref, StrictMode-safe with cleanup), the ambient ticker `setInterval` (45s), and the NPC upload `setInterval` (90s). All pause when `document.visibilityState !== "visible"` and persist their outputs
- **SFX** — a tiny Web Audio synthesizer (`lib/sfx.ts`): oscillator + gain envelopes for click/shutter/beep, lazily-created `AudioContext`, user-toggleable
- **Landing page** is a server component (static, fast); all interactive screens are client components behind `/snap`

**Notable engineering choices**

- Optimistic UI everywhere — state updates render instantly; IndexedDB writes are async and failure-tolerant
- The player's directory entry is kept in sync with their profile (REP grants update both)
- Upload validation (type + 10MB cap) happens before the editor mounts
- Strict ESLint (`eslint-config-next` + `react-hooks`) and `tsc --noEmit` both pass clean; the build is fully static

## License

Fan-made project inspired by Rockstar Games' Grand Theft Auto series. Not affiliated with or endorsed by Rockstar Games.

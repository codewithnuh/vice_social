# Vice City Suite

A GTA-inspired web application featuring two main experiences: a **Vice City ID** character identity card creator and a **Snapmatic** social media feed.

## Features

### Snapmatic — Social Feed (`/snap`)

A fully-featured social media feed inspired by GTA's in-game Snapmatic app.

- **Feed** — Scroll through posts with images, captions, hashtags, and comments
- **Stories** — Horizontal story carousel with full-screen viewer and auto-advance
- **Compose** — 3-step flow: upload photo → edit with image editor (filters, stickers, text, shapes, crop, resize, draw, frames) → add caption, location, and tags → post
- **Like/Save** — Double-tap to like (with heart animation), bookmark posts
- **Comments** — Expandable comment threads with inline posting
- **Profile** — User profile with post grid and saved posts tab
- **Explore** — Browse trending posts, popular hashtags, and parody locations
- **Notifications** — Filterable notification feed with like/comment/follow/wanted alerts
- **5 Themes** — Vice Neon, Ocean Drive, Sunset Blvd, Malibu Nights, Gold Coast — all switchable and persisted
- **IndexedDB Persistence** — Posts, likes, saves, comments, and theme preference survive page reloads
- **Responsive** — Mobile bottom nav, tablet, desktop sidebar layout

### Vice City ID — Identity Card Creator (`/studio`)

Create GTA-style character identity cards.

- **4 Templates** — Nightlife, VIP, Street Legend, Neon Runner
- **Photo Upload** — Drag-and-drop portrait upload
- **Image Editor** — Full `@unlayer/react-image-editor` integration with all tools
- **Customize** — Name your character, live card preview with holographic effects
- **Export** — Download your ID card as PNG
- **Cinematic Landing** — Animated entrance with neon effects

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (base-mira style)
- **Image Editor:** `@unlayer/react-image-editor`
- **Animations:** `motion/react` (Framer Motion)
- **Icons:** `lucide-react`
- **Persistence:** IndexedDB (client-side, no backend)
- **Package Manager:** pnpm

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

## Project Structure

```
app/
  layout.tsx          # Root layout with Inter font
  page.tsx            # Landing page (Hero)
  globals.css         # Theme CSS, neon utilities, holographic effects
  snap/page.tsx       # Snapmatic social feed
  studio/page.tsx     # Vice City ID studio

components/
  landing/
    hero.tsx          # Cinematic landing page
  snapmatic/
    snapmatic-feed.tsx    # Main feed layout orchestrator
    snap-header.tsx       # Header with nav, search, theme switcher
    post-card.tsx         # Post card with interactions
    compose-modal.tsx     # 3-step compose with image editor
    stories-row.tsx       # Stories carousel
    story-viewer.tsx      # Full-screen story viewer
    profile-panel.tsx     # User profile with grid
    explore-panel.tsx     # Explore trending/tags/places
    notifications-panel.tsx  # Notification feed
    theme-provider.tsx    # Theme context with 5 color schemes
  studio/
    studio-layout.tsx     # 5-step studio orchestrator
    template-selector.tsx # Identity card template picker
    upload-zone.tsx       # Portrait upload
    image-editor.tsx      # @unlayer/react-image-editor wrapper
    card-customize.tsx    # Name input + live card preview
    card-reveal.tsx       # Finished ID card with download
  ui/
    button.tsx            # shadcn Button component

lib/
  utils.ts            # cn() + formatNumber() utilities
  editor-config.ts    # Image editor configuration
  snapmatic-data.ts   # Mock users, posts, stories, GTA parody data
  snapmatic-db.ts     # IndexedDB CRUD operations
```

## Design Principles

- **Emil Kowalski's philosophy** — Spring-like easing `[0.23, 1, 0.32, 1]`, stagger animations, spatial consistency
- **Dark theme** with configurable neon color palettes
- **No backend** — All data stays in the browser via IndexedDB
- **GTA-inspired** — Parody usernames, wanted level badges, Vice City locations, neon aesthetics

## License

This is a fan-made project inspired by Rockstar Games' Grand Theft Auto series. Not affiliated with or endorsed by Rockstar Games.

/** Shared fullscreen FX: CRT scanline overlay (pure CSS, no client JS needed). */
export function CrtOverlay() {
  return (
    <div
      className="crt-overlay pointer-events-none fixed inset-0 z-40"
      aria-hidden="true"
    />
  );
}

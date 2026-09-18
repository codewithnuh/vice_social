import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AmbientCanvas } from "@/components/vice/ambient-canvas";
import { CrtOverlay } from "@/components/vice/chrome";
import { SPLASH_PREVIEWS } from "@/lib/vice-data";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AmbientCanvas />
      <CrtOverlay />

      {/* Radial glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-pink/10 blur-[140px]" />
        <div className="-bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-neon-cyan/10 blur-[120px]" />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="animate-float z-10 mx-auto max-w-4xl space-y-8">
          {/* Badge */}
          <div className="hud-glass inline-flex items-center gap-2 rounded-full border border-neon-cyan/40 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-neon-cyan shadow-lg shadow-neon-cyan/10">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-cyan" />
            <span>VICE CITY METROPOLITAN NETWORK v3.09</span>
          </div>

          {/* Title & tagline */}
          <div className="space-y-4">
            <h1 className="title-drop-glow font-display text-6xl font-black uppercase italic tracking-tight text-white sm:text-8xl md:text-9xl">
              VICE
              <span className="gradient-vice-text">SOCIAL</span>
            </h1>
            <p className="mx-auto max-w-2xl font-mono text-xl font-medium tracking-wide text-slate-300 sm:text-2xl">
              THE CITY&apos;S DIGITAL IDENTITY FRAMEWORK
            </p>
            <p className="mx-auto max-w-md text-sm text-slate-400 sm:text-base">
              Capture legendary street moments, flex custom vehicles, build crew
              status, and claim your digital identity in Vice City.
            </p>
          </div>

          {/* Floating previews */}
          <div className="mx-auto grid max-w-xl grid-cols-3 gap-4 pt-4 opacity-80 transition duration-500 hover:opacity-100">
            {SPLASH_PREVIEWS.map((p) => (
              <div
                key={p.id}
                className={`hud-glass rounded-xl border border-white/5 p-3 text-left transition ${p.cardClass}`}
              >
                <div className={`font-mono text-[10px] ${p.labelClass}`}>
                  {p.label}
                </div>
                <div className={`truncate text-xs font-bold ${p.titleClass}`}>
                  {p.title}
                </div>
                <div className="mt-1 text-[11px] text-slate-300">{p.body}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-6">
            <Link
              href="/snap"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 px-10 py-4 font-display text-lg font-black uppercase tracking-widest text-white shadow-2xl shadow-neon-pink/40 transition-all duration-300 hover:scale-105 hover:shadow-neon-pink/70 active:scale-95"
            >
              <span className="absolute inset-0 h-full w-full -translate-x-full transform bg-white/20 transition-transform duration-1000 group-hover:translate-x-full" />
              <span className="relative flex items-center gap-3">
                <span>ENTER VICE SOCIAL</span>
                <ArrowRight
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
            <div className="mt-3 font-mono text-xs text-slate-500">
              NO ACCOUNT REQUIRED • ENCRYPTED NETWORK
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

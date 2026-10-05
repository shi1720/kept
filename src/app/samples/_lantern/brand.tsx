/**
 * Shared bits of the fictional "Lantern Coffee Roasters" site used as demo
 * deliverables. Everything here renders on the server so the probed HTML
 * contains the full content (Kept's evidence engine never runs client JS).
 *
 * Palette mirrors the brand guide Ana delivers in the seeded demo:
 * Ember #C2410C · Roast #3B2A20 · Cream #F6EEDF · Brass #B88A3B
 */

export const PREORDER_HREF = "mailto:hello@lantern.coffee?subject=Holiday%20Blend%20pre-order";

export function LanternMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 12h16l-2-4H14z" fill="currentColor" />
      <rect x="11" y="12" width="18" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M20 17c2.6 3 3.4 5 3.4 7a3.4 3.4 0 0 1-6.8 0c0-2 .8-4 3.4-7z" fill="#C2410C" />
      <path d="M13 32h14l-1.5 3h-11z" fill="currentColor" />
    </svg>
  );
}

export function LanternHeader({ nav = true }: { nav?: boolean }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-5 sm:px-8">
      <a href="#top" className="flex items-center gap-2.5 text-[#3B2A20]">
        <LanternMark />
        <span className="display text-[22px] leading-none tracking-tight">Lantern Coffee Roasters</span>
      </a>
      {nav && (
        <nav className="ml-auto flex items-center gap-1 text-[13px] font-medium text-[#3B2A20]/80">
          <a href="#story" className="hidden rounded-full px-3 py-2 hover:bg-[#3B2A20]/5 sm:block">Story</a>
          <a href="#faq" className="hidden rounded-full px-3 py-2 hover:bg-[#3B2A20]/5 sm:block">FAQ</a>
          <a href="#preorder" className="rounded-full border border-[#3B2A20]/20 px-4 py-2 text-[#3B2A20] hover:bg-[#3B2A20] hover:text-[#F6EEDF]">Pre-order</a>
        </nav>
      )}
    </header>
  );
}

/** An illustrated 12oz bag, drawn in SVG so it needs no image assets. */
export function HolidayBag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 400" className={className} role="img" aria-label="A 12oz bag of Lantern Holiday Blend">
      <defs>
        <linearGradient id="bag-body" x1="0" x2="1">
          <stop offset="0" stopColor="#2c1f17" />
          <stop offset="0.45" stopColor="#4a3628" />
          <stop offset="1" stopColor="#24180f" />
        </linearGradient>
        <linearGradient id="bag-label" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbf4e6" />
          <stop offset="1" stopColor="#efe2c8" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="382" rx="120" ry="12" fill="#3B2A20" opacity="0.18" />
      <path d="M58 40h204l14 330c0 8-6 12-14 12H58c-8 0-14-4-14-12z" fill="url(#bag-body)" />
      <path d="M58 40h204v26H58z" fill="#1d140e" />
      {Array.from({ length: 17 }, (_, i) => (
        <path key={i} d={`M${64 + i * 12} 40v26`} stroke="#3B2A20" strokeWidth="2" />
      ))}
      <path d="M210 40l66 330" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="28" />
      <rect x="84" y="118" width="152" height="196" rx="10" fill="url(#bag-label)" />
      <rect x="92" y="126" width="136" height="180" rx="6" fill="none" stroke="#B88A3B" strokeWidth="1.2" />
      <g transform="translate(142 140)" color="#3B2A20">
        <LanternGlyph />
      </g>
      <text x="160" y="214" textAnchor="middle" fontFamily="var(--font-instrument), Georgia, serif" fontSize="30" fill="#3B2A20">Holiday</text>
      <text x="160" y="244" textAnchor="middle" fontFamily="var(--font-instrument), Georgia, serif" fontSize="30" fontStyle="italic" fill="#C2410C">Blend</text>
      <path d="M118 260h84" stroke="#B88A3B" strokeWidth="1" />
      <text x="160" y="280" textAnchor="middle" fontFamily="var(--font-inter), sans-serif" fontSize="9" letterSpacing="2.5" fill="#3B2A20">HUILA · COLOMBIA</text>
      <text x="160" y="296" textAnchor="middle" fontFamily="var(--font-inter), sans-serif" fontSize="8" letterSpacing="2" fill="#8a6d4f">12 OZ · WHOLE BEAN</text>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={96 + i * 26} cy={348} r="2.2" fill="#B88A3B" opacity="0.7" />
      ))}
    </svg>
  );
}

function LanternGlyph() {
  return (
    <g>
      <circle cx="18" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 11h16l-2-4H12z" fill="currentColor" />
      <rect x="9" y="11" width="18" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M18 16c2.8 3.2 3.6 5.4 3.6 7.4a3.6 3.6 0 0 1-7.2 0c0-2 .8-4.2 3.6-7.4z" fill="#C2410C" />
      <path d="M11 33h14l-1.5 3h-11z" fill="currentColor" />
    </g>
  );
}

export const TASTING_NOTES = [
  { name: "Dark cherry", swatch: "bg-[radial-gradient(circle_at_35%_30%,#b91c1c,#5b1414)]" },
  { name: "Cocoa nib", swatch: "bg-[radial-gradient(circle_at_35%_30%,#7a5a44,#2c1f17)]" },
  { name: "Orange peel", swatch: "bg-[radial-gradient(circle_at_35%_30%,#fb923c,#C2410C)]" },
] as const;

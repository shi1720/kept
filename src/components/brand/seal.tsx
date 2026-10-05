import { cn } from "@/lib/cn";

/** The wax seal shown on signed pacts; the visual signature of "a promise, kept". */
export function Seal({ size = 72, label = "SEALED", className, tone = "ember" }: { size?: number; label?: string; className?: string; tone?: "ember" | "jade" }) {
  const fill = tone === "ember" ? "#c2410c" : "#0f6b57";
  const dark = tone === "ember" ? "#9a330a" : "#0b5646";
  const id = `seal-${tone}-${label.replace(/\W/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={cn("drop-shadow-[0_3px_6px_rgba(0,0,0,0.18)]", className)} aria-label={label}>
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="60%" stopColor={fill} stopOpacity="0" />
        </radialGradient>
        <path id={`${id}-p`} d="M50,50 m-31,0 a31,31 0 1,1 62,0 a31,31 0 1,1 -62,0" />
      </defs>
      <path
        d="M50 4c6 0 8 5 13 6s10-2 14 2 1 9 4 13 8 5 9 11-4 8-4 14 5 9 3 14-8 4-11 8-2 10-7 12-9-2-14-1-9 6-15 5-7-6-12-8-11 0-14-4 0-9-3-13-8-6-8-12 6-7 6-13-6-9-3-14 9-3 12-7 1-10 6-12 9 2 14 1 6-7 12-7z"
        fill={fill}
      />
      <circle cx="50" cy="50" r="38" fill="none" stroke={dark} strokeWidth="2" opacity="0.6" />
      <circle cx="50" cy="50" r="24" fill={dark} opacity="0.35" />
      <text fontSize="9.5" fontWeight="700" letterSpacing="2.4" fill="#fff" opacity="0.85" fontFamily="var(--font-inter)">
        <textPath href={`#${id}-p`} startOffset="0">
          {`${label} · ${label} · `}
        </textPath>
      </text>
      <path d="M41 37v26M41 51l12-14M46 46l11 17" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.92" />
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-g)`} />
    </svg>
  );
}

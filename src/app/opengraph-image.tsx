import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Kept: promises, kept. Escrow with an AI referee for freelance work agreed anywhere, built on PayPal.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  paper: "#faf8f3",
  paper2: "#f3efe6",
  card: "#ffffff",
  ink: "#16140f",
  ink2: "#4a463e",
  ink3: "#8a857a",
  line: "#e7e1d5",
  jade: "#0f6b57",
  jade500: "#148a6f",
  jade50: "#eaf4f0",
  ember: "#c2410c",
  emberDark: "#9a330a",
  amber50: "#fbf4e6",
  amber700: "#84540b",
  sky50: "#eef4ff",
  sky600: "#1d4ed8",
};

async function font(file: string) {
  try {
    return await readFile(join(process.cwd(), "src/components/marketing/fonts", file));
  } catch {
    return null;
  }
}

function Check({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.2" />
      <path d="M8 12.5l2.6 2.6L16 9.7" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Image() {
  const [sans, sansBold, serif, serifItalic] = await Promise.all([
    font("InstrumentSans-Regular.ttf"),
    font("InstrumentSans-Bold.ttf"),
    font("InstrumentSerif-Regular.ttf"),
    font("InstrumentSerif-Italic.ttf"),
  ]);
  const fonts = [
    ...(sans ? [{ name: "Instrument Sans", data: sans, style: "normal" as const, weight: 400 as const }] : []),
    ...(sansBold ? [{ name: "Instrument Sans", data: sansBold, style: "normal" as const, weight: 600 as const }] : []),
    ...(serif ? [{ name: "Instrument Serif", data: serif, style: "normal" as const, weight: 400 as const }] : []),
    ...(serifItalic ? [{ name: "Instrument Serif", data: serifItalic, style: "italic" as const, weight: 400 as const }] : []),
  ];
  const display = serif ? "Instrument Serif" : "serif";

  const criteria = [
    ["Page is live and publicly reachable", true],
    ["Names “Holiday Blend” and its price", true],
    ["Has a clear “Pre-order” call to action", true],
    ["Matches Lantern’s warm, craft brand", false],
  ] as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: C.paper,
          backgroundImage: "linear-gradient(to bottom, rgba(22,20,15,0.045) 1px, transparent 1px)",
          backgroundSize: "100% 36px",
          padding: "56px 64px",
          position: "relative",
          fontFamily: sans ? "Instrument Sans" : "sans-serif",
          color: C.ink,
        }}
      >
        <div style={{ position: "absolute", right: -120, top: -140, width: 520, height: 520, borderRadius: 9999, background: "rgba(208,232,223,0.75)", filter: "blur(60px)", display: "flex" }} />
        <div style={{ position: "absolute", left: 380, bottom: -220, width: 460, height: 460, borderRadius: 9999, background: "rgba(251,220,201,0.55)", filter: "blur(60px)", display: "flex" }} />

        {/* Left: brand + headline */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="48" height="48" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="16" fill={C.jade} />
              <path d="M20 16v32M20 33l16-17M27 27l15 21" stroke={C.paper} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="46" cy="18" r="5" fill="#d9541e" />
            </svg>
            <span style={{ fontFamily: display, fontSize: 44, lineHeight: 1 }}>Kept</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: display, fontSize: 132, lineHeight: 0.92, letterSpacing: -2, display: "flex" }}>Promises,</div>
            <div style={{ fontFamily: display, fontStyle: "italic", fontSize: 132, lineHeight: 0.98, letterSpacing: -2, color: C.jade, display: "flex" }}>kept.</div>
            <div style={{ marginTop: 28, fontSize: 26, lineHeight: 1.35, color: C.ink2, maxWidth: 540, display: "flex" }}>
              Clear agreements, shared evidence, and PayPal payments for freelance work.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {["Built on PayPal", "Evidence-led AI", "Both sides sign"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: `1px solid ${C.line}`,
                  background: C.card,
                  fontSize: 19,
                  color: C.ink2,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Right: pact card */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end", position: "relative" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 420,
              background: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 24,
              boxShadow: "0 24px 60px -24px rgba(22,20,15,0.28)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", padding: "24px 26px 18px", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", flexDirection: "column", width: 250 }}>
                <div style={{ fontSize: 13, letterSpacing: 2.5, color: C.ink3, display: "flex" }}>EXAMPLE · MILESTONE 1</div>
                <div style={{ fontSize: 21, fontWeight: 600, marginTop: 6, lineHeight: 1.25, display: "flex" }}>Pre-order landing page for the Holiday Blend</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ fontSize: 26, fontWeight: 600, display: "flex" }}>$4,500.00</div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 8,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: C.amber50,
                    color: C.amber700,
                    fontSize: 14,
                  }}
                >
                  In escrow
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 26px" }}>
              {criteria.map(([text, auto]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, color: C.ink2 }}>
                  <Check color={auto ? C.jade500 : "#c98a1c"} />
                  <span style={{ display: "flex", flex: 1 }}>{text}</span>
                  <span
                    style={{
                      display: "flex",
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: auto ? C.sky50 : C.paper2,
                      color: auto ? C.sky600 : C.ink3,
                    }}
                  >
                    {auto ? "auto" : "judged"}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 26px 22px", borderTop: `1px dashed #d9d1c2` }}>
              <div style={{ display: "flex", width: 72, height: 72, alignItems: "center", justifyContent: "center", position: "relative" }}>
                <svg width="72" height="72" viewBox="0 0 100 100" style={{ position: "absolute", left: 0, top: 0, transform: "rotate(-90deg)" }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#efe9de" strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke={C.jade} strokeWidth="10" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset="15" />
                </svg>
                <span style={{ fontSize: 24, fontWeight: 600, color: C.jade }}>94</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 17, fontWeight: 600 }}>AI referee · Evidence</div>
                <div style={{ display: "flex", fontSize: 15, color: C.ink2, marginTop: 4 }}>Review evidence together</div>
              </div>
            </div>

            {/* Wax seal */}
            <svg width="112" height="112" viewBox="0 0 100 100" style={{ position: "absolute", right: -40, bottom: -40, transform: "rotate(-12deg)" }}>
              <path
                d="M50 4c6 0 8 5 13 6s10-2 14 2 1 9 4 13 8 5 9 11-4 8-4 14 5 9 3 14-8 4-11 8-2 10-7 12-9-2-14-1-9 6-15 5-7-6-12-8-11 0-14-4 0-9-3-13-8-6-8-12 6-7 6-13-6-9-3-14 9-3 12-7 1-10 6-12 9 2 14 1 6-7 12-7z"
                fill={C.ember}
              />
              <circle cx="50" cy="50" r="38" fill="none" stroke={C.emberDark} strokeWidth="2" opacity="0.6" />
              <circle cx="50" cy="50" r="24" fill={C.emberDark} opacity="0.35" />
              <path d="M41 37v26M41 51l12-14M46 46l11 17" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.92" />
            </svg>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://kept-pacts.web.app"),
  title: { default: "Kept | Clear agreements. PayPal payments.", template: "%s · Kept" },
  description:
    "Clear freelance agreements, PayPal milestone payments, and AI reviews with evidence both sides can see.",
  openGraph: {
    title: "Kept | Promises kept.",
    description: "Clear freelance agreements, shared evidence, and PayPal payments.",
    type: "website",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#faf8f3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" toastOptions={{ className: "!rounded-xl !border-line !font-sans" }} />
      </body>
    </html>
  );
}

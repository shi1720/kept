import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "Kept — escrow with an AI referee, built on PayPal", template: "%s · Kept" },
  description:
    "Turn the DM where a deal was made into a contract that enforces itself. Kept holds the money with PayPal, an AI referee checks the work against the criteria you both signed, and payment is released — or fairly split — in minutes.",
  openGraph: {
    title: "Kept — promises, kept.",
    description: "Escrow with an AI referee for freelance work agreed anywhere on the internet. Built on PayPal.",
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

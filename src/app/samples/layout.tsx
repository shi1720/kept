import type { Metadata } from "next";

/**
 * Sample deliverables for the demo. These are stand-alone "client sites" the
 * freelancer delivers by URL; deliberately outside the Kept app shell, and
 * fully server-rendered so Kept's evidence engine sees all content in the
 * initial HTML.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SamplesLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-1 flex-col bg-[#FBF6EC] text-[#3B2A20]">{children}</div>;
}

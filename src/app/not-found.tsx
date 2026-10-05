import type { Metadata } from "next";
import { NotFoundContent } from "@/components/app/not-found-content";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center">
      <NotFoundContent />
      <Logo className="mb-12 opacity-60" />
    </main>
  );
}

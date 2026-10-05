import type { Metadata } from "next";
import { NotFoundContent } from "@/components/app/not-found-content";

export const metadata: Metadata = { title: "Not found" };

/** 404s inside the app keep the sidebar and header. */
export default function AppNotFound() {
  return <NotFoundContent inApp />;
}

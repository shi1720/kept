import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <Link href="/login" className="display text-5xl">Kept</Link>
    </main>
  );
}

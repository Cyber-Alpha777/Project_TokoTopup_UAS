"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import TopupForm from "./TopupForm";
import { useCatalog } from "@/lib/catalog";
import { useNow } from "@/lib/store";

/** Mencari game di katalog toko (data admin), lalu menampilkan form top up. */
export default function GameLoader() {
  const { id } = useParams<{ id: string }>();
  const game = useCatalog().find((g) => g.id === id);
  const ready = useNow() > 0;
  if (!ready) return <p className="text-center text-gray-500">Memuat...</p>;
  if (!game) {
    return (
      <div className="vs-card mx-auto max-w-md p-10 text-center">
        <p className="text-4xl">🎮</p>
        <p className="mt-3 text-lg font-bold">Game tidak tersedia</p>
        <p className="mt-1 text-sm text-gray-500">Game ini tidak ada di katalog atau sedang dinonaktifkan.</p>
        <Link href="/katalog" className="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Lihat Katalog</Link>
      </div>
    );
  }
  return <TopupForm game={game} />;
}

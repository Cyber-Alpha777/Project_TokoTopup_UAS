"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GameCard from "./GameCard";
import { games } from "@/lib/games";

const filters = ["Semua", "Populer", "Promo"] as const;

export default function KatalogView() {
  const param = useSearchParams().get("q") ?? "";
  const [typed, setTyped] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Semua");
  const q = typed ?? param; // ketikan lokal menimpa ?q= dari Navbar

  const list = games.filter((g) => {
    const match = (g.name + " " + g.publisher).toLowerCase().includes(q.trim().toLowerCase());
    const f = filter === "Semua" || (filter === "Populer" && g.popular) || (filter === "Promo" && g.categories.some((c) => c.items.some((i) => i.oldPrice)));
    return match && f;
  });

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Katalog Game</h1>
      <p className="mt-1 text-sm text-gray-500">Cari dan pilih game yang ingin kamu top up.</p>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={q} onChange={(e) => setTyped(e.target.value)} placeholder="Cari nama game atau publisher..."
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 md:max-w-md dark:border-gray-600 dark:bg-gray-800"
        />
        <div className="flex gap-2">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${f === filter ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 hover:border-indigo-500 dark:border-gray-600"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="vs-card mt-10 p-12 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 text-lg font-bold">Game tidak ditemukan</p>
          <p className="mt-1 text-sm text-gray-500">Coba kata kunci lain atau lihat semua game.</p>
          <button onClick={() => { setTyped(""); setFilter("Semua"); }} className="mt-5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Tampilkan semua
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {list.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      )}
      <p className="mt-8 text-center text-xs text-gray-400">
        Tidak menemukan game? <Link href="/" className="text-indigo-600 hover:underline">Kembali ke beranda</Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { dayKey, fmtDate, idr } from "@/lib/games";
import { useAccount, useStore } from "@/lib/store";

const statusStyle = {
  success: ["Berhasil", "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"],
  pending: ["Menunggu", "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"],
  sending: ["Diproses", "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"],
  failed: ["Gagal", "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"],
} as const;

const selectCls = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800";

export default function Riwayat() {
  const account = useAccount();
  const s = useStore();
  const [game, setGame] = useState("");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("new");

  if (!account) {
    return (
      <div className="vs-card mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-bold">Halaman khusus Member</p>
        <p className="mt-1 text-sm text-gray-500">Masuk untuk melihat riwayat transaksi.</p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Masuk</Link>
      </div>
    );
  }

  const mine = s.orders.filter((o) => o.owner === account.email);
  const list = mine
    .filter((o) => (!game || o.gameId === game) && (!date || dayKey(o.createdAt) === date))
    .sort((a, b) => sort === "old" ? a.createdAt - b.createdAt : sort === "high" ? b.total - a.total : sort === "low" ? a.total - b.total : b.createdAt - a.createdAt);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Riwayat</h1>
      <p className="mt-1 text-sm text-gray-500">Semua transaksi top-up akunmu.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <select value={game} onChange={(e) => setGame(e.target.value)} className={selectCls} aria-label="Nama game">
          <option value="">Nama Game</option>
          {s.admin.games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectCls} aria-label="Tanggal" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls} aria-label="Urutkan">
          <option value="new">Tanggal: terbaru</option>
          <option value="old">Tanggal: terlama</option>
          <option value="high">Harga: tertinggi</option>
          <option value="low">Harga: terendah</option>
        </select>
        {(game || date) && <button onClick={() => { setGame(""); setDate(""); }} className="text-sm font-semibold text-indigo-600">Reset</button>}
      </div>

      {list.length === 0 ? (
        <div className="vs-card mt-8 p-12 text-center">
          <p className="text-4xl">🧾</p>
          <p className="mt-3 text-lg font-bold">{mine.length ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"}</p>
          <p className="mt-1 text-sm text-gray-500">{mine.length ? "Ubah filter untuk melihat transaksi lain." : "Top-up pertamamu akan muncul di sini."}</p>
          <Link href="/katalog" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Mulai Top Up</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {list.map((o) => (
            <li key={o.code} className="vs-card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{o.gameName}</p>
                <p className="text-sm text-gray-500">{o.item} · {o.code}</p>
                <p className="text-xs text-gray-400">{fmtDate(o.createdAt)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[o.status][1]}`}>{statusStyle[o.status][0]}</span>
              <p className="w-28 text-right font-bold">{idr(o.total)}</p>
              <Link href={`/riwayat/${o.code}`} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:border-gray-600">Detail</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

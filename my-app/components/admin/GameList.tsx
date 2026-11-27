"use client";

import { useState } from "react";
import Link from "next/link";
import GameCover from "@/components/GameCover";
import { games as staticGames, type Game } from "@/lib/games";
import { adminUpdate, useStore, type AdminGame } from "@/lib/store";
import { Modal, PageHeader, Pagination, Pill, Toast, btn, inputCls, takeFlash, usePaged } from "./ui";

const asGame = (g: AdminGame): Game => {
  const base = staticGames.find((x) => x.id === g.id);
  return { id: g.id, name: g.name, publisher: "", image: base?.image, hue: base?.hue ?? [...g.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7), idLabel: "", categories: [] };
};

export default function GameList() {
  const { admin } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [del, setDel] = useState<AdminGame | null>(null);
  const [toast, setToast] = useState<string | null>(takeFlash);

  const count = (id: string) => admin.products.filter((p) => p.gameId === id).length;
  const list = admin.games.filter((g) => (!status || (status === "on") === g.active) && g.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pg = usePaged(list, 8);
  const toggle = (g: AdminGame) => adminUpdate((a) => ({ ...a, games: a.games.map((x) => (x.id === g.id ? { ...x, active: !x.active } : x)) }));
  const blocked = del ? count(del.id) : 0;

  return (
    <div>
      <PageHeader title="Kelola Game" sub="Tambah game baru atau hapus game dari Katalog"
        right={<Link href="/admin/game/baru" className={btn.primary}>+ Tambah Game</Link>} />
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama game..." className={`${inputCls()} max-w-xs`} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls()} w-auto`} aria-label="Status">
          <option value="">Semua Status</option><option value="on">Aktif</option><option value="off">Nonaktif</option>
        </select>
      </div>
      <p className="mb-3 text-xs text-gray-500">Game yang dihapus tidak tampil lagi di Katalog. Game yang masih punya produk tidak bisa dihapus.</p>

      <div className="vs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ad-table">
            <thead><tr><th>Game</th><th>Platform</th><th>Jumlah Produk</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {pg.slice.map((g) => (
                <tr key={g.id}>
                  <td><div className="flex items-center gap-3"><GameCover game={asGame(g)} className="h-9 w-9 rounded-lg text-xs" /><span className="font-semibold">{g.name}</span></div></td>
                  <td>{g.platform}</td>
                  <td>{count(g.id)} produk</td>
                  <td><button onClick={() => toggle(g)} title="Klik untuk ubah status" aria-label={`Ubah status ${g.name}`}><Pill tone={g.active ? "green" : "gray"}>{g.active ? "Aktif" : "Nonaktif"}</Pill></button></td>
                  <td><button onClick={() => setDel(g)} className="text-sm font-semibold text-red-600 hover:underline">Hapus</button></td>
                </tr>
              ))}
              {pg.slice.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-500">Tidak ada game yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination p={pg} total={list.length} noun="game" />
      </div>

      {del && blocked > 0 && (
        <Modal title="Game Tidak Bisa Dihapus" onClose={() => setDel(null)}
          footer={<><button onClick={() => setDel(null)} className={btn.ghost}>Tutup</button><Link href="/admin/produk" className={btn.primary}>Ke Kelola Produk</Link></>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">Game {del.name} masih memiliki {blocked} produk. Hapus semua produknya di Kelola Produk terlebih dahulu (produk nonaktif tetap dihitung).</p>
        </Modal>
      )}
      {del && blocked === 0 && (
        <Modal title="Hapus Game?" onClose={() => setDel(null)}
          footer={<><button onClick={() => setDel(null)} className={btn.ghost}>Batal</button>
            <button onClick={() => { adminUpdate((a) => ({ ...a, games: a.games.filter((x) => x.id !== del.id) })); setToast(`Game ${del.name} berhasil dihapus`); setDel(null); }} className={btn.danger}>Ya, Hapus</button></>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">Game {del.name} akan dihapus dari Katalog dan tidak bisa dikembalikan. Game ini belum memiliki produk.</p>
        </Modal>
      )}
    </div>
  );
}

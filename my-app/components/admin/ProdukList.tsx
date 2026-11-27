"use client";

import { useState } from "react";
import Link from "next/link";
import { idr } from "@/lib/games";
import { adminUpdate, useStore, type AdminProduct } from "@/lib/store";
import { Modal, PageHeader, Pagination, Pill, Toast, btn, inputCls, margin, takeFlash, usePaged } from "./ui";

type Mode = "percent" | "nominal";
const NUM = /^[+-]?\d+([.,]\d+)?$/;

export default function ProdukList() {
  const s = useStore();
  const { games, products } = s.admin;
  const gameName = (id: string) => games.find((g) => g.id === id)?.name.split(":")[0] ?? id;

  const [q, setQ] = useState("");
  const [gameF, setGameF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<null | "form" | "confirm">(null);
  const [mode, setMode] = useState<Mode>("percent");
  const [value, setValue] = useState("");
  const [toast, setToast] = useState<string | null>(takeFlash);
  const [del, setDel] = useState<AdminProduct | null>(null);

  const list = products.filter((p) =>
    (!gameF || p.gameId === gameF) &&
    (!statusF || (statusF === "on") === p.active) &&
    (gameName(p.gameId) + " " + p.label).toLowerCase().includes(q.trim().toLowerCase())
  );
  const pg = usePaged(list, 8);

  const chosen = products.filter((p) => selected.includes(p.id));
  const num = Number(value.replace(",", "."));
  const formatOk = NUM.test(value.trim()) && num !== 0;
  const preview = chosen.map((p) => ({ p, next: Math.round(mode === "percent" ? p.price * (1 + num / 100) : p.price + num) }));
  const valid = formatOk && preview.every((x) => x.next > 0);
  const showError = value.trim() !== "" && !valid;

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const allOnPage = pg.slice.length > 0 && pg.slice.every((p) => selected.includes(p.id));
  const toggleAll = () => setSelected((cur) => allOnPage ? cur.filter((id) => !pg.slice.some((p) => p.id === id)) : [...new Set([...cur, ...pg.slice.map((p) => p.id)])]);

  const save = () => {
    adminUpdate((a) => ({ ...a, products: a.products.map((p) => preview.find((x) => x.p.id === p.id) ? { ...p, price: preview.find((x) => x.p.id === p.id)!.next } : p) }));
    setToast(`Harga ${chosen.length} produk berhasil diperbarui`);
    setSelected([]); setValue(""); setStep(null);
  };
  const close = () => { setStep(null); };

  const names = chosen.slice(0, 3).map((p) => `${gameName(p.gameId)} ${p.label}`).join(", ") + (chosen.length > 3 ? ` +${chosen.length - 3} lainnya` : "");
  const sign = num > 0 ? "+" : "";

  return (
    <div>
      <PageHeader title="Kelola Produk" sub="Daftar produk dan harga jual (mengikuti harga supplier)"
        right={<button disabled={selected.length === 0} onClick={() => setStep("form")} className={btn.dark}>Ubah Harga Massal</button>} />
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari game atau nominal..." className={`${inputCls()} max-w-xs`} />
        <select value={gameF} onChange={(e) => setGameF(e.target.value)} className={`${inputCls()} w-auto`} aria-label="Filter game">
          <option value="">Semua Game</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className={`${inputCls()} w-auto`} aria-label="Filter status">
          <option value="">Semua Status</option><option value="on">Aktif</option><option value="off">Nonaktif</option>
        </select>
        <Link href="/admin/produk/baru" className={`${btn.primary} ml-auto`}>+ Tambah Produk</Link>
      </div>

      {selected.length > 0 ? (
        <p className="mb-3 flex items-center gap-3 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
          {selected.length} produk dipilih
          <button onClick={() => setSelected([])} className="font-semibold underline">Batal pilih</button>
        </p>
      ) : <p className="mb-3 text-xs text-gray-500">Centang produk untuk mengubah harga secara massal</p>}

      <div className="vs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ad-table">
            <thead>
              <tr>
                <th className="w-8"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Pilih semua" /></th>
                <th>Game</th><th>Produk / Nominal</th><th>Harga Supplier</th><th>Harga Jual</th><th>Margin</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pg.slice.map((p) => (
                <tr key={p.id} data-selected={selected.includes(p.id)}>
                  <td><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} aria-label={`Pilih ${p.label}`} /></td>
                  <td>{gameName(p.gameId)}</td>
                  <td className="font-semibold">{p.label}</td>
                  <td>{idr(p.supplier)}</td>
                  <td className="font-semibold">{idr(p.price)}</td>
                  <td>{margin(p.supplier, p.price)}</td>
                  <td><Pill tone={p.active ? "green" : "gray"}>{p.active ? "Aktif" : "Nonaktif"}</Pill></td>
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/produk/${p.id}`} className={btn.link}>Edit</Link>
                    <span className="mx-2 text-gray-300">|</span>
                    <button onClick={() => setDel(p)} className="text-sm font-semibold text-red-600 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
              {pg.slice.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-gray-500">Tidak ada produk yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination p={pg} total={list.length} noun="produk" />
      </div>

      {del && (
        <Modal title="Hapus Produk?" onClose={() => setDel(null)}
          footer={<><button onClick={() => setDel(null)} className={btn.ghost}>Batal</button>
            <button onClick={() => {
              adminUpdate((a) => ({ ...a, products: a.products.filter((x) => x.id !== del.id) }));
              setSelected((cur) => cur.filter((id) => id !== del.id));
              setToast(`Produk ${gameName(del.gameId)} ${del.label} berhasil dihapus`);
              setDel(null);
            }} className={btn.danger}>Ya, Hapus</button></>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">Produk {gameName(del.gameId)} {del.label} akan dihapus dari toko dan tidak bisa dikembalikan. Pesanan lama yang sudah dibuat tidak terpengaruh. Kalau hanya ingin menyembunyikannya, ubah statusnya jadi Nonaktif lewat Edit.</p>
        </Modal>
      )}

      {step === "form" && (
        <Modal wide title="Ubah Harga Massal" onClose={close}
          footer={<><button onClick={close} className={btn.ghost}>Batal</button><button disabled={!valid} onClick={() => setStep("confirm")} className={btn.primary}>Lanjut ke Konfirmasi</button></>}>
          <p className="mb-4 rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700/50">{chosen.length} produk dipilih: {names}</p>
          {showError && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <p className="font-semibold">! Nilai harga tidak valid</p>
              <p className="text-xs">Masukkan angka saja, contoh +5 atau -3. Harga baru tidak boleh nol atau negatif.</p>
            </div>
          )}
          <p className="mb-1 text-xs font-semibold">Jenis perubahan</p>
          <div className="mb-4 flex gap-2">
            {([["percent", "Persentase (%)"], ["nominal", "Nominal (IDR)"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setMode(k)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${mode === k ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 dark:border-gray-600"}`}>{l}</button>
            ))}
          </div>
          <label className="block text-xs font-semibold">
            Nilai perubahan
            <div className="relative mt-1">
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "percent" ? "+5" : "+1000"} className={`${inputCls(showError)} pr-10`} inputMode="text" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{mode === "percent" ? "%" : "IDR"}</span>
            </div>
            <span className="mt-1 block font-normal text-gray-500">Angka positif untuk menaikkan, negatif untuk menurunkan harga. Contoh: +5 atau -3.</span>
          </label>
          {valid && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-semibold">Pratinjau harga</p>
              <table className="ad-table"><thead><tr><th>Produk</th><th>Harga Lama</th><th>Harga Baru</th></tr></thead>
                <tbody>{preview.map(({ p, next }) => <tr key={p.id}><td>{gameName(p.gameId)} {p.label}</td><td>{idr(p.price)}</td><td className="font-bold">{idr(next)}</td></tr>)}</tbody></table>
            </div>
          )}
        </Modal>
      )}

      {step === "confirm" && (
        <Modal wide title="Konfirmasi Perubahan Harga" onClose={close}
          footer={<><button onClick={() => setStep("form")} className={btn.ghost}>Kembali</button><button onClick={save} className={btn.primary}>Konfirmasi &amp; Simpan</button></>}>
          <table className="ad-table"><thead><tr><th>Produk</th><th>Harga Lama</th><th>Harga Baru</th></tr></thead>
            <tbody>{preview.map(({ p, next }) => <tr key={p.id}><td>{gameName(p.gameId)} {p.label}</td><td>{idr(p.price)}</td><td className="font-bold">{idr(next)}</td></tr>)}</tbody></table>
          <p className="mt-4 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">! Harga baru langsung berlaku di toko untuk semua pelanggan dan tercatat di log admin.</p>
          <p className="mt-3 text-xs text-gray-500">Ringkasan: {mode === "percent" ? "Persentase (%)" : "Nominal (IDR)"} | Nilai {sign}{num}{mode === "percent" ? "%" : " IDR"} | {chosen.length} produk</p>
        </Modal>
      )}
    </div>
  );
}

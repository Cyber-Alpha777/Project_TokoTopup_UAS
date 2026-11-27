"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { idr } from "@/lib/games";
import { adminUpdate, newId, useNow, useStore, type AdminProduct } from "@/lib/store";
import { ErrorBanner, Field, PageHeader, Toggle, btn, inputCls, margin, setFlash } from "./ui";

/** Form yang sama untuk Tambah & Edit Produk (id dari URL; "baru" = tambah) */
export default function ProdukForm() {
  const { id } = useParams<{ id?: string }>();
  const s = useStore();
  const ready = useNow() > 0;
  const existing = id ? s.admin.products.find((p) => p.id === id) : undefined;

  if (!ready) return <p className="text-gray-500">Memuat...</p>;
  if (id && !existing) {
    return (
      <div className="vs-card max-w-md p-8 text-center">
        <p className="font-bold">Produk tidak ditemukan</p>
        <Link href="/admin/produk" className={`${btn.primary} mt-4 inline-block`}>Kembali ke Kelola Produk</Link>
      </div>
    );
  }
  return <Inner key={existing?.id ?? "baru"} existing={existing} />;
}

function Inner({ existing }: { existing?: AdminProduct }) {
  const router = useRouter();
  const { games, products } = useStore().admin;
  const [f, setF] = useState({
    gameId: existing?.gameId ?? "", label: existing?.label ?? "",
    supplier: existing ? String(existing.supplier) : "", price: existing ? String(existing.price) : "", active: existing?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const supplier = Number(f.supplier) || 0;
  const price = Number(f.price) || 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.gameId) er.gameId = "Game wajib dipilih";
    if (f.label.trim().length < 2) er.label = "Nama produk wajib diisi";
    else if (products.some((p) => p.gameId === f.gameId && p.id !== existing?.id && p.label.toLowerCase() === f.label.trim().toLowerCase())) er.label = "Produk dengan nama ini sudah ada di game tersebut";
    if (!(Number(f.supplier) > 0)) er.supplier = "Harga supplier harus lebih dari 0";
    if (!(Number.isInteger(price) && price > 0)) er.price = "Harga jual harus berupa angka lebih dari 0";
    setErrors(er);
    if (Object.keys(er).length) return;

    const category = existing?.category ?? products.find((p) => p.gameId === f.gameId)?.category ?? "Top Up";
    const next: AdminProduct = {
      id: existing?.id ?? `${f.gameId}-${newId()}`, gameId: f.gameId, category, label: f.label.trim(),
      supplier, price, oldPrice: existing?.oldPrice, active: f.active,
    };
    adminUpdate((a) => ({ ...a, products: existing ? a.products.map((p) => (p.id === existing.id ? next : p)) : [next, ...a.products] }));
    setFlash(`Produk ${next.label} berhasil disimpan`);
    router.push("/admin/produk");
  };

  return (
    <div>
      <Link href="/admin/produk" className={btn.link}>← Kembali ke Kelola Produk</Link>
      <div className="mt-3"><PageHeader title={existing ? "Edit Produk" : "Tambah Produk"} sub="Form yang sama dipakai untuk Edit; kolom terisi otomatis dari produk terpilih" /></div>
      {Object.keys(errors).length > 0 && <ErrorBanner>Periksa kembali isian yang ditandai</ErrorBanner>}

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="vs-card space-y-5 p-6">
          <Field label="Game" error={errors.gameId}>
            <select value={f.gameId} onChange={(e) => set("gameId", e.target.value)} className={inputCls(!!errors.gameId)}>
              <option value="">Pilih game</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Nama produk / nominal" error={errors.label}>
            <input value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="Contoh: 86 Diamond" className={inputCls(!!errors.label)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Harga supplier" hint="Harga modal dari supplier" error={errors.supplier}>
              <input value={f.supplier} onChange={(e) => set("supplier", e.target.value.replace(/\D/g, ""))} placeholder="IDR 0" inputMode="numeric" className={inputCls(!!errors.supplier)} />
            </Field>
            <Field label="Harga jual" hint="Harga yang tampil di Katalog" error={errors.price}>
              <input value={f.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} placeholder="IDR 0" inputMode="numeric" className={inputCls(!!errors.price)} />
            </Field>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-700/40">
            <p className="text-xs font-semibold">Margin</p>
            <p className={`text-lg font-bold ${price && supplier && price < supplier ? "text-red-600" : ""}`}>{price && supplier ? margin(supplier, price) : "-"}{price && supplier ? ` (${idr(price - supplier)})` : ""}</p>
            <p className="text-xs text-gray-500">Dihitung otomatis: (harga jual - harga supplier) / harga supplier</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold">Status produk</p>
            <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Aktif (tampil di Katalog)" />
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
            <Link href="/admin/produk" className={btn.ghost}>Batal</Link>
            <button className={btn.primary}>Simpan Produk</button>
          </div>
        </div>

        <aside className="vs-card h-fit p-5 text-sm">
          <h2 className="font-bold">Panduan harga</h2>
          <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-600 dark:text-gray-400">
            <li>Harga jual sebaiknya di atas harga supplier agar margin tidak negatif.</li>
            <li>Produk nonaktif tidak tampil di Katalog dan Detail Produk.</li>
            <li>Untuk menaikkan banyak harga sekaligus, gunakan Ubah Harga Massal di daftar produk.</li>
          </ul>
        </aside>
      </form>
    </div>
  );
}

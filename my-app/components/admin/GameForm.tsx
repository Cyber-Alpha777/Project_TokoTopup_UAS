"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminUpdate, newId, useStore, type Platform } from "@/lib/store";
import { ErrorBanner, Field, PageHeader, Toggle, btn, inputCls, setFlash } from "./ui";

export default function GameForm() {
  const router = useRouter();
  const { games } = useStore().admin;
  const [f, setF] = useState({ name: "", platform: "" as "" | Platform, logo: "", active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return set("logo", "");
    if (!/^image\/(png|jpe?g)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
      setErrors((p) => ({ ...p, logo: "Logo harus PNG/JPG, maksimal 2 MB" }));
      set("logo", "");
    } else {
      setErrors((p) => { const { logo, ...rest } = p; void logo; return rest; });
      set("logo", file.name);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = { ...(errors.logo ? { logo: errors.logo } : {}) };
    const name = f.name.trim();
    if (name.length < 2) er.name = "Nama game wajib diisi";
    else if (games.some((g) => g.name.toLowerCase() === name.toLowerCase())) er.name = "Nama game sudah terdaftar";
    if (!f.platform) er.platform = "Platform wajib dipilih";
    setErrors(er);
    if (Object.keys(er).length) return;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game";
    adminUpdate((a) => ({
      ...a,
      games: [{ id: `${slug}-${newId()}`, name, platform: f.platform as Platform, idLabel: "ID Pemain", logo: f.logo || undefined, active: f.active }, ...a.games],
    }));
    setFlash(`Game ${name} berhasil ditambahkan`);
    router.push("/admin/game");
  };

  return (
    <div>
      <Link href="/admin/game" className={btn.link}>← Kembali ke Kelola Game</Link>
      <div className="mt-3"><PageHeader title="Tambah Game" sub="Game baru tampil di Katalog setelah disimpan dengan status Aktif" /></div>
      {Object.keys(errors).length > 0 && <ErrorBanner>Periksa kembali isian yang ditandai</ErrorBanner>}

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="vs-card space-y-5 p-6">
          <Field label="Nama game" error={errors.name}>
            <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Contoh: Valorant" className={inputCls(!!errors.name)} />
          </Field>
          <Field label="Platform" error={errors.platform}>
            <select value={f.platform} onChange={(e) => set("platform", e.target.value)} className={inputCls(!!errors.platform)}>
              <option value="">Pilih platform</option><option>Mobile</option><option>PC</option><option>Mobile / PC</option>
            </select>
          </Field>
          <Field label="Logo game" hint="Logo tampil di kartu game pada Katalog" error={errors.logo}>
            <input type="file" accept="image/png,image/jpeg" onChange={pickLogo} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold dark:file:bg-gray-700" />
            <span className="mt-1 block text-xs text-gray-400">Pilih file logo (PNG/JPG, maks. 2 MB){f.logo && ` - dipilih: ${f.logo}`}</span>
          </Field>
          <div>
            <p className="mb-2 text-xs font-semibold">Status game</p>
            <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Aktif (tampil di Katalog)" />
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
            <Link href="/admin/game" className={btn.ghost}>Batal</Link>
            <button className={btn.primary}>Simpan Game</button>
          </div>
        </div>

        <aside className="vs-card h-fit p-5 text-sm">
          <h2 className="font-bold">Panduan game</h2>
          <ul className="mt-3 list-disc space-y-3 pl-5 text-gray-600 dark:text-gray-400">
            <li>Nama game harus unik dan sesuai nama resmi game.</li>
            <li>Game nonaktif tidak tampil di Katalog.</li>
            <li>Setelah game disimpan, tambahkan nominal di Kelola Produk.</li>
          </ul>
        </aside>
      </form>
    </div>
  );
}

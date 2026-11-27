"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { dayKey, fmtDay, idr } from "@/lib/games";
import { adminUpdate, newId, useNow, useStore, type AdminVoucher } from "@/lib/store";
import { ErrorBanner, Field, PageHeader, Toggle, btn, inputCls, setFlash } from "./ui";

export default function VoucherForm() {
  const { id } = useParams<{ id?: string }>();
  const s = useStore();
  const now = useNow();
  const existing = id ? s.admin.vouchers.find((v) => v.id === id) : undefined;
  if (now === 0) return <p className="text-gray-500">Memuat...</p>;
  if (id && !existing) {
    return (
      <div className="vs-card max-w-md p-8 text-center">
        <p className="font-bold">Voucher tidak ditemukan</p>
        <Link href="/admin/voucher" className={`${btn.primary} mt-4 inline-block`}>Kembali ke Kelola Voucher</Link>
      </div>
    );
  }
  return <Inner key={existing?.id ?? "baru"} existing={existing} today={dayKey(now)} />;
}

function Inner({ existing, today }: { existing?: AdminVoucher; today: string }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: existing?.name ?? "", value: existing ? String(existing.value) : "",
    maxDiscount: existing ? String(existing.maxDiscount) : "", minTopup: existing ? String(existing.minTopup) : "",
    cost: existing ? String(existing.cost) : "", quota: existing ? String(existing.quota) : "100",
    startISO: existing?.startISO ?? today, endISO: existing?.endISO ?? "", active: existing?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const digits = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value.replace(/\D/g, ""));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    const value = Number(f.value);
    if (f.name.trim().length < 3) er.name = "Nama voucher wajib diisi (min. 3 karakter)";
    if (!(value >= 1 && value <= 100)) er.value = "Nilai diskon harus antara 1 dan 100";
    if (!(Number(f.maxDiscount) > 0)) er.maxDiscount = "Maksimal potongan harus lebih dari 0";
    if (f.minTopup === "") er.minTopup = "Minimal pembelian wajib diisi (isi 0 jika tanpa minimal)";
    if (f.cost === "") er.cost = "Poin untuk menukar wajib diisi";
    if (!(Number(f.quota) >= 1)) er.quota = "Kuota minimal 1";
    if (!f.startISO) er.startISO = "Tanggal mulai wajib diisi";
    if (!f.endISO) er.endISO = "Tanggal berakhir wajib diisi";
    else if (f.startISO && f.endISO <= f.startISO) er.endISO = "Tanggal berakhir harus setelah tanggal mulai";
    setErrors(er);
    if (Object.keys(er).length) return;

    const v: AdminVoucher = {
      id: existing?.id ?? `v-${newId()}`, name: f.name.trim(), value,
      maxDiscount: Number(f.maxDiscount), minTopup: Number(f.minTopup), cost: Number(f.cost),
      quota: Number(f.quota), used: existing?.used ?? 0, startISO: f.startISO, endISO: f.endISO, active: f.active,
    };
    adminUpdate((a) => ({ ...a, vouchers: existing ? a.vouchers.map((x) => (x.id === existing.id ? v : x)) : [v, ...a.vouchers] }));
    setFlash(`Voucher ${v.name} berhasil disimpan`);
    router.push("/admin/voucher");
  };

  const title = f.name.trim() || (f.value ? `Diskon ${f.value}%` : "Nama voucher");

  return (
    <div>
      <Link href="/admin/voucher" className={btn.link}>← Kembali ke Kelola Voucher</Link>
      <div className="mt-3"><PageHeader title={existing ? "Edit Voucher" : "Tambah Voucher"} sub="Voucher ditukar Member dengan poin dan dipakai di Checkout" /></div>
      {Object.keys(errors).length > 0 && <ErrorBanner>Periksa kembali isian yang ditandai</ErrorBanner>}

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="vs-card space-y-5 p-6">
          <Field label="Nama voucher" hint="Tampil di halaman Poin & Voucher milik Member" error={errors.name}>
            <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Diskon 20%" className={inputCls(!!errors.name)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nilai diskon" hint="Isi angka 1 - 100" error={errors.value}>
              <div className="relative">
                <input value={f.value} onChange={digits("value")} inputMode="numeric" placeholder="20" className={`${inputCls(!!errors.value)} pr-10`} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">%</span>
              </div>
            </Field>
            <Field label="Maksimal potongan" hint="Batas potongan untuk voucher diskon persen" error={errors.maxDiscount}>
              <input value={f.maxDiscount} onChange={digits("maxDiscount")} inputMode="numeric" placeholder="IDR 10000" className={inputCls(!!errors.maxDiscount)} />
            </Field>
            <Field label="Minimal pembelian" error={errors.minTopup}>
              <input value={f.minTopup} onChange={digits("minTopup")} inputMode="numeric" placeholder="IDR 20000" className={inputCls(!!errors.minTopup)} />
            </Field>
            <Field label="Poin untuk menukar" hint="Poin yang dipotong dari saldo Member" error={errors.cost}>
              <input value={f.cost} onChange={digits("cost")} inputMode="numeric" placeholder="500" className={inputCls(!!errors.cost)} />
            </Field>
            <Field label="Kuota voucher" error={errors.quota}>
              <input value={f.quota} onChange={digits("quota")} inputMode="numeric" placeholder="100" className={inputCls(!!errors.quota)} />
            </Field>
            <Field label="Berlaku mulai" error={errors.startISO}>
              <input type="date" value={f.startISO} onChange={(e) => set("startISO", e.target.value)} className={inputCls(!!errors.startISO)} />
            </Field>
            <Field label="Berlaku sampai" error={errors.endISO}>
              <input type="date" value={f.endISO} onChange={(e) => set("endISO", e.target.value)} className={inputCls(!!errors.endISO)} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold">Status voucher</p>
            <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Aktifkan setelah disimpan" />
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
            <Link href="/admin/voucher" className={btn.ghost}>Batal</Link>
            <button className={btn.primary}>Simpan Voucher</button>
          </div>
        </div>

        <aside className="vs-card h-fit p-5">
          <h2 className="text-sm font-bold">Pratinjau untuk Member</h2>
          <div className="mt-3 rounded-xl border border-dashed border-indigo-300 p-4 text-sm">
            <p className="text-lg font-extrabold">{title}</p>
            <p className="mt-2 text-xs text-gray-500">Maks. potongan {idr(Number(f.maxDiscount) || 0)}</p>
            <p className="text-xs text-gray-500">Min. pembelian {idr(Number(f.minTopup) || 0)}</p>
            <p className="text-xs text-gray-500">Berlaku s/d {f.endISO ? fmtDay(f.endISO) : "-"}</p>
            <p className="mt-3 rounded-lg bg-indigo-600 py-2 text-center text-xs font-semibold text-white">Tukar {f.cost || 0} poin</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

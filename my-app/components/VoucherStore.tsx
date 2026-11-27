"use client";

import { useState } from "react";
import Link from "next/link";
import "./transaksi.css"; // CSS eksternal
import { fmtDay, idr } from "@/lib/games";
import { type AdminVoucher, redeemVoucher, useAccount, useNow, useStore, voucherState } from "@/lib/store";

export default function VoucherStore() {
  const account = useAccount();
  const now = useNow();
  const catalog = useStore().admin.vouchers.filter((v) => voucherState(v, now) === "Aktif");
  const [confirm, setConfirm] = useState<AdminVoucher | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!account) {
    return (
      <div className="vs-card mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-bold">Halaman khusus Member</p>
        <p className="mt-1 text-sm text-gray-500">Masuk untuk melihat saldo poin dan menukar voucher.</p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Masuk</Link>
      </div>
    );
  }

  const claim = (v: AdminVoucher) => {
    setMsg(null);
    if (v.used >= v.quota) {
      setMsg({ type: "err", text: `Kuota ${v.name} sudah habis.` });
    } else if (account.points < v.cost) {
      setMsg({ type: "err", text: `Poin tidak cukup. Kamu butuh ${v.cost - account.points} Pt lagi untuk ${v.name}.` });
    } else setConfirm(v);
  };
  const doRedeem = () => {
    if (!confirm) return;
    const r = redeemVoucher(confirm.id);
    setMsg(r === "ok"
      ? { type: "ok", text: `Berhasil! ${confirm.name} masuk ke akunmu. Poin berkurang ${confirm.cost} Pt.` }
      : { type: "err", text: r === "insufficient" ? "Poin tidak cukup." : "Voucher ini sudah tidak tersedia." });
    setConfirm(null);
  };

  const mine = account.vouchers.filter((v) => !v.used);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Voucher</h1>
          <p className="mt-1 text-sm text-gray-500">Tukar poin kamu dengan voucher diskon.</p>
        </div>
        <p className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
          Saldo poin: {account.points} Pt
        </p>
      </div>

      {msg && (
        <p role="status" className={`rounded-lg px-4 py-3 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
          {msg.text}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.length === 0 && <p className="text-sm text-gray-500">Belum ada voucher yang bisa ditukar.</p>}
        {catalog.map((v) => {
          const enough = account.points >= v.cost;
          return (
            <div key={v.id} className="vs-card flex items-center gap-4 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xl font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">%</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{v.name}</p>
                <p className="text-xs text-gray-500">Min. top up {idr(v.minTopup)} · Maks. {idr(v.maxDiscount)}</p>
                <p className="text-[11px] text-gray-400">Berlaku s.d. {fmtDay(v.endISO)} · Diskon {v.value}%</p>
                <p className="mt-1 text-sm font-bold text-indigo-600">{v.cost} Pt</p>
              </div>
              <button onClick={() => claim(v)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${enough ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-500 dark:bg-gray-700"}`}>
                Klaim
              </button>
            </div>
          );
        })}
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold">Voucher milikmu ({mine.length})</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada voucher. Klaim salah satu di atas, lalu pakai saat top up.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((v) => {
              const expired = now > 0 && new Date(v.expiryISO + "T23:59:59").getTime() < now;
              return (
                <div key={v.uid} className={`vs-card p-4 ${expired ? "opacity-60" : ""}`}>
                  <p className="font-bold">{v.name}</p>
                  <p className="text-xs text-gray-500">Min. top up {idr(v.minTopup)} · Maks. {idr(v.maxDiscount)}</p>
                  <p className="text-[11px] text-gray-400">{expired ? "Kedaluwarsa" : "Berlaku s.d."} {v.expiry}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {confirm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="vs-card w-full max-w-sm p-6 text-center">
            <p className="text-lg font-bold">Konfirmasi penukaran</p>
            <p className="mt-2 text-sm text-gray-500">Tukar {confirm.cost} Pt dengan {confirm.name}?</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirm(null)} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold dark:border-gray-600">Batal</button>
              <button onClick={doRedeem} className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Tukar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

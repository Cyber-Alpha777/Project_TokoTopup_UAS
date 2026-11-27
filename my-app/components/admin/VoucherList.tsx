"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtDay } from "@/lib/games";
import { adminUpdate, useNow, useStore, voucherState, type AdminVoucher, type VoucherState } from "@/lib/store";
import { Modal, PageHeader, Pagination, Pill, Toast, btn, inputCls, takeFlash, usePaged } from "./ui";

const tone: Record<VoucherState, "green" | "gray" | "yellow" | "red"> = { Aktif: "green", Berakhir: "gray", Terjadwal: "yellow", Nonaktif: "red" };

export const fmtRange = (a: string, b: string) =>
  a.slice(0, 4) === b.slice(0, 4) ? `${fmtDay(a).slice(0, 6)} - ${fmtDay(b)}` : `${fmtDay(a)} - ${fmtDay(b)}`;

export default function VoucherList() {
  const s = useStore();
  const now = useNow();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [off, setOff] = useState<AdminVoucher | null>(null);
  const [toast, setToast] = useState<string | null>(takeFlash);

  const list = s.admin.vouchers.filter((v) =>
    (!status || voucherState(v, now) === status) && v.name.toLowerCase().includes(q.trim().toLowerCase())
  );
  const pg = usePaged(list, 7);
  const setActive = (v: AdminVoucher, active: boolean) => adminUpdate((a) => ({ ...a, vouchers: a.vouchers.map((x) => (x.id === v.id ? { ...x, active } : x)) }));

  return (
    <div>
      <PageHeader title="Kelola Voucher" sub="Promo dan penukaran poin Member"
        right={<Link href="/admin/voucher/baru" className={btn.primary}>+ Tambah Voucher</Link>} />
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama voucher..." className={`${inputCls()} max-w-xs`} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls()} w-auto`} aria-label="Status">
          <option value="">Semua Status</option>{(["Aktif", "Berakhir", "Terjadwal", "Nonaktif"] as const).map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>
      <p className="mb-3 text-xs text-gray-500">Voucher ditukar Member di Poin &amp; Voucher lalu dipakai di Checkout.</p>

      <div className="vs-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ad-table">
            <thead><tr><th>Nama Voucher</th><th>Diskon</th><th>Poin Tukar</th><th>Masa Berlaku</th><th>Terpakai</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {pg.slice.map((v) => {
                const st = voucherState(v, now);
                return (
                  <tr key={v.id}>
                    <td className="font-semibold">{v.name}</td>
                    <td>{v.value}%</td>
                    <td>{v.cost} poin</td>
                    <td className="whitespace-nowrap">{fmtRange(v.startISO, v.endISO)}</td>
                    <td>{v.used} / {v.quota}</td>
                    <td><Pill tone={tone[st]}>{st}</Pill></td>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/voucher/${v.id}`} className={btn.link}>Edit</Link>
                      <span className="mx-2 text-gray-300">|</span>
                      {v.active
                        ? <button onClick={() => setOff(v)} className="text-sm font-semibold text-red-600 hover:underline">Nonaktifkan</button>
                        : <button onClick={() => { setActive(v, true); setToast(`Voucher ${v.name} diaktifkan`); }} className={btn.link}>Aktifkan</button>}
                    </td>
                  </tr>
                );
              })}
              {pg.slice.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-gray-500">Tidak ada voucher yang cocok.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination p={pg} total={list.length} noun="voucher" />
      </div>

      {off && (
        <Modal title="Nonaktifkan Voucher?" onClose={() => setOff(null)}
          footer={<><button onClick={() => setOff(null)} className={btn.ghost}>Batal</button>
            <button onClick={() => { setActive(off, false); setToast(`Voucher ${off.name} dinonaktifkan`); setOff(null); }} className={btn.danger}>Ya, Nonaktifkan</button></>}>
          <p className="text-sm text-gray-600 dark:text-gray-300">Voucher {off.name} tidak bisa lagi ditukar Member. Voucher yang sudah ditukar tetap bisa dipakai sampai masa berlaku habis.</p>
        </Modal>
      )}
    </div>
  );
}

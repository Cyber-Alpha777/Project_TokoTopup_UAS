"use client";

import { useState } from "react";
import Link from "next/link";
import { idr } from "@/lib/games";
import { useNow, useStore, type Order } from "@/lib/store";
import { statusMeta } from "./Dashboard";
import { PageHeader, Pagination, Pill, btn, inputCls, usePaged } from "./ui";

const DAY = 86400000;
type Tab = "all" | "pending" | "complaint" | "failed";

export const complaintPill = (o: Order) =>
  !o.complaint ? <span className="text-gray-400">-</span>
    : o.complaint.resolved ? <Pill tone="green">Selesai</Pill> : <Pill tone="red">Terbuka</Pill>;

export default function PesananList() {
  const s = useStore();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [cust, setCust] = useState("");
  const [range, setRange] = useState("30");

  const all = [...s.orders].sort((a, b) => b.createdAt - a.createdAt);
  const counts = {
    all: all.length,
    pending: all.filter((o) => o.status === "pending").length,
    complaint: all.filter((o) => o.complaint && !o.complaint.resolved).length,
    failed: all.filter((o) => o.status === "failed").length,
  };

  const list = all.filter((o) =>
    (tab === "all" || (tab === "pending" && o.status === "pending") || (tab === "failed" && o.status === "failed") || (tab === "complaint" && !!o.complaint && !o.complaint.resolved)) &&
    (!status || o.status === status) &&
    (!cust || (cust === "member") === !!o.owner) &&
    (range === "all" || now === 0 || o.createdAt > now - Number(range) * DAY) &&
    (o.code + " " + o.email).toLowerCase().includes(q.trim().toLowerCase())
  );
  const pg = usePaged(list, 8);
  const reset = () => { setTab("all"); setQ(""); setStatus(""); setCust(""); setRange("all"); };

  const tabs: [Tab, string][] = [["all", "Semua"], ["pending", "Pending"], ["complaint", "Komplain Terbuka"], ["failed", "Gagal"]];

  return (
    <div>
      <PageHeader title="Kelola Pesanan" sub="Transaksi pelanggan dan komplain yang perlu ditangani" />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === k ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900" : "border-gray-300 hover:border-indigo-500 dark:border-gray-600"}`}>
            {l} ({counts[k]})
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari no. order atau email..." className={`${inputCls()} max-w-xs`} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls()} w-auto`} aria-label="Status">
          <option value="">Semua Status</option>
          {Object.entries(statusMeta).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <select value={cust} onChange={(e) => setCust(e.target.value)} className={`${inputCls()} w-auto`} aria-label="Pelanggan">
          <option value="">Semua Pelanggan</option><option value="member">Member</option><option value="guest">Guest</option>
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value)} className={`${inputCls()} w-auto`} aria-label="Rentang waktu">
          <option value="7">7 Hari Terakhir</option><option value="30">30 Hari Terakhir</option><option value="all">Semua Waktu</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className="vs-card p-14 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 text-lg font-bold">Pesanan tidak ditemukan</p>
          <p className="mt-1 text-sm text-gray-500">
            {q ? <>Tidak ada pesanan dengan kata kunci <b>{q}</b>. Periksa nomor order atau ubah filter.</> : "Tidak ada pesanan yang cocok dengan filter. Ubah filter untuk melihat pesanan lain."}
          </p>
          <button onClick={reset} className={`${btn.dark} mt-5`}>Reset Filter</button>
        </div>
      ) : (
        <div className="vs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ad-table">
              <thead><tr><th>No. Order</th><th>Game &amp; Produk</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Komplain</th><th>Aksi</th></tr></thead>
              <tbody>
                {pg.slice.map((o) => (
                  <tr key={o.code}>
                    <td className="font-semibold">{o.code}</td>
                    <td>{o.gameName.split(":")[0]} - {o.item}</td>
                    <td>{o.owner ? "Member" : "Guest"} - {o.email}</td>
                    <td className="font-semibold">{idr(o.total)}</td>
                    <td><Pill tone={statusMeta[o.status].tone}>{statusMeta[o.status].label}</Pill></td>
                    <td>{complaintPill(o)}</td>
                    <td><Link href={`/admin/pesanan/${o.code}`} className={btn.link}>Detail</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination p={pg} total={list.length} noun="pesanan" />
        </div>
      )}
    </div>
  );
}

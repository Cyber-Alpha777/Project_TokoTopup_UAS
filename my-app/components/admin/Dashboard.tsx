"use client";

import { useState } from "react";
import Link from "next/link";
import { dayKey, idr } from "@/lib/games";
import { useNow, useStore, type OrderStatus } from "@/lib/store";
import { PageHeader, Pill } from "./ui";

export const statusMeta: Record<OrderStatus, { label: string; tone: "green" | "yellow" | "red" | "blue" }> = {
  success: { label: "Berhasil", tone: "green" },
  pending: { label: "Pending", tone: "yellow" },
  sending: { label: "Diproses", tone: "blue" },
  failed: { label: "Gagal", tone: "red" },
};
const DAY = 86400000;
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const delta = (cur: number, prev: number) =>
  prev > 0 ? `${cur >= prev ? "+" : "-"}${Math.abs(Math.round(((cur - prev) / prev) * 100))}% dari periode sebelumnya` : "Belum ada pembanding";

export default function Dashboard() {
  const s = useStore();
  const now = useNow();
  const [range, setRange] = useState(7);

  const inRange = (t: number, from: number) => t > now - from * DAY && t <= now;
  const cur = s.orders.filter((o) => inRange(o.createdAt, range));
  const prev = s.orders.filter((o) => o.createdAt > now - 2 * range * DAY && o.createdAt <= now - range * DAY);
  const sales = (list: typeof cur) => list.filter((o) => o.status === "success").reduce((a, o) => a + o.total, 0);

  const pending = s.orders.filter((o) => o.status === "pending").length;
  const openComplaints = s.orders.filter((o) => o.complaint && !o.complaint.resolved).length;

  // grafik per hari
  const bars = Array.from({ length: range }, (_, i) => {
    const t = now - (range - 1 - i) * DAY;
    const key = dayKey(t);
    const total = s.orders.filter((o) => o.status === "success" && dayKey(o.createdAt) === key).reduce((a, o) => a + o.total, 0);
    return { label: range === 7 ? DAYS[new Date(t).getDay()] : String(new Date(t).getDate()), total };
  });
  const max = Math.max(1, ...bars.map((b) => b.total));

  // produk terlaris (per game)
  const byGame = new Map<string, number>();
  cur.filter((o) => o.status === "success").forEach((o) => byGame.set(o.gameName, (byGame.get(o.gameName) ?? 0) + 1));
  const top = [...byGame].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const recent = [...s.orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);

  const stats = [
    { t: "Total Penjualan", v: idr(sales(cur)), d: delta(sales(cur), sales(prev)) },
    { t: "Jumlah Pesanan", v: String(cur.length), d: delta(cur.length, prev.length) },
    { t: "Pesanan Pending", v: String(pending), d: "Perlu dicek di Kelola Pesanan", href: "/admin/pesanan" },
    { t: "Komplain Terbuka", v: String(openComplaints), d: "Perlu ditangani", href: "/admin/pesanan" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard Admin" sub="Ringkasan penjualan"
        right={
          <select value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Rentang waktu"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
            <option value={7}>7 Hari Terakhir</option>
            <option value={30}>30 Hari Terakhir</option>
          </select>
        } />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((c) => {
          const body = (
            <>
              <p className="text-xs font-semibold text-gray-500">{c.t}</p>
              <p className="mt-2 text-2xl font-extrabold">{c.v}</p>
              <p className="mt-1 text-xs text-gray-500">{c.d}</p>
            </>
          );
          return c.href
            ? <Link key={c.t} href={c.href} className="vs-card p-5 transition hover:border-indigo-500">{body}</Link>
            : <div key={c.t} className="vs-card p-5">{body}</div>;
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="vs-card p-5">
          <h2 className="font-bold">Penjualan {range} Hari Terakhir</h2>
          <div className="mt-6 flex h-48 items-end gap-2" role="img" aria-label="Grafik penjualan">
            {bars.map((b, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${b.label}: ${idr(b.total)}`}>
                {/* CSS INLINE: tinggi batang mengikuti nilai penjualan */}
                <div className="w-full max-w-10 rounded-t bg-indigo-500 transition-all" style={{ height: `${Math.max((b.total / max) * 100, b.total ? 4 : 1)}%`, opacity: b.total ? 1 : 0.25 }} />
                {(range === 7 || i % 5 === 0) && <span className="text-[10px] text-gray-500">{b.label}</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="vs-card p-5">
          <h2 className="font-bold">Produk Terlaris</h2>
          {top.length === 0 ? <p className="mt-4 text-sm text-gray-500">Belum ada penjualan di rentang ini.</p> : (
            <ol className="mt-4 space-y-3 text-sm">
              {top.map(([name, n], i) => (
                <li key={name} className="flex justify-between gap-2"><span className="truncate">{i + 1}. {name}</span><span className="shrink-0 text-gray-500">{n} terjual</span></li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="vs-card mt-6 overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <h2 className="font-bold">Pesanan Terbaru</h2>
          <Link href="/admin/pesanan" className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-gray-900">Lihat Semua Pesanan</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="ad-table">
            <thead><tr><th>No. Order</th><th>Game &amp; Produk</th><th>Pelanggan</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.code}>
                  <td><Link href={`/admin/pesanan/${o.code}`} className="font-semibold text-indigo-600 hover:underline">{o.code}</Link></td>
                  <td>{o.gameName.split(":")[0]} - {o.item}</td>
                  <td>{o.owner ? "Member" : "Guest"} - {o.email}</td>
                  <td className="font-semibold">{idr(o.total)}</td>
                  <td><Pill tone={statusMeta[o.status].tone}>{statusMeta[o.status].label}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

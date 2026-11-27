"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "./transaksi.css"; // CSS eksternal
import QrDummy from "./QrDummy";
import { fmtDate, idr } from "@/lib/games";
import { fileComplaint, setOrderStatus, useNowSec, useStore, type Order } from "@/lib/store";

const PAY_WINDOW = 60 * 60; // detik (60 menit)

const meta = {
  pending: { icon: "⏳", title: "Menunggu Pembayaran", ring: "bg-yellow-100 text-yellow-700", label: "Menunggu pembayaran" },
  sending: { icon: "🚚", title: "Pesanan Diproses", ring: "bg-blue-100 text-blue-700", label: "Diproses" },
  success: { icon: "✓", title: "Top-up Berhasil", ring: "bg-green-100 text-green-700", label: "Berhasil" },
  failed: { icon: "✕", title: "Pembayaran Gagal", ring: "bg-red-100 text-red-700", label: "Gagal" },
} as const;

const payCode = (o: Order) => {
  let n = 0;
  for (const c of o.code + o.method) n = (n * 31 + c.charCodeAt(0)) % 100000000;
  return (o.method.includes("Virtual") ? "8808" : o.method === "Indomaret" || o.method === "Alfamart" ? "PAY" : "0812") + String(n).padStart(8, "0");
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-gray-500">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

function ComplaintBox({ order }: { order: Order }) {
  const [text, setText] = useState("");
  const c = order.complaint;
  if (c) {
    return (
      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-700/50">
        <p className="font-semibold">Komplain {c.resolved ? "sudah ditangani" : "sedang diproses admin"}</p>
        <p className="mt-1 text-gray-600 dark:text-gray-300">“{c.text}”</p>
        {c.reply && <p className="mt-2 text-indigo-600"><b>Balasan admin:</b> {c.reply}</p>}
      </div>
    );
  }
  return (
    <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-700">
      <p className="text-sm font-semibold">Ada masalah dengan pesanan ini?</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Jelaskan masalahmu..."
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-800" />
      <button disabled={text.trim().length < 5} onClick={() => fileComplaint(order.code, text.trim())}
        className="mt-2 rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-semibold hover:border-indigo-500 disabled:opacity-50 dark:border-gray-600">
        Ajukan Komplain
      </button>
    </div>
  );
}

/** mode "status" = halaman setelah checkout, mode "detail" = detail dari Riwayat */
export default function OrderStatus({ mode }: { mode: "status" | "detail" }) {
  const { code } = useParams<{ code: string }>();
  const s = useStore();
  const nowSec = useNowSec();
  const [checking, setChecking] = useState(false);
  const order = s.orders.find((o) => o.code === code);

  const expiresAt = order ? Math.floor(order.createdAt / 1000) + PAY_WINDOW : 0;
  const left = order && nowSec ? Math.max(0, expiresAt - nowSec) : PAY_WINDOW;

  // waktu habis -> pesanan otomatis gagal
  useEffect(() => {
    if (order?.status === "pending" && !order.seed && nowSec && nowSec >= expiresAt) setOrderStatus(order.code, "failed");
  }, [order, nowSec, expiresAt]);

  if (!order) {
    return (
      <div className="vs-card mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-bold">Pesanan tidak ditemukan</p>
        <p className="mt-1 text-sm text-gray-500">Kode pesanan {code} tidak ada di perangkat ini.</p>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Kembali ke Beranda</Link>
      </div>
    );
  }

  const m = meta[order.status];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  const checkPayment = () => {
    setChecking(true);
    setTimeout(() => { setOrderStatus(order.code, "success"); setChecking(false); }, 1200);
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-[1fr_260px]">
      <div className="vs-card p-8">
        <div className="text-center">
          <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${m.ring}`}>{m.icon}</span>
          <h1 className="mt-3 text-2xl font-extrabold">{m.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {order.status === "pending" && "Selesaikan pembayaran sebelum waktu habis. Pesanan otomatis batal jika waktu habis."}
            {order.status === "sending" && "Pembayaran diterima. Admin sedang memproses pengiriman item ke akun game."}
            {order.status === "success" && `Item sudah dikirim ke akun game. Struk dikirim ke ${order.email}.`}
            {order.status === "failed" && "Pembayaran tidak berhasil diproses atau waktu habis. Tidak ada item yang dikirim."}
          </p>
        </div>

        <dl className="mt-6 divide-y divide-gray-100 dark:divide-gray-700">
          <Row k="No. Pesanan" v={order.code} />
          <Row k="Game" v={order.gameName} />
          <Row k="ID Pemain" v={order.zoneId ? `${order.playerId} (${order.zoneId})` : order.playerId} />
          <Row k="Item" v={order.item} />
          <Row k="Metode" v={order.method} />
          {order.discount > 0 && <Row k="Diskon voucher" v={`- ${idr(order.discount)}`} />}
          <Row k="Total" v={idr(order.total)} />
          <Row k="Status" v={m.label} />
          {order.status === "success" && order.paidAt && <Row k="Waktu" v={fmtDate(order.paidAt)} />}
          {order.status === "success" && order.points > 0 && <Row k="Poin didapat" v={`+${order.points} Pt`} />}
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {order.status === "pending" && mode === "status" && (
            <button onClick={checkPayment} disabled={checking} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {checking ? "Memeriksa..." : "Cek Status Pembayaran"}
            </button>
          )}
          {order.status === "failed" && (
            <Link href={`/game/${order.gameId}`} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">Coba Lagi</Link>
          )}
          {order.status === "success" && mode === "status" && (
            <Link href={`/game/${order.gameId}`} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-700">Top-up Lagi</Link>
          )}
          {mode === "detail" && (
            <Link href="/riwayat" className="flex-1 rounded-lg border border-gray-300 py-2.5 text-center text-sm font-semibold dark:border-gray-600">Kembali ke Riwayat</Link>
          )}
          <Link href="/" className="flex-1 rounded-lg border border-gray-300 py-2.5 text-center text-sm font-semibold hover:border-indigo-500 dark:border-gray-600">Kembali ke Beranda</Link>
        </div>

        {(order.status === "pending" || order.status === "failed") && <ComplaintBox order={order} />}

        {order.status === "pending" && mode === "status" && (
          <button onClick={() => setOrderStatus(order.code, "failed")} className="mt-4 w-full text-center text-xs text-gray-400 hover:text-red-500">
            Simulasi: gagalkan pembayaran ini
          </button>
        )}
      </div>

      {order.status === "pending" && (
        <aside className="vs-card h-fit p-6 text-center">
          <p className="text-xs text-gray-500">Sisa waktu pembayaran</p>
          {/* CSS INLINE: angka hitung mundur */}
          <p className="mb-5 font-mono text-4xl font-extrabold" style={{ color: left < 300 ? "#dc2626" : "inherit" }}>{mm}:{ss}</p>
          {order.method === "QRIS" ? (
            <>
              <p className="mb-2 text-sm font-semibold">Kode QRIS</p>
              <div className="mx-auto" style={{ width: 176, height: 176 }}><QrDummy seed={order.code + order.total} /></div>
              <p className="mt-3 text-xs text-gray-500">Scan untuk membayar {idr(order.total)}</p>
            </>
          ) : (
            <>
              <p className="mb-2 text-sm font-semibold">{order.method.includes("Virtual") ? "Nomor Virtual Account" : "Kode Pembayaran"}</p>
              <p className="rounded-lg bg-gray-100 py-3 font-mono text-lg font-bold tracking-wider dark:bg-gray-700">{payCode(order)}</p>
              <p className="mt-3 text-xs text-gray-500">Bayar {idr(order.total)} lewat {order.method}</p>
            </>
          )}
        </aside>
      )}
    </div>
  );
}

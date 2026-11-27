"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fmtDate, fmtTime, idr } from "@/lib/games";
import { handleComplaint, useNow, useStore, type ComplaintAction, type Order } from "@/lib/store";
import { statusMeta } from "./Dashboard";
import { complaintPill } from "./PesananList";
import { Modal, PageHeader, Pill, Toast, btn, inputCls } from "./ui";

const ACTION_LABEL: Record<ComplaintAction, string> = {
  reprocess: "Proses ulang top-up", refund: "Refund ke metode pembayaran", reject: "Tolak komplain (pembayaran tidak ditemukan)",
};
const PRESET: Record<ComplaintAction, string> = {
  reprocess: "Pembayaran sudah kami verifikasi. Top-up diproses ulang dan struk dikirim ke email Anda.",
  refund: "Pembayaran akan dikembalikan ke metode pembayaran Anda dalam 1-3 hari kerja.",
  reject: "Kami tidak menemukan pembayaran untuk pesanan ini. Mohon kirim bukti pembayaran yang valid.",
};

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 py-2 text-sm"><dt className="text-gray-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>;
}

export default function PesananDetail() {
  const { code } = useParams<{ code: string }>();
  const s = useStore();
  const ready = useNow() > 0;
  const order = s.orders.find((o) => o.code === code);
  if (!ready) return <p className="text-gray-500">Memuat...</p>;
  if (!order) {
    return (
      <div className="vs-card max-w-md p-8 text-center">
        <p className="font-bold">Pesanan tidak ditemukan</p>
        <Link href="/admin/pesanan" className={`${btn.primary} mt-4 inline-block`}>Kembali ke Kelola Pesanan</Link>
      </div>
    );
  }
  return <Detail key={order.code} order={order} />;
}

function Detail({ order: o }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<ComplaintAction>("reprocess");
  const [note, setNote] = useState(PRESET.reprocess);
  const [noteErr, setNoteErr] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const c = o.complaint;

  const pickAction = (a: ComplaintAction) => { setAction(a); setNote(PRESET[a]); setNoteErr(""); };
  const submit = () => {
    if (note.trim().length < 5) { setNoteErr("Catatan untuk pelanggan wajib diisi"); return; }
    handleComplaint(o.code, action, note.trim());
    setOpen(false);
    setToast(`Komplain ditangani. Email terkirim ke ${o.email}`);
  };

  return (
    <div>
      <Link href="/admin/pesanan" className={btn.link}>← Kembali ke Kelola Pesanan</Link>
      <div className="mt-3">
        <PageHeader title="Detail Pesanan" sub={`${o.code} - ${fmtDate(o.createdAt)}`}
          right={<div className="flex items-center gap-2"><Pill tone={statusMeta[o.status].tone}>{statusMeta[o.status].label}</Pill>{c && (c.resolved ? <Pill tone="green">Komplain Selesai</Pill> : <Pill tone="red">Komplain Terbuka</Pill>)}</div>} />
      </div>
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="vs-card p-6">
            <h2 className="mb-2 font-bold">Informasi Pesanan</h2>
            <dl className="divide-y divide-gray-100 dark:divide-gray-700">
              <Row k="Game" v={o.gameName} />
              <Row k="Produk" v={o.item} />
              <Row k="ID Game" v={o.zoneId ? `${o.playerId} (${o.zoneId})` : o.playerId} />
              <Row k="Email penerima struk" v={o.email} />
              <Row k="Tipe pelanggan" v={o.owner ? `Member (${o.owner})` : "Guest (tanpa akun)"} />
              <Row k="Metode bayar" v={o.method} />
              <Row k="Voucher" v={o.voucherName ? `${o.voucherName} (− ${idr(o.discount)})` : "-"} />
              <Row k="Total bayar" v={idr(o.total)} />
            </dl>
          </section>
          <section className="vs-card p-6">
            <h2 className="mb-4 font-bold">Riwayat Status</h2>
            <ol className="space-y-3 border-l-2 border-gray-200 pl-5 dark:border-gray-700">
              {o.history.map((h, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  <span className="font-mono text-xs text-gray-500">{fmtTime(h.at)}</span> {h.text}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          {c && (
            <section className="vs-card p-6">
              <h2 className="font-bold">Komplain Pelanggan {c.resolved ? "Selesai" : "Terbuka"}</h2>
              <p className="mt-1 text-xs text-gray-500">Diajukan: {fmtDate(c.at)} - {o.email}</p>
              <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700/40">{c.text}</p>
              {c.attachment && <p className="mt-2 text-xs text-gray-500">Lampiran: <span className="font-semibold text-indigo-600">{c.attachment}</span></p>}
              <p className="mt-2 text-[11px] text-gray-400">Komplain dari halaman Status Pesanan</p>
              {c.resolved ? (
                <>
                  <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200">{c.reply}</p>
                  <p className="mt-2 text-xs text-gray-500">Ditangani Admin - {c.handledAt ? fmtDate(c.handledAt) : "-"}</p>
                  {c.action && <p className="text-xs text-gray-500">Tindakan: {ACTION_LABEL[c.action]}</p>}
                  <button disabled className={`${btn.ghost} mt-4 w-full opacity-60`}>Komplain Sudah Ditangani</button>
                </>
              ) : (
                <button onClick={() => setOpen(true)} className={`${btn.primary} mt-4 w-full`}>Tangani Komplain</button>
              )}
            </section>
          )}
          <section className="vs-card space-y-3 p-6">
            <h2 className="font-bold">Aksi Pesanan</h2>
            <button onClick={() => setToast(`Struk dikirim ulang ke ${o.email}`)} className={`${btn.ghost} w-full`}>Kirim Ulang Struk ke Email</button>
            <Link href={`/status/${o.code}`} className={`${btn.ghost} block w-full text-center`}>Lihat Status seperti Pelanggan</Link>
            <p className="text-xs text-gray-500">Komplain: {complaintPill(o)}</p>
          </section>
        </div>
      </div>

      {open && (
        <Modal title="Tangani Komplain" onClose={() => setOpen(false)}
          footer={<><button onClick={() => setOpen(false)} className={btn.ghost}>Batal</button><button onClick={submit} className={btn.primary}>Simpan &amp; Kirim Email</button></>}>
          <p className="mb-4 text-sm text-gray-500">Pesanan {o.code} - {o.email}</p>
          <p className="mb-2 text-xs font-semibold">Tindakan</p>
          <div className="space-y-2">
            {(Object.keys(ACTION_LABEL) as ComplaintAction[]).map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600">
                <input type="radio" name="action" checked={action === a} onChange={() => pickAction(a)} />
                {a === "reprocess" ? `${ACTION_LABEL[a]} ${o.gameName.split(":")[0]} ${o.item}` : ACTION_LABEL[a]}
              </label>
            ))}
          </div>
          <label className="mt-4 block text-xs font-semibold">
            Catatan untuk pelanggan
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${inputCls(!!noteErr)} mt-1 font-normal`} />
            <span className={`mt-1 block font-normal ${noteErr ? "text-red-600" : "text-gray-500"}`}>{noteErr || "Catatan ini dikirim ke email pelanggan dan tersimpan di riwayat pesanan"}</span>
          </label>
        </Modal>
      )}
    </div>
  );
}

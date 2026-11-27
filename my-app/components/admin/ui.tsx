"use client";

import { useState } from "react";
import "../transaksi.css"; // .vs-card
import "./admin.css"; // CSS eksternal admin

/* ---------- pesan sukses lintas halaman (mis. setelah simpan form) ---------- */
let flash: string | null = null;
export const setFlash = (m: string) => { flash = m; };
/** ambil pesan flash sekali (dipanggil di initializer useState pada halaman daftar) */
export const takeFlash = () => { const m = flash; flash = null; return m; };

export const btn = {
  primary: "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50",
  dark: "rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900",
  ghost: "rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:border-gray-600",
  danger: "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700",
  link: "text-sm font-semibold text-indigo-600 hover:underline",
};
export const inputCls = (err?: boolean) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-gray-800 ${
    err ? "border-red-500 focus:ring-red-500/30" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-gray-600"
  }`;

export function Pill({ tone, children }: { tone: "green" | "yellow" | "red" | "blue" | "gray"; children: React.ReactNode }) {
  return <span className="ad-pill" data-tone={tone}>{children}</span>;
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div role="status" className="mb-4 flex items-center justify-between rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
      <span>✓ {message}</span>
      <button onClick={onClose} aria-label="Tutup" className="text-green-700/70 hover:text-green-700">✕</button>
    </div>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">! {children}</p>;
}

export function Modal({ title, onClose, children, footer, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`vs-card max-h-[90vh] w-full overflow-y-auto p-6 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      {label}
    </label>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <div className="mt-1 font-normal">{children}</div>
      {error ? <span className="mt-1 block font-medium text-red-600">{error}</span> : hint && <span className="mt-1 block font-normal text-gray-500">{hint}</span>}
    </label>
  );
}

/** pagination: "Menampilkan 1-8 dari 42 produk ‹ 1 2 3 ›" */
export function usePaged<T>(list: T[], size: number) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(list.length / size));
  const cur = Math.min(page, pages);
  return { page: cur, setPage, pages, slice: list.slice((cur - 1) * size, cur * size), from: list.length ? (cur - 1) * size + 1 : 0, to: Math.min(cur * size, list.length) };
}

export function Pagination({ p, total, noun }: { p: ReturnType<typeof usePaged>; total: number; noun: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500 dark:border-gray-700">
      <span>Menampilkan {p.from}-{p.to} dari {total} {noun}</span>
      <div className="flex items-center gap-1">
        <button disabled={p.page <= 1} onClick={() => p.setPage(p.page - 1)} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700" aria-label="Sebelumnya">‹</button>
        {Array.from({ length: p.pages }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => p.setPage(n)} className={`h-7 w-7 rounded font-semibold ${n === p.page ? "bg-indigo-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}>{n}</button>
        ))}
        <button disabled={p.page >= p.pages} onClick={() => p.setPage(p.page + 1)} className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700" aria-label="Berikutnya">›</button>
      </div>
    </div>
  );
}

export const margin = (supplier: number, price: number) =>
  supplier > 0 ? (((price - supplier) / supplier) * 100).toFixed(1).replace(".", ",") + "%" : "-";

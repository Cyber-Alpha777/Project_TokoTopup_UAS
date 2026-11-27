"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, toggleTheme, useAccount, useNow, useStore } from "@/lib/store";
import "./admin.css";

const nav = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/produk", label: "Kelola Produk", icon: "▤" },
  { href: "/admin/pesanan", label: "Kelola Pesanan", icon: "☰" },
  { href: "/admin/voucher", label: "Kelola Voucher", icon: "％" },
  { href: "/admin/game", label: "Kelola Game", icon: "◈" },
];

/** P08 - Akses ditolak 403 (bukan Admin): dialihkan ke Beranda dalam 5 detik */
function Forbidden() {
  const router = useRouter();
  const [left, setLeft] = useState(5);
  useEffect(() => {
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (left <= 0) router.push("/"); }, [left, router]);

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <Link href="/" className="text-lg font-bold text-indigo-600">Vouch<span className="text-gray-900 dark:text-white"> Store</span></Link>
        <span className="ml-auto rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-gray-900">IDN</span>
      </header>
      <div className="vs-card mx-auto mt-16 max-w-xl p-12 text-center">
        <p className="text-6xl font-extrabold">403</p>
        <h1 className="mt-2 text-2xl font-bold">Akses Ditolak</h1>
        <p className="mt-3 text-sm text-gray-500">Halaman Dashboard Admin hanya bisa dibuka oleh Admin. Akun kamu tidak memiliki izin untuk masuk ke halaman ini.</p>
        <p className="mt-4 text-sm text-gray-400">Kamu akan dialihkan ke Beranda dalam {Math.max(left, 0)} detik...</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">Ke Beranda Sekarang</Link>
          <Link href="/login" className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold dark:border-gray-600">Login dengan Akun Lain</Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const account = useAccount();
  const s = useStore();
  const ready = useNow() > 0; // false saat SSR/hidrasi (localStorage belum terbaca)

  const leaving = useRef(false); // true saat admin menekan Keluar -> jangan dialihkan ke /login

  useEffect(() => {
    if (ready && !account && !leaving.current) router.replace("/login");
  }, [ready, account, router]);

  const signOut = () => {
    leaving.current = true;
    logout();
    router.replace("/"); // kembali ke halaman user
  };

  if (!ready || !account) return <p className="p-10 text-center text-gray-500">Memuat...</p>;
  if (account.role !== "admin") return <Forbidden />;

  const isDark = s.theme === "dark";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Link href="/admin" className="text-lg font-bold text-indigo-600">Vouch<span className="text-gray-900 dark:text-white"> Store</span></Link>
        <span className="rounded bg-gray-900 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white dark:bg-white dark:text-gray-900">ADMIN</span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <button onClick={() => toggleTheme(!isDark)} role="switch" aria-checked={isDark} aria-label="Mode gelap"
            className="relative h-5 w-9 rounded-full bg-gray-300 transition dark:bg-indigo-600">
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isDark ? "left-[18px]" : "left-0.5"}`} />
          </button>
          <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-gray-900">IDN</span>
          <Link href="/" className="hidden rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:border-indigo-500 sm:block dark:border-gray-600">Lihat Toko</Link>
          <button onClick={signOut} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Keluar</button>
          {/* CSS INLINE: avatar admin */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full font-bold text-white" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            {account.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="ad-side flex shrink-0 flex-row gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50 p-3 md:w-56 md:flex-col md:border-b-0 md:border-r dark:border-gray-800 dark:bg-gray-950/40">
          {nav.map((n) => {
            const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} data-active={active}
                className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-800">
                <span aria-hidden className="w-4 text-center">{n.icon}</span>{n.label}
              </Link>
            );
          })}
          <div className="ml-auto flex gap-1 md:ml-0 md:mt-auto md:flex-col md:border-t md:border-gray-200 md:pt-3 dark:md:border-gray-800">
            <Link href="/" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800">Lihat Toko</Link>
            <button onClick={signOut}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-gray-200 dark:hover:bg-gray-800">Keluar</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, toggleTheme, useAccount, useStore } from "@/lib/store";

export default function Navbar() {
  const router = useRouter();
  const s = useStore();
  const account = useAccount();
  const [menuOpen, setMenuOpen] = useState(false); // menu hamburger (mobile)
  const [userOpen, setUserOpen] = useState(false); // dropdown member
  const [q, setQ] = useState("");
  const userRef = useRef<HTMLDivElement>(null);


  // tutup dropdown saat klik di luar
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const isDark = s.theme === "dark";
  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/katalog?q=${encodeURIComponent(q.trim())}` : "/katalog");
  };

  const links = [
    { href: "/", label: "Beranda" },
    { href: "/katalog", label: "Katalog" },
    { href: "/promo", label: "Promo" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-3">
        <button className="rounded-lg p-2 hover:bg-gray-100 md:hidden dark:hover:bg-gray-800" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
          ☰
        </button>
        <Link href="/" className="text-lg font-bold text-indigo-600">
          Vouch<span className="text-gray-900 dark:text-white"> Store</span>
        </Link>
        <ul className="hidden gap-5 text-sm font-medium md:flex">
          {links.map((l) => (
            <li key={l.href}><Link href={l.href} className="hover:text-indigo-600">{l.label}</Link></li>
          ))}
        </ul>

        <form onSubmit={search} className="mx-auto hidden w-full max-w-sm md:block">
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari game..."
            className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-gray-700 dark:bg-gray-800"
          />
        </form>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <button
            onClick={() => toggleTheme(!isDark)} role="switch" aria-checked={isDark} aria-label="Mode gelap"
            className="relative h-5 w-9 rounded-full bg-gray-300 transition dark:bg-indigo-600"
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${isDark ? "left-[18px]" : "left-0.5"}`} />
          </button>
          <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-gray-900">IDN</span>

          {account ? (
            <>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                P = {account.points}
              </span>
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserOpen((v) => !v)} aria-label="Menu akun"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-bold text-white"
                >
                  {account.name.charAt(0).toUpperCase()}
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <p className="px-4 py-2 text-xs font-bold text-gray-500">Menu</p>
                    {[...(account.role === "admin" ? [["/admin", "Panel Admin"]] : []), ["/pengaturan", "Pengaturan"], ["/voucher", "Voucher"], ["/riwayat", "Riwayat"]].map(([href, label]) => (
                      <Link key={href} href={href} onClick={() => setUserOpen(false)} className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                        {label}
                      </Link>
                    ))}
                    <button
                      onClick={() => { logout(); setUserOpen(false); router.push("/"); }}
                      className="block w-full border-t border-gray-100 px-4 py-2 text-left text-red-600 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
                    >
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-1.5 font-medium hover:bg-gray-100 dark:hover:bg-gray-800">Masuk</Link>
              <Link href="/register" className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700">Daftar</Link>
            </>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className="border-t border-gray-200 px-6 py-3 md:hidden dark:border-gray-800">
          <form onSubmit={(e) => { search(e); setMenuOpen(false); }} className="mb-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari game..."
              className="w-full rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
          </form>
          <ul className="space-y-1 text-sm font-medium">
            {links.map((l) => (
              <li key={l.href}><Link href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}

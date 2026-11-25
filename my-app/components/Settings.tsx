"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout, toggleTheme, useAccount, useStore } from "@/lib/store";

export default function Settings() {
  const router = useRouter();
  const account = useAccount();
  const s = useStore();

  if (!account) {
    return (
      <div className="vs-card mx-auto max-w-md p-8 text-center">
        <p className="font-bold">Masuk dulu untuk membuka pengaturan.</p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">Masuk</Link>
      </div>
    );
  }
  return (
    <div className="vs-card mx-auto max-w-md space-y-5 p-8">
      <h1 className="text-3xl font-extrabold">Pengaturan</h1>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between"><dt className="text-gray-500">Nama</dt><dd className="font-semibold">{account.name}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="font-semibold">{account.email}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-500">Poin</dt><dd className="font-semibold">{account.points} Pt</dd></div>
      </dl>
      <label className="flex items-center justify-between text-sm">
        Mode gelap
        <input type="checkbox" checked={s.theme === "dark"} onChange={(e) => toggleTheme(e.target.checked)} />
      </label>
      <button onClick={() => { logout(); router.push("/"); }} className="w-full rounded-lg border border-red-300 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
        Keluar
      </button>
    </div>
  );
}

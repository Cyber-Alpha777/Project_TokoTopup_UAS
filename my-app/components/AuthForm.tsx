"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/store";

const inputCls = (err?: string) =>
  `w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-gray-800 ${
    err ? "border-red-500 focus:ring-red-500/30" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-gray-600"
  }`;

function PasswordField({ label, value, onChange, placeholder, error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-xs font-medium">
      {label}
      <div className="relative mt-1">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls(error)} pr-14`} />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600">
          {show ? "Sembunyi" : "Lihat"}
        </button>
      </div>
      {error && <span className="mt-1 block text-red-600">{error}</span>}
    </label>
  );
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRe.test(email) || !password) { setError("Isi email yang valid dan kata sandi."); return; }
    const err = login(email.trim(), password);
    if (err) setError(err);
    else router.push("/");
  };

  return (
    <div className="vs-card mx-auto w-full max-w-md p-8">
      <h1 className="text-3xl font-extrabold">Masuk</h1>
      <p className="mt-2 text-sm text-gray-500">Masuk untuk dapat poin, riwayat transaksi, dan voucher. Top-up tanpa akun tetap bisa.</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">{error}</p>}
        <label className="block text-xs font-medium">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" className={`${inputCls()} mt-1`} />
        </label>
        <PasswordField label="Kata Sandi" value={password} onChange={setPassword} placeholder="Kata sandi" />
        <button className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">Masuk</button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Belum punya akun? <Link href="/register" className="font-semibold text-indigo-600 hover:underline">Daftar</Link>
      </p>
      <div className="my-5 flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />atau<span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" /></div>
      <Link href="/" className="block w-full rounded-lg border border-gray-300 py-2.5 text-center text-sm font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:border-gray-600">
        Lanjut Top-up Tanpa Login
      </Link>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 2) er.name = "Nama pengguna minimal 2 karakter.";
    if (!emailRe.test(f.email)) er.email = "Format email belum benar.";
    if (f.password.length < 8) er.password = "Kata sandi minimal 8 karakter.";
    if (f.confirm !== f.password) er.confirm = "Konfirmasi kata sandi tidak sama.";
    if (!f.terms) er.terms = "Setujui syarat dan ketentuan dulu.";
    if (!Object.keys(er).length) {
      const err = register(f.name.trim(), f.email.trim(), f.password);
      if (err) er.email = err;
      else { router.push("/"); return; }
    }
    setErrors(er);
  };

  return (
    <div className="vs-card mx-auto w-full max-w-md p-8">
      <h1 className="text-3xl font-extrabold">Daftar</h1>
      <p className="mt-2 text-sm text-gray-500">Akun baru otomatis jadi Member: dapat poin dari setiap top-up, riwayat transaksi, dan ringkasan bulanan.</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <label className="block text-xs font-medium">
          Nama Pengguna
          <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Raka" className={`${inputCls(errors.name)} mt-1`} />
          {errors.name && <span className="mt-1 block text-red-600">{errors.name}</span>}
        </label>
        <label className="block text-xs font-medium">
          Email
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="raka@gmail.com" className={`${inputCls(errors.email)} mt-1`} />
          {errors.email && <span className="mt-1 block text-red-600">{errors.email}</span>}
        </label>
        <PasswordField label="Kata Sandi" value={f.password} onChange={(v) => set("password", v)} placeholder="Minimal 8 karakter" error={errors.password} />
        <PasswordField label="Konfirmasi Kata Sandi" value={f.confirm} onChange={(v) => set("confirm", v)} placeholder="Ulangi kata sandi" error={errors.confirm} />
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" checked={f.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5" />
          <span>Saya setuju dengan syarat dan ketentuan{errors.terms && <span className="block text-red-600">{errors.terms}</span>}</span>
        </label>
        <button className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">Daftar</button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Sudah punya akun? <Link href="/login" className="font-semibold text-indigo-600 hover:underline">Masuk</Link>
      </p>
    </div>
  );
}

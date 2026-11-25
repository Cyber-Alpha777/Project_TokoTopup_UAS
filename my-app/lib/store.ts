"use client";

import { useSyncExternalStore } from "react";
import { earnPoints, voucherCatalog } from "./games";

/**
 * Store sederhana berbasis localStorage (tanpa backend) untuk keperluan demo UAS:
 * akun, sesi login, poin, voucher milik member, dan pesanan.
 * CATATAN: kata sandi disimpan apa adanya di localStorage hanya untuk simulasi.
 */

export const WELCOME_POINTS = 500; // bonus poin akun baru (ubah ke 0 bila tidak mau)

export type OwnedVoucher = {
  uid: string; pct: number; minTopup: number; maxDiscount: number;
  expiry: string; expiryISO: string; used: boolean;
};
export type Account = { name: string; email: string; password: string; points: number; vouchers: OwnedVoucher[] };
export type OrderStatus = "pending" | "success" | "failed";
export type Order = {
  code: string; owner: string | null; gameId: string; gameName: string;
  playerId: string; zoneId: string; item: string; method: string;
  price: number; discount: number; total: number; email: string;
  status: OrderStatus; createdAt: number; paidAt?: number; points: number; voucherUid?: string;
};
export type State = {
  accounts: Account[]; session: string | null; orders: Order[];
  theme: "light" | "dark" | null; pointsPopup: number; seq: number;
};

const KEY = "vouchstore:v1";
const DEFAULT: State = {
  accounts: [{ name: "Raka", email: "raka@gmail.com", password: "12345678", points: WELCOME_POINTS, vouchers: [] }],
  session: null, orders: [], theme: null, pointsPopup: 0, seq: 123,
};

const listeners = new Set<() => void>();
let lastRaw: string | null = null;
let cache: State = DEFAULT;

function read(): State {
  if (typeof window === "undefined") return DEFAULT;
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return cache; }
  if (raw === lastRaw) return cache;
  lastRaw = raw;
  try { cache = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT; } catch { cache = DEFAULT; }
  return cache;
}

function write(next: State) {
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(KEY, raw);
    lastRaw = raw;
  } catch { /* localStorage tidak tersedia */ }
  cache = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

export const useStore = () => useSyncExternalStore(subscribe, read, () => DEFAULT);

export function useAccount(): Account | null {
  const s = useStore();
  return s.accounts.find((a) => a.email === s.session) ?? null;
}

/* waktu "sekarang" yang aman untuk SSR: 0 di server, nilai tetap di klien */
let frozenNow = 0;
export const useNow = () =>
  useSyncExternalStore(() => () => {}, () => frozenNow || (frozenNow = Date.now()), () => 0);

const subTick = (cb: () => void) => { const id = setInterval(cb, 1000); return () => clearInterval(id); };
/** detik sekarang, berdetak tiap 1 detik (untuk hitung mundur) */
export const useNowSec = () =>
  useSyncExternalStore(subTick, () => Math.floor(Date.now() / 1000), () => 0);

const mutate = (fn: (s: State) => State) => write(fn(read()));
const patchAccount = (s: State, email: string | null, fn: (a: Account) => Account): State => ({
  ...s, accounts: s.accounts.map((a) => (a.email === email ? fn(a) : a)),
});

/* ---------------- aksi ---------------- */
export function register(name: string, email: string, password: string): string | null {
  const s = read();
  if (s.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) return "Email sudah terdaftar. Silakan masuk.";
  write({
    ...s, session: email,
    accounts: [...s.accounts, { name, email, password, points: WELCOME_POINTS, vouchers: [] }],
  });
  return null;
}

export function login(email: string, password: string): string | null {
  const s = read();
  const acc = s.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
  if (!acc) return "Email atau kata sandi salah.";
  write({ ...s, session: acc.email });
  return null;
}

export const logout = () => mutate((s) => ({ ...s, session: null }));
export const toggleTheme = (dark: boolean) => mutate((s) => ({ ...s, theme: dark ? "dark" : "light" }));
export const clearPointsPopup = () => mutate((s) => ({ ...s, pointsPopup: 0 }));

export function redeemVoucher(catalogId: string): "ok" | "insufficient" | "auth" {
  const s = read();
  const acc = s.accounts.find((a) => a.email === s.session);
  const cv = voucherCatalog.find((v) => v.id === catalogId);
  if (!acc || !cv) return "auth";
  if (acc.points < cv.cost) return "insufficient";
  write(patchAccount(s, acc.email, (a) => ({
    ...a, points: a.points - cv.cost,
    vouchers: [...a.vouchers, {
      uid: `${cv.id}-${Date.now()}`, pct: cv.pct, minTopup: cv.minTopup, maxDiscount: cv.maxDiscount,
      expiry: cv.expiry, expiryISO: cv.expiryISO, used: false,
    }],
  })));
  return "ok";
}

export type NewOrder = Omit<Order, "code" | "status" | "createdAt" | "points" | "owner">;
export function createOrder(input: NewOrder): Order {
  const s = read();
  const order: Order = {
    ...input, owner: s.session, code: `ORD-${String(s.seq).padStart(6, "0")}`,
    status: "pending", createdAt: Date.now(), points: s.session ? earnPoints(input.total) : 0,
  };
  let next: State = { ...s, seq: s.seq + 1, orders: [order, ...s.orders] };
  if (input.voucherUid) {
    next = patchAccount(next, s.session, (a) => ({
      ...a, vouchers: a.vouchers.map((v) => (v.uid === input.voucherUid ? { ...v, used: true } : v)),
    }));
  }
  write(next);
  return order;
}

export function setOrderStatus(code: string, status: OrderStatus) {
  const s = read();
  const order = s.orders.find((o) => o.code === code);
  if (!order || order.status !== "pending") return;
  let next: State = {
    ...s,
    orders: s.orders.map((o) => (o.code === code ? { ...o, status, paidAt: status === "success" ? Date.now() : undefined } : o)),
  };
  if (status === "success" && order.owner) {
    next = patchAccount(next, order.owner, (a) => ({ ...a, points: a.points + order.points }));
    if (s.session === order.owner) next.pointsPopup = order.points;
  }
  if (status === "failed" && order.voucherUid) {
    // voucher dikembalikan bila pembayaran gagal
    next = patchAccount(next, order.owner, (a) => ({
      ...a, vouchers: a.vouchers.map((v) => (v.uid === order.voucherUid ? { ...v, used: false } : v)),
    }));
  }
  write(next);
}

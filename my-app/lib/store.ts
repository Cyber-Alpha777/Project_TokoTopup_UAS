"use client";

import { useSyncExternalStore } from "react";
import { type DiscountRule, earnPoints, fmtDay, games as staticGames } from "./games";

/**
 * Store sederhana berbasis localStorage (tanpa backend) untuk demo UAS:
 * akun, sesi login, poin, voucher member, pesanan, dan data panel admin.
 * CATATAN: kata sandi disimpan apa adanya di localStorage hanya untuk simulasi.
 */

export const WELCOME_POINTS = 500; // bonus poin akun baru (ubah ke 0 bila tidak mau)

export type OwnedVoucher = DiscountRule & {
  uid: string; name: string; minTopup: number; expiry: string; expiryISO: string; used: boolean;
};
export type Role = "member" | "admin";
export type Account = { name: string; email: string; password: string; role: Role; points: number; vouchers: OwnedVoucher[] };

// pending=Pending, sending=Diproses, success=Berhasil, failed=Gagal
export type OrderStatus = "pending" | "sending" | "success" | "failed";
export type ComplaintAction = "reprocess" | "refund" | "reject";
export type Complaint = {
  text: string; at: number; resolved: boolean; attachment?: string;
  reply?: string; action?: ComplaintAction; handledAt?: number;
};
export type HistoryItem = { at: number; text: string };
export type Order = {
  code: string; owner: string | null; gameId: string; gameName: string;
  playerId: string; zoneId: string; item: string; method: string;
  price: number; discount: number; total: number; email: string;
  status: OrderStatus; createdAt: number; paidAt?: number; points: number; voucherUid?: string;
  awarded?: boolean; complaint?: Complaint; history: HistoryItem[]; voucherName?: string; seed?: boolean;
};

/* ----- data panel admin (mengikuti tabel games / products / vouchers di backend) ----- */
export type Platform = "Mobile" | "PC" | "Mobile / PC";
export type AdminGame = { id: string; name: string; platform: Platform; idLabel: string; logo?: string; active: boolean };
export type AdminProduct = {
  id: string; gameId: string; category: string; label: string; supplier: number; price: number; oldPrice?: number; active: boolean;
};
export type AdminVoucher = DiscountRule & {
  id: string; name: string; minTopup: number; cost: number; quota: number; used: number;
  startISO: string; endISO: string; active: boolean;
};
export type AdminData = { games: AdminGame[]; products: AdminProduct[]; vouchers: AdminVoucher[] };

export type State = {
  accounts: Account[]; session: string | null; orders: Order[];
  theme: "light" | "dark" | null; pointsPopup: number; seq: number; admin: AdminData;
};

const KEY = "vouchstore:v4";

/* ---------------- data awal ---------------- */
const PLATFORM: Record<string, Platform> = {
  roblox: "Mobile / PC", efootball: "Mobile / PC", genshin: "Mobile / PC", hsr: "Mobile / PC",
  stumble: "Mobile / PC", valorant: "PC", pointblank: "PC",
};

const seedAdmin = (): AdminData => {
  let n = 0;
  return {
    games: staticGames.map((g) => ({ id: g.id, name: g.name, platform: PLATFORM[g.id] ?? "Mobile", idLabel: g.idLabel, active: true })),
    products: staticGames.flatMap((g) =>
      g.categories.flatMap((c) =>
        c.items.map((i) => {
          const margin = 0.07 + (n++ % 5) * 0.012; // margin awal 7%-12%
          return {
            id: `${g.id}-${i.id}`, gameId: g.id, category: c.name, label: i.label, price: i.price, oldPrice: i.oldPrice,
            supplier: Math.round(i.price / (1 + margin) / 50) * 50, active: true,
          };
        })
      )
    ),
    vouchers: [
      v("v20", "Diskon 20%", 20, 10000, 20000, 500, 100, 38, "2026-11-01", "2026-12-31"),
      v("v8", "Diskon 8%", 8, 5000, 20000, 250, 200, 112, "2026-11-01", "2026-12-31"),
      v("v10", "Diskon 10% Member Baru", 10, 5000, 10000, 300, 100, 87, "2026-10-01", "2026-11-15"),
      v("v25", "Diskon 25%", 25, 10000, 50000, 650, 50, 20, "2026-11-15", "2026-12-15"),
      v("v15", "Diskon 15% Weekend", 15, 8000, 10000, 400, 100, 0, "2026-11-28", "2026-11-29"),
      v("v5", "Diskon 5%", 5, 3000, 5000, 100, 100, 100, "2026-10-01", "2026-10-31"),
      v("v3", "Diskon 3%", 3, 2000, 5000, 100, 100, 14, "2026-10-01", "2026-12-31", false),
      v("v30", "Diskon 30%", 30, 15000, 20000, 600, 50, 9, "2026-11-01", "2027-01-20"),
      v("v40", "Diskon 40%", 40, 20000, 30000, 700, 50, 4, "2026-11-10", "2027-01-31"),
      v("v50", "Diskon 50%", 50, 25000, 50000, 900, 30, 2, "2026-11-20", "2027-02-28"),
      v("v60", "Diskon 60%", 60, 30000, 50000, 1200, 20, 1, "2026-12-01", "2027-02-28"),
      v("v70", "Diskon 70%", 70, 35000, 100000, 1500, 10, 0, "2026-12-15", "2027-03-31"),
    ],
  };
};
function v(id: string, name: string, value: number, maxDiscount: number, minTopup: number,
  cost: number, quota: number, used: number, startISO: string, endISO: string, active = true): AdminVoucher {
  return { id, name, value, maxDiscount, minTopup, cost, quota, used, startISO, endISO, active };
}

const ts = (s: string) => new Date(s).getTime();
const codeFor = (n: number, at: string) => `VS-${at.slice(2, 4)}${at.slice(5, 7)}${at.slice(8, 10)}-${String(n).padStart(4, "0")}`;
function sample(n: number, owner: string | null, email: string, gameId: string, gameName: string, pid: string, zone: string,
  item: string, price: number, method: string, status: OrderStatus, at: string, complaint?: Complaint): Order {
  const t0 = ts(at);
  const history: HistoryItem[] = [
    { at: t0, text: `Pesanan dibuat oleh ${owner ? "Member" : "Guest"}` },
    { at: t0 + 60000, text: `Menunggu pembayaran (${method})` },
  ];
  if (status === "success") history.push({ at: t0 + 180000, text: "Status Berhasil, struk dikirim ke email" });
  if (status === "failed") history.push({ at: t0 + 1800000, text: "Pembayaran gagal / waktu habis" });
  if (complaint) history.push({ at: complaint.at, text: "Pelanggan mengajukan komplain" });
  if (complaint?.resolved && complaint.handledAt) history.push({ at: complaint.handledAt, text: "Admin menangani komplain" });
  return {
    code: codeFor(n, at), owner, gameId, gameName, playerId: pid, zoneId: zone, item, method, price, discount: 0, total: price,
    email, status, createdAt: t0, paidAt: status === "success" ? t0 + 180000 : undefined,
    points: owner ? earnPoints(price) : 0, awarded: status === "success" && !!owner,
    complaint, history: history.sort((a, b) => a.at - b.at), seed: true,
  };
}

const ML = "Mobile Legends: Bang Bang";
// contoh pesanan (tanggal tetap) supaya dashboard & kelola pesanan tidak kosong
const SEED_ORDERS: Order[] = [
  sample(412, "rina@mail.com", "rina@mail.com", "mlbb", ML, "88231045", "2201", "17 + 2 Diamonds", 5908, "QRIS", "success", "2026-11-26T10:30:00"),
  sample(411, null, "dika@mail.com", "ff", "Free Fire", "5821937401", "", "100 Diamonds", 15000, "QRIS", "pending", "2026-11-26T10:02:00",
    { text: "Saldo e-wallet sudah terpotong tapi status pesanan masih pending lebih dari 30 menit. Mohon dicek.", at: ts("2026-11-26T10:41:00"), resolved: false, attachment: "bukti-bayar.png" }),
  sample(410, "tono@mail.com", "tono@mail.com", "roblox", "Roblox", "tonogaming", "", "480 Robux", 108000, "DANA", "failed", "2026-11-26T09:20:00",
    { text: "Pembayaran gagal padahal saldo berkurang.", at: ts("2026-11-26T09:50:00"), resolved: false }),
  sample(409, null, "sari@mail.com", "fcmobile", "FC Mobile", "UID-55102", "", "520 FC Points", 80000, "ShopeePay", "success", "2026-11-26T08:15:00"),
  sample(408, "budi@mail.com", "budi@mail.com", "genshin", "Genshin Impact", "812345678", "", "330 Genesis Crystals", 81000, "GoPay", "success", "2026-11-25T21:40:00"),
  sample(407, null, "yoga@mail.com", "mlbb", ML, "77120934", "3301", "25 + 3 Diamonds", 42000, "Indomaret", "pending", "2026-11-25T19:10:00",
    { text: "Sudah bayar di Indomaret tapi belum diproses.", at: ts("2026-11-25T20:30:00"), resolved: false }),
  sample(406, "nina@mail.com", "nina@mail.com", "pubgm", "PUBG Mobile", "51234987", "", "325 UC", 75000, "QRIS", "success", "2026-11-25T14:05:00",
    { text: "Diamond belum masuk padahal status berhasil.", at: ts("2026-11-25T15:00:00"), resolved: true, handledAt: ts("2026-11-25T15:20:00"), action: "reprocess", reply: "Sudah dicek, item masuk. Silakan restart game." }),
  sample(405, null, "agus@mail.com", "ff", "Free Fire", "9981230", "", "310 Diamonds", 45000, "DANA", "success", "2026-11-24T20:22:00"),
  sample(404, "budi@mail.com", "budi@mail.com", "mlbb", ML, "88231045", "2201", "40 + 4 Diamonds", 12909, "QRIS", "success", "2026-11-24T11:45:00"),
  sample(403, null, "lia@mail.com", "valorant", "VALORANT", "lia#1234", "", "475 VP", 59000, "BRI Virtual Account", "success", "2026-11-23T13:20:00"),
  sample(402, "sinta@mail.com", "sinta@mail.com", "mlbb", ML, "66100234", "1188", "Weekly Diamond Pass", 28000, "GoPay", "failed", "2026-11-23T10:15:00"),
  sample(401, null, "andi@mail.com", "roblox", "Roblox", "andi_rbx", "", "400 Robux", 75000, "Alfamart", "success", "2026-11-22T16:40:00"),
  sample(400, "rina@mail.com", "rina@mail.com", "ff", "Free Fire", "5521098", "", "140 Diamonds", 20000, "DANA", "success", "2026-11-21T18:30:00"),
  sample(399, null, "dewi@mail.com", "mlbb", ML, "55012389", "4410", "77 + 8 Diamonds", 24724, "QRIS", "success", "2026-11-20T12:00:00"),
  sample(398, "budi@mail.com", "budi@mail.com", "efootball", "eFootball™", "KON-88120", "", "1000 coins", 120000, "DANA", "success", "2026-11-19T19:00:00"),
  sample(397, null, "joko@mail.com", "mlbb", ML, "44120934", "1180", "17 + 2 Diamonds", 5908, "ShopeePay", "success", "2026-11-18T09:30:00"),
  sample(396, "tono@mail.com", "tono@mail.com", "ff", "Free Fire", "3321987", "", "70 Diamonds", 10000, "QRIS", "success", "2026-11-17T15:10:00"),
  sample(395, null, "rani@mail.com", "pubgm", "PUBG Mobile", "50012344", "", "60 UC", 15000, "GoPay", "success", "2026-11-16T11:25:00"),
  sample(394, "nina@mail.com", "nina@mail.com", "mlbb", ML, "91200345", "2290", "11 + 1 Diamonds", 3714, "QRIS", "success", "2026-11-15T20:05:00"),
];

const DEFAULT: State = {
  accounts: [
    { name: "Raka", email: "raka@gmail.com", password: "12345678", role: "member", points: WELCOME_POINTS, vouchers: [] },
    { name: "Admin", email: "admin@vouchstore.id", password: "admin1234", role: "admin", points: 0, vouchers: [] },
  ],
  session: null, orders: SEED_ORDERS, theme: null, pointsPopup: 0, seq: 413, admin: seedAdmin(),
};

/* ---------------- penyimpanan ---------------- */
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
const patchOrder = (s: State, code: string, fn: (o: Order) => Order): State => ({
  ...s, orders: s.orders.map((o) => (o.code === code ? fn(o) : o)),
});
const addHistory = (o: Order, text: string): Order => ({ ...o, history: [...o.history, { at: Date.now(), text }] });

/* ---------------- aksi pelanggan ---------------- */
export function register(name: string, email: string, password: string): string | null {
  const s = read();
  if (s.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) return "Email sudah terdaftar. Silakan masuk.";
  write({
    ...s, session: email,
    accounts: [...s.accounts, { name, email, password, role: "member", points: WELCOME_POINTS, vouchers: [] }],
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

/** role akun yang sedang login (untuk mengarahkan Admin ke /admin setelah login) */
export const currentRole = (): Role | null => {
  const s = read();
  return s.accounts.find((a) => a.email === s.session)?.role ?? null;
};

export const logout = () => mutate((s) => ({ ...s, session: null }));
export const toggleTheme = (dark: boolean) => mutate((s) => ({ ...s, theme: dark ? "dark" : "light" }));
export const clearPointsPopup = () => mutate((s) => ({ ...s, pointsPopup: 0 }));

/** status voucher admin berdasarkan tanggal sekarang */
export type VoucherState = "Aktif" | "Berakhir" | "Terjadwal" | "Nonaktif";
export function voucherState(v: AdminVoucher, now: number): VoucherState {
  if (!v.active) return "Nonaktif";
  if (now > 0 && ts(v.endISO + "T23:59:59") < now) return "Berakhir";
  if (now > 0 && ts(v.startISO + "T00:00:00") > now) return "Terjadwal";
  return "Aktif";
}

export function redeemVoucher(id: string): "ok" | "insufficient" | "auth" | "unavailable" {
  const s = read();
  const acc = s.accounts.find((a) => a.email === s.session);
  const cv = s.admin.vouchers.find((x) => x.id === id);
  if (!acc || !cv) return "auth";
  if (voucherState(cv, Date.now()) !== "Aktif" || cv.used >= cv.quota) return "unavailable";
  if (acc.points < cv.cost) return "insufficient";
  let next = patchAccount(s, acc.email, (a) => ({
    ...a, points: a.points - cv.cost,
    vouchers: [...a.vouchers, {
      uid: `${cv.id}-${Date.now()}`, name: cv.name, value: cv.value, maxDiscount: cv.maxDiscount,
      minTopup: cv.minTopup, expiry: fmtDay(cv.endISO), expiryISO: cv.endISO, used: false,
    }],
  }));
  next = { ...next, admin: { ...next.admin, vouchers: next.admin.vouchers.map((x) => (x.id === id ? { ...x, used: x.used + 1 } : x)) } };
  write(next);
  return "ok";
}

export type NewOrder = Omit<Order, "code" | "status" | "createdAt" | "points" | "owner" | "awarded" | "complaint" | "history">;
export function createOrder(input: NewOrder): Order {
  const s = read();
  const now = Date.now();
  const d = new Date(now);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const order: Order = {
    ...input, owner: s.session, code: `VS-${p2(d.getFullYear() % 100)}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${String(s.seq).padStart(4, "0")}`,
    status: "pending", createdAt: now, points: s.session ? earnPoints(input.total) : 0,
    history: [
      { at: now, text: `Pesanan dibuat oleh ${s.session ? "Member" : "Guest"}` },
      { at: now, text: `Menunggu pembayaran (${input.method})` },
    ],
  };
  let next: State = { ...s, seq: s.seq + 1, orders: [order, ...s.orders] };
  if (input.voucherUid) {
    next = patchAccount(next, s.session, (a) => ({
      ...a, vouchers: a.vouchers.map((x) => (x.uid === input.voucherUid ? { ...x, used: true } : x)),
    }));
  }
  write(next);
  return order;
}

const STATUS_NOTE: Record<OrderStatus, string> = {
  pending: "Status kembali Pending",
  sending: "Pesanan diproses, item sedang dikirim",
  success: "Status Berhasil, struk dikirim ke email",
  failed: "Status Gagal / dibatalkan",
};

/** Terapkan perubahan status + efek sampingnya (poin & voucher). Dipakai pelanggan dan admin. */
function applyStatus(s: State, code: string, status: OrderStatus, popup: boolean): State {
  const o = s.orders.find((x) => x.code === code);
  if (!o || o.status === status) return s;
  let next = patchOrder(s, code, (x) => addHistory({ ...x, status, paidAt: status === "success" ? Date.now() : x.paidAt }, STATUS_NOTE[status]));
  if (status === "success" && !o.awarded && o.owner) {
    next = patchAccount(next, o.owner, (a) => ({ ...a, points: a.points + o.points }));
    next = patchOrder(next, code, (x) => ({ ...x, awarded: true }));
    if (popup && s.session === o.owner) next = { ...next, pointsPopup: o.points };
  }
  if (status !== "success" && o.awarded && o.owner) {
    next = patchAccount(next, o.owner, (a) => ({ ...a, points: Math.max(0, a.points - o.points) }));
    next = patchOrder(next, code, (x) => ({ ...x, awarded: false }));
  }
  if (status === "failed" && o.voucherUid) {
    next = patchAccount(next, o.owner, (a) => ({
      ...a, vouchers: a.vouchers.map((x) => (x.uid === o.voucherUid ? { ...x, used: false } : x)),
    }));
  }
  return next;
}

/** Dipakai halaman status pelanggan: hanya dari "pending". */
export function setOrderStatus(code: string, status: OrderStatus) {
  const s = read();
  if (s.orders.find((o) => o.code === code)?.status !== "pending") return;
  write(applyStatus(s, code, status, true));
}

export const fileComplaint = (code: string, text: string) =>
  mutate((s) => patchOrder(s, code, (o) => addHistory({ ...o, complaint: { text, at: Date.now(), resolved: false } }, "Pelanggan mengajukan komplain")));

/* ---------------- aksi admin ---------------- */
export function handleComplaint(code: string, action: ComplaintAction, note: string) {
  const s = read();
  const o = s.orders.find((x) => x.code === code);
  if (!o?.complaint) return;
  const label = { reprocess: `Admin memproses ulang top-up`, refund: "Admin melakukan refund ke metode pembayaran", reject: "Admin menolak komplain" }[action];
  let next = patchOrder(s, code, (x) => addHistory({ ...x, complaint: { ...x.complaint!, resolved: true, action, reply: note, handledAt: Date.now() } }, label));
  if (action === "reprocess") next = applyStatus(next, code, "success", false);
  if (action === "refund") next = applyStatus(next, code, "failed", false);
  write(next);
}

export const adminUpdate = (fn: (a: AdminData) => AdminData) => mutate((s) => ({ ...s, admin: fn(s.admin) }));
export const newId = () => Math.random().toString(36).slice(2, 8);

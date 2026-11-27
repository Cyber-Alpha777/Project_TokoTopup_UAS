// Data game, nominal, voucher, dan metode pembayaran (dummy)

export type Item = { id: string; label: string; price: number; oldPrice?: number };
export type Category = { name: string; items: Item[] };
export type Game = {
  id: string;
  name: string;
  publisher: string;
  image?: string; // jika kosong, dipakai sampul gradient
  hue: number;
  popular?: boolean;
  idLabel: string;
  zoneLabel?: string; // kosong = game tidak butuh ID Zona
  categories: Category[];
};

export const idr = (n: number) =>
  "IDR " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pad = (n: number) => String(n).padStart(2, "0");
export const fmtDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtTime = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
/** "2026-12-31" -> "31 Des 2026" */
export const fmtDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return `${pad(d)} ${MON[m - 1]} ${y}`; };
export const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** 1 poin untuk setiap IDR 300 (dibulatkan ke atas): 5.908 -> 20 poin */
export const earnPoints = (total: number) => Math.ceil(total / 300);

const mk = (p: string, rows: [string, number, number?][]): Item[] =>
  rows.map(([label, price, oldPrice], i) => ({ id: `${p}${i}`, label, price, oldPrice }));

export const games: Game[] = [
  {
    id: "mlbb", name: "Mobile Legends: Bang Bang", publisher: "Moonton", image: "/Mole.jpg", hue: 220, popular: true,
    idLabel: "ID Pengguna", zoneLabel: "ID Zona",
    categories: [
      { name: "Diamonds", items: mk("d", [["5 Diamonds", 1555], ["11 + 1 Diamonds", 3714], ["17 + 2 Diamonds", 5908], ["25 + 3 Diamonds", 8451], ["40 + 4 Diamonds", 12909], ["77 + 8 Diamonds", 24724, 27000]]) },
      { name: "Weekly Pass", items: mk("w", [["Weekly Diamond Pass", 28000], ["Weekly Diamond Pass x2", 55500]]) },
      { name: "Twilight Pass", items: mk("t", [["Twilight Pass", 148000]]) },
    ],
  },
  {
    id: "ff", name: "Free Fire", publisher: "Garena", image: "/FF.jpg", hue: 20, popular: true, idLabel: "Player ID",
    categories: [
      { name: "Diamonds", items: mk("f", [["5 Diamonds", 1000], ["12 Diamonds", 2000], ["50 Diamonds", 7500], ["70 Diamonds", 10000], ["140 Diamonds", 20000], ["355 Diamonds", 50000, 56000]]) },
      { name: "Membership", items: mk("fm", [["Membership Mingguan", 29000], ["Membership Bulanan", 79000]]) },
    ],
  },
  {
    id: "fcmobile", name: "FC Mobile", publisher: "EA Sports", hue: 140, image: "/Fc.jpg", popular: true, idLabel: "UID",
    categories: [{ name: "FC Points", items: mk("fc", [["100 FC Points", 15000], ["520 FC Points", 75000], ["1070 FC Points", 150000], ["2200 FC Points", 300000]]) }],
  },

];

export const getGame = (id: string) => games.find((g) => g.id === id);

/* ---------- Voucher ---------- */
export type DiscountRule = { value: number; maxDiscount: number }; // value = persen diskon (1-100)
export const voucherDiscount = (v: DiscountRule | undefined, price: number) =>
  v ? Math.min(Math.round((price * v.value) / 100), v.maxDiscount) : 0;

export const paymentGroups = [
  { group: "E-wallet", methods: ["DANA", "ShopeePay", "GoPay", "QRIS"] },
  { group: "Transfer Bank", methods: ["BCA Virtual Account", "BRI Virtual Account", "Mandiri Virtual Account"] },
  { group: "Minimarket", methods: ["Indomaret", "Alfamart"] },
];

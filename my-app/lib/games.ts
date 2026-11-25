// Data game, nominal, voucher, dan metode pembayaran (dummy, sesuai wireframe Figma)

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
    id: "fcmobile", name: "FC Mobile", publisher: "EA Sports", hue: 140, popular: true, idLabel: "UID",
    categories: [{ name: "FC Points", items: mk("fc", [["100 FC Points", 15000], ["520 FC Points", 75000], ["1070 FC Points", 150000], ["2200 FC Points", 300000]]) }],
  },
  {
    id: "efootball", name: "eFootball™", publisher: "Konami", hue: 200, popular: true, idLabel: "Konami ID",
    categories: [{ name: "Coins", items: mk("ef", [["130 coins", 21000], ["300 coins", 49000], ["1000 coins", 120000, 160000], ["3250 coins", 380000]]) }],
  },
  {
    id: "roblox", name: "Roblox", publisher: "Roblox Corp", hue: 350, popular: true, idLabel: "Username Roblox",
    categories: [{ name: "Robux", items: mk("rb", [["80 Robux", 15000], ["400 Robux", 75000], ["480 Robux", 146000, 200000], ["800 Robux", 150000]]) }],
  },
  {
    id: "pubgm", name: "PUBG Mobile", publisher: "Tencent", hue: 45, popular: true, idLabel: "Character ID",
    categories: [{ name: "UC", items: mk("pb", [["60 UC", 15000], ["325 UC", 75000], ["660 UC", 148000], ["1800 UC", 380000]]) }],
  },
  {
    id: "genshin", name: "Genshin Impact", publisher: "HoYoverse", hue: 265, idLabel: "UID",
    categories: [{ name: "Genesis Crystals", items: mk("gi", [["60 Genesis Crystals", 16000], ["330 Genesis Crystals", 79000], ["1090 Genesis Crystals", 249000]]) }],
  },
  {
    id: "valorant", name: "VALORANT", publisher: "Riot Games", hue: 0, idLabel: "Riot ID",
    categories: [{ name: "Valorant Points", items: mk("vl", [["475 VP", 59000], ["1000 VP", 119000], ["2050 VP", 239000]]) }],
  },
  {
    id: "hsr", name: "Honkai: Star Rail", publisher: "HoYoverse", hue: 290, idLabel: "UID",
    categories: [{ name: "Oneiric Shards", items: mk("hs", [["60 Oneiric Shards", 16000], ["330 Oneiric Shards", 79000], ["1090 Oneiric Shards", 249000]]) }],
  },
  {
    id: "codm", name: "Call of Duty: Mobile", publisher: "Activision", hue: 100, idLabel: "Open ID",
    categories: [{ name: "CP", items: mk("cd", [["80 CP", 15000], ["400 CP", 75000], ["800 CP", 150000]]) }],
  },
  {
    id: "coc", name: "Clash of Clans", publisher: "Supercell", hue: 30, idLabel: "Player Tag",
    categories: [{ name: "Gems", items: mk("cc", [["500 Gems", 79000], ["1200 Gems", 159000], ["2500 Gems", 319000]]) }],
  },
  {
    id: "aov", name: "Arena of Valor", publisher: "Garena", hue: 170, idLabel: "Player ID",
    categories: [{ name: "Vouchers", items: mk("av", [["40 Vouchers", 10000], ["90 Vouchers", 20000], ["230 Vouchers", 50000]]) }],
  },
  {
    id: "stumble", name: "Stumble Guys", publisher: "Kitka Games", hue: 310, idLabel: "Username",
    categories: [{ name: "Gems", items: mk("sg", [["300 Gems", 15000], ["1000 Gems", 45000], ["2500 Gems", 99000]]) }],
  },
  {
    id: "pointblank", name: "Point Blank", publisher: "Zepetto", hue: 80, idLabel: "Nickname",
    categories: [{ name: "Cash", items: mk("pbl", [["1.200 Cash", 10000], ["6.000 Cash", 50000], ["12.500 Cash", 100000]]) }],
  },
];

export const getGame = (id: string) => games.find((g) => g.id === id);

/** Tawaran spesial = item yang punya harga coret */
export const deals = games.flatMap((g) =>
  g.categories.flatMap((c) =>
    c.items.filter((i) => i.oldPrice).map((i) => ({ game: g, item: i }))
  )
);

/* ---------- Voucher: katalog tukar poin ---------- */
export type CatalogVoucher = {
  id: string; pct: number; cost: number; minTopup: number; maxDiscount: number; expiry: string; expiryISO: string;
};
export const voucherCatalog: CatalogVoucher[] = [
  { id: "c10", pct: 10, cost: 100, minTopup: 5000, maxDiscount: 5000, expiry: "15 Des 2026", expiryISO: "2026-12-15" },
  { id: "c20", pct: 20, cost: 200, minTopup: 5000, maxDiscount: 10000, expiry: "31 Des 2026", expiryISO: "2026-12-31" },
  { id: "c30", pct: 30, cost: 300, minTopup: 5000, maxDiscount: 15000, expiry: "20 Jan 2027", expiryISO: "2027-01-20" },
  { id: "c40", pct: 40, cost: 400, minTopup: 10000, maxDiscount: 20000, expiry: "31 Jan 2027", expiryISO: "2027-01-31" },
  { id: "c50", pct: 50, cost: 500, minTopup: 50000, maxDiscount: 25000, expiry: "28 Feb 2027", expiryISO: "2027-02-28" },
  { id: "c60", pct: 60, cost: 600, minTopup: 50000, maxDiscount: 30000, expiry: "28 Feb 2027", expiryISO: "2027-02-28" },
  { id: "c70", pct: 70, cost: 700, minTopup: 100000, maxDiscount: 35000, expiry: "31 Mar 2027", expiryISO: "2027-03-31" },
];

export const voucherDiscount = (v: { pct: number; maxDiscount: number } | undefined, price: number) =>
  v ? Math.min(Math.round((price * v.pct) / 100), v.maxDiscount) : 0;

export const paymentGroups = [
  { group: "E-wallet", methods: ["DANA", "ShopeePay", "GoPay", "QRIS"] },
  { group: "Transfer Bank", methods: ["BCA Virtual Account", "BRI Virtual Account", "Mandiri Virtual Account"] },
  { group: "Minimarket", methods: ["Indomaret", "Alfamart"] },
];

import Link from "next/link";
import DealCard from "@/components/DealCard";
import { deals, voucherCatalog, idr } from "@/lib/games";

export const metadata = { title: "Promo - Vouch Store" };

const steps = [
  { t: "Top up sebagai member", d: "Masuk lalu top up game favoritmu. Top-up tanpa akun tetap bisa, tapi tanpa poin." },
  { t: "Dapat poin", d: "Setiap IDR 300 transaksi berhasil = 1 poin. Poin masuk otomatis." },
  { t: "Tukar voucher", d: "Tukar poin di halaman Voucher, lalu pakai saat top up berikutnya." },
];

export default function PromoPage() {
  return (
    <div className="space-y-14">
      <section className="rounded-2xl bg-linear-to-br from-purple-600 to-indigo-600 px-8 py-10 text-white">
        <h1 className="text-3xl font-extrabold">Promo &amp; Reward</h1>
        <p className="mt-2 max-w-xl text-indigo-100">Harga spesial, kumpulkan poin, dan tukar dengan voucher diskon.</p>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold">Tawaran Spesial ％</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {deals.map((d) => <DealCard key={d.game.id + d.item.id} game={d.game} item={d.item} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold">Cara dapat voucher</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="rounded-xl bg-gray-50 p-5 dark:bg-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Voucher yang bisa ditukar</h2>
          <Link href="/voucher" className="text-sm font-semibold text-indigo-600 hover:underline">Tukar sekarang ›</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {voucherCatalog.map((v) => (
            <div key={v.id} className="vs-card p-4">
              <p className="font-bold">Diskon {v.pct} %</p>
              <p className="text-xs text-gray-500">Min. top up {idr(v.minTopup)}</p>
              <p className="text-xs text-gray-500">Maks. diskon {idr(v.maxDiscount)}</p>
              <p className="mt-2 text-sm font-bold text-indigo-600">{v.cost} Pt</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

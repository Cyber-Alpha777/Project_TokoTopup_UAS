import Link from "next/link";
import DealCard from "@/components/DealCard";
import GameCard from "@/components/GameCard";
import PointsPopup from "@/components/PointsPopup";
import { deals, games } from "@/lib/games";

const promos = [
  { icon: "🎟️", t: "Voucher Diskon", d: "Pakai voucher hasil tukar poin untuk potongan harga di setiap pesanan.", href: "/voucher" },
  { icon: "🏆", t: "Kumpulkan Poin", d: "Setiap top-up berhasil sebagai member menambah poin otomatis.", href: "/promo" },
  { icon: "🎁", t: "Tukar Poin", d: "Tukarkan poinmu dengan voucher diskon eksklusif.", href: "/voucher" },
];

export default function Home() {
  const popular = games.filter((g) => g.popular);
  const topDeals = deals.slice(0, 2);

  return (
    <div className="space-y-14">
      <PointsPopup />

      <section className="rounded-2xl bg-linear-to-br from-indigo-600 to-purple-600 px-8 py-14 text-white">
        <h1 className="max-w-xl text-3xl font-bold leading-tight md:text-4xl">Top up game favoritmu, cepat dan aman.</h1>
        <p className="mt-3 max-w-lg text-indigo-100">Pilih game, masukkan ID akun, bayar, dan item langsung diproses.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/katalog" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-50">Mulai Top Up</Link>
          <Link href="/promo" className="rounded-lg border border-white/50 px-5 py-2.5 font-semibold hover:bg-white/10">Lihat Promo</Link>
        </div>
      </section>

      {/* Tawaran Spesial */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tawaran Spesial <span aria-hidden>％</span></h2>
          <Link href="/promo" className="text-sm font-semibold text-indigo-600 hover:underline">Lainnya ›</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {topDeals.map((d) => <DealCard key={d.game.id + d.item.id} game={d.game} item={d.item} />)}
        </div>
      </section>

      {/* Game Populer */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Game Populer <span aria-hidden>★</span></h2>
          <Link href="/katalog" className="text-sm font-semibold text-indigo-600 hover:underline">Lainnya ›</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {popular.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
        <div className="mt-6 text-center">
          <Link href="/katalog" className="inline-block rounded-lg border border-gray-300 px-6 py-2 text-sm font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:border-gray-600">
            Lihat semua {games.length} game
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold">Promo &amp; Reward</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {promos.map((p) => (
            <Link key={p.t} href={p.href} className="rounded-xl border border-gray-200 p-5 transition hover:border-indigo-500 hover:shadow-lg dark:border-gray-700">
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-2 font-semibold">{p.t}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{p.d}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

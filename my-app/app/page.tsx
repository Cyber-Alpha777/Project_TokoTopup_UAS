import Link from "next/link";
import Image from "next/image";

const games = [
  { id: "mlbb", name: "Mobile Legends", publisher: "Moonton", image: "/Mole.jpg", from: 3000 },
  { id: "ff", name: "Free Fire", publisher: "Garena", image: "/FF.jpg", from: 1000 },

]

export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

const steps = [
  { t: "Pilih Game", d: "Cari game dan nominal top up yang kamu mau." },
  { t: "Isi Akun Tujuan", d: "Masukkan ID game / akun tempat item dikirim." },
  { t: "Bayar", d: "Pilih metode pembayaran dan selesaikan pembayaran." },
  { t: "Item Terkirim", d: "Pesanan diproses dan item masuk ke akunmu." },
];

const promos = [
  { icon: "🎟️", t: "Voucher Diskon", d: "Pakai kode promo untuk potongan harga di setiap pesanan." },
  { icon: "🏆", t: "Selesaikan Quest", d: "Setiap pesanan selesai menambah progres quest dan poin." },
  { icon: "🎁", t: "Tukar Poin", d: "Tukarkan poinmu dengan voucher diskon eksklusif." },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="rounded-2xl bg-linear-to-br from-indigo-600 to-purple-600 px-8 py-14 text-white">
        <h1 className="max-w-xl text-3xl font-bold leading-tight md:text-4xl">
          Top up game favoritmu, cepat dan aman.
        </h1>
        <p className="mt-3 max-w-lg text-indigo-100">
          Pilih game, masukkan ID akun, bayar, dan item langsung diproses.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/#katalog" className="rounded-lg bg-white px-5 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-50">
            Mulai Top Up
          </Link>
          <Link href="/#promo" className="rounded-lg border border-white/50 px-5 py-2.5 font-semibold hover:bg-white/10">
            Lihat Promo
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold">Katalog Game</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/game/${g.id}`}
              className="group rounded-xl border border-gray-200 p-4 transition hover:-translate-y-1 hover:border-indigo-500 hover:shadow-lg dark:border-gray-700">
              <Image src={g.image} alt="PlaceHolder Pic" className="flex h-24 items-center justify-center rounded-lg bg-indigo-50 text-5xl dark:bg-gray-800" width={192} height={192}/>                
              <h3 className="mt-3 font-semibold group-hover:text-indigo-600">{g.name}</h3>
              <p className="text-xs text-gray-500">{g.publisher}</p>
              <p className="mt-2 text-sm">Mulai <span className="font-bold text-indigo-600">{rupiah(g.from)}</span></p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold">Promo & Reward</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {promos.map((p) => (
            <div key={p.t} className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-2 font-semibold">{p.t}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold">Cara Order</h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="rounded-xl bg-gray-50 p-5 dark:bg-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-indigo-600">
          Vouch<span className="text-gray-900 dark:text-white">Store</span>
        </Link>
        <ul className="hidden gap-6 text-sm font-medium md:flex">
          <li><Link href="/" className="hover:text-indigo-600">Beranda</Link></li>
          <li><Link href="/#katalog" className="hover:text-indigo-600">Katalog</Link></li>
          <li><Link href="/#promo" className="hover:text-indigo-600">Promo</Link></li>
          <li><Link href="/#cara-order" className="hover:text-indigo-600">Cara Order</Link></li>
        </ul>
        <div className="flex gap-2 text-sm">
          <Link href="/login" className="rounded-lg px-4 py-2 font-medium hover:bg-gray-100 dark:hover:bg-gray-800">Masuk</Link>
          <Link href="/register" className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700">Daftar</Link>
        </div>
      </nav>
    </header>
  );
}
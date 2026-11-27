import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Layout situs pelanggan (Navbar + Footer). Halaman /admin punya layout sendiri.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
      <Footer />
    </div>
  );
}

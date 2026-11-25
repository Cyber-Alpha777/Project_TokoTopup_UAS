import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Vouch Store - Top up game cepat, aman, dan murah",
  description: "Top up game favoritmu, kumpulkan poin, dan tukar dengan voucher diskon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="flex min-h-screen flex-col font-sans dark:bg-gray-900 dark:text-gray-100">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

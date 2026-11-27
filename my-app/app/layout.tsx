import "./globals.css";
import ThemeSync from "@/components/ThemeSync";

export const metadata = {
  title: "Vouch Store - Top up game cepat, aman, dan murah",
  description: "Top up game favoritmu, kumpulkan poin, dan tukar dengan voucher diskon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans dark:bg-gray-900 dark:text-gray-100">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}

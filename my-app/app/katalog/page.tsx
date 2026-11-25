import { Suspense } from "react";
import KatalogView from "@/components/KatalogView";

export const metadata = { title: "Katalog Game - Vouch Store" };

export default function KatalogPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Memuat katalog...</p>}>
      <KatalogView />
    </Suspense>
  );
}

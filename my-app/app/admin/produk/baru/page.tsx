import { Suspense } from "react";
import ProdukForm from "@/components/admin/ProdukForm";

export default function ProdukBaruPage() {
  return <Suspense fallback={<p className="text-gray-500">Memuat...</p>}><ProdukForm /></Suspense>;
}

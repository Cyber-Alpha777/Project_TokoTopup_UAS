import { Suspense } from "react";
import PesananDetail from "@/components/admin/PesananDetail";

export default function PesananDetailPage() {
  return <Suspense fallback={<p className="text-gray-500">Memuat...</p>}><PesananDetail /></Suspense>;
}

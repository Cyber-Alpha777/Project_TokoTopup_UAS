import { Suspense } from "react";
import VoucherForm from "@/components/admin/VoucherForm";

export default function VoucherBaruPage() {
  return <Suspense fallback={<p className="text-gray-500">Memuat...</p>}><VoucherForm /></Suspense>;
}

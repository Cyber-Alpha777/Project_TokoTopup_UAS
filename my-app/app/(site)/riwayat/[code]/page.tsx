import { Suspense } from "react";
import OrderStatus from "@/components/OrderStatus";

export const metadata = { title: "Detail Transaksi - Vouch Store" };

export default function DetailPage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-500">Memuat transaksi...</p>}>
      <OrderStatus mode="detail" />
    </Suspense>
  );
}

import { Suspense } from "react";
import OrderStatus from "@/components/OrderStatus";

export const metadata = { title: "Status Pesanan - Vouch Store" };

export default function StatusPage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-500">Memuat pesanan...</p>}>
      <OrderStatus mode="status" />
    </Suspense>
  );
}

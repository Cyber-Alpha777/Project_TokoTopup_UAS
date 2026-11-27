import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";

export const metadata = { title: "Admin - Vouch Store" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-10 text-center text-gray-500">Memuat...</p>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

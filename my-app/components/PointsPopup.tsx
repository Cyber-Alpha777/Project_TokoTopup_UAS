"use client";

import { clearPointsPopup, useAccount, useStore } from "@/lib/store";

/** Popup "Selamat, anda mendapatkan N Point" setelah top-up member berhasil (Figma: Beranda pasca pembayaran). */
export default function PointsPopup() {
  const s = useStore();
  const account = useAccount();
  if (!account || s.pointsPopup <= 0) return null;

  return (
    <>
      {/* CSS INTERNAL: animasi popup */}
      <style>{`
        @keyframes vs-pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: none; } }
        .vs-pop { animation: vs-pop .25s ease both; }
      `}</style>
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
        <div className="vs-pop vs-card w-full max-w-sm p-8 text-center">
          <div className="text-5xl">🎉</div>
          <p className="mt-3 text-lg font-bold">Selamat, anda mendapatkan {s.pointsPopup} Point</p>
          <p className="mt-1 text-sm text-gray-500">Total poinmu sekarang {account.points} Pt.</p>
          <button onClick={clearPointsPopup} className="mt-6 w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">
            Berikutnya
          </button>
        </div>
      </div>
    </>
  );
}

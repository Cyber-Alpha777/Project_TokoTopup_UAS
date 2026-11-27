import { Suspense } from "react";
import GameLoader from "@/components/GameLoader";

export default function GamePage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-500">Memuat...</p>}>
      <GameLoader />
    </Suspense>
  );
}

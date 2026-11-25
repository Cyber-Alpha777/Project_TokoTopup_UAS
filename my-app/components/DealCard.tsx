import Link from "next/link";
import GameCover from "./GameCover";
import { type Game, type Item, idr } from "@/lib/games";

/** Kartu "Tawaran Spesial": harga coret -> harga promo */
export default function DealCard({ game, item }: { game: Game; item: Item }) {
  return (
    <Link
      href={`/game/${game.id}`}
      className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:border-indigo-500 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <GameCover game={game} className="h-16 w-16 shrink-0 rounded-lg" />
      <div className="min-w-0">
        <p className="truncate font-semibold">{game.name}</p>
        <p className="text-xs text-gray-500">{item.label}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
          <span className="text-gray-400 line-through">{idr(item.oldPrice ?? item.price)}</span>
          <span aria-hidden>→</span>
          <b className="text-indigo-600">{idr(item.price)}</b>
        </p>
      </div>
    </Link>
  );
}

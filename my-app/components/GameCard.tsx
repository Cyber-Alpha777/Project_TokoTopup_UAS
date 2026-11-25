import Link from "next/link";
import GameCover from "./GameCover";
import { type Game, idr } from "@/lib/games";

export default function GameCard({ game }: { game: Game }) {
  const from = Math.min(...game.categories.flatMap((c) => c.items.map((i) => i.price)));
  return (
    <Link
      href={`/game/${game.id}`}
      className="group rounded-xl border border-gray-200 p-3 transition hover:-translate-y-1 hover:border-indigo-500 hover:shadow-lg dark:border-gray-700"
    >
      <GameCover game={game} className="aspect-square w-full rounded-lg" />
      <h3 className="mt-3 text-sm font-semibold group-hover:text-indigo-600">{game.name}</h3>
      <p className="text-xs text-gray-500">{game.publisher}</p>
      <p className="mt-2 flex items-center justify-between text-xs">
        <span>Mulai <b className="text-indigo-600">{idr(from)}</b></span>
        <span className="rounded-full bg-indigo-600 px-2 py-0.5 font-semibold text-white">Top up</span>
      </p>
    </Link>
  );
}

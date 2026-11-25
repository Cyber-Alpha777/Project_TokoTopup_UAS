import Image from "next/image";
import type { Game } from "@/lib/games";

/** Sampul game: pakai gambar jika ada, kalau tidak pakai gradient + inisial (CSS inline). */
export default function GameCover({ game, className = "" }: { game: Game; className?: string }) {
  if (game.image) {
    return <Image src={game.image} alt={game.name} width={240} height={240} className={`object-cover ${className}`} />;
  }
  const initials = game.name
    .replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div
      className={`flex items-center justify-center text-2xl font-extrabold text-white ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${game.hue} 70% 45%), hsl(${(game.hue + 50) % 360} 75% 32%))` }}
      aria-label={game.name}
    >
      {initials}
    </div>
  );
}

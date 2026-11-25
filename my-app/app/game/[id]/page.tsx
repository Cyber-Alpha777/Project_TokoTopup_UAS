import { notFound } from "next/navigation";
import TopupForm from "@/components/TopupForm";
import { games } from "@/lib/games";

export function generateStaticParams() {
  return games.map((g) => ({ id: g.id }));
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = games.find((g) => g.id === id);
  if (!game) notFound();

  return <TopupForm game={game} />;
}

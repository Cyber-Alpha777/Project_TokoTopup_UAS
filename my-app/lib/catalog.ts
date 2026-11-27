"use client";

import { useMemo } from "react";
import { type Game, type Item, games as staticGames } from "./games";
import { type AdminData, useStore } from "./store";

const hueOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

/** Katalog toko = data admin (game/produk aktif) digabung dengan gambar & detail dari data statis. */
export function buildCatalog(admin: AdminData): Game[] {
  return admin.games
    .filter((g) => g.active)
    .map((ag) => {
      const base = staticGames.find((s) => s.id === ag.id);
      const cats = new Map<string, Item[]>();
      admin.products
        .filter((p) => p.gameId === ag.id && p.active)
        .forEach((p) => {
          const list = cats.get(p.category) ?? [];
          list.push({ id: p.id, label: p.label, price: p.price, oldPrice: p.oldPrice });
          cats.set(p.category, list);
        });
      return {
        id: ag.id, name: ag.name, publisher: base?.publisher ?? ag.platform, image: base?.image,
        hue: base?.hue ?? hueOf(ag.id), popular: base?.popular, idLabel: ag.idLabel, zoneLabel: base?.zoneLabel,
        categories: [...cats].map(([name, items]) => ({ name, items })),
      } as Game;
    })
    .filter((g) => g.categories.length > 0); // game tanpa produk belum tampil di katalog
}

export function useCatalog(): Game[] {
  const s = useStore();
  return useMemo(() => buildCatalog(s.admin), [s.admin]);
}

/** item bertanda harga coret = "Tawaran Spesial" */
export function useDeals() {
  const catalog = useCatalog();
  return useMemo(
    () => catalog.flatMap((g) => g.categories.flatMap((c) => c.items.filter((i) => i.oldPrice).map((i) => ({ game: g, item: i })))),
    [catalog]
  );
}

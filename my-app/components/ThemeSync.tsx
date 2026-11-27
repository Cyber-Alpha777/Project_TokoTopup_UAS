"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Menerapkan mode gelap/terang ke <html> di semua halaman (user maupun admin). */
export default function ThemeSync() {
  const s = useStore();
  useEffect(() => {
    const dark = s.theme ? s.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  }, [s.theme]);
  return null;
}

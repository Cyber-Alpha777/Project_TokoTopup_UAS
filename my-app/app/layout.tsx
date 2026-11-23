import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";


export default async function LocaleLayout({
  children

}: {
  children: React.ReactNode;

}) {
  return (
    <html lang='eng'>
      <body className="flex min-h-screen flex-col font-sans dark:bg-gray-900 dark:text-gray-100">
          <Navbar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
            {children}
          </main>
          <Footer />
      </body>
    </html>
  );

}
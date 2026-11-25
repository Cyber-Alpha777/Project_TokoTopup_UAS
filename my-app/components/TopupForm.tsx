"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./transaksi.css"; // CSS eksternal
import GameCover from "./GameCover";
import { type Game, idr, paymentGroups, voucherDiscount } from "@/lib/games";
import { createOrder, useAccount, useNow, type OwnedVoucher } from "@/lib/store";

const inputCls = (err?: boolean) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 dark:bg-gray-800 ${
    err ? "border-red-500 focus:ring-red-500/30" : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/30 dark:border-gray-600"
  }`;
const cardCls = "rounded-xl bg-gray-100 p-5 dark:bg-gray-800/60";

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{n}</span>
      {children}
    </h2>
  );
}

export default function TopupForm({ game }: { game: Game }) {
  const router = useRouter();
  const account = useAccount();
  const now = useNow();

  const [view, setView] = useState<"transaksi" | "voucher">("transaksi");
  const [catIdx, setCatIdx] = useState(0);
  const [itemId, setItemId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [emailInput, setEmailInput] = useState<string | null>(null); // null = ikut email akun
  const [payment, setPayment] = useState("");
  const [voucherUid, setVoucherUid] = useState<string | null>(null);
  const [draftUid, setDraftUid] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [guestVoucherNote, setGuestVoucherNote] = useState(false);

  const email = emailInput ?? account?.email ?? "";
  const item = game.categories.flatMap((c) => c.items).find((i) => i.id === itemId);
  const price = item?.price ?? 0;

  /* ----- voucher milik member ----- */
  const owned = (account?.vouchers ?? []).filter((v) => !v.used);
  const isExpired = (v: OwnedVoucher) => now > 0 && new Date(v.expiryISO + "T23:59:59").getTime() < now;
  const eligible = (v: OwnedVoucher) => !!item && !isExpired(v) && price >= v.minTopup;
  const voucher = owned.find((v) => v.uid === voucherUid && eligible(v));
  const discount = voucherDiscount(voucher, price);
  const total = price - discount;

  const draft = owned.find((v) => v.uid === draftUid);
  const draftDiscount = voucherDiscount(draft, price);
  const availableV = owned.filter(eligible);
  const unavailableV = owned.filter((v) => !eligible(v));

  /* ----- validasi ----- */
  const needZone = !!game.zoneLabel;
  const idOk = /^[A-Za-z0-9_#.\-]{4,}$/.test(userId) && (!needZone || /^\d{3,5}$/.test(zoneId));
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showErr = touched && (!idOk || !emailOk);

  const buy = () => {
    setTouched(true);
    if (!idOk || !emailOk || !item || !payment) return;
    const order = createOrder({
      gameId: game.id, gameName: game.name, playerId: userId, zoneId: needZone ? zoneId : "",
      item: item.label, method: payment, price, discount, total, email, voucherUid: voucher?.uid,
    });
    router.push(`/status/${order.code}`);
  };

  /* ===================== PILIH VOUCHER ===================== */
  if (view === "voucher") {
    return (
      <div className="space-y-4">
        <button onClick={() => setView("transaksi")} className="text-sm font-medium text-indigo-600 hover:underline">‹ Kembali ke Pembelian</button>
        <div className={cardCls}>
          <h1 className="text-3xl font-extrabold">Pilih Voucher</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Voucher hasil tukar poin kamu. Pilih satu untuk dipakai di top up ini.</p>

          {owned.length === 0 ? (
            <div className="mt-8 rounded-xl bg-white p-10 text-center dark:bg-gray-800">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-xl font-bold text-indigo-700">%</span>
              <p className="mt-3 text-lg font-bold">Belum ada voucher</p>
              <p className="mt-1 text-sm text-gray-500">Tukar poin kamu dengan voucher di halaman Voucher, lalu pakai di top up.</p>
              <div className="mt-5 flex justify-center gap-3">
                <Link href="/voucher" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Tukar Poin</Link>
                <button onClick={() => setView("transaksi")} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold dark:border-gray-600">Kembali</button>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-6 md:grid-cols-[1fr_320px]">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Voucher tersedia ({availableV.length})</h3>
                <div className="space-y-3">
                  {availableV.map((v) => (
                    <button key={v.uid} className="tt-option" data-selected={draftUid === v.uid} onClick={() => setDraftUid(v.uid)}>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">%</span>
                      <span>
                        <span className="block text-sm font-bold">Voucher diskon {v.pct} %</span>
                        <span className="block text-xs text-gray-500">Min. top up {idr(v.minTopup)} · Maks. diskon {idr(v.maxDiscount)}</span>
                        <span className="block text-[11px] text-gray-400">Berlaku s.d. {v.expiry}</span>
                      </span>
                      <span className="tt-radio" />
                    </button>
                  ))}
                  {availableV.length === 0 && <p className="text-sm text-gray-500">Belum ada voucher yang memenuhi syarat untuk pesananmu.</p>}
                </div>

                {unavailableV.length > 0 && (
                  <>
                    <h3 className="mb-2 mt-6 text-sm font-semibold text-gray-500">Belum bisa dipakai ({unavailableV.length})</h3>
                    <div className="space-y-3">
                      {unavailableV.map((v) => (
                        <button key={v.uid} className="tt-option" disabled>
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-lg font-bold text-gray-500 dark:bg-gray-700">%</span>
                          <span>
                            <span className="block text-sm font-bold">Voucher diskon {v.pct} %</span>
                            <span className="block text-xs text-gray-500">Min. top up {idr(v.minTopup)}</span>
                            <span className="block text-[11px] font-medium text-gray-500">
                              {isExpired(v) ? `Kedaluwarsa ${v.expiry}` : !item ? "Pilih nominal top up dulu" : `Belum memenuhi: tambah ${idr(v.minTopup - price)}`}
                            </span>
                          </span>
                          <span className="tt-radio border-dashed" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="mt-6 text-xs text-gray-500">Belum punya voucher? Tukar poin di halaman <Link href="/voucher" className="font-semibold text-indigo-600">Voucher ›</Link></p>
              </div>

              <aside className="h-fit rounded-xl bg-gray-900 p-5 text-white">
                <h3 className="mb-4 font-bold">Ringkasan Voucher</h3>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between"><dt className="text-gray-400">Voucher dipilih</dt><dd className="font-bold">{draft ? `Diskon ${draft.pct} %` : "-"}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-400">Harga item</dt><dd className="font-bold">{idr(price)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-400">Hemat</dt><dd className="font-bold">− {idr(draftDiscount)}</dd></div>
                </dl>
                <div className="my-4 border-t border-gray-700" />
                <div className="flex items-end justify-between">
                  <span className="text-xs text-gray-400">Total bayar</span>
                  <span className="text-2xl font-extrabold">{idr(price - draftDiscount)}</span>
                </div>
                <button disabled={!draft || !eligible(draft)} onClick={() => { setVoucherUid(draftUid); setView("transaksi"); }}
                  className="mt-4 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-gray-900 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Pakai Voucher
                </button>
                <button onClick={() => { setDraftUid(voucherUid); setView("transaksi"); }}
                  className="mt-2 w-full rounded-lg border border-gray-600 py-2.5 text-sm font-semibold hover:bg-white/10">
                  Batal
                </button>
              </aside>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ===================== PEMBELIAN ===================== */
  return (
    <>
      {/* CSS INTERNAL: tag <style> di dalam komponen */}
      <style>{`
        .tt-banner { border: 2px dashed #a5b4fc; }
        .tt-err { border-color: #ef4444 !important; }
      `}</style>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className={`${cardCls} flex items-center gap-4`}>
            <GameCover game={game} className="h-16 w-16 rounded-lg" />
            <div>
              <h1 className="font-bold">{game.name}</h1>
              <p className="text-xs text-gray-500">{game.publisher}</p>
              {/* CSS INLINE: atribut style */}
              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "#111827", color: "#fff" }}>
                Isi Ulang Instan
              </span>
            </div>
          </div>

          {!account && (
            <div className="tt-banner flex items-center justify-between gap-3 rounded-xl p-4">
              <div>
                <p className="text-sm font-bold">Top-up tanpa akun tetap bisa.</p>
                <p className="text-xs text-gray-500">Masuk atau daftar untuk dapat poin dari setiap top-up.</p>
              </div>
              <Link href="/login" className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900">Masuk / Daftar</Link>
            </div>
          )}

          {/* Voucher */}
          <div className={cardCls}>
            <p className="mb-2 text-sm font-bold">Voucher</p>
            <button
              onClick={() => { if (!account) setGuestVoucherNote(true); else { setDraftUid(voucherUid); setView("voucher"); } }}
              className="flex w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm dark:border-gray-600 dark:bg-gray-800"
            >
              <span className="rounded border border-gray-400 px-1.5 text-[10px] font-bold">%</span>
              <span className={voucher ? "font-semibold" : "text-gray-400"}>
                {voucher ? `Voucher diskon ${voucher.pct} % dipakai` : "Pilih voucher yang tersedia"}
              </span>
              <span className="ml-auto text-xs font-bold">Lihat ›</span>
            </button>
            {voucher ? (
              <p className="mt-1 text-[11px] text-green-600">Hemat {idr(discount)} dari voucher hasil tukar poin.</p>
            ) : (
              <p className="mt-1 text-[11px] text-gray-500">
                Khusus Member. {guestVoucherNote || !account ? <>Masuk untuk memakai voucher dari poin. <Link href="/login" className="font-semibold text-indigo-600">Masuk ›</Link></> : "Voucher dari poin bisa dipakai di sini."}
              </p>
            )}
          </div>

          {/* 1. ID Pemain */}
          <section className={cardCls}>
            <StepTitle n={1}>Masukkan ID Pemain</StepTitle>
            {showErr && !idOk && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">
                ! Data pemain belum bisa diverifikasi. Periksa ID dan email.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium">
                {game.idLabel}
                <input className={`${inputCls(touched && !idOk)} mt-1`} placeholder="12345678" value={userId} onChange={(e) => setUserId(e.target.value.trim())} />
              </label>
              {needZone && (
                <label className="text-xs font-medium">
                  {game.zoneLabel}
                  <input className={`${inputCls(touched && !idOk)} mt-1`} inputMode="numeric" maxLength={5} placeholder="1234" value={zoneId} onChange={(e) => setZoneId(e.target.value.replace(/\D/g, ""))} />
                </label>
              )}
            </div>
            {touched && !idOk && <p className="mt-1 text-xs text-red-600">ID {needZone ? "Pengguna atau ID Zona" : "Pemain"} tidak ditemukan. Periksa di profil game.</p>}

            <label className="mt-3 block text-xs font-medium">
              Email
              <input className={`${inputCls(touched && !emailOk)} mt-1`} type="email" placeholder="raka@email.com" value={email} onChange={(e) => setEmailInput(e.target.value)} />
            </label>
            {touched && !emailOk && <p className="mt-1 text-xs text-red-600">Email tidak ditemukan atau formatnya salah. Struk dikirim ke email ini.</p>}
            <p className="mt-2 text-[11px] font-semibold text-gray-500">Di mana menemukan ID? Buka profil di dalam game.</p>
          </section>

          {/* 2. Pilih Jumlah */}
          <section className={cardCls}>
            <StepTitle n={2}>Pilih Jumlah</StepTitle>
            <div className="mb-3 flex flex-wrap gap-2">
              {game.categories.map((c, i) => (
                <button key={c.name} onClick={() => setCatIdx(i)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${i === catIdx ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-400 hover:border-indigo-500"}`}>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {game.categories[catIdx].items.map((it) => (
                <button key={it.id} className="tt-option" data-selected={it.id === itemId} onClick={() => setItemId(it.id)}>
                  <span className="h-6 w-6 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
                  <span>
                    <span className="block text-xs font-bold">{it.label}</span>
                    <span className="block text-[11px] text-gray-500">
                      {it.oldPrice && <s className="mr-1 text-gray-400">{idr(it.oldPrice)}</s>}{idr(it.price)}
                    </span>
                  </span>
                  <span className="tt-radio" />
                </button>
              ))}
            </div>
            {touched && !item && <p className="mt-2 text-xs text-red-600">Pilih jumlah top up dulu.</p>}
          </section>

          {/* 3. Metode Pembayaran */}
          <section className={cardCls}>
            <StepTitle n={3}>Pilih Metode Pembayaran</StepTitle>
            {paymentGroups.map((g) => (
              <div key={g.group} className="mb-3 last:mb-0">
                <p className="mb-1 text-[11px] font-semibold text-gray-500">{g.group}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.methods.map((m) => (
                    <button key={m} className="tt-option" data-selected={payment === m} onClick={() => setPayment(m)}>
                      <span className="h-5 w-7 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs font-bold">{m}</span>
                      <span className="tt-radio" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {touched && !payment && <p className="mt-2 text-xs text-red-600">Pilih metode pembayaran dulu.</p>}
          </section>
        </div>

        {/* Ringkasan Pesanan (tetap di layar saat scroll) */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-xl bg-gray-900 p-5 text-white">
            <h3 className="mb-3 font-bold">Ringkasan Pesanan</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-gray-400">ID Pengguna</dt><dd className="font-bold">{userId ? `${userId}${needZone && zoneId ? ` (${zoneId})` : ""}` : "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Item</dt><dd className="font-bold">{item?.label ?? "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Pembayaran</dt><dd className="font-bold">{payment || "-"}</dd></div>
              {voucher && <div className="flex justify-between"><dt className="text-gray-400">Voucher {voucher.pct}%</dt><dd className="font-bold">− {idr(discount)}</dd></div>}
            </dl>
            <div className="my-4 border-t border-gray-700" />
            <p className="text-xs text-gray-400">Total</p>
            <p className="mb-4 text-2xl font-extrabold">{idr(total)}</p>
            <button onClick={buy} className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-gray-900 hover:bg-indigo-50">Beli Sekarang</button>
            {account && item && <p className="mt-3 text-center text-[11px] text-gray-400">Kamu dapat +{Math.ceil(total / 300)} poin setelah pembayaran berhasil.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}

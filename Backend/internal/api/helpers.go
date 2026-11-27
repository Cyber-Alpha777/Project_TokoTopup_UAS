package api

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"vouchstore/internal/auth"
	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/concepts/order"
	"vouchstore/internal/concepts/payment"
	"vouchstore/internal/concepts/pointexchange"
	"vouchstore/internal/concepts/quest"
	"vouchstore/internal/concepts/questreward"
	"vouchstore/internal/concepts/voucher"
	"vouchstore/internal/syncs"
)

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_id", "id tidak valid")
		return 0, false
	}
	return id, true
}

func queryInt(r *http.Request, key string, def, lo, hi int) int {
	v, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil {
		return def
	}
	return min(max(v, lo), hi)
}

func actorFrom(r *http.Request) syncs.Actor {
	u, _ := UserFrom(r.Context())
	return syncs.Actor{ID: u.ID, IsAdmin: u.Role == auth.RoleAdmin}
}

func internalError(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	writeError(w, http.StatusInternalServerError, "internal_error", "terjadi kesalahan server")
}

// writeDomainError memetakan error concept dan sync ke respons HTTP.
func writeDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, syncs.ErrNotFound), errors.Is(err, order.ErrNotFound), errors.Is(err, payment.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "data tidak ditemukan")
	case errors.Is(err, admincatalog.ErrProductNotFound):
		writeError(w, http.StatusNotFound, "product_not_found", "produk tidak ditemukan")
	case errors.Is(err, syncs.ErrProductUnavailable):
		writeError(w, http.StatusConflict, "product_unavailable", "produk tidak tersedia atau harga sudah berubah, muat ulang halaman")
	case errors.Is(err, syncs.ErrPaymentAmountMismatch):
		writeError(w, http.StatusConflict, "amount_mismatch", "jumlah bayar tidak sama dengan harga order")
	case errors.Is(err, syncs.ErrOrderClosed):
		writeError(w, http.StatusConflict, "order_closed", "order sudah tidak menerima pembayaran")
	case errors.Is(err, order.ErrNotPending):
		writeError(w, http.StatusConflict, "order_not_pending", "order sudah tidak berstatus pending")
	case errors.Is(err, payment.ErrNotWaiting):
		writeError(w, http.StatusConflict, "payment_not_waiting", "pembayaran sudah tidak berstatus waiting")
	case errors.Is(err, order.ErrNotSending):
		writeError(w, http.StatusConflict, "order_not_sending", "order belum berstatus sending")
	case errors.Is(err, order.ErrInvalidDiscount):
		writeError(w, http.StatusConflict, "discount_too_large", "diskon melebihi harga order")
	case errors.Is(err, syncs.ErrVoucherAlreadyApplied):
		writeError(w, http.StatusConflict, "voucher_already_applied", "order ini sudah memakai voucher")
	case errors.Is(err, syncs.ErrPaymentInProgress):
		writeError(w, http.StatusConflict, "payment_in_progress", "selesaikan atau batalkan pembayaran yang menunggu sebelum memasang voucher")

	// voucher milik user lain disamarkan sebagai tidak ditemukan agar kepemilikan tidak bocor
	case errors.Is(err, voucher.ErrNotFound), errors.Is(err, voucher.ErrNotOwner):
		writeError(w, http.StatusNotFound, "voucher_not_found", "voucher tidak ditemukan")
	case errors.Is(err, voucher.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_voucher", "kode, diskon, kuota, atau masa berlaku tidak valid")
	case errors.Is(err, voucher.ErrCodeTaken):
		writeError(w, http.StatusConflict, "voucher_code_taken", "kode voucher sudah dipakai")
	case errors.Is(err, voucher.ErrInactive):
		writeError(w, http.StatusConflict, "voucher_inactive", "voucher tidak aktif")
	case errors.Is(err, voucher.ErrExpired):
		writeError(w, http.StatusConflict, "voucher_expired", "voucher sudah kedaluwarsa")
	case errors.Is(err, voucher.ErrQuotaExhausted):
		writeError(w, http.StatusConflict, "voucher_exhausted", "kuota voucher habis")
	case errors.Is(err, voucher.ErrAlreadyRedeemed):
		writeError(w, http.StatusConflict, "voucher_already_redeemed", "kamu sudah pernah memakai voucher ini")

	case errors.Is(err, quest.ErrNotFound):
		writeError(w, http.StatusNotFound, "quest_not_found", "quest tidak ditemukan")
	case errors.Is(err, quest.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_quest", "label, poin, target, atau batas waktu tidak valid")
	case errors.Is(err, quest.ErrInactive):
		writeError(w, http.StatusConflict, "quest_inactive", "quest sudah tidak aktif")
	case errors.Is(err, quest.ErrNotDeletable):
		writeError(w, http.StatusConflict, "quest_not_deletable", "quest masih aktif dan belum kedaluwarsa")

	case errors.Is(err, questreward.ErrInsufficientPoints):
		writeError(w, http.StatusConflict, "insufficient_points", "saldo poin tidak cukup")
	case errors.Is(err, pointexchange.ErrOfferNotFound):
		writeError(w, http.StatusNotFound, "offer_not_found", "penawaran tidak ditemukan")
	case errors.Is(err, pointexchange.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, "invalid_offer", "label, nilai, biaya, atau stok tidak valid")
	case errors.Is(err, pointexchange.ErrOfferInactive):
		writeError(w, http.StatusConflict, "offer_inactive", "penawaran tidak aktif")
	case errors.Is(err, pointexchange.ErrOutOfStock):
		writeError(w, http.StatusConflict, "offer_out_of_stock", "stok penawaran habis")

	case errors.Is(err, admincatalog.ErrNameTaken):
		writeError(w, http.StatusConflict, "name_taken", "nama game sudah dipakai")
	case errors.Is(err, admincatalog.ErrGameNotFound):
		writeError(w, http.StatusNotFound, "game_not_found", "game tidak ditemukan")
	case errors.Is(err, admincatalog.ErrGameInactive), errors.Is(err, admincatalog.ErrAlreadyInactive):
		writeError(w, http.StatusConflict, "invalid_state", "game atau produk sudah tidak aktif")
	case errors.Is(err, admincatalog.ErrInvalidPrice):
		writeError(w, http.StatusBadRequest, "invalid_price", "harga harus lebih dari 0")
	default:
		internalError(w, err)
	}
}

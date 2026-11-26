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
	default:
		internalError(w, err)
	}
}

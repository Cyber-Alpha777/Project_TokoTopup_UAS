package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/concepts/order"
	"vouchstore/internal/concepts/pointexchange"
	"vouchstore/internal/concepts/quest"
	"vouchstore/internal/concepts/questreward"
	"vouchstore/internal/concepts/voucher"
	"vouchstore/internal/syncs"
)

func TestWriteDomainError(t *testing.T) {
	cases := []struct {
		err    error
		status int
		code   string
	}{
		{voucher.ErrNotFound, http.StatusNotFound, "voucher_not_found"},
		{voucher.ErrNotOwner, http.StatusNotFound, "voucher_not_found"}, // tidak membocorkan kepemilikan
		{voucher.ErrExpired, http.StatusConflict, "voucher_expired"},
		{voucher.ErrQuotaExhausted, http.StatusConflict, "voucher_exhausted"},
		{voucher.ErrAlreadyRedeemed, http.StatusConflict, "voucher_already_redeemed"},
		{voucher.ErrCodeTaken, http.StatusConflict, "voucher_code_taken"},
		{voucher.ErrInvalidInput, http.StatusBadRequest, "invalid_voucher"},
		{syncs.ErrVoucherAlreadyApplied, http.StatusConflict, "voucher_already_applied"},
		{syncs.ErrPaymentInProgress, http.StatusConflict, "payment_in_progress"},
		{order.ErrInvalidDiscount, http.StatusConflict, "discount_too_large"},
		{order.ErrNotSending, http.StatusConflict, "order_not_sending"},
		{quest.ErrNotFound, http.StatusNotFound, "quest_not_found"},
		{quest.ErrNotDeletable, http.StatusConflict, "quest_not_deletable"},
		{questreward.ErrInsufficientPoints, http.StatusConflict, "insufficient_points"},
		{pointexchange.ErrOfferNotFound, http.StatusNotFound, "offer_not_found"},
		{pointexchange.ErrOutOfStock, http.StatusConflict, "offer_out_of_stock"},
		{pointexchange.ErrOfferInactive, http.StatusConflict, "offer_inactive"},
		{admincatalog.ErrNameTaken, http.StatusConflict, "name_taken"},
		{admincatalog.ErrInvalidPrice, http.StatusBadRequest, "invalid_price"},
		{fmt.Errorf("dibungkus: %w", voucher.ErrExpired), http.StatusConflict, "voucher_expired"},
		{errors.New("error tak dikenal"), http.StatusInternalServerError, "internal_error"},
	}
	for _, c := range cases {
		t.Run(c.code+"/"+c.err.Error(), func(t *testing.T) {
			w := httptest.NewRecorder()
			writeDomainError(w, c.err)
			var body struct {
				Error struct{ Code string } `json:"error"`
			}
			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if w.Code != c.status || body.Error.Code != c.code {
				t.Fatalf("got %d %q, want %d %q", w.Code, body.Error.Code, c.status, c.code)
			}
		})
	}
}

func TestInternalErrorDoesNotLeakDetails(t *testing.T) {
	w := httptest.NewRecorder()
	writeDomainError(w, errors.New("pq: password authentication failed for user postgres"))
	if body := w.Body.String(); w.Code != http.StatusInternalServerError || containsAny(body, "pq:", "password") {
		t.Fatalf("code=%d body=%s", w.Code, body)
	}
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		for i := 0; i+len(sub) <= len(s); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
	}
	return false
}

func TestRequestValidation(t *testing.T) {
	t.Run("voucher: kode, diskon, kuota, dan masa berlaku wajib", func(t *testing.T) {
		f := validateStruct(createVoucherRequest{})
		for _, field := range []string{"code", "discount", "quota", "expires_at"} {
			if f[field] == "" {
				t.Errorf("field %s harus ditolak, fields=%v", field, f)
			}
		}
	})
	t.Run("order: harga opsional tapi tidak boleh negatif", func(t *testing.T) {
		if f := validateStruct(createOrderRequest{ProductID: 1, InGameID: "abcd"}); len(f) != 0 {
			t.Fatalf("tanpa harga harus lolos: %v", f)
		}
		if f := validateStruct(createOrderRequest{ProductID: 1, InGameID: "abcd", Price: -5}); f["price"] == "" {
			t.Fatalf("harga negatif harus ditolak: %v", f)
		}
	})
	t.Run("payment: jumlah opsional tapi tidak boleh negatif", func(t *testing.T) {
		if f := validateStruct(initiatePaymentRequest{Method: "qris"}); len(f) != 0 {
			t.Fatalf("tanpa jumlah harus lolos: %v", f)
		}
		if f := validateStruct(initiatePaymentRequest{Method: "qris", Amount: -1}); f["amount"] == "" {
			t.Fatalf("jumlah negatif harus ditolak: %v", f)
		}
	})
}

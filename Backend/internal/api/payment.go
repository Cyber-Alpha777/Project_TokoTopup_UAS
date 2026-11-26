package api

import (
	"net/http"
	"time"

	"vouchstore/internal/concepts/payment"
)

type initiatePaymentRequest struct {
	Method string `json:"method" validate:"required,max=30"`
	Amount int64  `json:"amount" validate:"required,gt=0"`
}

type paymentResponse struct {
	ID      int64      `json:"id"`
	OrderID int64      `json:"order_id"`
	Method  string     `json:"method"`
	Amount  int64      `json:"amount"`
	Status  string     `json:"status"`
	PaidAt  *time.Time `json:"paid_at"`
}

func toPaymentResponse(p payment.Payment) paymentResponse {
	res := paymentResponse{ID: p.ID, OrderID: p.OrderID, Method: p.Method, Amount: p.Amount, Status: p.Status}
	if p.PaidAt.Valid {
		t := p.PaidAt.Time
		res.PaidAt = &t
	}
	return res
}

func (h *Handler) InitiatePayment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	u, _ := UserFrom(r.Context())
	var req initiatePaymentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if fields := validateStruct(req); len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	p, err := h.sync.InitiatePayment(r.Context(), u.ID, id, req.Method, req.Amount)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, toPaymentResponse(p))
}

func (h *Handler) ListPayments(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	items, err := h.sync.ListPayments(r.Context(), actorFrom(r), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	data := make([]paymentResponse, 0, len(items))
	for _, p := range items {
		data = append(data, toPaymentResponse(p))
	}
	writeJSON(w, http.StatusOK, data)
}

// ConfirmPayment menggantikan callback payment gateway. Admin selalu boleh;
// member hanya boleh jika PAYMENT_SIMULATION=true (mode demo).
func (h *Handler) ConfirmPayment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	actor := actorFrom(r)
	if !actor.IsAdmin && !h.cfg.PaymentSimulation {
		writeError(w, http.StatusForbidden, "forbidden", "konfirmasi pembayaran hanya oleh admin")
		return
	}
	p, err := h.sync.ConfirmPayment(r.Context(), actor, id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toPaymentResponse(p))
}

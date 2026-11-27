package api

import (
	"net/http"
	"time"

	"vouchstore/internal/concepts/pointexchange"
	"vouchstore/internal/concepts/quest"
	"vouchstore/internal/concepts/voucher"
)

type voucherResponse struct {
	ID        int64     `json:"id"`
	Code      string    `json:"code"`
	Discount  int64     `json:"discount"`
	Quota     int32     `json:"quota"`
	ExpiresAt time.Time `json:"expires_at"`
	OwnerID   *int64    `json:"owner_id"`
	Active    bool      `json:"active"`
}

func toVoucherResponse(v voucher.Voucher) voucherResponse {
	res := voucherResponse{ID: v.ID, Code: v.Code, Discount: v.Discount, Quota: v.Quota,
		ExpiresAt: v.ExpiresAt.Time, Active: v.Active}
	if v.OwnerID.Valid {
		id := v.OwnerID.Int64
		res.OwnerID = &id
	}
	return res
}

type questResponse struct {
	ID        int64     `json:"id"`
	Label     string    `json:"label"`
	Points    int32     `json:"points"`
	Target    int32     `json:"target"`
	ExpiresAt time.Time `json:"expires_at"`
	Active    bool      `json:"active"`
}

func toQuestResponse(q quest.Quest) questResponse {
	return questResponse{ID: q.ID, Label: q.Label, Points: q.Points, Target: q.Target,
		ExpiresAt: q.ExpiresAt.Time, Active: q.Active}
}

type exchangeResponse struct {
	ID          int64     `json:"id"`
	OfferID     int64     `json:"offer_id"`
	Cost        int32     `json:"cost"`
	ExchangedAt time.Time `json:"exchanged_at"`
}

func toExchangeResponse(e pointexchange.Exchange) exchangeResponse {
	return exchangeResponse{ID: e.ID, OfferID: e.OfferID, Cost: e.Cost, ExchangedAt: e.ExchangedAt.Time}
}

type redeemVoucherRequest struct {
	Code string `json:"code" validate:"required,min=3,max=30"`
}

// RedeemVoucher: Voucher.redeem + sync ApplyVoucherDiscount.
func (h *Handler) RedeemVoucher(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	u, _ := UserFrom(r.Context())
	var req redeemVoucherRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if fields := validateStruct(req); len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	o, err := h.sync.RedeemVoucher(r.Context(), u.ID, id, req.Code)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toOrderResponse(o))
}

// ListMyVouchers: Voucher._listOwned.
func (h *Handler) ListMyVouchers(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFrom(r.Context())
	items, err := h.sync.ListUsableVouchers(r.Context(), u.ID)
	if err != nil {
		internalError(w, err)
		return
	}
	data := make([]voucherResponse, 0, len(items))
	for _, v := range items {
		data = append(data, toVoucherResponse(v))
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *Handler) ListQuests(w http.ResponseWriter, r *http.Request) {
	items, err := h.sync.ListQuests(r.Context())
	if err != nil {
		internalError(w, err)
		return
	}
	data := make([]questResponse, 0, len(items))
	for _, q := range items {
		data = append(data, toQuestResponse(q))
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *Handler) ListQuestProgress(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFrom(r.Context())
	items, err := h.sync.ListQuestProgress(r.Context(), u.ID)
	if err != nil {
		internalError(w, err)
		return
	}
	if items == nil {
		items = []quest.Progress{}
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *Handler) GetPoints(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFrom(r.Context())
	b, err := h.sync.GetBalance(r.Context(), u.ID)
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]int32{"points": b.Points})
}

func (h *Handler) ListOffers(w http.ResponseWriter, r *http.Request) {
	items, err := h.sync.ListOffers(r.Context())
	if err != nil {
		internalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// ExchangePoints: PointExchange.exchange + sync ExchangeSpendsPoints + ExchangeIssuesVoucher.
func (h *Handler) ExchangePoints(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	u, _ := UserFrom(r.Context())
	ex, v, err := h.sync.ExchangePoints(r.Context(), u.ID, id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"exchange": toExchangeResponse(ex),
		"voucher":  toVoucherResponse(v),
	})
}

func (h *Handler) ListExchanges(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFrom(r.Context())
	items, err := h.sync.ListExchanges(r.Context(), u.ID)
	if err != nil {
		internalError(w, err)
		return
	}
	data := make([]exchangeResponse, 0, len(items))
	for _, e := range items {
		data = append(data, toExchangeResponse(e))
	}
	writeJSON(w, http.StatusOK, data)
}

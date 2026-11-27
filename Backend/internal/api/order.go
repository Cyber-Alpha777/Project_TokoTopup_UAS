package api

import (
	"net/http"
	"regexp"
	"time"

	"vouchstore/internal/concepts/order"
	"vouchstore/internal/syncs"
)

var idRe = regexp.MustCompile(`^[A-Za-z0-9_#.\-]{4,50}$`)

var orderStatuses = map[string]bool{
	order.StatusPending: true, order.StatusSending: true,
	order.StatusCompleted: true, order.StatusCancelled: true,
}

type createOrderRequest struct {
	ProductID int64  `json:"product_id" validate:"required,gt=0"`
	Price     int64  `json:"price" validate:"omitempty,gt=0"` // opsional; jika ada harus sama dengan harga produk, jika kosong dipakai harga dari DB
	InGameID  string `json:"in_game_id" validate:"required,min=4,max=50"`
	ZoneID    string `json:"zone_id" validate:"omitempty,numeric,min=3,max=5"`
}

type orderResponse struct {
	ID        int64     `json:"id"`
	ProductID int64     `json:"product_id"`
	InGameID  string    `json:"in_game_id"`
	ZoneID    string    `json:"zone_id,omitempty"`
	Price     int64     `json:"price"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

func toOrderResponse(o order.Order) orderResponse {
	return orderResponse{
		ID: o.ID, ProductID: o.ProductID, InGameID: o.InGameID, ZoneID: o.ZoneID.String,
		Price: o.Price, Status: o.Status, CreatedAt: o.CreatedAt.Time,
	}
}

func (h *Handler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFrom(r.Context())
	var req createOrderRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	fields := validateStruct(req)
	if req.InGameID != "" && !idRe.MatchString(req.InGameID) {
		fields["in_game_id"] = "ID pemain tidak valid"
	}
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	o, err := h.sync.PlaceOrder(r.Context(), syncs.PlaceOrderInput{
		BuyerID: u.ID, ProductID: req.ProductID, Price: req.Price,
		InGameID: req.InGameID, ZoneID: req.ZoneID,
	})
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, toOrderResponse(o))
}

func (h *Handler) ListOrders(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFrom(r.Context())
	status := r.URL.Query().Get("status")
	if status != "" && !orderStatuses[status] {
		writeError(w, http.StatusBadRequest, "invalid_status", "status tidak valid")
		return
	}
	page := queryInt(r, "page", 1, 1, 1_000_000)
	size := queryInt(r, "page_size", 10, 1, 50)
	items, total, err := h.sync.ListOrders(r.Context(), u.ID, status, int32(page), int32(size))
	if err != nil {
		internalError(w, err)
		return
	}
	data := make([]orderResponse, 0, len(items))
	for _, o := range items {
		data = append(data, toOrderResponse(o))
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": data, "page": page, "page_size": size, "total": total})
}

func (h *Handler) GetOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	o, err := h.sync.GetOrder(r.Context(), actorFrom(r), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toOrderResponse(o))
}

func (h *Handler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	u, _ := UserFrom(r.Context())
	o, err := h.sync.CancelOrder(r.Context(), u.ID, id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toOrderResponse(o))
}

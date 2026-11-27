package api

import (
	"net/http"
	"time"
)

// Semua handler di file ini dipasang di bawah RequireRole(admin) pada router.

type addGameRequest struct {
	Name string `json:"name" validate:"required,min=2,max=100"`
}

type addProductRequest struct {
	Label string `json:"label" validate:"required,max=100"`
	Price int64  `json:"price" validate:"required,gt=0"`
}

type updatePriceRequest struct {
	Price int64 `json:"price" validate:"required,gt=0"`
}

type createVoucherRequest struct {
	Code      string    `json:"code" validate:"required,min=3,max=30"`
	Discount  int64     `json:"discount" validate:"required,gt=0"`
	Quota     int32     `json:"quota" validate:"required,gt=0"`
	ExpiresAt time.Time `json:"expires_at" validate:"required"`
	OwnerID   *int64    `json:"owner_id" validate:"omitempty,gt=0"`
}

type createQuestRequest struct {
	Label     string    `json:"label" validate:"required,max=100"`
	Points    int32     `json:"points" validate:"required,gt=0"`
	Target    int32     `json:"target" validate:"required,gt=0"`
	ExpiresAt time.Time `json:"expires_at" validate:"required"`
}

type createOfferRequest struct {
	Label string `json:"label" validate:"required,max=100"`
	Value int64  `json:"value" validate:"required,gt=0"`
	Cost  int32  `json:"cost" validate:"required,gt=0"`
	Stock int32  `json:"stock" validate:"required,gt=0"`
}

// bind membaca body JSON lalu memvalidasinya; false berarti respons error sudah ditulis.
func bind(w http.ResponseWriter, r *http.Request, dst any) bool {
	if !decodeJSON(w, r, dst) {
		return false
	}
	if fields := validateStruct(dst); len(fields) > 0 {
		writeValidation(w, fields)
		return false
	}
	return true
}

// CompleteOrder: Order.markCompleted + sync CompletedOrderAdvancesQuests + CompletedQuestGrantsReward.
func (h *Handler) CompleteOrder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	o, err := h.sync.CompleteOrder(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toOrderResponse(o))
}

func (h *Handler) AddGame(w http.ResponseWriter, r *http.Request) {
	var req addGameRequest
	if !bind(w, r, &req) {
		return
	}
	g, err := h.catalog.AddGame(r.Context(), req.Name)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, g)
}

func (h *Handler) AddProduct(w http.ResponseWriter, r *http.Request) {
	gameID, ok := pathID(w, r)
	if !ok {
		return
	}
	var req addProductRequest
	if !bind(w, r, &req) {
		return
	}
	p, err := h.catalog.AddProduct(r.Context(), gameID, req.Label, req.Price)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (h *Handler) UpdatePrice(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var req updatePriceRequest
	if !bind(w, r, &req) {
		return
	}
	p, err := h.catalog.UpdatePrice(r.Context(), id, req.Price)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// DeactivateProduct: AdminCatalog.deactivate + sync DeactivatedProductCancelsPendingOrders.
func (h *Handler) DeactivateProduct(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	p, err := h.sync.DeactivateProduct(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) CreateVoucher(w http.ResponseWriter, r *http.Request) {
	var req createVoucherRequest
	if !bind(w, r, &req) {
		return
	}
	v, err := h.sync.CreateVoucher(r.Context(), req.Code, req.Discount, req.Quota, req.ExpiresAt, req.OwnerID)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, toVoucherResponse(v))
}

func (h *Handler) ListVouchers(w http.ResponseWriter, r *http.Request) {
	page := queryInt(r, "page", 1, 1, 1_000_000)
	size := queryInt(r, "page_size", 10, 1, 50)
	items, total, err := h.sync.ListVouchers(r.Context(), int32(page), int32(size))
	if err != nil {
		internalError(w, err)
		return
	}
	data := make([]voucherResponse, 0, len(items))
	for _, v := range items {
		data = append(data, toVoucherResponse(v))
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": data, "page": page, "page_size": size, "total": total})
}

func (h *Handler) CreateQuest(w http.ResponseWriter, r *http.Request) {
	var req createQuestRequest
	if !bind(w, r, &req) {
		return
	}
	q, err := h.sync.CreateQuest(r.Context(), req.Label, req.Points, req.Target, req.ExpiresAt)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, toQuestResponse(q))
}

func (h *Handler) DeactivateQuest(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	q, err := h.sync.DeactivateQuest(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toQuestResponse(q))
}

func (h *Handler) DeleteQuest(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := h.sync.DeleteQuest(r.Context(), id); err != nil {
		writeDomainError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreateOffer(w http.ResponseWriter, r *http.Request) {
	var req createOfferRequest
	if !bind(w, r, &req) {
		return
	}
	o, err := h.sync.CreateOffer(r.Context(), req.Label, req.Value, req.Cost, req.Stock)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, o)
}

func (h *Handler) DeactivateOffer(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	o, err := h.sync.DeactivateOffer(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"vouchstore/internal/concepts/admincatalog"
)

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) ListGames(w http.ResponseWriter, r *http.Request) {
	games, err := h.catalog.ListGames(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "terjadi kesalahan server")
		return
	}
	writeJSON(w, http.StatusOK, games)
}

func (h *Handler) ListProducts(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_id", "id game tidak valid")
		return
	}
	products, err := h.catalog.ListProducts(r.Context(), id)
	switch {
	case errors.Is(err, admincatalog.ErrGameNotFound):
		writeError(w, http.StatusNotFound, "game_not_found", "game tidak ditemukan")
	case err != nil:
		writeError(w, http.StatusInternalServerError, "internal_error", "terjadi kesalahan server")
	default:
		writeJSON(w, http.StatusOK, products)
	}
}

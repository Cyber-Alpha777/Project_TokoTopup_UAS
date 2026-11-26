package api

import (
	"vouchstore/internal/auth"
	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/config"
)

type Handler struct {
	catalog *admincatalog.Concept
	auth    *auth.Service
	cfg     config.Config
}

func NewHandler(c *admincatalog.Concept, a *auth.Service, cfg config.Config) *Handler {
	return &Handler{catalog: c, auth: a, cfg: cfg}
}

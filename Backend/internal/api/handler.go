package api

import (
	"vouchstore/internal/auth"
	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/config"
	"vouchstore/internal/syncs"
)

type Handler struct {
	catalog *admincatalog.Concept
	auth    *auth.Service
	sync    *syncs.Service
	cfg     config.Config
}

func NewHandler(c *admincatalog.Concept, a *auth.Service, s *syncs.Service, cfg config.Config) *Handler {
	return &Handler{catalog: c, auth: a, sync: s, cfg: cfg}
}

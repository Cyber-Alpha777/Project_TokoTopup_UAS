package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"

	"vouchstore/internal/auth"
)

func NewRouter(h *Handler) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger, middleware.Recoverer, middleware.Timeout(30*time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{h.cfg.FrontendOrigin},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	}))
	r.Use(OriginCheck(h.cfg.FrontendOrigin), h.Authenticate)

	r.Get("/healthz", h.Health)
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/games", h.ListGames)
		r.Get("/games/{id}/products", h.ListProducts)

		r.Route("/auth", func(r chi.Router) {
			limit := httprate.LimitByIP(10, time.Minute) // batasi percobaan login/register
			r.With(limit).Post("/register", h.Register)
			r.With(limit).Post("/login", h.Login)
			r.Post("/logout", h.Logout)
			r.With(RequireRole(auth.RoleMember, auth.RoleAdmin)).Get("/me", h.Me)
		})
	})
	return r
}

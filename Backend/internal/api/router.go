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
	r.Use(middleware.Logger, middleware.Recoverer, middleware.Timeout(25*time.Second))
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
		member := RequireRole(auth.RoleMember)
		authed := RequireRole(auth.RoleMember, auth.RoleAdmin)
		r.With(member).Post("/orders", h.CreateOrder)
		r.With(member).Get("/orders", h.ListOrders)
		r.With(authed).Get("/orders/{id}", h.GetOrder)
		r.With(member).Post("/orders/{id}/cancel", h.CancelOrder)
		r.With(member).Post("/orders/{id}/payments", h.InitiatePayment)
		r.With(authed).Get("/orders/{id}/payments", h.ListPayments)
		r.With(authed).Post("/payments/{id}/confirm", h.ConfirmPayment)

		r.With(member).Post("/orders/{id}/voucher", h.RedeemVoucher)
		r.With(member).Get("/vouchers/mine", h.ListMyVouchers)
		r.With(member).Get("/quests", h.ListQuests)
		r.With(member).Get("/quests/progress", h.ListQuestProgress)
		r.With(member).Get("/points", h.GetPoints)
		r.With(member).Get("/offers", h.ListOffers)
		r.With(member).Post("/offers/{id}/exchange", h.ExchangePoints)
		r.With(member).Get("/exchanges", h.ListExchanges)

		r.Route("/admin", func(r chi.Router) {
			r.Use(RequireRole(auth.RoleAdmin))
			r.Post("/orders/{id}/complete", h.CompleteOrder)
			r.Post("/games", h.AddGame)
			r.Post("/games/{id}/products", h.AddProduct)
			r.Patch("/products/{id}", h.UpdatePrice)
			r.Post("/products/{id}/deactivate", h.DeactivateProduct)
			r.Post("/vouchers", h.CreateVoucher)
			r.Get("/vouchers", h.ListVouchers)
			r.Post("/quests", h.CreateQuest)
			r.Post("/quests/{id}/deactivate", h.DeactivateQuest)
			r.Delete("/quests/{id}", h.DeleteQuest)
			r.Post("/offers", h.CreateOffer)
			r.Post("/offers/{id}/deactivate", h.DeactivateOffer)
		})

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

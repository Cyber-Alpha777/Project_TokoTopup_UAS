package api

import (
	"context"
	"net/http"
	"slices"
	"time"

	"vouchstore/internal/auth"
)

const (
	cookieName = "session"
	sessionTTL = 24 * time.Hour
)

type ctxKey struct{}

func UserFrom(ctx context.Context) (auth.User, bool) {
	u, ok := ctx.Value(ctxKey{}).(auth.User)
	return u, ok
}

// Authenticate membaca cookie sesi. Tanpa cookie yang sah, request diperlakukan sebagai guest.
func (h *Handler) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c, err := r.Cookie(cookieName); err == nil {
			if id, err := auth.ParseToken(h.cfg.JWTSecret, c.Value); err == nil {
				if u, err := h.auth.GetByID(r.Context(), id); err == nil {
					r = r.WithContext(context.WithValue(r.Context(), ctxKey{}, u))
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

// RequireRole: 401 jika belum login, 403 jika role tidak diizinkan. Dicek di server.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := UserFrom(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthenticated", "silakan masuk dulu")
				return
			}
			if !slices.Contains(roles, u.Role) {
				writeError(w, http.StatusForbidden, "forbidden", "kamu tidak punya akses")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// OriginCheck: perlindungan CSRF tambahan untuk method yang mengubah data.
func OriginCheck(allowed string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions:
			default:
				if o := r.Header.Get("Origin"); o != "" && o != allowed {
					writeError(w, http.StatusForbidden, "bad_origin", "origin tidak diizinkan")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

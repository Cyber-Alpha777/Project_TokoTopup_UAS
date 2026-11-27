package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"vouchstore/internal/auth"
)

func okHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
}

func withUser(role string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	if role == "" {
		return r
	}
	return r.WithContext(context.WithValue(r.Context(), ctxKey{}, auth.User{ID: 1, Role: role}))
}

func TestRequireRole(t *testing.T) {
	h := RequireRole(auth.RoleAdmin)(okHandler())
	cases := []struct {
		name, role string
		want       int
	}{
		{"guest ditolak 401", "", http.StatusUnauthorized},
		{"member ditolak 403", auth.RoleMember, http.StatusForbidden},
		{"admin diizinkan", auth.RoleAdmin, http.StatusOK},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			h.ServeHTTP(w, withUser(c.role))
			if w.Code != c.want {
				t.Fatalf("got %d want %d", w.Code, c.want)
			}
		})
	}
}

func TestOriginCheck(t *testing.T) {
	h := OriginCheck("http://localhost:3000")(okHandler())
	cases := []struct {
		name, method, origin string
		want                 int
	}{
		{"POST origin salah ditolak", http.MethodPost, "http://evil.com", http.StatusForbidden},
		{"POST origin benar", http.MethodPost, "http://localhost:3000", http.StatusOK},
		{"POST tanpa origin lolos", http.MethodPost, "", http.StatusOK},
		{"GET origin salah tidak dicek", http.MethodGet, "http://evil.com", http.StatusOK},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := httptest.NewRequest(c.method, "/", nil)
			if c.origin != "" {
				r.Header.Set("Origin", c.origin)
			}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != c.want {
				t.Fatalf("got %d want %d", w.Code, c.want)
			}
		})
	}
}

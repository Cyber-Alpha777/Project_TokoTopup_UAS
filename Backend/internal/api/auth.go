package api

import (
	"errors"
	"net/http"
	"regexp"
	"time"

	"vouchstore/internal/auth"
)

var waRe = regexp.MustCompile(`^(\+62|62|0)8[0-9]{8,12}$`)

type registerRequest struct {
	Name      string `json:"name" validate:"required,min=2,max=50"`
	Email     string `json:"email" validate:"required,email,max=100"`
	Password  string `json:"password" validate:"required,min=8,max=72"`
	BirthDate string `json:"birth_date" validate:"required"`
	Whatsapp  string `json:"whatsapp" validate:"required"`
}

type loginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// userResponse sengaja dipisah dari auth.User agar password_hash tidak pernah ikut terkirim.
type userResponse struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	BirthDate string `json:"birth_date"`
	Whatsapp  string `json:"whatsapp"`
	Role      string `json:"role"`
}

func toUserResponse(u auth.User) userResponse {
	return userResponse{
		ID: u.ID, Name: u.Name, Email: u.Email,
		BirthDate: u.BirthDate.Time.Format("2006-01-02"),
		Whatsapp:  u.Whatsapp, Role: u.Role,
	}
}

func (h *Handler) startSession(w http.ResponseWriter, userID int64) error {
	tok, err := auth.IssueToken(h.cfg.JWTSecret, userID, sessionTTL)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name: cookieName, Value: tok, Path: "/",
		HttpOnly: true, Secure: h.cfg.CookieSecure, SameSite: http.SameSiteLaxMode,
		MaxAge: int(sessionTTL.Seconds()),
	})
	return nil
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	fields := validateStruct(req)
	birth, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil || birth.After(time.Now()) || birth.Year() < 1900 {
		fields["birth_date"] = "tanggal lahir tidak valid (format YYYY-MM-DD)"
	}
	if !waRe.MatchString(req.Whatsapp) {
		fields["whatsapp"] = "nomor WhatsApp tidak valid (contoh: 081234567890)"
	}
	if len(fields) > 0 {
		writeValidation(w, fields)
		return
	}

	// role selalu member: klien tidak bisa menentukan role sendiri
	u, err := h.auth.Register(r.Context(), auth.RegisterInput{
		Name: req.Name, Email: req.Email, Password: req.Password,
		Whatsapp: req.Whatsapp, BirthDate: birth, Role: auth.RoleMember,
	})
	switch {
	case errors.Is(err, auth.ErrEmailTaken):
		writeError(w, http.StatusConflict, "email_taken", "email sudah terdaftar")
	case err != nil, h.startSession(w, u.ID) != nil:
		writeError(w, http.StatusInternalServerError, "internal_error", "terjadi kesalahan server")
	default:
		writeJSON(w, http.StatusCreated, toUserResponse(u))
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if fields := validateStruct(req); len(fields) > 0 {
		writeValidation(w, fields)
		return
	}
	u, err := h.auth.Login(r.Context(), req.Email, req.Password)
	switch {
	case errors.Is(err, auth.ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, "invalid_credentials", "email atau kata sandi salah")
	case err != nil, h.startSession(w, u.ID) != nil:
		writeError(w, http.StatusInternalServerError, "internal_error", "terjadi kesalahan server")
	default:
		writeJSON(w, http.StatusOK, toUserResponse(u))
	}
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name: cookieName, Value: "", Path: "/", MaxAge: -1,
		HttpOnly: true, Secure: h.cfg.CookieSecure, SameSite: http.SameSiteLaxMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFrom(r.Context()) // dijamin ada oleh RequireRole
	writeJSON(w, http.StatusOK, toUserResponse(u))
}

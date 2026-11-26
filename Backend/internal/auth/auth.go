package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

const (
	RoleMember = "member"
	RoleAdmin  = "admin"
)

var (
	ErrEmailTaken         = errors.New("auth: email sudah terdaftar")
	ErrInvalidCredentials = errors.New("auth: email atau kata sandi salah")
)

type Service struct{ q *Queries }

func NewService(db DBTX) *Service { return &Service{q: New(db)} }

type RegisterInput struct {
	Name, Email, Password, Whatsapp, Role string
	BirthDate                             time.Time
}

// hash palsu agar waktu respons login tidak membocorkan apakah email terdaftar
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password"), bcrypt.DefaultCost)

func normalizeEmail(e string) string { return strings.ToLower(strings.TrimSpace(e)) }

func (s *Service) Register(ctx context.Context, in RegisterInput) (User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}
	u, err := s.q.CreateUser(ctx, CreateUserParams{
		Name:         in.Name,
		Email:        normalizeEmail(in.Email),
		PasswordHash: string(hash),
		BirthDate:    pgtype.Date{Time: in.BirthDate, Valid: true},
		Whatsapp:     in.Whatsapp,
		Role:         in.Role,
	})
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return User{}, ErrEmailTaken
	}
	return u, err
}

func (s *Service) Login(ctx context.Context, email, password string) (User, error) {
	u, err := s.q.GetUserByEmail(ctx, normalizeEmail(email))
	if errors.Is(err, pgx.ErrNoRows) {
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return User{}, ErrInvalidCredentials
	}
	if err != nil {
		return User{}, err
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return User{}, ErrInvalidCredentials
	}
	return u, nil
}

func (s *Service) GetByID(ctx context.Context, id int64) (User, error) {
	return s.q.GetUserByID(ctx, id)
}

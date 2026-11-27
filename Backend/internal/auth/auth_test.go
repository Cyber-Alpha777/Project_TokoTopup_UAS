package auth

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func newService(t *testing.T) *Service {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL belum di-set")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = tx.Rollback(ctx) })
	return NewService(tx)
}

func input(email string) RegisterInput {
	return RegisterInput{Name: "Raka", Email: email, Password: "password123",
		Whatsapp: "081234567890", Role: RoleMember,
		BirthDate: time.Date(2004, 5, 5, 0, 0, 0, 0, time.UTC)}
}

func TestRegister(t *testing.T) {
	ctx := context.Background()
	t.Run("effects/email dinormalkan, password di-hash", func(t *testing.T) {
		s := newService(t)
		u, err := s.Register(ctx, input("  Raka@Gmail.COM "))
		if err != nil || u.Email != "raka@gmail.com" || u.PasswordHash == "password123" {
			t.Fatalf("u=%+v err=%v", u, err)
		}
	})
	t.Run("requires/email belum terdaftar", func(t *testing.T) {
		s := newService(t)
		_, _ = s.Register(ctx, input("a@b.com"))
		if _, err := s.Register(ctx, input("A@B.com")); !errors.Is(err, ErrEmailTaken) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestLogin(t *testing.T) {
	ctx := context.Background()
	t.Run("berhasil dengan kredensial benar", func(t *testing.T) {
		s := newService(t)
		_, _ = s.Register(ctx, input("a@b.com"))
		if _, err := s.Login(ctx, "A@B.com", "password123"); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("ditolak: password salah", func(t *testing.T) {
		s := newService(t)
		_, _ = s.Register(ctx, input("a@b.com"))
		if _, err := s.Login(ctx, "a@b.com", "salah"); !errors.Is(err, ErrInvalidCredentials) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("ditolak: email tidak terdaftar", func(t *testing.T) {
		s := newService(t)
		if _, err := s.Login(ctx, "x@y.com", "password123"); !errors.Is(err, ErrInvalidCredentials) {
			t.Fatalf("err=%v", err)
		}
	})
}

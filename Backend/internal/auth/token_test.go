package auth

import (
	"strings"
	"testing"
	"time"
)

func TestToken(t *testing.T) {
	secret := strings.Repeat("s", 32)

	t.Run("roundtrip mengembalikan id user", func(t *testing.T) {
		tok, err := IssueToken(secret, 42, time.Hour)
		if err != nil {
			t.Fatal(err)
		}
		id, err := ParseToken(secret, tok)
		if err != nil || id != 42 {
			t.Fatalf("id=%d err=%v", id, err)
		}
	})
	t.Run("ditolak: secret salah", func(t *testing.T) {
		tok, _ := IssueToken(secret, 1, time.Hour)
		if _, err := ParseToken(strings.Repeat("x", 32), tok); err == nil {
			t.Fatal("harus error")
		}
	})
	t.Run("ditolak: kedaluwarsa", func(t *testing.T) {
		tok, _ := IssueToken(secret, 1, -time.Minute)
		if _, err := ParseToken(secret, tok); err == nil {
			t.Fatal("harus error")
		}
	})
	t.Run("ditolak: token sampah", func(t *testing.T) {
		if _, err := ParseToken(secret, "bukan-token"); err == nil {
			t.Fatal("harus error")
		}
	})
}

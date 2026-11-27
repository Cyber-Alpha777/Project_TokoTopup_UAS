package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port, DatabaseURL, JWTSecret,
	FrontendOrigin string
	CookieSecure      bool
	PaymentSimulation bool
}

func Load() Config {
	_ = godotenv.Load()
	secret := must("JWT_SECRET")
	if len(secret) < 32 {
		log.Fatal("JWT_SECRET minimal 32 karakter (buat dengan: openssl rand -base64 48)")
	}
	return Config{
		Port:              get("PORT", "8080"),
		DatabaseURL:       must("DATABASE_URL"),
		JWTSecret:         secret,
		FrontendOrigin:    get("FRONTEND_ORIGIN", "http://localhost:3000"),
		CookieSecure:      os.Getenv("COOKIE_SECURE") == "true",
		PaymentSimulation: os.Getenv("PAYMENT_SIMULATION") == "true",
	}
}

func get(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func must(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("env %s wajib diisi", k)
	}
	return v
}

package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port, DatabaseURL, JWTSecret, FrontendOrigin string
}

func Load() Config {
	_ = godotenv.Load()
	return Config{
		Port:           get("PORT", "8080"),
		DatabaseURL:    must("DATABASE_URL"),
		JWTSecret:      must("JWT_SECRET"),
		FrontendOrigin: get("FRONTEND_ORIGIN", "http://localhost:3000"),
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

package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"vouchstore/internal/api"
	"vouchstore/internal/auth"
	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/config"
	"vouchstore/internal/syncs"
)

func main() {
	cfg := config.Load()

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatal("database tidak terhubung: ", err)
	}

	h := api.NewHandler(admincatalog.NewConcept(pool), auth.NewService(pool), syncs.NewService(pool), cfg)
	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           api.NewRouter(h),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Println("server jalan di :" + cfg.Port)
	log.Fatal(srv.ListenAndServe())
}

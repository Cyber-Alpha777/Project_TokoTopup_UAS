package main

import (
	"context"
	"errors"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"vouchstore/internal/auth"
	"vouchstore/internal/concepts/admincatalog"
	"vouchstore/internal/config"
)

type item struct {
	label string
	price int64
}
type game struct {
	name  string
	items []item
}

var games = []game{
	{"Mobile Legends: Bang Bang", []item{
		{"5 Diamonds", 1555}, {"11 + 1 Diamonds", 3714}, {"17 + 2 Diamonds", 5908},
		{"25 + 3 Diamonds", 8451}, {"40 + 4 Diamonds", 12909}, {"77 + 8 Diamonds", 24724},
		{"Weekly Diamond Pass", 28000}, {"Weekly Diamond Pass x2", 55500}, {"Twilight Pass", 148000},
	}},
	{"Free Fire", []item{
		{"5 Diamonds", 1000}, {"12 Diamonds", 2000}, {"50 Diamonds", 7500}, {"70 Diamonds", 10000},
		{"140 Diamonds", 20000}, {"355 Diamonds", 50000},
		{"Membership Mingguan", 29000}, {"Membership Bulanan", 79000},
	}},
}

func main() {
	cfg := config.Load()
	password := os.Getenv("SEED_PASSWORD")
	if len(password) < 8 {
		log.Fatal("SEED_PASSWORD wajib diisi (minimal 8 karakter)")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	seedUsers(ctx, auth.NewService(pool), password)
	seedCatalog(ctx, admincatalog.NewConcept(pool))
	log.Println("seed selesai")
}

func seedUsers(ctx context.Context, a *auth.Service, password string) {
	users := []auth.RegisterInput{
		{Name: "Admin", Email: "admin@vouchstore.local", Whatsapp: "081200000001",
			BirthDate: time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC), Role: auth.RoleAdmin},
		{Name: "Raka", Email: "raka@gmail.com", Whatsapp: "081200000002",
			BirthDate: time.Date(2004, 5, 17, 0, 0, 0, 0, time.UTC), Role: auth.RoleMember},
	}
	for _, u := range users {
		u.Password = password
		if _, err := a.Register(ctx, u); err != nil && !errors.Is(err, auth.ErrEmailTaken) {
			log.Fatal(err)
		}
	}
}

func seedCatalog(ctx context.Context, c *admincatalog.Concept) {
	if existing, err := c.ListGames(ctx); err != nil || len(existing) > 0 {
		if err != nil {
			log.Fatal(err)
		}
		log.Println("katalog sudah terisi, dilewati")
		return
	}
	for _, g := range games {
		created, err := c.AddGame(ctx, g.name)
		if err != nil {
			log.Fatal(err)
		}
		for _, it := range g.items {
			if _, err := c.AddProduct(ctx, created.ID, it.label, it.price); err != nil {
				log.Fatal(err)
			}
		}
	}
}

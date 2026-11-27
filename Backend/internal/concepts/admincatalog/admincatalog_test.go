package admincatalog

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// newConcept membuat Concept di atas transaksi yang di-rollback saat tes selesai.
func newConcept(t *testing.T) *Concept {
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
	return NewConcept(tx)
}

const missingID = int64(999999999)

func TestAddGame(t *testing.T) {
	ctx := context.Background()
	t.Run("effects/game baru active", func(t *testing.T) {
		c := newConcept(t)
		g, err := c.AddGame(ctx, "Valorant")
		if err != nil || !g.Active || g.Name != "Valorant" {
			t.Fatalf("g=%+v err=%v", g, err)
		}
	})
	t.Run("requires/nama belum dipakai", func(t *testing.T) {
		c := newConcept(t)
		_, _ = c.AddGame(ctx, "Valorant")
		if _, err := c.AddGame(ctx, "Valorant"); !errors.Is(err, ErrNameTaken) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestAddProduct(t *testing.T) {
	ctx := context.Background()
	t.Run("effects/produk baru active", func(t *testing.T) {
		c := newConcept(t)
		g, _ := c.AddGame(ctx, "G")
		p, err := c.AddProduct(ctx, g.ID, "10 Diamonds", 1000)
		if err != nil || !p.Active || p.Price != 1000 || p.GameID != g.ID {
			t.Fatalf("p=%+v err=%v", p, err)
		}
	})
	t.Run("requires/price lebih dari 0", func(t *testing.T) {
		c := newConcept(t)
		g, _ := c.AddGame(ctx, "G")
		for _, price := range []int64{0, -5} {
			if _, err := c.AddProduct(ctx, g.ID, "x", price); !errors.Is(err, ErrInvalidPrice) {
				t.Fatalf("price=%d err=%v", price, err)
			}
		}
	})
	t.Run("requires/game ada", func(t *testing.T) {
		c := newConcept(t)
		if _, err := c.AddProduct(ctx, missingID, "x", 100); !errors.Is(err, ErrGameNotFound) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("requires/game active", func(t *testing.T) {
		c := newConcept(t)
		g, _ := c.AddGame(ctx, "G")
		if _, err := c.q.db.Exec(ctx, "UPDATE games SET active = FALSE WHERE id = $1", g.ID); err != nil {
			t.Fatal(err)
		}
		if _, err := c.AddProduct(ctx, g.ID, "x", 100); !errors.Is(err, ErrGameInactive) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestUpdatePrice(t *testing.T) {
	ctx := context.Background()
	t.Run("effects/harga berubah", func(t *testing.T) {
		c := newConcept(t)
		g, _ := c.AddGame(ctx, "G")
		p, _ := c.AddProduct(ctx, g.ID, "x", 100)
		got, err := c.UpdatePrice(ctx, p.ID, 250)
		if err != nil || got.Price != 250 {
			t.Fatalf("got=%+v err=%v", got, err)
		}
	})
	t.Run("requires/price lebih dari 0", func(t *testing.T) {
		c := newConcept(t)
		if _, err := c.UpdatePrice(ctx, 1, 0); !errors.Is(err, ErrInvalidPrice) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("requires/product ada", func(t *testing.T) {
		c := newConcept(t)
		if _, err := c.UpdatePrice(ctx, missingID, 100); !errors.Is(err, ErrProductNotFound) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestDeactivate(t *testing.T) {
	ctx := context.Background()
	t.Run("effects/active jadi false", func(t *testing.T) {
		c := newConcept(t)
		g, _ := c.AddGame(ctx, "G")
		p, _ := c.AddProduct(ctx, g.ID, "x", 100)
		got, err := c.Deactivate(ctx, p.ID)
		if err != nil || got.Active {
			t.Fatalf("got=%+v err=%v", got, err)
		}
	})
	t.Run("requires/product ada", func(t *testing.T) {
		c := newConcept(t)
		if _, err := c.Deactivate(ctx, missingID); !errors.Is(err, ErrProductNotFound) {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("requires/product masih active", func(t *testing.T) {
		c := newConcept(t)
		g, _ := c.AddGame(ctx, "G")
		p, _ := c.AddProduct(ctx, g.ID, "x", 100)
		_, _ = c.Deactivate(ctx, p.ID)
		if _, err := c.Deactivate(ctx, p.ID); !errors.Is(err, ErrAlreadyInactive) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestListProducts(t *testing.T) {
	ctx := context.Background()
	t.Run("effects/hanya active, urut harga", func(t *testing.T) {
		c := newConcept(t)
		g, _ := c.AddGame(ctx, "G")
		_, _ = c.AddProduct(ctx, g.ID, "mahal", 900)
		murah, _ := c.AddProduct(ctx, g.ID, "murah", 100)
		mati, _ := c.AddProduct(ctx, g.ID, "mati", 500)
		_, _ = c.Deactivate(ctx, mati.ID)
		list, err := c.ListProducts(ctx, g.ID)
		if err != nil || len(list) != 2 || list[0].ID != murah.ID {
			t.Fatalf("list=%+v err=%v", list, err)
		}
	})
	t.Run("requires/game ada", func(t *testing.T) {
		c := newConcept(t)
		if _, err := c.ListProducts(ctx, missingID); !errors.Is(err, ErrGameNotFound) {
			t.Fatalf("err=%v", err)
		}
	})
}

func TestListGames(t *testing.T) {
	ctx := context.Background()
	c := newConcept(t)
	aktif, _ := c.AddGame(ctx, "Aktif")
	mati, _ := c.AddGame(ctx, "Mati")
	_, _ = c.q.db.Exec(ctx, "UPDATE games SET active = FALSE WHERE id = $1", mati.ID)
	list, err := c.ListGames(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var sawAktif, sawMati bool
	for _, g := range list {
		sawAktif = sawAktif || g.ID == aktif.ID
		sawMati = sawMati || g.ID == mati.ID
	}
	if !sawAktif || sawMati {
		t.Fatalf("sawAktif=%v sawMati=%v", sawAktif, sawMati)
	}
}

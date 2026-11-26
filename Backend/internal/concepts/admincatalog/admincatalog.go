package admincatalog

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrNameTaken       = errors.New("admincatalog: nama game sudah dipakai")
	ErrGameNotFound    = errors.New("admincatalog: game tidak ditemukan")
	ErrGameInactive    = errors.New("admincatalog: game tidak aktif")
	ErrProductNotFound = errors.New("admincatalog: produk tidak ditemukan")
	ErrAlreadyInactive = errors.New("admincatalog: produk sudah nonaktif")
	ErrInvalidPrice    = errors.New("admincatalog: harga harus lebih dari 0")
)

type Concept struct{ q *Queries }

func NewConcept(db DBTX) *Concept { return &Concept{q: New(db)} }

// addGame — requires: nama belum dipakai game lain
func (c *Concept) AddGame(ctx context.Context, name string) (Game, error) {
	if _, err := c.q.GetGameByName(ctx, name); err == nil {
		return Game{}, ErrNameTaken
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return Game{}, err
	}
	game, err := c.q.CreateGame(ctx, name)
	if isUniqueViolation(err) {
		return Game{}, ErrNameTaken
	}
	return game, err
}

// addProduct — requires: game ada dan active; price > 0
func (c *Concept) AddProduct(ctx context.Context, gameID int64, label string, price int64) (Product, error) {
	if price <= 0 {
		return Product{}, ErrInvalidPrice
	}
	game, err := c.q.GetGame(ctx, gameID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Product{}, ErrGameNotFound
	}
	if err != nil {
		return Product{}, err
	}
	if !game.Active {
		return Product{}, ErrGameInactive
	}
	return c.q.CreateProduct(ctx, CreateProductParams{GameID: gameID, Label: label, Price: price})
}

// updatePrice — requires: product ada; price > 0
func (c *Concept) UpdatePrice(ctx context.Context, productID, price int64) (Product, error) {
	if price <= 0 {
		return Product{}, ErrInvalidPrice
	}
	p, err := c.q.UpdateProductPrice(ctx, UpdateProductPriceParams{ID: productID, Price: price})
	if errors.Is(err, pgx.ErrNoRows) {
		return Product{}, ErrProductNotFound
	}
	return p, err
}

// deactivate — requires: product ada dan active
func (c *Concept) Deactivate(ctx context.Context, productID int64) (Product, error) {
	p, err := c.q.GetProduct(ctx, productID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Product{}, ErrProductNotFound
	}
	if err != nil {
		return Product{}, err
	}
	if !p.Active {
		return Product{}, ErrAlreadyInactive
	}
	return c.q.DeactivateProduct(ctx, productID)
}

// Pembacaan untuk katalog (bukan action pada spec)
func (c *Concept) ListGames(ctx context.Context) ([]Game, error) {
	return c.q.ListActiveGames(ctx)
}

func (c *Concept) ListProducts(ctx context.Context, gameID int64) ([]Product, error) {
	game, err := c.q.GetGame(ctx, gameID)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !game.Active) {
		return nil, ErrGameNotFound
	}
	if err != nil {
		return nil, err
	}
	return c.q.ListActiveProductsByGame(ctx, gameID)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

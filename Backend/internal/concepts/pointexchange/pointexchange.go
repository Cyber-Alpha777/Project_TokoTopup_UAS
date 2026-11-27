package pointexchange

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

var (
	ErrOfferNotFound = errors.New("pointexchange: penawaran tidak ditemukan")
	ErrInvalidInput  = errors.New("pointexchange: label, nilai, biaya, atau stok tidak valid")
	ErrOfferInactive = errors.New("pointexchange: penawaran tidak aktif")
	ErrOutOfStock    = errors.New("pointexchange: stok penawaran habis")
)

type Concept struct{ q *Queries }

func NewConcept(db DBTX) *Concept { return &Concept{q: New(db)} }

// createOffer — requires: value > 0; cost > 0; stock > 0
// effects: Offer baru dengan active = true
func (c *Concept) CreateOffer(ctx context.Context, label string, value int64, cost, stock int32) (Offer, error) {
	if label == "" || value <= 0 || cost <= 0 || stock <= 0 {
		return Offer{}, ErrInvalidInput
	}
	return c.q.CreateOffer(ctx, CreateOfferParams{Label: label, Value: value, Cost: cost, Stock: stock})
}

// exchange — requires: offer ada dan active; stock > 0
// effects: Exchange baru dengan cost = cost offer saat itu dan exchangedAt;
//
//	stock offer berkurang 1
//
// Concept ini TIDAK memotong poin dan TIDAK membuat voucher. Keduanya tugas sync
// ExchangeSpendsPoints dan ExchangeIssuesVoucher. Panggil di dalam satu transaksi
// (syncs.inTx) supaya jika poin tidak cukup, stok yang sudah berkurang ikut di-rollback.
func (c *Concept) Exchange(ctx context.Context, userID, offerID int64) (Exchange, error) {
	// UPDATE atomik "WHERE stock > 0": dua user yang menukar stok terakhir
	// bersamaan tidak bisa sama-sama berhasil.
	o, err := c.q.TakeOfferStock(ctx, offerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Exchange{}, c.whyNotAvailable(ctx, offerID)
	}
	if err != nil {
		return Exchange{}, err
	}
	// cost dicatat dari offer saat penukaran, jadi perubahan harga nanti tidak mengubah riwayat
	return c.q.CreateExchange(ctx, CreateExchangeParams{UserID: userID, OfferID: offerID, Cost: o.Cost})
}

// deactivateOffer — requires: offer ada dan active
// effects: active = false
func (c *Concept) DeactivateOffer(ctx context.Context, id int64) (Offer, error) {
	o, err := c.q.DeactivateOffer(ctx, id)
	if !errors.Is(err, pgx.ErrNoRows) {
		return o, err
	}
	if _, gerr := c.GetOffer(ctx, id); gerr != nil {
		return Offer{}, gerr // ErrOfferNotFound atau error DB
	}
	return Offer{}, ErrOfferInactive
}

// Pembacaan (bukan action pada spec)

// GetOffer dipakai sync ExchangeIssuesVoucher untuk membaca offer.value.
func (c *Concept) GetOffer(ctx context.Context, id int64) (Offer, error) {
	o, err := c.q.GetOffer(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Offer{}, ErrOfferNotFound
	}
	return o, err
}

func (c *Concept) ListActiveOffers(ctx context.Context) ([]Offer, error) {
	return c.q.ListActiveOffers(ctx)
}

func (c *Concept) ListByUser(ctx context.Context, userID int64) ([]Exchange, error) {
	return c.q.ListExchangesByUser(ctx, userID)
}

// whyNotAvailable: UPDATE tidak mengubah baris, bedakan tidak ada / nonaktif / stok habis.
func (c *Concept) whyNotAvailable(ctx context.Context, id int64) error {
	o, err := c.GetOffer(ctx, id)
	switch {
	case err != nil:
		return err
	case !o.Active:
		return ErrOfferInactive
	default:
		return ErrOutOfStock
	}
}

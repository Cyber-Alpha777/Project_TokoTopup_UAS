package voucher

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

var (
	ErrInvalidInput    = errors.New("voucher: kode, diskon, kuota, atau masa berlaku tidak valid")
	ErrCodeTaken       = errors.New("voucher: kode sudah dipakai")
	ErrNotFound        = errors.New("voucher: voucher tidak ditemukan")
	ErrInactive        = errors.New("voucher: voucher tidak aktif")
	ErrExpired         = errors.New("voucher: voucher sudah kedaluwarsa")
	ErrQuotaExhausted  = errors.New("voucher: kuota voucher habis")
	ErrNotOwner        = errors.New("voucher: voucher ini milik user lain")
	ErrAlreadyRedeemed = errors.New("voucher: voucher sudah pernah dipakai user ini")
	ErrNoRedemption    = errors.New("voucher: tidak ada pemakaian voucher untuk order ini")
)

// Concept harus dipanggil di dalam satu transaksi (lihat syncs.inTx) agar redeem
// (kuota berkurang + redemption dibuat) dan release bersifat atomik.
type Concept struct {
	q   *Queries
	now func() time.Time // bisa diganti di test
}

func NewConcept(db DBTX) *Concept { return &Concept{q: New(db), now: time.Now} }

func ts(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }

func NormalizeCode(code string) string { return strings.ToUpper(strings.TrimSpace(code)) }

// create — requires: code belum dipakai; discount > 0; quota > 0 (+ expiresAt di masa depan)
// owner nil = voucher umum.
func (c *Concept) Create(ctx context.Context, code string, discount int64, quota int32, expiresAt time.Time, owner *int64) (Voucher, error) {
	code = NormalizeCode(code)
	if len(code) < 3 || len(code) > 30 || discount <= 0 || quota <= 0 || !expiresAt.After(c.now()) {
		return Voucher{}, ErrInvalidInput
	}
	if _, err := c.q.GetVoucherByCode(ctx, code); err == nil {
		return Voucher{}, ErrCodeTaken
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return Voucher{}, err
	}
	var o pgtype.Int8
	if owner != nil {
		o = pgtype.Int8{Int64: *owner, Valid: true}
	}
	v, err := c.q.CreateVoucher(ctx, CreateVoucherParams{
		Code: code, Discount: discount, Quota: quota, ExpiresAt: ts(expiresAt), OwnerID: o,
	})
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return Voucher{}, ErrCodeTaken
	}
	return v, err
}

// redeem — requires: voucher ada, active, belum kedaluwarsa, quota > 0, user belum memakainya
// (+ jika voucher punya owner, owner harus user yang sama)
// effects: Redemption dibuat; quota berkurang 1; mengembalikan discount
func (c *Concept) Redeem(ctx context.Context, code string, user, order int64) (int64, error) {
	v, err := c.q.GetVoucherByCode(ctx, NormalizeCode(code))
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, err
	}
	switch {
	case !v.Active:
		return 0, ErrInactive
	case !c.now().Before(v.ExpiresAt.Time):
		return 0, ErrExpired
	case v.OwnerID.Valid && v.OwnerID.Int64 != user:
		return 0, ErrNotOwner
	case v.Quota <= 0:
		return 0, ErrQuotaExhausted
	}
	// UPDATE atomik "WHERE quota > 0": aman dari dua user yang menebus kuota terakhir bersamaan
	if _, err := c.q.DecrementQuota(ctx, v.ID); errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrQuotaExhausted
	} else if err != nil {
		return 0, err
	}
	// UNIQUE (voucher_id, user_id) menjamin satu user tidak bisa memakai voucher yang sama dua kali
	_, err = c.q.CreateRedemption(ctx, CreateRedemptionParams{VoucherID: v.ID, UserID: user, OrderID: order})
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return 0, ErrAlreadyRedeemed
	}
	if err != nil {
		return 0, err
	}
	return v.Discount, nil
}

// release — requires: ada Redemption untuk order itu
// effects: Redemption dihapus; quota voucher bertambah 1
func (c *Concept) Release(ctx context.Context, order int64) error {
	rows, err := c.q.DeleteRedemptionsByOrder(ctx, order)
	if err != nil {
		return err
	}
	if len(rows) == 0 {
		return ErrNoRedemption
	}
	for _, r := range rows {
		if err := c.q.RestoreQuota(ctx, r.VoucherID); err != nil {
			return err
		}
	}
	return nil
}

// ---- Pembacaan (bukan action pada spec) ----

// HasRedemption dipakai sync ReleaseVoucherOnCancel pada klausa where.
func (c *Concept) HasRedemption(ctx context.Context, order int64) (bool, error) {
	rows, err := c.q.ListRedemptionsByOrder(ctx, order)
	return len(rows) > 0, err
}

func (c *Concept) List(ctx context.Context, limit, offset int32) ([]Voucher, int64, error) {
	items, err := c.q.ListVouchers(ctx, ListVouchersParams{PageLimit: limit, PageOffset: offset})
	if err != nil {
		return nil, 0, err
	}
	total, err := c.q.CountVouchers(ctx)
	return items, total, err
}

// UsableByOwner: voucher milik user yang masih bisa dipakai.
func (c *Concept) UsableByOwner(ctx context.Context, owner int64) ([]Voucher, error) {
	return c.q.ListUsableVouchersByOwner(ctx, ListUsableVouchersByOwnerParams{OwnerID: owner, Now: ts(c.now())})
}

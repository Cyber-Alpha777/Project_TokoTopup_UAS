-- +goose Up
-- Kolom ini menyimpan nilai hadiah penawaran, bukan "diskon": PointExchange tidak
-- boleh membawa semantik Voucher. Yang memberi arti diskon adalah sync ExchangeIssuesVoucher.
ALTER TABLE offers RENAME COLUMN discount TO value;

-- +goose Down
ALTER TABLE offers RENAME COLUMN value TO discount;

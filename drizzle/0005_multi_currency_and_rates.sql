-- KASDESK EPIC 1: Multi-Currency, Forex, Emas & Crypto Net Worth Rollup.
-- Adds currency tracking to wallets, historical exchange rate freeze to transactions,
-- and the exchangeRates reference table.

ALTER TABLE `wallets`
  ADD COLUMN IF NOT EXISTS `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR' AFTER `type`;

ALTER TABLE `transactions`
  ADD COLUMN IF NOT EXISTS `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR' AFTER `amount`,
  ADD COLUMN IF NOT EXISTS `exchangeRate` DECIMAL(18, 6) NOT NULL DEFAULT 1.000000 AFTER `currency`,
  ADD COLUMN IF NOT EXISTS `baseAmount` BIGINT NOT NULL DEFAULT 0 AFTER `exchangeRate`;

CREATE TABLE IF NOT EXISTS `exchangeRates` (
  `id` CHAR(36) NOT NULL,
  `fromCurrency` VARCHAR(10) NOT NULL,
  `toCurrency` VARCHAR(10) NOT NULL DEFAULT 'IDR',
  `rate` DECIMAL(18, 6) NOT NULL,
  `provider` VARCHAR(32) NOT NULL DEFAULT 'system',
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchange_rates_pair_uq` (`fromCurrency`, `toCurrency`),
  KEY `exchange_rates_lookup_idx` (`fromCurrency`, `toCurrency`, `updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

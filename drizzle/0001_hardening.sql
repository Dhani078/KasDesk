-- KASDESK hardening migration for existing databases.
-- Back up first and run in staging before production.

ALTER TABLE `transactions`
  ADD COLUMN IF NOT EXISTS `clientMutationId` CHAR(36) DEFAULT NULL AFTER `createdAt`;

ALTER TABLE `transactions`
  ADD UNIQUE INDEX `tx_user_client_mutation_uq` (`userId`, `clientMutationId`);

ALTER TABLE `wallets`
  ADD CONSTRAINT `wallet_balance_nonnegative_ck` CHECK (`balance` >= 0),
  ADD CONSTRAINT `wallet_type_ck` CHECK (`type` IN ('cash','bank','e_wallet','investment'));

ALTER TABLE `transactions`
  ADD CONSTRAINT `tx_amount_positive_ck` CHECK (`amount` > 0),
  ADD CONSTRAINT `tx_type_ck` CHECK (`type` IN ('income','expense','transfer')),
  ADD CONSTRAINT `tx_transfer_wallet_ck` CHECK (`toWalletId` IS NULL OR `toWalletId` <> `walletId`);

ALTER TABLE `vaults`
  ADD CONSTRAINT `vault_amounts_ck` CHECK (`targetAmount` > 0 AND `currentAmount` >= 0);

ALTER TABLE `debts`
  ADD CONSTRAINT `debt_amounts_ck` CHECK (`amount` > 0 AND `paidAmount` >= 0 AND `paidAmount` <= `amount`),
  ADD CONSTRAINT `debt_direction_ck` CHECK (`direction` IN ('utang','piutang'));

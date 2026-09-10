-- KASDESK — TiDB Cloud / MySQL 8 schema

CREATE TABLE IF NOT EXISTS `users` (
  `id`            CHAR(36)       NOT NULL,
  `email`         VARCHAR(255)   NOT NULL,
  `name`          VARCHAR(120)   DEFAULT NULL,
  `image`         VARCHAR(500)   DEFAULT NULL,
  `emailVerified` DATETIME(3)    DEFAULT NULL,
  `passwordHash`  VARCHAR(255)   DEFAULT NULL,
  `locale`        VARCHAR(8)     NOT NULL DEFAULT 'id-ID',
  `currency`      CHAR(3)        NOT NULL DEFAULT 'IDR',
  `createdAt`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_uq` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `accounts` (
  `id`                CHAR(36)      NOT NULL,
  `userId`            CHAR(36)      NOT NULL,
  `provider`          VARCHAR(32)   NOT NULL,
  `providerAccountId` VARCHAR(255)  NOT NULL,
  `accessToken`       VARCHAR(1000) DEFAULT NULL,
  `refreshToken`      VARCHAR(1000) DEFAULT NULL,
  `expiresAt`         BIGINT        DEFAULT NULL,
  `createdAt`         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_provider_uq` (`provider`, `providerAccountId`),
  KEY `accounts_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`           CHAR(36)      NOT NULL,
  `userId`       CHAR(36)      NOT NULL,
  `sessionToken` VARCHAR(255)  NOT NULL,
  `expires`      DATETIME(3)   NOT NULL,
  `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_token_uq` (`sessionToken`),
  KEY `sessions_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id`        CHAR(36)     NOT NULL,
  `userId`    CHAR(36)     NOT NULL,
  `name`      VARCHAR(32)  NOT NULL,
  `kind`      VARCHAR(8)   NOT NULL,
  `sortOrder` TINYINT      NOT NULL DEFAULT 0,
  `isSystem`  TINYINT      NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_user_name_uq` (`userId`, `name`),
  KEY `categories_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wallets` (
  `id`         CHAR(36)     NOT NULL,
  `userId`     CHAR(36)     NOT NULL,
  `name`       VARCHAR(60)  NOT NULL,
  `type`       VARCHAR(12)  NOT NULL,
  `balance`    BIGINT       NOT NULL DEFAULT 0,
  `isArchived` TINYINT      NOT NULL DEFAULT 0,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `wallets_user_idx` (`userId`),
  KEY `wallets_user_archived_idx` (`userId`, `isArchived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id`          CHAR(36)     NOT NULL,
  `userId`      CHAR(36)     NOT NULL,
  `walletId`    CHAR(36)     NOT NULL,
  `toWalletId`  CHAR(36)     DEFAULT NULL,
  `type`        VARCHAR(8)   NOT NULL,
  `amount`      BIGINT       NOT NULL,
  `title`       VARCHAR(120) NOT NULL,
  `categoryTag` VARCHAR(32)  DEFAULT NULL,
  `note`        VARCHAR(500) DEFAULT NULL,
  `occurredAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `tx_user_date_idx` (`userId`, `occurredAt`),
  KEY `tx_wallet_date_idx` (`walletId`, `occurredAt`),
  KEY `tx_user_wallet_idx` (`userId`, `walletId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vaults` (
  `id`            CHAR(36)    NOT NULL,
  `userId`        CHAR(36)    NOT NULL,
  `name`          VARCHAR(80) NOT NULL,
  `targetAmount`  BIGINT      NOT NULL,
  `currentAmount` BIGINT      NOT NULL DEFAULT 0,
  `targetDate`    DATETIME(3) DEFAULT NULL,
  `isCompleted`   TINYINT     NOT NULL DEFAULT 0,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `vaults_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `debts` (
  `id`         CHAR(36)     NOT NULL,
  `userId`     CHAR(36)     NOT NULL,
  `direction`  VARCHAR(8)   NOT NULL,
  `personName` VARCHAR(80)  NOT NULL,
  `amount`     BIGINT       NOT NULL,
  `paidAmount` BIGINT       NOT NULL DEFAULT 0,
  `isPaid`     TINYINT      NOT NULL DEFAULT 0,
  `note`       VARCHAR(500) DEFAULT NULL,
  `dueDate`    DATETIME(3)  DEFAULT NULL,
  `settledAt`  DATETIME(3)  DEFAULT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `debts_user_idx` (`userId`),
  KEY `debts_user_open_idx` (`userId`, `isPaid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

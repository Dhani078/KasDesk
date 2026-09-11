CREATE TABLE IF NOT EXISTS `budgets` (
  `id` CHAR(36) NOT NULL, `userId` CHAR(36) NOT NULL, `month` CHAR(7) NOT NULL,
  `categoryTag` VARCHAR(32) NOT NULL, `amount` BIGINT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), UNIQUE KEY `budgets_user_month_category_uq` (`userId`,`month`,`categoryTag`),
  KEY `budgets_user_month_idx` (`userId`,`month`), CONSTRAINT `budget_amount_positive_ck` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `recurringRules` (
  `id` CHAR(36) NOT NULL, `userId` CHAR(36) NOT NULL, `title` VARCHAR(120) NOT NULL,
  `type` VARCHAR(8) NOT NULL, `amount` BIGINT NOT NULL, `categoryTag` VARCHAR(32) DEFAULT NULL,
  `frequency` VARCHAR(12) NOT NULL, `nextRunAt` DATETIME(3) NOT NULL, `isActive` TINYINT NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`), KEY `recurring_user_next_idx` (`userId`,`nextRunAt`),
  CONSTRAINT `recurring_amount_positive_ck` CHECK (`amount` > 0),
  CONSTRAINT `recurring_type_ck` CHECK (`type` IN ('income','expense')),
  CONSTRAINT `recurring_frequency_ck` CHECK (`frequency` IN ('weekly','monthly'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

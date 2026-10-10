-- KASDESK EPIC 8.4: Web Push Notifications Subscriptions
-- Stores user Web Push endpoints and encryption keys (p256dh, auth) for VAPID delivery.

CREATE TABLE IF NOT EXISTS `pushSubscriptions` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `userAgent` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_endpoint_uq` (`endpoint`),
  KEY `push_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

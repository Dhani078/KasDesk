-- KASDESK EPIC 6: Shared Financial Spaces (Mode Rumah Tangga & Pasutri)
-- Creates tables for shared workspaces, member RBAC memberships,
-- and attaches spaceId & createdByUserId attribution to wallets and transactions.

CREATE TABLE IF NOT EXISTS `sharedSpaces` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `ownerUserId` CHAR(36) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `shared_spaces_owner_idx` (`ownerUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `spaceMembers` (
  `id` CHAR(36) NOT NULL,
  `spaceId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `role` VARCHAR(16) NOT NULL DEFAULT 'editor',
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `space_members_pair_uq` (`spaceId`, `userId`),
  KEY `space_members_user_idx` (`userId`),
  CONSTRAINT `space_member_role_ck` CHECK (`role` IN ('owner', 'editor', 'viewer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `wallets`
  ADD COLUMN IF NOT EXISTS `spaceId` CHAR(36) DEFAULT NULL AFTER `userId`;

ALTER TABLE `transactions`
  ADD COLUMN IF NOT EXISTS `spaceId` CHAR(36) DEFAULT NULL AFTER `userId`,
  ADD COLUMN IF NOT EXISTS `createdByUserId` CHAR(36) DEFAULT NULL AFTER `spaceId`;

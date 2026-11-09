-- Credenciales de Notion por organización (aditiva, no toca datos existentes). Equivale a `prisma db push` solo para este modelo.
CREATE TABLE IF NOT EXISTS `NotionConfig` (
  `id` VARCHAR(191) NOT NULL,
  `token` TEXT NOT NULL,
  `databaseId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `NotionConfig_organizationId_key`(`organizationId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `NotionConfig_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

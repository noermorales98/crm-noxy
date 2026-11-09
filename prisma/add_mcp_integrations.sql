-- Tabla de conexiones MCP (aditiva, no toca datos existentes). Equivale a `prisma db push` solo para este modelo.
CREATE TABLE IF NOT EXISTS `McpIntegration` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `url` TEXT NULL,
  `transport` VARCHAR(191) NOT NULL DEFAULT 'http',
  `authToken` TEXT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `source` VARCHAR(191) NOT NULL DEFAULT 'manual',
  `category` VARCHAR(191) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `McpIntegration_organizationId_name_key`(`organizationId`, `name`),
  INDEX `McpIntegration_organizationId_idx`(`organizationId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `McpIntegration_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

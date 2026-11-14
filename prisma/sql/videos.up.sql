CREATE TABLE `Video` (
 `id` VARCHAR(191) NOT NULL PRIMARY KEY, `title` VARCHAR(191) NOT NULL,
 `publishedAt` DATETIME(3) NULL, `platform` VARCHAR(191) NOT NULL,
 `hook` TEXT NULL, `hookType` VARCHAR(191) NULL, `format` VARCHAR(191) NULL,
 `durationSeconds` INT NULL, `aiTool` VARCHAR(191) NULL, `prompt` TEXT NULL,
 `reach` INT NULL, `views` INT NULL, `retention3s` DOUBLE NULL, `shares` INT NULL,
 `saves` INT NULL, `comments` INT NULL, `leadsGenerated` INT NULL,
 `predictorScore` DOUBLE NULL, `notes` TEXT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 `organizationId` VARCHAR(191) NOT NULL, `clientId` VARCHAR(191) NULL,
 `contentClientId` VARCHAR(191) NULL, `contentItemId` VARCHAR(191) NULL,
 INDEX `Video_organizationId_publishedAt_idx` (`organizationId`,`publishedAt`),
 INDEX `Video_clientId_idx` (`clientId`), INDEX `Video_contentClientId_idx` (`contentClientId`),
 INDEX `Video_contentItemId_idx` (`contentItemId`),
 CONSTRAINT `Video_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `Video_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT `Video_contentClientId_fkey` FOREIGN KEY (`contentClientId`) REFERENCES `ContentClient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT `Video_contentItemId_fkey` FOREIGN KEY (`contentItemId`) REFERENCES `ContentItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

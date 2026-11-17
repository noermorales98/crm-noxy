CREATE TABLE `AiProviderKey` (
 `id` VARCHAR(191) NOT NULL PRIMARY KEY, `organizationId` VARCHAR(191) NOT NULL, `provider` VARCHAR(191) NOT NULL,
 `apiKey` TEXT NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 UNIQUE INDEX `AiProviderKey_organizationId_provider_key` (`organizationId`,`provider`),
 CONSTRAINT `AiProviderKey_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

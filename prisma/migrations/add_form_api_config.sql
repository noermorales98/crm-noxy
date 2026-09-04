-- Crear tabla FormApiConfig
CREATE TABLE `FormApiConfig` (
  `id` VARCHAR(191) NOT NULL,
  `formId` VARCHAR(191) NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT false,
  `isPublic` BOOLEAN NOT NULL DEFAULT false,
  `apiToken` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `FormApiConfig_formId_key`(`formId`),
  UNIQUE INDEX `FormApiConfig_apiToken_key`(`apiToken`),
  INDEX `FormApiConfig_formId_idx`(`formId`),
  INDEX `FormApiConfig_apiToken_idx`(`apiToken`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Agregar foreign key
ALTER TABLE `FormApiConfig` ADD CONSTRAINT `FormApiConfig_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `Form`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Sincronización con Notion: segunda base (docs), interruptores de auto-sync y página de Notion por documento del /kb.
-- Aditiva: solo agrega columnas con valor por defecto o nulas.
ALTER TABLE `NotionConfig` ADD COLUMN `docsDatabaseId` VARCHAR(191) NULL, ADD COLUMN `autoSyncDeals` BOOLEAN NOT NULL DEFAULT false, ADD COLUMN `autoSyncDocs` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `KbPage` ADD COLUMN `notionPageId` VARCHAR(191) NULL;
ALTER TABLE `KbPage` ADD COLUMN `notionSyncedAt` DATETIME(3) NULL;

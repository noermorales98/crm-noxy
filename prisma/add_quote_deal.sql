-- Vínculo cotización ↔ lead (aditiva): una cotización puede pertenecer a un deal.
ALTER TABLE `Quote` ADD COLUMN `dealId` VARCHAR(191) NULL;
CREATE INDEX `Quote_dealId_idx` ON `Quote`(`dealId`);
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

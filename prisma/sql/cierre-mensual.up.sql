-- Fecha de cierre de los deals ganados y foto mensual de métricas.
ALTER TABLE `Deal` ADD COLUMN `wonAt` DATETIME(3) NULL;

CREATE TABLE `MonthlySnapshot` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `year` INT NOT NULL,
  `month` INT NOT NULL,
  `metrics` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `organizationId` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `MonthlySnapshot_organizationId_year_month_key` (`organizationId`, `year`, `month`),
  INDEX `MonthlySnapshot_organizationId_idx` (`organizationId`),
  CONSTRAINT `MonthlySnapshot_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Relleno único: los deals ya ganados conservan su última edición como fecha de cierre (mejor aproximación disponible).
UPDATE `Deal` d JOIN `Stage` s ON s.`id` = d.`stageId` SET d.`wonAt` = d.`updatedAt` WHERE s.`isWon` = true AND d.`wonAt` IS NULL;

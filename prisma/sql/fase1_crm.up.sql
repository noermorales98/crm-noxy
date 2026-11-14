-- Fase 1 CRM (aditiva): referidos, proyecto ligado al deal, plantillas de proyecto,
-- alertas de pago y fuentes TIKTOK/FACEBOOK. Reversa: fase1_crm.down.sql.
-- Aplicar: mysql ... < prisma/sql/fase1_crm.up.sql   (o pegar en el cliente SQL)

-- 1) Nuevas fuentes de lead
ALTER TABLE `Deal` MODIFY `source` ENUM('WHATSAPP','REFERIDO','LINKEDIN','VISITA','EMAIL_FRIO','FORMULARIO','INSTAGRAM','TIKTOK','FACEBOOK','OTRO') NULL;

-- 2) «Referido por» (contacto o cliente)
ALTER TABLE `Deal` ADD COLUMN `referredByContactId` VARCHAR(191) NULL;
ALTER TABLE `Deal` ADD COLUMN `referredByClientId` VARCHAR(191) NULL;
CREATE INDEX `Deal_referredByContactId_idx` ON `Deal`(`referredByContactId`);
CREATE INDEX `Deal_referredByClientId_idx` ON `Deal`(`referredByClientId`);
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_referredByContactId_fkey` FOREIGN KEY (`referredByContactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_referredByClientId_fkey` FOREIGN KEY (`referredByClientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Proyecto originado por un deal
ALTER TABLE `Project` ADD COLUMN `dealId` VARCHAR(191) NULL;
CREATE INDEX `Project_dealId_idx` ON `Project`(`dealId`);
ALTER TABLE `Project` ADD CONSTRAINT `Project_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `Deal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 4) Marca de alerta de cobro enviada (evita avisar dos veces)
ALTER TABLE `Payment` ADD COLUMN `dueAlertSentAt` DATETIME(3) NULL;
ALTER TABLE `ClientPayment` ADD COLUMN `dueAlertSentAt` DATETIME(3) NULL;

-- 5) Plantillas de proyecto por servicio
CREATE TABLE `ProjectTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `service` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `tasks` TEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `ProjectTemplate_organizationId_service_key`(`organizationId`, `service`),
  INDEX `ProjectTemplate_organizationId_idx`(`organizationId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ProjectTemplate` ADD CONSTRAINT `ProjectTemplate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

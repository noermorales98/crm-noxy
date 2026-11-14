-- Reversa de fase1_crm.up.sql. Pierde SOLO lo creado por la Fase 1
-- (referidos, vínculo proyecto↔deal, plantillas, marcas de alerta).
-- Los deals con source TIKTOK/FACEBOOK pasan a OTRO (único cambio sobre datos previos).

DROP TABLE `ProjectTemplate`;

ALTER TABLE `ClientPayment` DROP COLUMN `dueAlertSentAt`;
ALTER TABLE `Payment` DROP COLUMN `dueAlertSentAt`;

ALTER TABLE `Project` DROP FOREIGN KEY `Project_dealId_fkey`;
DROP INDEX `Project_dealId_idx` ON `Project`;
ALTER TABLE `Project` DROP COLUMN `dealId`;

ALTER TABLE `Deal` DROP FOREIGN KEY `Deal_referredByClientId_fkey`;
ALTER TABLE `Deal` DROP FOREIGN KEY `Deal_referredByContactId_fkey`;
DROP INDEX `Deal_referredByClientId_idx` ON `Deal`;
DROP INDEX `Deal_referredByContactId_idx` ON `Deal`;
ALTER TABLE `Deal` DROP COLUMN `referredByClientId`;
ALTER TABLE `Deal` DROP COLUMN `referredByContactId`;

UPDATE `Deal` SET `source` = 'OTRO' WHERE `source` IN ('TIKTOK','FACEBOOK');
ALTER TABLE `Deal` MODIFY `source` ENUM('WHATSAPP','REFERIDO','LINKEDIN','VISITA','EMAIL_FRIO','FORMULARIO','INSTAGRAM','OTRO') NULL;

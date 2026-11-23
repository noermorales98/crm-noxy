-- Empresa → sub-cuenta: marca la organización creada a partir de esta empresa (null = no migrada).
ALTER TABLE `Company` ADD COLUMN `migratedToOrgId` VARCHAR(191) NULL;

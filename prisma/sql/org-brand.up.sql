-- Identidad por empresa (sub-cuenta): color, icono y tema propios. Todo opcional: sin valor, la empresa usa el logotipo de Noxy y el tema de cada persona.
ALTER TABLE `Organization`
  ADD COLUMN `brandColor` VARCHAR(16) NULL,
  ADD COLUMN `brandIcon` VARCHAR(32) NULL,
  ADD COLUMN `themeId` VARCHAR(32) NULL;

-- Fecha en que un deal pasó a una etapa perdida (aditiva). El cierre mensual cuenta los perdidos por esta fecha,
-- no por la última edición. Los perdidos anteriores quedan en NULL: su fecha real no se conoce.
ALTER TABLE `Deal` ADD COLUMN `lostAt` DATETIME(3) NULL;

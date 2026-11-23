-- Reversa de cierre-mensual.up.sql. Pierde las fotos mensuales y la fecha de cierre (el archivado hecho por el cierre NO se revierte).
DROP TABLE `MonthlySnapshot`;
ALTER TABLE `Deal` DROP COLUMN `wonAt`;

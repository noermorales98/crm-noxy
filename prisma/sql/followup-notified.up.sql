-- Marca de «ya avisado» del seguimiento de un deal. Los deals existentes quedan en NULL:
-- los seguimientos vencidos hace más de 24 h no se avisan (el cron solo mira las últimas 24 h).
ALTER TABLE `Deal` ADD COLUMN `followUpNotifiedAt` DATETIME(3) NULL;

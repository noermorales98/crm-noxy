-- Nuevo tipo de notificación: el resumen diario falló (el cron lo avisa en la campanita).
ALTER TABLE `Notification` MODIFY COLUMN `type` ENUM('NEW_EMAIL','NEW_CONTACT','NEW_FORM_LEAD','APPOINTMENT_REMINDER','DIGEST_ERROR') NOT NULL;

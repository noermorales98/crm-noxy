-- Revertir: primero borra las notificaciones de ese tipo, si no el ALTER falla.
DELETE FROM `Notification` WHERE `type` = 'DIGEST_ERROR';
ALTER TABLE `Notification` MODIFY COLUMN `type` ENUM('NEW_EMAIL','NEW_CONTACT','NEW_FORM_LEAD','APPOINTMENT_REMINDER') NOT NULL;

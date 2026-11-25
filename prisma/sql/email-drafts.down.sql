-- Revertir: los borradores no caben en el tipo anterior, así que se borran antes de quitar el valor.
DELETE FROM `Email` WHERE `type` = 'DRAFT';
ALTER TABLE `Email` MODIFY `type` ENUM('RECEIVED','SENT') NOT NULL DEFAULT 'RECEIVED';

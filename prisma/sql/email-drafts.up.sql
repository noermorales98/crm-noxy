-- Borradores de correo: nuevo valor DRAFT en el tipo. Aditivo: los correos existentes (RECEIVED/SENT) no cambian.
ALTER TABLE `Email` MODIFY `type` ENUM('RECEIVED','SENT','DRAFT') NOT NULL DEFAULT 'RECEIVED';

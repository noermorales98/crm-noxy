-- Seguimiento automático tras la cita: marca de que ya se dejó el borrador. Aditivo y nulo por defecto.
ALTER TABLE `Appointment` ADD COLUMN `followupDraftedAt` DATETIME(3) NULL;

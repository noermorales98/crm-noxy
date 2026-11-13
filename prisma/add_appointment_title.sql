-- Cita apartada a mano (aditiva): el tipo de cita pasa a ser opcional y se agrega un título.
ALTER TABLE `Appointment` MODIFY `appointmentTypeId` VARCHAR(191) NULL, ADD COLUMN `title` VARCHAR(191) NULL;

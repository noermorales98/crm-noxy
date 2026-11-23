-- Interruptor de avisos por cliente de contenido. No modifica piezas existentes:
-- ningún aviso nuevo sale hasta que se use el interruptor o «Activar todos».
ALTER TABLE `ContentClient` ADD COLUMN `remindersEnabled` BOOLEAN NOT NULL DEFAULT true;

-- Tras `prisma db push`, activa recordatorios en piezas "entrega" existentes
-- (comportamiento previo del cron: aviso 1 día antes).
UPDATE ContentItem
SET reminderEnabled = 1, reminderDaysBefore = 1
WHERE type = 'entrega' AND reminderEnabled = 0;

-- Default de aviso a nivel calendario (si la columna aún no existe, prisma db push la crea).
-- ALTER TABLE ContentClient ADD COLUMN reminderDaysBefore INT NOT NULL DEFAULT 1;

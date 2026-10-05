-- Calendario general: color por cliente y vínculo con Google Calendar.
-- Ejecutar una sola vez después de agregar las columnas (prisma db push también las crea).

ALTER TABLE `ContentClient`
  ADD COLUMN `color` VARCHAR(191) NOT NULL DEFAULT '#3545D6';

ALTER TABLE `ContentItem`
  ADD COLUMN `googleEventId` VARCHAR(191) NULL;

-- Reparte la paleta dentro de cada organización. No volver a correrlo: pisa colores elegidos a mano.
UPDATE `ContentClient` AS c
JOIN (
  SELECT
    id,
    MOD(ROW_NUMBER() OVER (PARTITION BY organizationId ORDER BY createdAt, id) - 1, 11) AS idx
  FROM `ContentClient`
) AS ranked ON ranked.id = c.id
SET c.color = ELT(
  ranked.idx + 1,
  '#3545D6',
  '#9B7EDE',
  '#6E7F5C',
  '#C9973B',
  '#4A7BA6',
  '#C45C26',
  '#8B3A4A',
  '#2F6F4E',
  '#6B4C9A',
  '#D4537E',
  '#5C6370'
);

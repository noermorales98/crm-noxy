-- Reversa de content-reminders-client.up.sql. Solo pierde el interruptor por cliente.
ALTER TABLE `ContentClient` DROP COLUMN `remindersEnabled`;

-- Reversa de followup-notified.up.sql. Solo pierde la marca de «ya avisado».
ALTER TABLE `Deal` DROP COLUMN `followUpNotifiedAt`;

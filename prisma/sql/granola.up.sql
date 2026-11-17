CREATE TABLE `GranolaConfig` (
 `id` VARCHAR(191) NOT NULL PRIMARY KEY, `organizationId` VARCHAR(191) NOT NULL,
 `mode` VARCHAR(191) NOT NULL, `apiKey` TEXT NULL, `mcpClientInfo` TEXT NULL, `mcpTokens` TEXT NULL,
 `mcpVerifier` TEXT NULL, `mcpState` VARCHAR(191) NULL,
 `status` VARCHAR(191) NOT NULL DEFAULT 'CONNECTED', `lastSyncAt` DATETIME(3) NULL,
 `lastSyncCount` INT NOT NULL DEFAULT 0, `lastSyncError` TEXT NULL, `syncingAt` DATETIME(3) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 UNIQUE INDEX `GranolaConfig_organizationId_key` (`organizationId`),
 CONSTRAINT `GranolaConfig_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GranolaNote` (
 `id` VARCHAR(191) NOT NULL PRIMARY KEY, `organizationId` VARCHAR(191) NOT NULL, `granolaId` VARCHAR(191) NOT NULL, `source` VARCHAR(191) NOT NULL DEFAULT 'GRANOLA',
 `title` VARCHAR(191) NULL, `url` TEXT NULL, `startedAt` DATETIME(3) NULL, `endedAt` DATETIME(3) NULL,
 `attendees` TEXT NULL, `summary` LONGTEXT NULL, `privateNotes` LONGTEXT NULL, `granolaUpdatedAt` DATETIME(3) NULL,
 `appointmentId` VARCHAR(191) NULL, `linkSource` VARCHAR(191) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
 UNIQUE INDEX `GranolaNote_organizationId_granolaId_key` (`organizationId`,`granolaId`),
 INDEX `GranolaNote_organizationId_appointmentId_idx` (`organizationId`,`appointmentId`),
 INDEX `GranolaNote_startedAt_idx` (`startedAt`),
 CONSTRAINT `GranolaNote_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `GranolaNote_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GranolaActionItem` (
 `id` VARCHAR(191) NOT NULL PRIMARY KEY, `noteId` VARCHAR(191) NOT NULL, `text` TEXT NOT NULL,
 `position` INT NOT NULL DEFAULT 0, `taskId` VARCHAR(191) NULL, `convertedAt` DATETIME(3) NULL,
 UNIQUE INDEX `GranolaActionItem_taskId_key` (`taskId`),
 INDEX `GranolaActionItem_noteId_idx` (`noteId`),
 CONSTRAINT `GranolaActionItem_noteId_fkey` FOREIGN KEY (`noteId`) REFERENCES `GranolaNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `GranolaActionItem_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AppointmentSuggestion` (
 `id` VARCHAR(191) NOT NULL PRIMARY KEY, `organizationId` VARCHAR(191) NOT NULL, `appointmentId` VARCHAR(191) NOT NULL,
 `type` VARCHAR(191) NOT NULL, `title` VARCHAR(191) NOT NULL, `detail` TEXT NULL, `payload` TEXT NOT NULL,
 `fingerprint` VARCHAR(191) NOT NULL, `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
 `resultType` VARCHAR(191) NULL, `resultId` VARCHAR(191) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `resolvedAt` DATETIME(3) NULL,
 UNIQUE INDEX `AppointmentSuggestion_appointmentId_fingerprint_key` (`appointmentId`,`fingerprint`),
 INDEX `AppointmentSuggestion_organizationId_appointmentId_status_idx` (`organizationId`,`appointmentId`,`status`),
 CONSTRAINT `AppointmentSuggestion_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `AppointmentSuggestion_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

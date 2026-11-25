-- Claves propias de agentes externos (OpenClaw / Kimi Claw): solo se guarda el hash; se pueden revocar sin redeploy.
CREATE TABLE IF NOT EXISTS `AgentKey` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `keyHash` VARCHAR(64) NOT NULL,
  `keyPrefix` VARCHAR(16) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `lastUsedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `organizationId` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `AgentKey_keyHash_key`(`keyHash`),
  INDEX `AgentKey_organizationId_idx`(`organizationId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AgentKey_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Registro de lo que hizo cada clave: herramienta y resultado. Nunca los argumentos ni la clave.
CREATE TABLE IF NOT EXISTS `AgentActivity` (
  `id` VARCHAR(191) NOT NULL,
  `tool` VARCHAR(100) NOT NULL,
  `ok` BOOLEAN NOT NULL,
  `error` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `agentKeyId` VARCHAR(191) NOT NULL,
  `organizationId` VARCHAR(191) NOT NULL,
  INDEX `AgentActivity_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
  INDEX `AgentActivity_agentKeyId_idx`(`agentKeyId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `AgentActivity_agentKeyId_fkey` FOREIGN KEY (`agentKeyId`) REFERENCES `AgentKey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AgentActivity_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

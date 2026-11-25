-- Contexto adjunto a un chat de IA (qué registro o pantalla se consultaba). Aditivo y nulo por defecto.
ALTER TABLE `AiConversation` ADD COLUMN `contextLabel` VARCHAR(200) NULL, ADD COLUMN `contextPage` VARCHAR(40) NULL;

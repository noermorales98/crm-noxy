# Conteo de correos sin leer en el Resumen por WhatsApp

## Objetivo

El usuario quiere recibir, todos los días por WhatsApp (vía CallMeBot), cuántos correos tiene sin leer.

## Contexto

El CRM ya tiene una funcionalidad de "Resumen por WhatsApp" (Ajustes > Resumen por WhatsApp, `app/settings/digest/page.tsx`) que:

- Se controla con un modelo `DigestSchedule` (`prisma/schema.prisma:58-83`), único por `(userId, organizationId)`, con `enabled`, `frequency` (daily/weekly/monthly/custom), `hour`/`minute`, `includeGoogleCalendar`, `aiModelId`, `lastSentAt`.
- Se dispara desde un cron externo (`cron-job.org`) que golpea `GET /api/cron/digest` cada 15 minutos (`CRON.md`); ese endpoint recorre todos los `DigestSchedule` con `enabled: true`, filtra los que están "due" (`isDigestDue` en `src/lib/digest.ts`) y llama a `runDigestForUser(userId, organizationId, { sendWhatsApp: true, skipScheduleCheck: true })`.
- `runDigestForUser` arma el contexto (`buildDigestContext`), genera el mensaje final con IA (`generateDigestMessage`, vía `completeWithAi`) y lo envía por WhatsApp usando `sendWhatsAppNotification` (`src/lib/whatsapp.ts`), con el teléfono/API key guardados en el modelo `CallMeBot` (1:1 con el usuario, reutilizado entre organizaciones).
- El modelo `Email` (`prisma/schema.prisma:841-874`) tiene `isRead`, `isSpam`, `isArchived`, y está escopeado a `companyId` + `organizationId` — no tiene dueño individual (es bandeja compartida por organización/empresa).

En vez de construir un sistema nuevo (cron, schedule, envío WhatsApp por separado), esta funcionalidad se integra en el Resumen por WhatsApp ya existente, agregando el conteo de correos sin leer como un dato más del mensaje. Esto reutiliza el cron, el horario ya configurado (por defecto diario a las 8:00) y el teléfono/API key de CallMeBot ya guardados.

## Alcance

### 1. Conteo de correos sin leer

- Se cuenta a nivel de organización (`organizationId`), sumando todas las empresas/bandejas: `prisma.email.count({ where: { organizationId, isRead: false, isSpam: false, isArchived: false } })`.
- Se excluyen correos marcados como spam o archivados (para no inflar el número con correos irrelevantes).

### 2. `prisma/schema.prisma`

- Nuevo campo en `DigestSchedule`: `includeUnreadEmails Boolean @default(true)`, siguiendo el mismo patrón que `includeGoogleCalendar`.

### 3. `src/lib/digest.ts`

- `buildDigestContext`: nuevo parámetro `includeUnreadEmails` (default `true`, igual que `includeGoogleCalendar`). Cuando está activo, agrega la query de conteo y una línea `CORREOS SIN LEER: N` al contexto de texto que se le pasa a la IA.
- `generateDigestMessage`: el `systemPrompt` de la IA se actualiza para incluir "correos sin leer" en la lista de contenido que debe aparecer en el resumen final (junto a pipelines, deals, tareas, citas, etc.).
- `runDigestForUser`: lee `schedule?.includeUnreadEmails ?? true` y lo pasa a `buildDigestContext`, igual que hace hoy con `includeGoogleCalendar`.

### 4. `app/api/settings/digest/route.ts`

- `GET`: incluye `includeUnreadEmails` en la respuesta (con default `true` si no existe schedule aún).
- `PATCH`: acepta y guarda `includeUnreadEmails` en el upsert de `DigestSchedule`.

### 5. `app/settings/digest/page.tsx`

- Nuevo toggle "Incluir correos sin leer" en el formulario, con el mismo patrón visual de switch (`w-11 h-6 rounded-full ...`) ya usado para los toggles existentes de esa página (ej. `includeGoogleCalendar`).
- Estado por defecto: activado (`true`).

## Fuera de alcance

- No se crea un cron, schedule, ni endpoint de envío nuevo — todo corre sobre la infraestructura existente de `DigestSchedule` / `/api/cron/digest`.
- No se hace desglose por empresa/bandeja individual — solo el total de la organización.
- No se cambia la frecuencia/horario del resumen existente: si el usuario aún no ha activado el Resumen por WhatsApp (Ajustes > Resumen por WhatsApp), deberá activarlo y configurar su horario (por defecto diario 8:00) para empezar a recibir el conteo de correos sin leer junto con el resto del resumen.
- No se agrega un mensaje de WhatsApp separado exclusivo para correos sin leer.

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Nuevo campo `includeUnreadEmails` en `DigestSchedule` (+ migración) |
| `src/lib/digest.ts` | Conteo de correos sin leer + inclusión en contexto/prompt de IA |
| `app/api/settings/digest/route.ts` | Exponer y guardar `includeUnreadEmails` |
| `app/settings/digest/page.tsx` | Nuevo toggle "Incluir correos sin leer" |

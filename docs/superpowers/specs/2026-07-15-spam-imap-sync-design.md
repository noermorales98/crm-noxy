# Sincronización de la carpeta real de Spam del servidor IMAP

## Contexto

El feature de Spam previamente construido (`docs/superpowers/specs/2026-07-15-spam-emails-design.md`) marca correos como spam solo de dos formas: manualmente por el usuario, o automáticamente por una heurística conservadora (`src/lib/spam-detector.ts`) que corre sobre los correos de `INBOX` durante la sincronización IMAP. Ese diseño excluía explícitamente sincronizar la carpeta de Spam/Junk real del servidor de correo — el cron (`app/api/cron/fetch-emails/route.ts`) solo abre la carpeta `INBOX`.

El usuario reporta que tiene correos en la carpeta de Spam de su cuenta de correo real que no aparecen en la carpeta "Spam" de la app. Este documento extiende el feature para también sincronizar esa carpeta real del servidor.

## Detección de la carpeta de Spam/Junk

`imapflow` soporta `client.list()`, que devuelve cada carpeta del buzón junto a su atributo `specialUse` cuando el servidor implementa la extensión `SPECIAL-USE` (RFC 6154) — el valor `"\Junk"` identifica la carpeta de spam. Gmail, Outlook/Microsoft 365 e iCloud soportan esta extensión.

Estrategia (confirmada con el usuario):
1. Llamar `client.list()` y buscar la primera carpeta cuyo `specialUse === "\\Junk"`.
2. Si ninguna carpeta reporta ese flag (servidores IMAP viejos o self-hosted sin soporte SPECIAL-USE), buscar por nombre exacto (case-insensitive) entre: `Spam`, `Junk`, `Junk E-mail`, `[Gmail]/Spam`, `INBOX.Spam`, `INBOX.Junk`.
3. Si no se encuentra ninguna carpeta por ninguno de los dos métodos, esa empresa simplemente no sincroniza spam del servidor (sigue sincronizando `INBOX` normalmente) — no es un error fatal.

## Modelo de datos

Añadir a `Company` en `prisma/schema.prisma`:

```prisma
imapSpamLastUid Int? @default(0)
```

Cada carpeta IMAP tiene su propia numeración de UID (no son comparables entre carpetas), por lo que se necesita un contador de sincronización incremental independiente del `imapLastUid` existente (que sigue siendo solo para `INBOX`).

Aplicado con `npm run db:push` (mismo mecanismo usado en el feature anterior — este hosting no permite `prisma migrate dev`).

## Cambios en el cron (`app/api/cron/fetch-emails/route.ts`)

**Refactor:** la lógica de fetch/parseo/dedupe/creación de un mensaje dentro de una carpeta (actualmente ~130 líneas inline dentro del loop de `INBOX`) se extrae a una función interna reutilizable con esta forma:

```ts
async function syncMailbox(
  client: ImapFlow,
  mailboxPath: string,
  lastUid: number,
  company: { id: string; organizationId: string; imapUser: string },
  simpleParser: typeof import("mailparser").simpleParser,
  options: { forceSpam: boolean; notifyOnNew: boolean }
): Promise<{ fetched: number; newMaxUid: number }>
```

Esta función:
- Abre el lock de la carpeta indicada (`mailboxPath`), itera mensajes con UID mayor a `lastUid`.
- Parsea cada mensaje igual que hoy (mailparser + fallback a envelope IMAP).
- Deduplica por `messageId` dentro de la misma `companyId` (sin filtrar por carpeta — si un mensaje ya existe, no se duplica, sea cual sea el origen).
- Calcula `isSpam`: si `options.forceSpam` es `true`, se asigna `true` directamente (se confía en la clasificación del servidor); si es `false`, se llama a `detectSpam(...)` como hasta ahora.
- Crea el registro `Email` con el `isSpam` resultante.
- Envía notificación in-app solo si `options.notifyOnNew && !isSpam`.
- Devuelve cuántos mensajes nuevos se insertaron y el UID máximo visto, para que el llamador persista el contador correspondiente.

**Loop principal por empresa**, después de conectar (`client.connect()`):
1. Llamar `syncMailbox(client, "INBOX", company.imapLastUid ?? 0, company, simpleParser, { forceSpam: false, notifyOnNew: true })`. Persistir el nuevo `imapLastUid` si avanzó.
2. Intentar `client.list()` y localizar la carpeta de spam (ver "Detección" arriba). Si se encuentra, envolver en su propio `try/catch` (para que un fallo aislado en esta carpeta —ej. permisos, carpeta vacía en un estado raro— no invalide la sincronización de `INBOX` que ya tuvo éxito) y llamar `syncMailbox(client, spamMailboxPath, company.imapSpamLastUid ?? 0, company, simpleParser, { forceSpam: true, notifyOnNew: false })`. Persistir el nuevo `imapSpamLastUid` si avanzó.
3. `client.logout()`.

El contador `totalFetched` en la respuesta del endpoint suma los mensajes nuevos de ambas carpetas.

## `?reset=true`

El reset de sincronización completa existente (`prisma.company.updateMany({ data: { imapLastUid: 0 } })`) se extiende para también poner `imapSpamLastUid: 0`, de modo que "Sincronizar todo el historial" también re-trae el historial completo de la carpeta de spam del servidor, no solo `INBOX`.

## Interacción con la heurística existente

La heurística (`detectSpam`) sigue corriendo exactamente igual sobre los correos de `INBOX` — sin cambios. Los correos que vienen de la carpeta real de Spam del servidor no pasan por la heurística: se confía directamente en la clasificación que ya hizo el proveedor de correo.

Un correo marcado como spam por el servidor sigue siendo reversible por el usuario con el botón "No es spam" ya construido (Tarea 5/7 del feature anterior), que lo devuelve a la bandeja de entrada.

## Fuera de alcance

- No se sincronizan otras carpetas especiales del servidor (`\Trash`, `\Sent`, `\Drafts`, `\Archive`) — solo `INBOX` y `\Junk`.
- No hay configuración manual de nombre de carpeta por empresa — la detección es automática (auto-detección + fallback por nombre), según lo confirmado con el usuario.

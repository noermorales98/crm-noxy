# Sección de Spam en Correos

## Contexto

El módulo de correos (`app/emails/page.tsx`, `src/context/EmailContext.tsx`, `src/components/Sidebar.tsx`) ya maneja tres carpetas mutuamente independientes — `inbox`, `sent`, `archived` — basadas en flags booleanos (`isArchived`) sobre el modelo `Email` de Prisma. No existe ninguna noción de spam ni sincronización con una carpeta de spam del servidor IMAP: el cron de sincronización (`app/api/cron/fetch-emails/route.ts`) solo lee la carpeta `INBOX` del servidor.

Este documento describe cómo añadir una carpeta "Spam" al mismo patrón existente, permitiendo:
1. Mover un correo manualmente a Spam y viceversa ("No es spam").
2. Marcar automáticamente como spam los correos entrantes que cumplan una heurística conservadora, durante la sincronización IMAP.

## Modelo de datos

Añadir al modelo `Email` en `prisma/schema.prisma`:

```prisma
isSpam Boolean @default(false)
```

con `@@index([isSpam])` junto a los índices existentes. Se genera la migración correspondiente con `prisma migrate dev`.

El flag es independiente de `isArchived`, igual que patrón actual de `isRead`/`isArchived`.

## Filtrado de carpetas

`GET /api/emails` (folder query param) y `GET /api/emails/unread-count`:

| Carpeta    | Condición                                             |
|------------|--------------------------------------------------------|
| `inbox`    | `type=RECEIVED, isArchived=false, isSpam=false`         |
| `sent`     | `type=SENT, isArchived=false` (sin cambios)             |
| `archived` | `isArchived=true, isSpam=false`                         |
| `spam`     | `isSpam=true` (nueva; **ignora** `isArchived`)          |

Spam es una carpeta que "prevalece" sobre archivado: un correo marcado como spam desaparece de `inbox`/`archived` y solo aparece en `spam`, independientemente de si estaba archivado antes. Esto simplifica el modelo mental (igual que Gmail) y evita que un correo quede invisible en dos flags simultáneos.

El contador de no leídos (`unread-count`) sigue excluyendo spam (`isSpam=false`) además de `isArchived=false`.

## Mover correos manualmente

`PATCH /api/emails/[id]` acepta un nuevo campo opcional `isSpam: boolean`, junto a los existentes `isRead`/`isArchived`:

- **Marcar como spam** (`isSpam: true`): solo actualiza ese flag. El correo desaparece de la carpeta actual y pasa a `spam`.
- **Marcar como no spam** (`isSpam: false`): además de `isSpam=false`, se fuerza `isArchived=false` en la misma actualización, para que el correo siempre regrese a la bandeja de entrada (comportamiento confirmado con el usuario: "no es spam" = inbox, sin intentar reconstruir el estado previo).

Esta acción solo tiene sentido para correos `type=RECEIVED`; el botón correspondiente en la UI no se muestra para correos enviados.

No se requiere un endpoint nuevo — se reutiliza el PATCH existente en `app/api/emails/[id]/route.ts`, añadiendo el campo al `dataToUpdate`.

## Heurística automática de spam

Nuevo módulo `src/lib/spam-detector.ts` que exporta:

```ts
function detectSpam(input: {
  subject: string;
  bodyText: string | null;
  fromAddress: string;
  fromName: string | null;
}): boolean
```

Evalúa tres señales independientes, cada una devuelve `true`/`false`:

1. **Palabras clave de spam** — lista de términos ES/EN típicos de spam (p. ej. "gana dinero", "dinero fácil", "viagra", "haz clic aquí", "oferta exclusiva", "lottery", "you won", "free money", "act now", "cuenta bloqueada", "verifica tu cuenta") buscados (case-insensitive) en `subject` o en los primeros ~2000 caracteres de `bodyText`.
2. **Remitente sospechoso** — el `fromName` contiene el nombre de una marca conocida sensible a phishing (banco, PayPal, Amazon, Microsoft, Netflix, Apple, etc., lista corta y explícita) **pero** el dominio de `fromAddress` es un dominio de correo gratuito genérico (`gmail.com`, `outlook.com`, `hotmail.com`, `yahoo.com`, etc.) — inconsistencia típica de suplantación. Alternativamente, la parte local del `fromAddress` tiene una proporción alta (>50%) de dígitos.
3. **Exceso de mayúsculas/signos en el asunto** — 3 o más signos de exclamación/interrogación consecutivos, o más del 60% de los caracteres alfabéticos del asunto en mayúsculas (con asunto de longitud ≥ 8 para evitar falsos positivos en asuntos cortos).

**Regla de decisión conservadora**: se requieren **2 o más señales verdaderas** para que `detectSpam` devuelva `true`. Con 0 o 1 señal, el correo se considera legítimo. Esto minimiza falsos positivos, dado que en un CRM perder un lead real por error es más costoso que dejar pasar algún spam ocasional (que el usuario puede marcar manualmente).

### Integración en el cron de sincronización

En `app/api/cron/fetch-emails/route.ts`, justo antes de `prisma.email.create(...)`, se llama a `detectSpam(...)` con los datos ya parseados (`subject`, `bodyText`, `fromAddress`, `fromName`) y se guarda el resultado en el nuevo campo `isSpam` del `create`. No se envía notificación in-app (`createNotification`) para correos detectados como spam, para no generar ruido de notificaciones por spam.

## UI

**Tipos** (`app/emails/page.tsx`, `src/context/EmailContext.tsx`):
- `Folder` / `EmailFolder`: se amplía a `"inbox" | "sent" | "archived" | "spam"`.
- `EmailSummary` / `EmailDetail`: se añade `isSpam: boolean`.

**Pestañas de carpeta** (`FOLDERS` en `page.tsx`, `EMAIL_FOLDERS` en `Sidebar.tsx`):
- Nueva entrada `{ key: "spam", label: "Spam", icon: <HugeiconsIcon icon={SpamIcon} .../> }` (el ícono `SpamIcon` ya existe en `@hugeicons/core-free-icons`, no requiere instalar nada).
- Deep link `?box=spam` soportado igual que `sent`/`archived` (en el `useEffect` de inicialización por URL en `page.tsx` y en la detección de `pathname` en `MailNav` de `Sidebar.tsx`).

**Panel de detalle del correo** (`page.tsx`, junto a los botones existentes de Responder/Leído/Archivar/Eliminar):
- Si `selectedEmail.type === "RECEIVED" && !selectedEmail.isSpam`: botón "Marcar como spam" (icono `SpamIcon`) que llama a un nuevo `handleToggleSpam(id, true)`.
- Si `selectedEmail.isSpam`: se reemplaza el botón de Archivar por "No es spam" (icono `CheckmarkCircle02Icon`) que llama a `handleToggleSpam(id, false)`.
- El botón Eliminar permanece disponible siempre (para borrar spam definitivamente).

**`handleToggleSpam(emailId, isSpam)`**: sigue el mismo patrón que `handleArchive` — `PATCH /api/emails/{id}` con `{ isSpam }`, y en éxito remueve el correo de la lista local (`setEmails`), limpia `selectedEmail` si coincide, y muestra un toast:
- `isSpam=true` → "Correo marcado como spam."
- `isSpam=false` → "Correo movido a la bandeja de entrada."

No se requieren cambios en el modal de composición ni en el flujo de envío — spam solo aplica a correos recibidos.

## Fuera de alcance

- No se sincroniza con ninguna carpeta "Junk"/"Spam" real del servidor IMAP (el cron solo lee `INBOX`); el flag `isSpam` es puramente interno a la app.
- No hay aprendizaje ni ajuste de la heurística basado en las correcciones manuales del usuario (no se reentrena ni se ajustan pesos).
- No se añade un endpoint de "vaciar spam" masivo; el borrado es correo por correo con el botón Eliminar existente.

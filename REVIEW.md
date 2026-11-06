# REVIEW.md — qué lee primero quien revisa crm-noxy

Ratificado junto a la constitution (`02-DOCS/wiki/sdd/constitution.md`). Se enmienda igual que ella, nunca en silencio.

## El resumen empieza con un conteo

"3 hallazgos: 1 bloqueante, 2 nits", y después el detalle.

## Cómo se ve un fallo aquí

- Una ruta de `app/api/**` privada que lee o escribe datos sin `auth()` / `requireTeamManager` (P11).
- Una ruta de `app/api/public/**` que devuelve campos de más o datos de otro cliente a partir de un token (P18).
- Un `findMany` sin `take` sobre contactos, leads, emails o tareas (P23).
- Un error de Prisma o un stack trace que llega al cliente en vez de pasar por `jsonFromUnknownError` (P12).
- Un `new PrismaClient()` fuera de `src/lib/db.ts` (P2).
- Un body, query o webhook usado sin validar (P20).
- Un cambio en `prisma/schema.prisma` que rompe datos existentes en MySQL de producción.
- Un test nuevo en rojo o un test borrado para que el suite pase (P5).
- Un secreto o una URL de BD con contraseña en el diff (P17).

## Rutas que no se revisan

- `node_modules/`, `.next/`, `tsconfig.tsbuildinfo`, `package-lock.json` (salvo dependencias nuevas).
- `.rsc/`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.cursor/`, `.codex/` (los gestiona rsc).
- `.worktrees/`, `.superpowers/`, `.bolt/`, `.impeccable/`.

## Tope de nits

Como máximo 3 nits por revisión. El resto se descarta.

## Rutas que siempre revisa una persona

- Auth y permisos: `auth.ts`, `auth.config.ts`, `middleware.ts`, `app/api/auth/**`, `app/api/oauth/**`, `src/lib/permissions.ts`, `src/lib/require-team.ts`.
- Rutas públicas: `app/api/public/**`.

Esta lista solo informa. `rsc risk` ya sube a tier 2 por defecto los archivos `auth*`, `oauth/`, `migrations/` y `stripe`. `middleware.ts`, `permissions.ts`, `require-team.ts` y `app/api/public/**` solo quedarían forzados si se añaden a `risk.raise` en `.rsc/sello-config.json`, pero crear ese archivo activa también el sello (el bloqueo de commit/push sin revisión sellada). Está **sin activar** por decisión pendiente del dueño.

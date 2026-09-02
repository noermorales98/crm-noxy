# 05 — Inicialización del proyecto y variables de entorno

Guía paso a paso para levantar una copia nueva del CRM desde cero (mismo negocio u otro).

## Prerrequisitos

- Node.js 20+ y npm
- Una base de datos **MySQL 8+** o **MariaDB 10.4+** accesible (local, Docker, PlanetScale, Railway, etc.)
- Git

## Paso 1 — Clonar e instalar

```bash
git clone <url-del-repo> mi-crm
cd mi-crm
npm install        # el script postinstall ejecuta `prisma generate` automáticamente
```

## Paso 2 — Crear la base de datos

```sql
CREATE DATABASE mi_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Paso 3 — Variables de entorno

El proyecto **no trae `.env.example`**; usa esta misma carpeta: copia [`env.example`](env.example) a `.env.local` en la raíz y rellena los valores. Los scripts npm de BD cargan `.env.local` automáticamente (`source .env.local` antes de Prisma). Next.js también lee `.env` si existe — el proyecto original usa ambos archivos, pero con `.env.local` basta.

Mínimo indispensable para arrancar:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/mi_crm"
AUTH_SECRET="<cadena aleatoria larga>"   # openssl rand -base64 32
CRON_SECRET="<cadena aleatoria larga>"   # protege /api/cron/*
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

Las demás (Stripe, OpenRouter, Chatbase, Google, SMTP, MCP) son opcionales y solo se necesitan para activar su módulo correspondiente. Tabla completa más abajo.

## Paso 4 — Crear el schema en la BD

```bash
npm run db:push
```

> **Importante:** el proyecto usa **`prisma db push`**, no migraciones. La carpeta `prisma/migrations/` solo contiene una carpeta vacía (`add_ai_conversations`) — el historial de migraciones está abandonado. El script `db:migrate` existe pero no es el flujo real. Cada vez que cambies `prisma/schema.prisma`, ejecuta `npm run db:push` de nuevo.

## Paso 5 — Arrancar y crear el primer usuario

```bash
npm run dev   # http://localhost:3000
```

1. Abre `http://localhost:3000/register`.
2. Registra el primer usuario. **No hay seed que correr**: el endpoint `/api/auth/register` crea en una sola transacción:
   - `User` (con `passwordHash` bcrypt)
   - `Organization` + `OrganizationMember` con rol `OWNER`
   - `Pipeline` "Sales Pipeline" con 5 `Stage` por defecto: **Lead** (#6B7280) → **Contactado** (#3B82F6) → **Propuesta** (#F59E0B) → **Ganado** (isWon, #10B981) → **Perdido** (isLost, #EF4444)
3. Inicia sesión en `/login`.

## Paso 6 — Configuración posterior (opcional, desde la UI)

| Módulo | Dónde se configura |
|---|---|
| SMTP/IMAP de correo | `/companies` → empresa → config SMTP/IMAP (con botón de prueba) |
| Google Calendar | `/settings` → conectar cuenta (OAuth) |
| WhatsApp (CallMeBot) | `/settings` → teléfono + API key por usuario |
| Cotizaciones (fiscal, banco, Stripe) | `/cotizaciones/configuracion` (guarda claves Stripe por organización) |
| Modelos de IA | `/settings/ai-models` |
| Digest diario | `/settings/digest` |

## Paso 7 — Crons en producción

Los procesos diferidos (correo, campañas, recordatorios, digest) son endpoints `/api/cron/*` que hay que disparar externamente (el proyecto usa **cron-job.org** contra Vercel). Configura cada job con header `Authorization: Bearer <CRON_SECRET>` y la frecuencia indicada en `03-rutas.md` / `CRON.md`. En desarrollo puedes llamarlos a mano con curl.

## Tabla completa de variables de entorno

| Variable | Requerida | Propósito |
|---|---|---|
| `DATABASE_URL` | ✅ | Conexión MySQL/MariaDB para Prisma (`mysql://user:pass@host:3306/db`) |
| `AUTH_SECRET` | ✅ | Secreto NextAuth (JWT) y firma HMAC de tokens OAuth del MCP |
| `CRON_SECRET` | ✅ prod | Bearer token que protege `/api/cron/*` |
| `NEXT_PUBLIC_BASE_URL` | ✅ prod | URL pública canónica (links de cotizaciones, booking, emails) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | opcional | Servidor SMTP global (fallback al SMTP por empresa en BD) |
| `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM_EMAIL` | opcional | Credenciales y remitente del SMTP global |
| `STRIPE_SECRET_KEY` | opcional | Clave Stripe global (fallback a las claves por organización en BD) |
| `STRIPE_WEBHOOK_SECRET` | opcional | Secreto de firma del webhook (fallback al de BD) |
| `OPENROUTER_API_KEY` | para IA | Clave principal de OpenRouter |
| `OPENROUTER_API_KEY_SECONDARY` | opcional | Failover ante 429 |
| `CHATBASE_API_KEY` / `CHATBASE_BOT_ID` | para IA | Bot de Chatbase, modelo por defecto del asistente |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | para Calendar | OAuth de Google |
| `GOOGLE_REDIRECT_URI` | para Calendar | p. ej. `https://tudominio.com/api/google-calendar/callback` |
| `MCP_API_KEY` | para MCP | API key estática del servidor MCP |
| `MCP_ORGANIZATION_ID` | para MCP | Organización a la que se limitan los datos del MCP (obtener tras registrarse, p. ej. desde Prisma Studio) |
| `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL` | auto | Fallbacks de URL base en Vercel |
| `NODE_ENV` | auto | Comportamiento dev/prod |

Para inspeccionar la BD: `npm run db:studio` (Prisma Studio).

## Scripts npm

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y arranque de producción |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica el schema a la BD (método real del proyecto) |
| `npm run db:migrate` | `prisma migrate dev` (existe, pero sin historial real) |
| `npm run db:studio` | Prisma Studio |

## Scripts sueltos de la raíz (solo para datos legacy, NO necesarios en instalación nueva)

| Script | Propósito |
|---|---|
| `update_stages.ts` | Migración de datos: marca stages "Ganado" como `isWon` y crea "Perdido" donde falte (correr con tsx/ts-node) |
| `migrate_forms.mjs` | Enlaza contactos legacy `source = "Form: X"` a `sourceFormId` y tareas a `formId` |
| `clear_stale_stripe_links.mjs` | Borra links de Stripe obsoletos de Quotes/Payments no pagados (`node clear_stale_stripe_links.mjs`) |
| `check_contact.js` / `query_db.js` | Debug: imprimen datos de prueba |
| `test_form_logic.js` | Test de lógica pura form→contacto (no toca BD) |

## Deploy (Vercel)

El proyecto despliega en Vercel (`vercel.json` existe). Puntos a cuidar: configurar todas las variables de entorno en el dashboard, la `DATABASE_URL` apuntando a una MySQL accesible públicamente, el webhook de Stripe apuntando a `https://<dominio>/api/webhooks/stripe`, y los cron jobs en cron-job.org con el `CRON_SECRET` de producción.

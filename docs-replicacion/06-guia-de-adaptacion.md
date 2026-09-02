# 06 — Guía de adaptación: clonar el CRM para otro negocio

El 90% del código es genérico y reutilizable tal cual. Esta guía lista **todo lo que está hardcodeado para Noxy** y qué cambiar al re-marcarlo.

## Checklist de adaptación

### 1. Marca y nombre del producto

| Dónde | Qué cambiar |
|---|---|
| `app/layout.tsx` | Título "Noxy CRM - Gestión de Clientes", favicon `?v=noxy-2026` |
| `package.json` | `"name": "crm-noxy"` |
| Footers de páginas públicas (`app/form/[id]`, `app/book/[token]`, `app/schedule/[slug]`) | Texto "Desarrollado por Noxy" |
| `app/cotizar/[token]` y PDFs | "Generado con Noxy CRM"; `DownloadProposalButton.tsx` incluye el dominio `noxy.app`; `QuotePdfButton.tsx` usa "Noxy CRM" como emisor fallback |
| Remitentes de email en `src/lib/email.ts`, `src/lib/quotes.ts`, crons y endpoints públicos | Nombres `"CRM Noxy"`, `"Noxy CRM"`, `"Noxy"` |
| Prompts de IA en `src/lib/ai-context.ts` | "Eres el asistente de IA del CRM Noxy" |
| Headers OpenRouter (3 archivos) | `X-Title: "CRM Noxy"`, `HTTP-Referer: https://noxthy.co` |
| `src/lib/digest.ts` | `"📊 Resumen Noxy — …"`; follow-ups `"⏰ Follow-up vencido en Noxy CRM"` |
| Archivos .ics de citas | `PRODID:-//CRM Noxy//Appointment//ES`, UID `@crm-noxy` |
| Servidor MCP | `serverInfo.name: "noxthy-crm"`, `realm="noxthy-crm"` |

### 2. Dominios

| Dominio hardcoded | Dónde |
|---|---|
| `noxthy.co` | OpenRouter referer, comentarios del MCP, CRON.md |
| `crm-noxy.vercel.app` | CRON.md, comentarios en `src/lib/url.ts` |
| `noxy.app` | Footer de PDFs |

Estrategia: centralizar en `NEXT_PUBLIC_BASE_URL` (ya resuelto por `src/lib/url.ts`) y limpiar los casos hardcoded restantes.

### 3. Identidad visual

- `DESIGN.md` — design system completo (paleta Índigo/Obsidiana/Lima/Jazmín/Lavanda, tipografía Open Sauce Two).
- `src/lib/crm-themes.ts` — 10 temas con IDs `noxy-*` (renombrar los IDs y ajustar paletas).
- `app/globals.css` y páginas públicas — clases CSS `noxy-form-*`.
- localStorage: claves `noxy-crm-theme:*`, `noxy-sound-enabled`.
- Tipografías: fuentes `@fontsource/*` en `package.json` (Open Sauce Two, IBM Plex, Playfair, etc.) — cambiar por la familia del nuevo negocio.

### 4. Datos semilla y defaults de negocio

| Qué | Dónde | Consideración |
|---|---|---|
| Pipeline por defecto "Sales Pipeline" con etapas Lead → Contactado → Propuesta → Ganado → Perdido | `app/api/auth/register/route.ts` | Ajustar nombres, colores y número de etapas al proceso comercial del nuevo negocio |
| Enum `LeadSource` | `prisma/schema.prisma` | Canales de la agencia (WHATSAPP, REFERIDO, LINKEDIN…): adaptar a los canales reales del negocio |
| Enum `ActivityType` | `prisma/schema.prisma` | Tipos de actividad comercial (LLAMADA, VISITA…) |
| Enum `PaymentType` | `prisma/schema.prisma` | ANTICIPO/SALDO/COMPLETO/MENSUALIDAD — cubre la mayoría de negocios de servicios |
| Folios de cotización `COT-YYYY-NNNN` | lógica de quotes | Cambiar prefijo si se desea |
| Timezones por defecto | `Organization.timezone` = "America/Cancun", `Appointment.timezone` = "America/Mexico_City" | Ajustar a la zona del negocio |
| Moneda por defecto | `Deal`/`Payment`/`Client` = "USD", `QuoteSettings`/`Quote` = "MXN" | Unificar a la moneda del negocio |
| IVA por defecto 16% | `QuoteSettings.defaultTaxRate`, `Quote.taxRate` | Ajustar al impuesto local |
| Campos bancarios mexicanos (CLABE) | `QuoteSettings` (`bankClabe`) + UI de `/cotizaciones/configuracion` | Renombrar/añadir campos bancarios del país |
| Lada telefónica `+52 México` por defecto | `src/lib/country-dial-codes.ts`, formularios, `Client.phoneCode` | Cambiar el default |
| Formato de moneda `es-MX` | componentes de formato | Locale del negocio |
| SMTP por defecto `smtp.gmail.com:465` | config de empresas | Ajustar al proveedor típico |

### 5. Idioma

Toda la UI, los enums de negocio y los prompts de IA están en **español**. Para otro idioma hay que traducir: componentes en `src/components/`, páginas en `app/`, prompts en `src/lib/ai-context.ts` y `src/lib/digest.ts`, y textos de emails en `src/lib/email.ts` / `src/lib/quotes.ts`.

### 6. Configuración de servicios externos (nueva instancia)

1. **BD**: nueva base MySQL vacía + `DATABASE_URL` nueva (ver `05-inicializacion-y-variables.md`).
2. **Secretos**: regenerar `AUTH_SECRET` y `CRON_SECRET`.
3. **Stripe**: nuevas claves (por env o por organización en `/cotizaciones/configuracion`) + nuevo webhook apuntando a `/api/webhooks/stripe`.
4. **Google Calendar**: nuevo proyecto en Google Cloud Console, OAuth consent screen, y `GOOGLE_REDIRECT_URI` con el nuevo dominio.
5. **IA**: nuevas claves de OpenRouter (y Chatbase si se usa bot propio).
6. **MCP**: nuevo `MCP_API_KEY` y, tras registrar el primer usuario, obtener el `organizationId` (Prisma Studio) para `MCP_ORGANIZATION_ID`.
7. **Crons**: recrear los 8-9 jobs en cron-job.org con el nuevo dominio y `CRON_SECRET`.
8. **WhatsApp**: cada usuario configura su propio CallMeBot en `/settings` (nada que migrar).

### 7. Limpieza opcional al clonar

- Borrar `.env` y `.env.local` originales (nunca commitear los nuevos).
- Eliminar scripts legacy que no aplican: `update_stages.ts`, `migrate_forms.mjs`, `clear_stale_stripe_links.mjs`, `check_contact.js`, `query_db.js`, `test_form_logic.js`.
- `docs/superpowers/` contiene specs históricos de Noxy: conservar como referencia o eliminar.
- Considerar eliminar la dependencia muerta `@anthropic-ai/sdk` de `package.json` (no se importa en ningún archivo).
- Revisar `.worktrees/`, `.bolt/`, `.claude/`, `.superpowers/`, `.impeccable/` — carpetas de tooling del entorno original.

## Lo que NO hay que tocar (genérico)

- Toda la maquinaria multi-tenant (Organization/members, scoping por `organizationId`).
- Motor de formularios con variantes A/B y lógica post-submit (crear contacto + cita + tarea + email de bienvenida).
- Inbox IMAP/SMTP por empresa.
- Sistema de citas + Google Calendar + recordatorios.
- Cotizaciones + Stripe con claves por organización.
- Servidor MCP + OAuth 2.1.
- Knowledge base completa (páginas, revisiones, shares, sugerencias, relaciones).
- Sistema de temas (renombrando IDs).
- Crons, digest y notificaciones WhatsApp.
- Dashboard con widgets personalizables y búsqueda global.

## Riesgos / deuda conocida a tener en cuenta

- **Las API routes no pasan por el middleware**: cada handler debe llamar `auth()` manualmente. Al añadir endpoints nuevos, no olvidarlo.
- **Bóveda sin cifrar**: `ClientVaultEntry.password` se guarda en texto plano.
- **Sin tests** automatizados en el proyecto.
- **Historial de migraciones Prisma abandonado**: usar `db push` (aceptable en proyecto nuevo; valora inicializar `migrate dev` desde el inicio en la copia).
- **Webhook Stripe sin verificación cuando no hay secrets configurados** (modo dev): asegúrate de configurar `STRIPE_WEBHOOK_SECRET` o las claves por organización en producción.

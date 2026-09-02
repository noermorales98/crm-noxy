# 02 — Arquitectura y estructura del código

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5 |
| Estilos | Tailwind CSS 4 + design system propio (`DESIGN.md`, temas `noxy-*`) |
| Base de datos | MySQL/MariaDB vía Prisma 6.19 (`provider = "mysql"`) |
| Autenticación | NextAuth v5 beta (Credentials + bcryptjs, sesión JWT) |
| Validación | Zod |
| Pagos | Stripe (Payment Links / Checkout + webhook) |
| IA | OpenRouter (~20 modelos gratuitos, doble API key con failover) + Chatbase (modelo por defecto). **Nota:** `@anthropic-ai/sdk` está en `package.json` pero **no se usa** — la IA va por `fetch` directo. |
| Correo saliente | nodemailer (SMTP por empresa + SMTP global por env) |
| Correo entrante | imapflow + mailparser (sincronización IMAP por cron) |
| Calendario | googleapis (OAuth2 de Google Calendar por organización) |
| WhatsApp | CallMeBot (GET HTTP simple, credenciales en BD por usuario) |
| MCP | `@modelcontextprotocol/sdk` + `mcp-handler` (transporte Streamable HTTP) |
| UI extra | `@hello-pangea/dnd` (Kanban), `lucide-react` + `hugeicons`, `jspdf` (PDFs), `react-markdown`, `cuelume` (sonidos Web Audio), `sileo` (toasts) |
| Deploy | Vercel (`vercel.json`), crons externos vía cron-job.org |

## Estructura de carpetas

```
crm-noxy/
├── app/                        # App Router: páginas + API REST
│   ├── layout.tsx              # Layout raíz (AppShell/Sidebar, título "Noxy CRM")
│   ├── page.tsx                # Dashboard principal (widgets personalizables)
│   ├── login/ register/        # Auth
│   ├── pipeline/               # Kanban, detalle de deal, clientes, historial
│   ├── contacts/ companies/    # CRM core
│   ├── projects/               # Proyectos con layout de tabs (info/tareas/actividad/correo/docs)
│   ├── tasks/ emails/ campaigns/ forms/
│   ├── appointments/ appointment-types/ availability/
│   ├── cotizaciones/           # + nueva/, [folio]/, configuracion/
│   ├── contenido/ boveda/ kb/ assistant/ settings/ profile/
│   ├── form/ book/ schedule/ cotizar/ calendario/ docs/   # superficies PÚBLICAS
│   ├── oauth/authorize/        # consentimiento OAuth 2.1 (para clientes MCP)
│   └── api/                    # ~120 route handlers REST por dominio
│       ├── auth/               # NextAuth handlers + register (crea org + pipeline)
│       ├── cron/               # 9 jobs (ver 03-rutas.md)
│       ├── ai/ assistant/      # IA: drafts, chat con streaming
│       ├── google-calendar/    # OAuth connect/callback/status/disconnect
│       ├── oauth/              # servidor OAuth 2.1 para MCP (register/authorize/token)
│       ├── webhooks/stripe/    # webhook de pagos
│       ├── public/             # endpoints sin sesión (forms, booking, quotes, kb, contenido)
│       ├── [transport]/        # servidor MCP (rewrite desde /mcp)
│       └── contacts/ deals/ quotes/ campaigns/ emails/ forms/ kb/ tasks/ stages/ ...
├── src/
│   ├── lib/                    # Lógica de negocio reutilizable
│   │   ├── db.ts               # Prisma singleton
│   │   ├── email.ts            # envío SMTP
│   │   ├── whatsapp.ts         # CallMeBot
│   │   ├── quotes.ts           # cotizaciones + Stripe (resolución de claves por org)
│   │   ├── google-calendar.ts  # OAuth + eventos
│   │   ├── digest.ts           # resumen diario con IA → WhatsApp
│   │   ├── ai-completion.ts    # llamadas OpenRouter/Chatbase (failover de keys)
│   │   ├── ai-models.ts        # catálogo de ~20 modelos gratuitos
│   │   ├── ai-context.ts       # contexto CRM + prompts del asistente
│   │   ├── spam-detector.ts    # heurística propia de spam
│   │   ├── url.ts              # resolución de URL base (NEXT_PUBLIC_BASE_URL / Vercel)
│   │   ├── crm-themes.ts       # 10 temas `noxy-*`
│   │   ├── country-dial-codes.ts
│   │   ├── kb-*.ts             # ~18 archivos del knowledge base
│   │   └── mcp/                # tools.ts (~30 herramientas MCP), oauth.ts, cors.ts
│   ├── components/             # AppShell, Sidebar, KanbanBoard, DealDetailClient +
│   │                           # subcarpetas: ai/, content/, dashboard/, kb/ (22 comp.),
│   │                           # pipeline/, quotes/, settings/, vault/
│   ├── context/                # Providers: Toast, Notification, Email, Kb, CrmTheme,
│   │                           # Sound, Search, Header, Confirm
│   └── hooks/                  # useAi.ts
├── prisma/
│   ├── schema.prisma           # ~1465 líneas, 38 modelos, 14 enums (ver 04-base-de-datos.md)
│   └── migrations/             # ⚠️ prácticamente vacía: el equipo usa `prisma db push`
├── auth.ts / auth.config.ts / middleware.ts   # NextAuth v5
├── next.config.ts              # serverExternalPackages + rewrite /mcp → /api/mcp
├── docs/superpowers/           # specs históricos de features (no arquitectura)
└── scripts raíz                # update_stages.ts, migrate_forms.mjs, clear_stale_stripe_links.mjs
                                # (migraciones/limpieza de datos legacy; ver 04 y 05)
```

## Multi-tenancy

Todo cuelga de `Organization` con `onDelete: Cascade`. El usuario inicia sesión con NextAuth Credentials; el token JWT carga `currentOrganizationId` (primera organización del usuario; cambiable vía `trigger === "update"` de sesión). **Cada query de cada API handler filtra por `organizationId`** — este es el invariante más importante del código y hay que respetarlo al añadir features.

## Autenticación y protección

- `middleware.ts` ejecuta el callback `authorized` de `auth.config.ts` sobre todo **excepto** `/api`, `/mcp`, `/.well-known` y assets estáticos.
- Públicas sin sesión: `/form/*`, `/schedule/*`, `/book/*`, `/docs/*`, `/cotizar/*`, `/calendario/*`.
- Las API routes **no pasan por el middleware**: cada handler llama a `auth()` manualmente. Las excepciones intencionales (`/api/public/*`, webhooks, cron, OAuth, MCP) tienen su propio mecanismo (token, firma Stripe, `CRON_SECRET`, PKCE, API key). **Al crear una API route nueva, hay que añadir `auth()` a mano o quedará abierta.**

## Integraciones externas

### Stripe — cobros
Payment Links para cotizaciones (pago único o anticipo + liquidación) y pagos de deals. Webhook `checkout.session.completed` marca pagos como `RECIBIDO` y cotizaciones como `PARCIAL`/`PAGADA`. **Claves por organización en BD** (`QuoteSettings.stripeSecretKey/stripeWebhookSecret`) con fallback a env (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). El webhook prueba múltiples secrets (`getStripeWebhookSecrets()` en `src/lib/quotes.ts`). Código: `src/lib/quotes.ts`, `app/api/quotes/[id]/stripe`, `app/api/deals/[id]/stripe`, `app/api/webhooks/stripe`.

### IA — OpenRouter + Chatbase (no Anthropic)
`src/lib/ai-completion.ts` llama por `fetch` a OpenRouter con `OPENROUTER_API_KEY` y failover a `OPENROUTER_API_KEY_SECONDARY` ante 429. Chatbase (`CHATBASE_API_KEY`, `CHATBASE_BOT_ID`) es el modelo por defecto del asistente ("bot personalizado con acceso al CRM"). Usos: (1) asistente de chat con streaming y action cards (`app/api/assistant/chat`); (2) redacción de emails (`/api/ai/draft-email`); (3) redacción de documentos KB (`/api/ai/draft-document`); (4) ideas de contenido RRSS (`/api/content/clients/[id]/ai-ideas`); (5) digest diario por WhatsApp (`src/lib/digest.ts`). Catálogo de modelos en `src/lib/ai-models.ts`; gestión por org en `/settings/ai-models` (modelo `CustomAiModel`).

### Google Calendar
OAuth2 por organización, tokens en `GoogleCalendarToken` con auto-refresh. Crea/actualiza/borra eventos al agendar citas y alimenta recordatorios WhatsApp (`cron/google-calendar-reminders`). Scope único: `calendar`. Código: `src/lib/google-calendar.ts`, `app/api/google-calendar/*`. Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.

### Correo — SMTP saliente + IMAP entrante
- **Saliente (nodemailer):** dos niveles — SMTP por empresa (campos `Company.smtpHost/User/Pass/...`, configurable en UI con endpoint de test) y SMTP global por env como fallback. Usado en inbox/redacción, campañas drip, cotizaciones, confirmaciones de booking y recordatorios.
- **Entrante (imapflow + mailparser):** `app/api/cron/fetch-emails` conecta por IMAP a cada empresa con IMAP configurado, sincroniza INBOX y carpeta de spam (RFC 6154), parsea con `simpleParser`, guarda `Email` + `EmailAttachment` y crea notificaciones. Imports dinámicos (`await import("imapflow")`).

### CallMeBot — WhatsApp
`src/lib/whatsapp.ts`: GET a `https://api.callmebot.com/whatsapp.php?phone=…&text=…&apikey=…`. Credenciales por usuario en BD (modelo `CallMeBot`), sin variables de entorno. Usado en: nuevo lead, follow-ups vencidos, recordatorios de citas y de Google Calendar, digest IA, avisos de contenido.

### Servidor MCP
El CRM **expone** un servidor MCP en `/mcp` (rewrite a `/api/[transport]`) para conectar Claude/ChatGPT/Gemini a los datos. ~30 herramientas en `src/lib/mcp/tools.ts` (contactos, empresas, pipelines, deals, tareas, citas, campañas, emails, cotizaciones, proyectos, clientes, formularios, KB, notificaciones, búsqueda global, métricas de ventas). Auth dual: OAuth 2.1 con PKCE stateless (HMAC con `AUTH_SECRET`) o API key estática `Bearer <MCP_API_KEY>`. Datos scopeados a `MCP_ORGANIZATION_ID`.

### cuelume y sileo (UI, no servicios)
- `cuelume`: sonidos de interacción sintetizados por Web Audio (clicks, confirmaciones). Preferencia en localStorage `noxy-sound-enabled`.
- `sileo`: toasts con física para React (usado en `ToastContext` y `NotificationContext`).

## Crons y procesos en segundo plano

No hay workers ni colas internas: todo el trabajo diferido se hace con **9 endpoints `/api/cron/*`** protegidos con `Authorization: Bearer <CRON_SECRET>`, disparados desde cron-job.org (ver tabla completa en `03-rutas.md`). `fetch-emails` además acepta sesión de usuario (botón "Sincronizar" y auto-sync cada 5 min con la app abierta).

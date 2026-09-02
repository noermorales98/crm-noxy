# 01 — Descripción general del producto

## Qué es

**Noxy CRM** es un CRM + plataforma de automatización de marketing hecho a medida para **Noxy Digital**, una agencia de marketing en México (UI 100% en español). Aunque el código es **multi-tenant** (todo se scopea por `Organization`), en la práctica el despliegue real sirve a una sola agencia que gestiona sus leads, clientes, proyectos y cobros.

No es un SaaS genérico empaquetado: es una base de código completa y en producción que se presta muy bien a clonarse y re-marcarse para otro negocio de servicios (agencias, consultoras, freelancers con cartera de clientes).

## Origen del proyecto (documentos históricos en la raíz)

- `especificaciones.md` — prompt original: "SaaS tipo HubSpot" con CRM, email marketing, multi-empresa, WhatsApp vía CallMeBot y MariaDB.
- `paso_a_paso.md` — roadmap del MVP en 9 pasos (auth multi-tenant → CRM → pipeline Kanban → tareas + WhatsApp → email marketing → proyectos → dashboard → deploy en Vercel).
- `PRODUCT.md` — definición: "centralizar la operación comercial y de servicio de la agencia".
- `DESIGN.md` — design system propio (paleta Índigo/Obsidiana/Lima/Jazmín/Lavanda, tipografía Open Sauce Two, 10 temas personales `noxy-*`, WCAG 2.2 AA).
- `CRON.md` — documentación de los cron jobs (orquestados desde cron-job.org contra Vercel).
- `docs/superpowers/` — planes y specs históricos de features individuales.

## Módulos funcionales implementados

| Módulo | Ruta UI | Detalle |
|---|---|---|
| CRM core | `/contacts`, `/companies` | Contactos, empresas, origen de lead |
| Pipeline de ventas | `/pipeline` | Kanban drag & drop, deals, etapas, actividades, follow-ups, propuestas, pagos |
| Cotizaciones | `/cotizaciones`, `/cotizar/[token]` (pública) | Folios `COT-YYYY-NNNN`, ítems, IVA, pago dividido (anticipo + liquidación), cobro Stripe o transferencia, PDF |
| Correo completo | `/emails` | Inbox IMAP (recepción real), envío SMTP por empresa, adjuntos, detección de spam, correos programados |
| Campañas | `/campaigns` | Email marketing con secuencias drip (`CampaignStep`), cola procesada por cron |
| Formularios | `/forms`, `/form/[id]` (público) | Constructor de formularios de captación, variantes A/B, generan contactos/citas/tareas |
| Citas | `/appointments`, `/appointment-types`, `/availability` + públicas `/book`, `/schedule` | Agendamiento tipo Calendly, sincroniza con Google Calendar, recordatorios WhatsApp/email |
| Proyectos | `/projects` | Agrupan formularios, campañas, tareas, documentos, correo y bitácora |
| Tareas | `/tasks` | Categorías, asignación por usuario, recordatorios |
| Clientes recurrentes + Bóveda | `/pipeline/clientes`, `/boveda` | Mensualidades (`Client`, `ClientPayment`) y bóveda de credenciales de clientes (`ClientVaultEntry`) |
| Contenido RRSS | `/contenido` + pública `/calendario/[token]` | Calendario de contenido por cliente, ideas generadas con IA, avisos "grabar mañana" por WhatsApp |
| Knowledge Base | `/kb` + pública `/docs/s/[token]` | Wiki tipo Notion: páginas markdown, carpetas, revisiones, sugerencias de edición, relaciones con entidades CRM, compartición pública con roles |
| Asistente IA | `/assistant` | Chat con el contexto completo del CRM y "action cards" (propone crear/editar contactos, deals, tareas, citas…) |
| Dashboard | `/` | Widgets KPI personalizables por usuario, búsqueda global (spotlight) |
| Servidor MCP | `/mcp` | ~30 herramientas MCP para operar el CRM desde Claude/ChatGPT, con OAuth 2.1 + PKCE |

## Para quién encaja esta base

Negocios de servicios que venden proyectos o mensualidades y necesitan: captar leads (formularios), agendar llamadas (booking), dar seguimiento (pipeline + tareas + recordatorios), cotizar y cobrar (quotes + Stripe), entregar (proyectos + tareas + KB) y retener (mensualidades + contenido + email drip).

## Stack en una línea

Next.js 16.1.6 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 6 sobre MySQL/MariaDB · NextAuth v5 (Credentials + JWT) · Zod · jsPDF · Stripe · OpenRouter/Chatbase (IA) · googleapis (Calendar) · nodemailer/imapflow (correo) · CallMeBot (WhatsApp) · MCP SDK · Deploy en Vercel.

# 03 — Mapa completo de rutas

## Autenticación y protección de rutas

NextAuth v5 con JWT y un único provider **Credentials** (email + password verificado con bcryptjs contra `User.passwordHash`). La sesión incluye `user.id` y `currentOrganizationId`.

- **`middleware.ts`**: protege todo excepto `/api`, `/mcp`, `/.well-known` y assets.
- **`auth.config.ts`** (callback `authorized`):
  - `/login`, `/register`: si ya hay sesión → redirige a `/`.
  - Públicas sin sesión: `/form/*`, `/schedule/*`, `/book/*`, `/docs/*`, `/cotizar/*`, `/calendario/*`.
  - Todo lo demás requiere sesión (redirect a `/login`).
- Las **API routes no pasan por el middleware**: cada handler llama a `auth()` manualmente. Las rutas `/api/public/*`, `/api/webhooks/stripe`, `/api/oauth/*`, `/api/auth/*`, `/api/cron/*` y `/api/[transport]` son intencionalmente abiertas con su propio mecanismo (token, firma, `CRON_SECRET`, PKCE).

---

## Páginas públicas (sin login)

| Ruta | Archivo | Propósito |
|---|---|---|
| `/login` | `app/login/page.tsx` | Inicio de sesión |
| `/register` | `app/register/page.tsx` | Registro (crea User + Organization + pipeline por defecto) |
| `/form/[id]` | `app/form/[id]/page.tsx` | Formulario público de captación (lada telefónica, variantes A/B) |
| `/schedule/[slug]` | `app/schedule/[slug]/page.tsx` | Reserva pública de cita por slug (selector de timezone, slots) |
| `/book/[token]` | `app/book/[token]/page.tsx` | Reserva pública vía token único ligado a un deal |
| `/calendario/[token]` | `app/calendario/[token]/page.tsx` | Calendario público de contenido del cliente |
| `/cotizar/[token]` | `app/cotizar/[token]/page.tsx` | Cotización pública: aceptar/rechazar, pagar con Stripe |
| `/docs/s/[token]` | `app/docs/s/[token]/page.tsx` | Knowledge base compartida públicamente |
| `/docs/s/[token]/[pageId]` | `app/docs/s/[token]/[pageId]/page.tsx` | Página del KB público, con sugerencias de edición |
| `/oauth/authorize` | `app/oauth/authorize/page.tsx` | Consentimiento OAuth 2.1 para clientes MCP (requiere sesión CRM) |

## Páginas privadas (dashboard)

| Ruta | Propósito |
|---|---|
| `/` | Dashboard principal personalizable (widgets + tabs por `DashboardPreference`) |
| `/pipeline` | Kanban de deals (drag & drop) |
| `/pipeline/[id]` | Detalle de deal (actividades, pagos, propuestas, citas, Stripe) |
| `/pipeline/clientes` | Deals ganados como clientes (pagos) |
| `/pipeline/historial` | Deals archivados/cerrados |
| `/contacts` | Contactos CRM |
| `/companies` | Empresas (incluye config SMTP/IMAP por empresa) |
| `/projects` | Lista de proyectos |
| `/projects/create` | Crear proyecto |
| `/projects/[id]` | Resumen del proyecto (layout con tabs de workspace) |
| `/projects/[id]/info` | Información y asociaciones |
| `/projects/[id]/tareas` | Tareas del proyecto |
| `/projects/[id]/actividad` | Bitácora del proyecto |
| `/projects/[id]/correo` | Bandeja de correo del proyecto |
| `/projects/[id]/docs` | Documentos del proyecto |
| `/tasks` | Tareas globales (filtro por `?projectId`) |
| `/emails` | Bandeja de correo (inbox/enviados/archivo, sync IMAP) |
| `/campaigns` | Campañas de email con secuencias drip |
| `/forms` | Lista de formularios |
| `/forms/[id]` | Editor de formulario (campos, variantes, color de acento) |
| `/appointments` | Lista de citas |
| `/appointment-types` | Tipos de cita (duración, slug público, color) |
| `/availability` | Horarios semanales, bloqueos, disponibilidad extendida |
| `/cotizaciones` | Lista de cotizaciones |
| `/cotizaciones/nueva` | Crear/editar cotización (`?edit=`) |
| `/cotizaciones/[folio]` | Detalle (eventos, envío, pago, link público) |
| `/cotizaciones/configuracion` | Datos fiscales/bancarios, IVA, moneda, empresa emisora |
| `/contenido` | Gestión de contenido: clientes |
| `/contenido/[clientId]` | Calendario de contenido de un cliente (ideas IA, WhatsApp) |
| `/boveda` | Redirige al primer cliente |
| `/boveda/[clientId]` | Credenciales/datos sensibles del cliente |
| `/kb` | Knowledge base interno |
| `/kb/[id]` | Editor de página KB (revisiones, relaciones, compartir) |
| `/assistant` | Lista de conversaciones IA |
| `/assistant/new` | Nueva conversación |
| `/assistant/[id]` | Chat del asistente IA |
| `/settings` | Organización, Google Calendar, CallMeBot/WhatsApp |
| `/settings/ai-models` | Modelos de IA por organización |
| `/settings/digest` | Programación del resumen diario por WhatsApp |
| `/profile` | Perfil (nombre, password, tema) |

Layouts: `app/layout.tsx` (raíz), `app/docs/layout.tsx` (público minimal), `app/projects/[id]/layout.tsx` (workspace con tabs). No hay `loading.tsx`/`error.tsx`/`not-found.tsx`.

---

## API routes

### Auth
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Handlers NextAuth |
| `/api/auth/register` | POST | Registro: crea User + Organization + Pipeline + 5 Stages |

### Núcleo CRM
| Endpoint | Métodos | Propósito / modelos |
|---|---|---|
| `/api/contacts` | GET, POST, PUT | CRUD contactos (PUT = upsert masivo) — `Contact`, `Company` |
| `/api/contacts/[id]` | DELETE | Eliminar contacto |
| `/api/companies` | GET, POST, PUT | CRUD empresas |
| `/api/companies/[id]` | DELETE | Eliminar empresa |
| `/api/companies/[id]/smtp` | GET, PATCH | Config SMTP por empresa |
| `/api/companies/[id]/smtp/test` | POST | Correo de prueba SMTP |
| `/api/companies/[id]/imap` | GET, PATCH | Config IMAP por empresa |
| `/api/pipelines` | GET | Lista de pipelines |
| `/api/stages` | POST | Crear etapa |
| `/api/deals` | GET, POST, PATCH | CRUD deals / mover de etapa (Kanban) |
| `/api/deals/[id]` | GET, DELETE | Detalle / eliminar |
| `/api/deals/archived` | GET | Historial de archivados |
| `/api/deals/[id]/activities` | POST, DELETE | Actividades del deal |
| `/api/deals/[id]/appointments` | GET, POST, DELETE | Citas del deal |
| `/api/deals/[id]/payments` | POST, PATCH | Pagos del deal |
| `/api/deals/[id]/proposals` | POST, PATCH, DELETE | Propuestas del deal |
| `/api/deals/[id]/stripe` | POST | Checkout Session de Stripe para un pago |
| `/api/clients` | GET, POST | Clientes (mensualidades) |
| `/api/clients/[id]` | PATCH, DELETE | Editar/eliminar cliente |
| `/api/clients/[id]/payments` | GET, POST, PATCH | Pagos del cliente |
| `/api/clients/[id]/vault` | GET, POST, PATCH, DELETE | Bóveda de credenciales |
| `/api/sales/metrics` | GET | Métricas de ventas |
| `/api/search` | GET | Búsqueda global (Client, Company, Contact, Deal, Form, KbPage, Project, Task) |
| `/api/notifications` | GET | Notificaciones in-app |
| `/api/notifications/[id]` | PATCH, DELETE | Marcar leída / eliminar |
| `/api/notifications/read-all` | PATCH | Marcar todas leídas |
| `/api/dashboard-preferences` | GET, PATCH | Widgets/tabs del dashboard |
| `/api/profile` | GET, PATCH | Perfil y cambio de password |

### Proyectos y tareas
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/projects` | GET, POST | Lista/crear proyectos |
| `/api/projects/[id]` | GET, PUT, DELETE | Detalle/editar/eliminar |
| `/api/projects/[id]/activity` | GET, POST | Bitácora |
| `/api/projects/[id]/activity/[activityId]` | DELETE | Eliminar entrada |
| `/api/tasks` | GET, POST, PATCH | CRUD tareas |
| `/api/tasks/[id]` | DELETE | Eliminar tarea |
| `/api/task-categories` | GET, POST | Categorías |
| `/api/task-categories/[id]` | PUT, DELETE | Editar/eliminar categoría |

### Correo (IMAP/SMTP)
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/emails` | GET | Bandeja (inbox/sent/archive) |
| `/api/emails/[id]` | GET, PATCH, DELETE | Detalle, leído/archivar, eliminar |
| `/api/emails/[id]/attachments/[attachmentId]` | GET | Descargar adjunto |
| `/api/emails/send` | POST | Enviar vía SMTP de la empresa |
| `/api/emails/unread-count` | GET | Contador de no leídos |
| `/api/emails/fix-corrupted` | DELETE | Limpieza de correos corruptos |

### Campañas de email (drip)
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/campaigns` | GET, POST | Lista/crear campaña con pasos de secuencia |
| `/api/campaigns/[id]` | GET, DELETE | Detalle con logs / eliminar |
| `/api/campaigns/send` | POST | Encolar envío a contactos |

### Formularios
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/forms` | GET, POST | Lista/crear |
| `/api/forms/[id]` | GET, PUT, DELETE | Editar (campos, acento, lógica) |
| `/api/forms/[id]/contacts` | GET | Contactos captados |
| `/api/forms/[id]/variants` | GET, POST | Variantes A/B |
| `/api/forms/[id]/variants/[variantId]` | PUT, DELETE | Editar/eliminar variante |

### Citas y disponibilidad
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/appointment-types` | GET, POST | Tipos de cita |
| `/api/appointment-types/[id]` | GET, PUT, DELETE | Editar tipo |
| `/api/appointments` | GET | Lista de citas |
| `/api/appointments/[id]` | PATCH, DELETE | Confirmar/completar/cancelar |
| `/api/availability` | GET, POST | Horario semanal |
| `/api/availability/[id]` | GET, PUT, DELETE | Editar horario |
| `/api/availability/blocked` | GET, POST | Tiempos bloqueados |
| `/api/availability/blocked/[id]` | DELETE | Eliminar bloqueo |
| `/api/availability/extended` | GET, POST | Disponibilidad en fechas especiales |
| `/api/availability/extended/[id]` | DELETE | Eliminar disponibilidad extendida |

### Cotizaciones
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/quotes` | GET, POST | Lista/crear |
| `/api/quotes/[id]` | GET, PUT, DELETE | Detalle/editar/eliminar |
| `/api/quotes/[id]/send` | POST | Enviar por email |
| `/api/quotes/[id]/pago` | POST | Registrar pago manual |
| `/api/quotes/[id]/stripe` | POST | Checkout Session para la cotización |
| `/api/quote-settings` | GET, PUT | Config fiscal/banco/IVA |

### Knowledge base
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/kb` | GET, POST | Árbol/crear páginas |
| `/api/kb/[id]` | GET, PATCH, DELETE | Editar página |
| `/api/kb/move` | POST | Mover página en el árbol |
| `/api/kb/[id]/revisions` | GET | Historial de revisiones |
| `/api/kb/[id]/revisions/[revisionId]` | GET | Ver una revisión |
| `/api/kb/[id]/share` | GET, POST, PATCH | Compartir (token público, rol) |
| `/api/kb/[id]/suggestions` | GET | Sugerencias recibidas |
| `/api/kb/[id]/suggestions/[suggestionId]` | PATCH | Aceptar/rechazar sugerencia |
| `/api/kb/relations` | GET | Relaciones globales |
| `/api/kb/[id]/relations` | GET, POST | Relaciones de una página |
| `/api/kb/[id]/relations/[relId]` | DELETE | Eliminar relación |
| `/api/kb/search-entities` | GET | Buscador de entidades CRM para enlazar |

### IA
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/assistant/chat` | POST | Chat con asistente (OpenRouter/Chatbase, action cards) |
| `/api/assistant/conversations` | GET, POST | Lista/crear conversaciones |
| `/api/assistant/conversations/[id]` | GET, DELETE | Cargar/eliminar |
| `/api/ai/draft-email` | POST | Redactar correo con IA |
| `/api/ai/draft-document` | POST | Redactar documento con IA |
| `/api/settings/ai-models` | GET, POST, PATCH | Modelos IA personalizados |
| `/api/settings/ai-models/[id]` | PUT, DELETE | Editar/eliminar modelo |
| `/api/settings/ai-models/builtin` | PATCH | Seleccionar modelo built-in de la org |

### Ajustes y digest
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/settings` | GET, PATCH | Organización + CallMeBot |
| `/api/settings/theme` | GET, PATCH | Tema del usuario |
| `/api/settings/digest` | GET, PATCH | Programación del resumen WhatsApp |
| `/api/settings/digest/test` | POST | Digest de prueba |

### Google Calendar (OAuth)
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/google-calendar/auth` | GET | Inicia flujo OAuth |
| `/api/google-calendar/callback` | GET | Callback, guarda tokens |
| `/api/google-calendar/status` | GET | Estado de conexión |
| `/api/google-calendar/disconnect` | DELETE | Desconectar |

### Gestión de contenido
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/content/clients` | GET, POST | Clientes de contenido |
| `/api/content/clients/[id]` | GET, PATCH, DELETE | Editar cliente |
| `/api/content/clients/[id]/items` | GET, POST | Ítems del calendario |
| `/api/content/items/[id]` | PATCH, DELETE | Editar ítem |
| `/api/content/clients/[id]/phones` | POST | Añadir teléfono de notificación |
| `/api/content/phones/[id]` | DELETE | Eliminar teléfono |
| `/api/content/clients/[id]/ai-ideas` | POST | Ideas de contenido con IA |
| `/api/content/clients/[id]/notify` | POST | Notificar al cliente por WhatsApp |

### APIs públicas (sin sesión, por token/ID)
| Endpoint | Métodos | Propósito |
|---|---|---|
| `/api/public/forms/[id]` | GET | Definición pública del formulario |
| `/api/public/forms/[id]/submit` | POST | Envío → crea contacto (+ cita/tarea/email según lógica) |
| `/api/public/appointment-types/[id]` | GET | Tipo de cita público |
| `/api/public/appointment-types/[id]/slots` | GET | Slots disponibles |
| `/api/public/appointment-types/[id]/book` | POST | Reservar cita → contacto + cita + tarea |
| `/api/public/book/[token]` | GET | Datos de reserva por token de deal |
| `/api/public/book/[token]/submit` | POST | Confirmar reserva ligada a deal |
| `/api/public/content/[token]` | GET | Calendario de contenido público |
| `/api/public/quotes/[token]` | GET | Cotización pública + eventos |
| `/api/public/quotes/[token]/accept` | POST | Aceptar cotización |
| `/api/public/quotes/[token]/reject` | POST | Rechazar cotización |
| `/api/public/quotes/[token]/receipt` | POST | Subir comprobante de pago |
| `/api/public/kb/share/[token]` | GET | Árbol público del KB |
| `/api/public/kb/share/[token]/pages/[pageId]` | GET, PATCH | Ver página; PATCH = editar si rol editor |
| `…/pages/[pageId]/suggestions` | GET, POST | Sugerencias públicas |
| `…/suggestions/[suggestionId]` | PATCH, DELETE | Gestionar sugerencia |

---

## Webhook de Stripe — `POST /api/webhooks/stripe`

Verifica la firma probando **múltiples webhook secrets** (los de `QuoteSettings` por organización + el de entorno, vía `getStripeWebhookSecrets()`). Sin secrets configurados, parsea sin verificar (modo dev). Maneja `checkout.session.completed`: marca `Payment` como `RECIBIDO` (vía `metadata.paymentId`) y procesa pagos de cotizaciones (`metadata.quoteId`).

## Cron jobs — `GET /api/cron/*`

Todos requieren `Authorization: Bearer <CRON_SECRET>` en producción (configurados externamente en cron-job.org; documentados en `CRON.md`). `fetch-emails` además acepta sesión de usuario.

| Endpoint | Frecuencia | Propósito |
|---|---|---|
| `/api/cron/fetch-emails` | 5 min | Descarga correos IMAP, detecta spam, notificaciones |
| `/api/cron/send-scheduled` | 5 min | Envía correos programados (`scheduledAt`) |
| `/api/cron/process-emails` | 5 min | Despacha cola de campañas drip (logs PENDING) |
| `/api/cron/followups` | 15 min | Recordatorios WhatsApp de follow-ups de deals |
| `/api/cron/appointment-reminders` | 15 min | Recordatorios de citas (WhatsApp/email) |
| `/api/cron/digest` | 15 min | Resumen CRM por WhatsApp (IA + CallMeBot) |
| `/api/cron/google-calendar-reminders` | 15 min | Recordatorios de eventos de Google Calendar |
| `/api/cron/content-reminders` | cada 15 min | Avisa piezas con recordatorio activo (mismo día o N días antes) |
| `/api/cron/auto-archive` | (no documentado en CRON.md) | Auto-archiva deals según `Organization.autoArchiveDays` |

## Servidor MCP — `/mcp`

Rewrite a `/api/[transport]` con `mcp-handler` (Streamable HTTP; GET devuelve heartbeats para compatibilidad con ChatGPT). Server info: `noxthy-crm@1.0.0`. ~30 herramientas en `src/lib/mcp/tools.ts` (`registerCrmTools`), scopeadas a `MCP_ORGANIZATION_ID`.

**Auth dual:**
1. OAuth 2.1 (authorization code + PKCE S256, payloads firmados con HMAC en `src/lib/mcp/oauth.ts`):
   - `GET /.well-known/oauth-authorization-server` — metadata RFC 8414
   - `GET /.well-known/oauth-protected-resource` — metadata RFC 9728
   - `POST /api/oauth/register` — Dynamic Client Registration RFC 7591
   - `POST /api/oauth/authorize` — consentimiento (requiere sesión CRM) + emisión de code
   - `POST /api/oauth/token` — grants `authorization_code` (PKCE) y `refresh_token`
2. API key estática `Bearer <MCP_API_KEY>` (comparación `timingSafeEqual`).

Todas las respuestas 401 incluyen `WWW-Authenticate` con `resource_metadata`, y los endpoints llevan headers CORS (`src/lib/mcp/cors.ts`).

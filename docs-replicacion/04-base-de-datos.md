# 04 — Estructura de la base de datos

## Configuración general

- **Proveedor:** MySQL/MariaDB (`provider = "mysql"` en `prisma/schema.prisma`).
- **Conexión:** variable de entorno `DATABASE_URL`.
- **Cliente:** `prisma-client-js`, Prisma 6.19.2.
- **Migraciones:** el proyecto usa **`prisma db push`**; `prisma/migrations/` está prácticamente vacía (no hay historial real).
- **Convenciones:** todos los ids son `String @id @default(cuid())`; casi todo modelo tiene `createdAt`/`updatedAt`; el multi-tenancy es por `organizationId` con `onDelete: Cascade` hacia `Organization`.
- **Totales:** 38 modelos, 14 enums (~1465 líneas de schema).

## Diagrama textual de relaciones

```
User ──< OrganizationMember >── Organization (tenant raíz; todo cuelga de ella con Cascade)
User ──1:1── CallMeBot
User+Org ──< DashboardPreference / DigestSchedule / GoogleCalendarReminderLog
User+Org ──< AiConversation ──< AiMessage
Organization ──1:1── GoogleCalendarToken
Organization ──1:1── QuoteSettings ──?── Company (defaultSender)

Organization ──< Company ──< Contact
Company (SMTP/IMAP) ──< Email ──< EmailAttachment
Company ──< EmailCampaign ──< CampaignStep ┐
Contact ──< EmailLog ─────────────────────┘ (stepId opcional)
Company ──< Form ──< FormField ; Form ──< FormVariant ──< Contact (sourceVariant)
Form ──?── EmailCampaign (welcomeEmail / targetForm) ; Form ──?── AppointmentType ; Form ──?── Project

Organization ──< Pipeline ──< Stage ──< Deal
Deal ──?── Pipeline / Company / Contact
Deal ──< ActivityLog / Proposal(──< ProposalItem) / Payment(Stripe) / Appointment

Organization ──< Project ──?── Company (clientCompany + emailAccountCompany) / Contact / Client
Project ──< ProjectActivity / Task / Form / EmailCampaign

Task ──> User (assignedTo, obligatorio) ; ──?── Deal/Contact/Project/TaskCategory/Company/Form/Appointment
Organization ──< TaskCategory ──?── Company

Organization ──< AvailabilitySchedule ──< AvailabilitySlot
AvailabilitySchedule ──< AppointmentType ──< Appointment ──?── Contact/Deal
Organization ──< BlockedTime / ExtendedAvailability

Organization ──< Client (mensualidades) ──< ClientPayment / ClientVaultEntry
Organization ──< Notification
Organization ──< KbPage ──< KbPageRevision / KbSuggestion / KbPageRelation
KbPage ──1:1── KbShare ; KbPage ──autorrelación padre/hijos
Organization ──< CustomAiModel
Organization ──< Quote ──< QuoteItem / QuoteEvent ; Quote ──?── Contact / Company(sender)
Organization ──< ContentClient ──< ContentPhone / ContentItem
```

---

## Núcleo / autenticación

### User
Usuarios de la app.
`id`, `name String?`, `email String @unique`, `passwordHash String`, `crmTheme String @default("noxy-indigo")`, timestamps.
Relaciones: `organizations OrganizationMember[]`, `tasks Task[]`, `callMeBot CallMeBot?`, `digestSchedules`, `googleCalendarReminderLogs`, `activityLogs`, `aiConversations`, `dashboardPreferences`, `projectActivities`.

### Organization
Tenant principal.
`id`, `name`, `timezone String @default("America/Cancun")`, `autoArchiveDays Int @default(30)`, `hiddenAiModels String @default("[]")`, timestamps.
Todas las demás entidades cuelgan de aquí con Cascade (companies, contacts, emails, pipelines, deals, tasks, campaigns, forms, projects, appointments, clients, kbPages, quotes, contentClients, etc.). 1:1 con `GoogleCalendarToken` y `QuoteSettings`.

### OrganizationMember
Membresía usuario↔organización.
`id`, `role Role @default(MEMBER)`, `userId`, `organizationId`; `@@unique([userId, organizationId])`.

> Enum **Role**: `OWNER | ADMIN | MEMBER`

---

## Preferencias y notificaciones de usuario

### DashboardPreference
Layout del dashboard por usuario/org. `id`, `userId`, `organizationId`, `widgets Json`, `tabs Json`; `@@unique([userId, organizationId])`.

### CallMeBot
Integración WhatsApp (CallMeBot) por usuario. `id`, `phone`, `apiKey`, `notificationEmail String?`, `userId @unique` (1:1, Cascade).

### DigestSchedule
Programación de resúmenes (digest WhatsApp/email).
`id`, `enabled Boolean @default(false)`, `frequency String @default("daily")` (daily|weekly|monthly|custom), `customDays String?` (JSON), `weeklyDay Int @default(1)`, `monthlyDay Int @default(1)`, `hour Int @default(8)`, `minute Int @default(0)`, `lastSentAt DateTime?`, `includeGoogleCalendar Boolean @default(true)`, `includeUnreadEmails Boolean @default(true)`, `calendarRemindDayBefore Boolean @default(true)`, `calendarRemindMinutesBefore Int @default(15)`, `aiModelId String @default("chatbase")`; `userId` + `organizationId`, `@@unique([userId, organizationId])`.

### GoogleCalendarReminderLog
Dedupe de recordatorios enviados. `id`, `googleEventId`, `userId`, `organizationId`, `reminderType String` (day_before|minutes_before), `eventStart DateTime`, `sentAt @default(now())`; `@@unique([googleEventId, userId, reminderType])`.

---

## Proyectos

### Project
Proyectos internos (agrupan formularios, campañas, tareas, docs, correo).
`id`, `name`, `description String? @db.Text`, `icon String?`, timestamps.
Relaciones: `organizationId` (Cascade); opcionales SetNull: `companyId` → Company ("ProjectClientCompany"), `contactId`, `clientId`, `emailAccountCompanyId` → Company ("ProjectEmailAccount"). Hijos: `forms`, `campaigns`, `tasks`, `activities ProjectActivity[]`.

### ProjectActivity
Bitácora del proyecto.
`id`, `type ProjectActivityType`, `description @db.Text`, `icon String?`, `tags Json?`, `eventDate DateTime?` (solo NOTE), `projectId` (Cascade), `organizationId` (Cascade), `createdById String?` → User (SetNull).

> Enum **ProjectActivityType**: `NOTE | PROJECT_CREATED | TASK_CREATED | TASK_COMPLETED | ASSOCIATIONS_UPDATED`

---

## Empresas y contactos

### Company
Empresa cliente; **también actúa como cuenta de correo** (SMTP/IMAP propios).
`id`, `name`, `website String?`, `industry String?`, timestamps.
SMTP: `smtpHost`, `smtpPort Int?`, `smtpUser`, `smtpPass`, `smtpFromEmail String?`, `smtpSecure Boolean? @default(true)`.
IMAP: `imapHost`, `imapPort Int?`, `imapUser`, `imapPass`, `imapSecure Boolean? @default(true)`, `imapLastUid Int? @default(0)`, `imapSpamLastUid Int? @default(0)`.
Relaciones: `organizationId` (Cascade); hijos: contacts, deals, campaigns, forms, taskCategories, tasks, clients, emails, appointmentTypes; `clientProjects` y `emailAccountProjects` (relaciones nombradas con Project); `quotesAsSender`, `quoteSettingsAsDefault`.

### Contact
Contacto/lead.
`id`, `firstName`, `lastName String?`, `email String?`, `phone String?`, `source String?` (p. ej. "Manual", "Form: X"), timestamps.
Relaciones: `organizationId` (Cascade), `companyId String?` (SetNull), `sourceFormId String?` → Form ("FormContacts", SetNull), `sourceVariantId String?` → FormVariant ("VariantContacts", SetNull). Hijos: deals, tasks, emailLogs, appointments, clients, quotes, `associatedProjects Project[]`.

---

## Pipeline de ventas

### Pipeline
`id`, `name`, `organizationId` (Cascade), `stages Stage[]`, `deals Deal[]`.

### Stage
Etapa del pipeline.
`id`, `name`, `order Int`, `color String @default("#6B7280")`, `isWon Boolean @default(false)`, `isLost Boolean @default(false)`, `pipelineId` (Cascade), `deals Deal[]`.

### Deal
Oportunidad de venta.
`id`, `title`, `value Float? @default(0)`, `currency String @default("USD")`, `source LeadSource?`, `followUpAt DateTime?`, `lostReason String?`, `probability Int @default(50)`, `notes @db.Text?`, `bookingToken String? @unique @default(cuid())`, `allowedBookingTypes String? @db.Text`, `isArchived Boolean @default(false)`, `archivedAt DateTime?`, timestamps.
Relaciones: `organizationId` (Cascade), `stageId` (**obligatorio**, Cascade), opcionales SetNull: `pipelineId`, `companyId`, `contactId`. Hijos: tasks, activities, proposals, payments, appointments.

> Enum **LeadSource**: `WHATSAPP | REFERIDO | LINKEDIN | VISITA | EMAIL_FRIO | FORMULARIO | INSTAGRAM | OTRO`

### ActivityLog
Actividad sobre un deal.
`id`, `type ActivityType`, `description @db.Text`, `dealId` (Cascade), `organizationId` (Cascade), `createdById String?` → User (SetNull).

> Enum **ActivityType**: `LLAMADA | WHATSAPP | VISITA | EMAIL | NOTA | PROPUESTA_ENVIADA | REUNION | OTRO`

### Proposal / ProposalItem
Propuesta comercial sobre un deal.
Proposal: `id`, `title`, `status ProposalStatus @default(BORRADOR)`, `notes @db.Text?`, `validUntil DateTime?`, `dealId` (Cascade), `organizationId` (Cascade), `items ProposalItem[]`.
ProposalItem: `id`, `description`, `quantity Float @default(1)`, `unitPrice Float`, `order Int @default(0)`, `proposalId` (Cascade).

> Enum **ProposalStatus**: `BORRADOR | ENVIADA | ACEPTADA | RECHAZADA`

### Payment
Pago ligado a deal (con Stripe).
`id`, `amount Float`, `currency @default("USD")`, `type PaymentType`, `status PaymentStatus @default(PENDIENTE)`, `method String?`, `notes @db.Text?`, `dueDate DateTime?`, `receivedAt DateTime?`, `stripePaymentLinkId String?`, `stripePaymentLinkUrl String?`, `createdAt`; `dealId` (Cascade), `organizationId` (Cascade).

> Enum **PaymentType**: `ANTICIPO | SALDO | COMPLETO | MENSUALIDAD`
> Enum **PaymentStatus**: `PENDIENTE | RECIBIDO | CANCELADO` (compartido con ClientPayment)

---

## Tareas

### Task
`id`, `title`, `description @db.Text?`, `dueDate DateTime?`, `isCompleted Boolean @default(false)`, timestamps.
Relaciones: `organizationId` (Cascade), `assignedToId` → User (**obligatorio**, Cascade); opcionales SetNull: `dealId`, `contactId`, `projectId`, `categoryId` → TaskCategory, `companyId`, `formId`, `appointmentId`.

### TaskCategory
`id`, `name`, `color String? @default("#3B82F6")`, `organizationId` (Cascade), `companyId String?` (Cascade), `tasks Task[]`.

---

## Email marketing / campañas drip

### EmailCampaign
Campaña (el mensaje 1 vive en subject/body; los siguientes en `CampaignStep`).
`id`, `subject`, `body @db.LongText`, `status CampaignStatus @default(DRAFT)`, `sentAt DateTime?`, `scheduledAt DateTime?` (null = inmediato), timestamps.
Relaciones: `organizationId` (Cascade), `companyId` (**obligatorio** — empresa remitente con SMTP, Cascade), `projectId String?` (SetNull), `targetFormId String?` → Form ("FormTargetCampaigns", SetNull); `formsAsWelcome Form[]` ("WelcomeEmail"), `logs EmailLog[]`, `steps CampaignStep[]`.

> Enum **CampaignStatus**: `DRAFT | SENDING | COMPLETED`

### CampaignStep
Mensajes 2, 3, 4… de la secuencia drip.
`id`, `order Int`, `delayDays Int @default(1)`, `subject`, `body @db.LongText`, `campaignId` (Cascade), `logs EmailLog[]`.

### EmailLog
Envío individual (la cola del cron).
`id`, `status EmailLogStatus @default(PENDING)`, `errorReason @db.Text?`, `sentAt DateTime?`, `scheduledAt DateTime?` (a partir de cuándo el cron puede enviar), `campaignId` (Cascade), `contactId` (Cascade), `stepId String?` → CampaignStep (SetNull; null = mensaje 1). Índice `[status, scheduledAt]`.

> Enum **EmailLogStatus**: `PENDING | SENT | FAILED | OPENED`

---

## Formularios públicos

### Form
Formulario captador de leads.
`id`, `organizationId` (Cascade), `companyId` (**obligatorio**, Cascade), `name`, `description @db.Text?`, `isActive Boolean @default(true)`, `successAction String @default("MESSAGE")` (MESSAGE|REDIRECT), `successMessage @db.Text?`, `redirectUrl String?`, `accentColor String?`, `backgroundColor String?`, timestamps.
Relaciones: `welcomeEmailId String?` → EmailCampaign ("WelcomeEmail", SetNull), `projectId String?` (SetNull), `appointmentTypeId String?` → AppointmentType ("FormAppointmentType", SetNull). Hijos: `fields FormField[]`, tasks, contacts, targetedCampaigns, `variants FormVariant[]`.

### FormField
Campo del formulario.
`id`, `formId` (Cascade), `type String` (TEXT, EMAIL, PHONE, NUMBER, TEXTAREA, SELECT, CHECKBOX, RADIO, DATE), `label`, `name` (interno), `placeholder String?`, `isRequired Boolean @default(false)`, `options String? @db.Text` (JSON array para select/radio), `order Int`.

### FormVariant
Variante del formulario (A/B testing o versiones).
`id`, `formId` (Cascade), `name`, `description @db.Text?`, `isActive Boolean @default(true)`, `contacts Contact[]` ("VariantContacts").

---

## Calendario / citas (booking)

### AvailabilitySchedule / AvailabilitySlot
Horario semanal.
AvailabilitySchedule: `id`, `organizationId` (Cascade), `name`, `timezone @default("America/Mexico_City")`, `isDefault Boolean @default(false)`, `slots`, `appointmentTypes`.
AvailabilitySlot: `id`, `scheduleId` (Cascade), `dayOfWeek Int` (0=domingo), `startTime String` ("09:00"), `endTime String` ("17:00"), `isAvailable Boolean @default(true)`.

### BlockedTime
Bloqueo de agenda. `id`, `organizationId` (Cascade), `title String?`, `start DateTime`, `end DateTime`.

### ExtendedAvailability
Disponibilidad extra en fecha puntual. `id`, `organizationId` (Cascade), `title String?`, `date DateTime`, `startTime String`, `endTime String`.

### AppointmentType
Tipo de cita agendable (tipo Calendly).
`id`, `organizationId` (Cascade), `scheduleId` (Cascade), `companyId String?` (SetNull), `name`, `description @db.Text?`, `duration Int` (minutos), `color @default("#3B82F6")`, `location String?`, `slug`, `isActive Boolean @default(true)`, `bufferAfter Int @default(0)`, `maxAdvanceDays Int @default(30)`, `appointments`, `forms`; `@@unique([organizationId, slug])`.

### Appointment
Cita agendada.
`id`, `appointmentTypeId` (Cascade), `organizationId` (Cascade), `contactId String?` (SetNull), `dealId String?` (SetNull), `startTime`, `endTime`, `timezone @default("America/Mexico_City")`, `status String @default("CONFIRMED")`, `guestName`, `guestEmail`, `guestPhone String?`, `notes @db.Text?`, `cancelToken String? @unique`, `googleEventId String?`, `reminderSent1h/10m/5m Boolean @default(false)`, `tasks Task[]`.

### GoogleCalendarToken
OAuth de Google Calendar por org (1:1). `id`, `organizationId @unique` (Cascade), `accessToken @db.Text`, `refreshToken @db.Text?`, `expiresAt DateTime?`, `calendarId @default("primary")`.

---

## Buzón de correo (IMAP interno)

### Email
Correo recibido/enviado.
`id`, `messageId String? @db.VarChar(500)`, `uid Int?` (UID IMAP), `subject @db.Text`, `fromAddress`, `fromName String?`, `toAddress @db.Text`, `ccAddress @db.Text?`, `bodyText/bodyHtml @db.LongText?`, `type EmailType @default(RECEIVED)`, `isRead/isArchived/isSpam Boolean @default(false)`, `receivedAt @default(now())`, `scheduledAt DateTime?` (envío programado), `companyId` (Cascade), `organizationId` (Cascade), `attachments EmailAttachment[]`.

> Enum **EmailType**: `RECEIVED | SENT`

### EmailAttachment
`id`, `filename`, `contentType`, `size Int`, `content Bytes @db.LongBlob`, `emailId` (Cascade).

---

## Clientes recurrentes (mensualidades)

### Client
Cliente con facturación mensual.
`id`, `name`, `monthlyFee Float`, `currency @default("USD")`, `startDate DateTime`, `billingDay Int @default(1)`, `autoMarkPaid Boolean @default(false)`, `notes @db.Text?`, `isActive Boolean @default(true)`; contacto directo: `contactName String?`, `phone String?`, `phoneCode String? @default("+52")`, `email String?`.
Relaciones: `organizationId` (Cascade), opcionales SetNull: `companyId`, `contactId`; hijos: `payments ClientPayment[]`, `vaultEntries`, `projects`.

### ClientPayment
Mensualidad. `id`, `amount Float`, `currency @default("USD")`, `status PaymentStatus @default(PENDIENTE)`, `month Int`, `year Int`, `notes @db.Text?`, `dueDate DateTime?`, `receivedAt DateTime?`; `clientId` (Cascade), `organizationId` (Cascade).

### ClientVaultEntry
Bóveda de credenciales del cliente. `id`, `type String @default("credential")` (credential|social|note), `label`, `username String?`, `password @db.Text?`, `url @db.Text?`, `notes @db.Text?`; `clientId` (Cascade), `organizationId` (Cascade).

> ⚠️ Las contraseñas de la bóveda se guardan en texto plano (`@db.Text`). Considera cifrado a nivel de aplicación si lo reutilizas.

---

## Notificaciones in-app

### Notification
`id`, `type NotificationType`, `title`, `body @db.Text?`, `link String?`, `isRead Boolean @default(false)`, `entityId String?`, `organizationId` (Cascade).

> Enum **NotificationType**: `NEW_EMAIL | NEW_CONTACT | NEW_FORM_LEAD | APPOINTMENT_REMINDER`

---

## Knowledge Base (wiki)

### KbPage
Página/carpeta del wiki.
`id`, `organizationId` (Cascade), `title @default("Sin título")`, `emoji String?`, `iconColor String?`, `iconBg String?`, `content @db.LongText?`, autorrelación `parentId String?` ("KbChildren", SetNull), `isFolder Boolean @default(false)`, `isPublished Boolean @default(false)`, `markdownTheme @default("minimal")`, `sortOrder Int @default(0)`; hijos: relations, `share KbShare?`, suggestions, revisions.

### KbPageRevision
Historial de revisiones. `id`, `pageId` (Cascade), `organizationId`, `savedById String?`, snapshot de title/emoji/colors/content/markdownTheme/isPublished, `createdAt`.

### KbShare
Enlace público por página. `id`, `organizationId`, `pageId @unique` (Cascade), `token @unique @default(cuid())`, `role KbShareRole @default(READER)`, `isEnabled Boolean @default(true)`, `includeChildren Boolean @default(true)`.

### KbSuggestion
Sugerencia de edición externa. `id`, `organizationId`, `pageId` (Cascade), `authorName`, `authorEmail String?`, `type KbSuggestionType`, `startOffset/endOffset Int?`, `selectedText/suggestedText/comment @db.Text?`, `status KbSuggestionStatus @default(PENDING)`, `resolvedBy String?`, `resolvedAt DateTime?`.

### KbPageRelation
Vínculo página↔entidad CRM. `id`, `pageId` (Cascade), `entityType KbRelationType`, `entityId`, `entityLabel`; `@@unique([pageId, entityType, entityId])`.

> Enum **KbRelationType**: `PROJECT | FORM | CLIENT | COMPANY | APPOINTMENT_TYPE | CONTACT | DEAL`
> Enum **KbShareRole**: `READER | EDITOR | COMMENTATOR`
> Enum **KbSuggestionType**: `COMMENT | REPLACE | DELETE | INSERT`
> Enum **KbSuggestionStatus**: `PENDING | ACCEPTED | REJECTED`

---

## IA

### AiConversation / AiMessage
AiConversation: `id`, `title @default("Nueva conversación")`, `userId` (Cascade), `organizationId` (Cascade), `messages`.
AiMessage: `id`, `conversationId` (Cascade), `role String`, `content @db.Text`.

### CustomAiModel
Modelos IA personalizados por org. `id`, `organizationId` (Cascade), `modelId`, `name`, `group @default("Personalizados")`, `description @default("")`, `tags @default("[]")`, `enabled Boolean @default(true)`; `@@unique([organizationId, modelId])`.

---

## Cotizaciones

### QuoteSettings
Configuración por org (1:1).
`id`, `organizationId @unique` (Cascade); fiscales: `businessName`, `logoUrl`, `taxId`, `address`, `phone`, `email`, `website`; bancarios: `bankName`, `bankBeneficiary`, `bankClabe`, `bankSwift`, `bankReference`; defaults: `defaultTaxRate Float @default(16)`, `defaultCurrency @default("MXN")`, `defaultTerms @db.Text?`; `defaultSenderCompanyId String?` → Company (SetNull); Stripe: `stripeSecretKey`, `stripeWebhookSecret @db.Text?`; `quoteCounter Int @default(0)`.

### Quote
Cotización con folio, vista pública y cobro Stripe/transferencia.
`id`, `folioNumber Int`, `folio` (`@@unique([organizationId, folio])`, formato `COT-YYYY-NNNN`), `status QuoteStatus @default(BORRADOR)`, `currency @default("MXN")`, `issuedAt @default(now())`, `validUntil DateTime?`; cliente: `contactId String?` (SetNull) + captura directa `clientName/clientCompany/clientEmail/clientPhone/clientAddress`; totales: `taxRate @default(16)`, `subtotal/taxAmount/total Float @default(0)`; `notes/terms @db.Text?`; `senderCompanyId String?` → Company (SetNull); público/cobro: `publicToken @unique @default(cuid())`, `stripePaymentLinkId/Url`, `paymentMethod String?` (stripe|transferencia), `acceptedAt`, `paidAt`, `transferReference`; pago dividido: `splitPayment Boolean @default(false)`, `depositPercent @default(50)`, `stripeDepositLinkId/Url`, `stripeFinalLinkId/Url`, `depositPaidAt`, `finalPaidAt`; `notifyEmail String?`, `createdById String?`; `organizationId` (Cascade); hijos: items, events.

> Enum **QuoteStatus**: `BORRADOR | ENVIADA | ACEPTADA | PARCIAL | PAGADA | VENCIDA | RECHAZADA`

### QuoteItem
`id`, `description @db.Text`, `quantity @default(1)`, `unitPrice @default(0)`, `discount @default(0)` (%), `total @default(0)`, `order @default(0)`, `quoteId` (Cascade).

### QuoteEvent
Historial de la cotización. `id`, `type QuoteEventType`, `description @db.Text?`, `actor String?` (crm|cliente), `quoteId` (Cascade), `organizationId` (Cascade).

> Enum **QuoteEventType**: `CREADA | EDITADA | ENVIADA | VISTA | ACEPTADA | RECHAZADA | PAGO_STRIPE | PAGO_ANTICIPO | PAGO_FINAL | COMPROBANTE_SUBIDO | PAGO_CONFIRMADO | VENCIDA | NOTA`

---

## Gestión de contenido (RRSS)

### ContentClient
Cliente/marca de contenidos. `id`, `name`, `kind @default("marca")` (cliente|marca), `description/context @db.Text?`, `publicToken @unique @default(cuid())`, `isActive Boolean @default(true)`, `organizationId` (Cascade); hijos: phones, items.

### ContentPhone
Teléfono CallMeBot del cliente de contenido. `id`, `label String?`, `phone`, `apiKey`, `clientId` (Cascade).

### ContentItem
Pieza del calendario de contenido. `id`, `date DateTime`, `type @default("video")` (video|reel|flyer|historia|entrega|edicion), `title`, `time String?`, `hook/hooksAlt/script/caption/cta/tips/note @db.Text?`, `notifiedAt DateTime?`; `clientId` (Cascade), `organizationId` (Cascade).

---

## Índice de los 14 enums

| Enum | Valores |
|---|---|
| `Role` | OWNER, ADMIN, MEMBER |
| `ProjectActivityType` | NOTE, PROJECT_CREATED, TASK_CREATED, TASK_COMPLETED, ASSOCIATIONS_UPDATED |
| `LeadSource` | WHATSAPP, REFERIDO, LINKEDIN, VISITA, EMAIL_FRIO, FORMULARIO, INSTAGRAM, OTRO |
| `ActivityType` | LLAMADA, WHATSAPP, VISITA, EMAIL, NOTA, PROPUESTA_ENVIADA, REUNION, OTRO |
| `ProposalStatus` | BORRADOR, ENVIADA, ACEPTADA, RECHAZADA |
| `PaymentType` | ANTICIPO, SALDO, COMPLETO, MENSUALIDAD |
| `PaymentStatus` | PENDIENTE, RECIBIDO, CANCELADO |
| `CampaignStatus` | DRAFT, SENDING, COMPLETED |
| `EmailLogStatus` | PENDING, SENT, FAILED, OPENED |
| `EmailType` | RECEIVED, SENT |
| `NotificationType` | NEW_EMAIL, NEW_CONTACT, NEW_FORM_LEAD, APPOINTMENT_REMINDER |
| `KbRelationType` | PROJECT, FORM, CLIENT, COMPANY, APPOINTMENT_TYPE, CONTACT, DEAL |
| `KbShareRole` / `KbSuggestionType` / `KbSuggestionStatus` | ver sección KB |
| `QuoteStatus` / `QuoteEventType` | ver sección Cotizaciones |

## Datos iniciales que la app crea sola

No hay seed. Al registrar el primer usuario (`POST /api/auth/register`), se crean en una transacción: `User` + `Organization` + `OrganizationMember` (OWNER) + `Pipeline` "Sales Pipeline" + 5 `Stage`: **Lead** (#6B7280) → **Contactado** (#3B82F6) → **Propuesta** (#F59E0B) → **Ganado** (isWon, #10B981) → **Perdido** (isLost, #EF4444). Los scripts de la raíz (`update_stages.ts`, `migrate_forms.mjs`, `clear_stale_stripe_links.mjs`) solo aplican a datos legacy.

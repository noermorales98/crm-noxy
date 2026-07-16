# Conteo de correos sin leer en el Resumen por WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the organization's unread-email count to the existing "Resumen por WhatsApp" digest message, with a settings toggle to include/exclude it.

**Architecture:** Extend the existing `DigestSchedule` model, digest-building pipeline (`src/lib/digest.ts`), settings API, and settings UI with one new boolean, `includeUnreadEmails`, following the exact same pattern already used for `includeGoogleCalendar`. No new cron job, schedule, or WhatsApp-send path is created — this reuses `/api/cron/digest` and `sendWhatsAppNotification` as-is.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Prisma 6 + PostgreSQL, existing `cuelume`-unrelated CRM digest infra.

## Global Constraints

- Unread count query: `prisma.email.count({ where: { organizationId, isRead: false, isSpam: false, isArchived: false } })` — organization-wide total, spam and archived excluded (per spec).
- New Prisma field: `includeUnreadEmails Boolean @default(true)` on `DigestSchedule`, mirroring `includeGoogleCalendar`'s existing pattern exactly.
- No new cron endpoint, schedule model, or WhatsApp-send function — only add to the existing `DigestSchedule` / `buildDigestContext` / `runDigestForUser` pipeline.
- Schema changes are applied via `npm run db:push` (this project's convention — see `package.json`'s `db:push` script — not `prisma migrate dev`).
- The project has **no test framework** installed. Verification per task is `npx tsc --noEmit` (zero errors) + manual verification via `npm run dev` (and, where applicable, the existing "Vista previa" button on `/settings/digest`, which calls `POST /api/settings/digest/test` with `{ mode: "preview" }`).

---

### Task 1: Add `includeUnreadEmails` field to `DigestSchedule` (schema)

**Files:**
- Modify: `prisma/schema.prisma:58-83` (the `DigestSchedule` model)

**Interfaces:**
- Produces: a new column `includeUnreadEmails Boolean @default(true)` on `DigestSchedule`, available to Prisma Client as `schedule.includeUnreadEmails` (used by Task 2 and Task 3).

- [ ] **Step 1: Add the field to the schema**

Read `prisma/schema.prisma` first. In the `DigestSchedule` model, add the new field directly after `includeGoogleCalendar` (currently line 68):

```prisma
model DigestSchedule {
  id             String    @id @default(cuid())
  enabled        Boolean   @default(false)
  frequency      String    @default("daily") // daily | weekly | monthly | custom
  customDays     String?   // JSON: weekday numbers 0=Sun..6=Sat
  weeklyDay      Int       @default(1)
  monthlyDay     Int       @default(1)
  hour           Int       @default(8)
  minute         Int       @default(0)
  lastSentAt     DateTime?
  includeGoogleCalendar       Boolean @default(true)
  includeUnreadEmails         Boolean @default(true)
  calendarRemindDayBefore     Boolean @default(true)
  calendarRemindMinutesBefore Int     @default(15) // 0 = desactivado
  aiModelId                   String  @default("chatbase")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([userId])
  @@index([organizationId])
}
```

- [ ] **Step 2: Push the schema change to the database**

Run: `npm run db:push`
Expected: Prisma reports the new column was added to `DigestSchedule` with no data loss (it has a default, so existing rows backfill to `true`), and regenerates the Prisma Client.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (confirms the regenerated Prisma Client compiles; `schedule.includeUnreadEmails` isn't referenced yet, so this should already pass).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add includeUnreadEmails field to DigestSchedule"
```

Note: if `db:push` does not create a new file under `prisma/migrations` (it uses schema push, not migration files, for this project's dev workflow), just commit `prisma/schema.prisma`:

```bash
git add prisma/schema.prisma
git commit -m "feat: add includeUnreadEmails field to DigestSchedule"
```

---

### Task 2: Count unread emails and include them in the digest context + AI prompt

**Files:**
- Modify: `src/lib/digest.ts` (`buildDigestContext`, `generateDigestMessage`, `runDigestForUser`)
- Modify: `app/api/settings/digest/test/route.ts:22,38` (preview-mode caller of `buildDigestContext`)

**Interfaces:**
- Consumes: `includeUnreadEmails Boolean` field on `DigestSchedule` (produced by Task 1).
- Produces: `buildDigestContext(orgId, userId, options?: { includeGoogleCalendar?: boolean; includeUnreadEmails?: boolean })` — the added `includeUnreadEmails` option, defaulting to `true` when omitted (matching `includeGoogleCalendar`'s existing default behavior). Later tasks (3, 4) rely on this exact option name and on `runDigestForUser`/`buildDigestContext` requiring no other signature changes.

- [ ] **Step 1: Add the unread-email count query and context line**

Read `src/lib/digest.ts` first. In `buildDigestContext`, after the existing `if (options?.includeGoogleCalendar !== false) { ... }` block (currently ending at line 233, right before the `return lines.join("\n");` on line 235), add:

```tsx
  if (options?.includeUnreadEmails !== false) {
    const unreadCount = await prisma.email.count({
      where: { organizationId: orgId, isRead: false, isSpam: false, isArchived: false },
    });
    lines.push(``, `CORREOS SIN LEER: ${unreadCount}`);
  }

  return lines.join("\n");
```

Update the `buildDigestContext` signature (currently lines 84-88) to accept the new option:

```tsx
export async function buildDigestContext(
  orgId: string,
  userId: string,
  options?: { includeGoogleCalendar?: boolean; includeUnreadEmails?: boolean }
): Promise<string> {
```

- [ ] **Step 2: Tell the AI prompt to include unread emails in the summary**

In `generateDigestMessage` (currently lines 238-259), update the `systemPrompt`'s bullet list (currently line 247) to add unread emails:

```tsx
  const systemPrompt = `Eres un asistente de CRM. Genera un resumen ejecutivo en español para enviar por WhatsApp.
Reglas:
- Máximo 1200 caracteres
- Usa emojis con moderación (2-4 en total)
- Secciones cortas con títulos en mayúsculas
- Incluye: pipelines, deals pendientes/vencidos, ventas y pagos pendientes, ingresos MRR, cobros próximos, tareas, citas del CRM, correos sin leer y eventos de Google Calendar si aparecen en los datos
- Sé conciso y accionable
- NO uses markdown ni asteriscos
- Solo el texto del mensaje, sin introducción`;
```

- [ ] **Step 3: Wire `includeUnreadEmails` through `runDigestForUser`**

In `runDigestForUser` (currently lines 261-332), find this line (currently line 304):

```tsx
  const includeGoogleCalendar = schedule?.includeGoogleCalendar ?? true;
```

Add directly after it:

```tsx
  const includeUnreadEmails = schedule?.includeUnreadEmails ?? true;
```

Then update the `buildDigestContext` call (currently line 306):

```tsx
  const context = await buildDigestContext(orgId, userId, { includeGoogleCalendar, includeUnreadEmails });
```

- [ ] **Step 4: Wire `includeUnreadEmails` through the preview/test route**

Read `app/api/settings/digest/test/route.ts` first. Update line 22 (right after `const includeGoogleCalendar = schedule?.includeGoogleCalendar ?? true;`) to add:

```tsx
  const includeUnreadEmails = schedule?.includeUnreadEmails ?? true;
```

Then update the `buildDigestContext` call at line 38:

```tsx
    const context = await buildDigestContext(orgId, session.user.id, { includeGoogleCalendar, includeUnreadEmails });
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in, go to `/settings/digest`, click "Vista previa" (calls `POST /api/settings/digest/test` with `{ mode: "preview" }`).
- Expected: the returned `context` (visible if you inspect the network response, or via the rendered preview text) includes a `CORREOS SIN LEER: N` line, and the AI-generated preview message mentions the unread email count.
- If you have zero emails synced in a test org, `N` will be `0` — that's still correct behavior; confirm the line is present rather than expecting a specific number.

- [ ] **Step 7: Commit**

```bash
git add src/lib/digest.ts app/api/settings/digest/test/route.ts
git commit -m "feat: include unread email count in WhatsApp digest context and AI prompt"
```

---

### Task 3: Expose `includeUnreadEmails` in the settings API

**Files:**
- Modify: `app/api/settings/digest/route.ts` (`GET` and `PATCH`)

**Interfaces:**
- Consumes: `includeUnreadEmails` field on `DigestSchedule` (Task 1).
- Produces: `GET /api/settings/digest` response includes `includeUnreadEmails: boolean`; `PATCH /api/settings/digest` accepts and persists `includeUnreadEmails` in its request body. Task 4's settings page reads/writes this exact field name.

- [ ] **Step 1: Add `includeUnreadEmails` to the `GET` response**

Read `app/api/settings/digest/route.ts` first. In the `GET` handler's response object (currently lines 32-47), add the field right after `includeGoogleCalendar` (currently line 41):

```tsx
    return NextResponse.json({
      enabled: schedule?.enabled ?? false,
      frequency: schedule?.frequency ?? "daily",
      customDays,
      weeklyDay: schedule?.weeklyDay ?? 1,
      monthlyDay: schedule?.monthlyDay ?? 1,
      hour: schedule?.hour ?? 8,
      minute: schedule?.minute ?? 0,
      lastSentAt: schedule?.lastSentAt ?? null,
      includeGoogleCalendar: schedule?.includeGoogleCalendar ?? true,
      includeUnreadEmails: schedule?.includeUnreadEmails ?? true,
      calendarRemindDayBefore: schedule?.calendarRemindDayBefore ?? true,
      calendarRemindMinutesBefore: schedule?.calendarRemindMinutesBefore ?? 15,
      aiModelId: schedule?.aiModelId ?? "chatbase",
      whatsappConfigured: !!(callMeBot?.phone && callMeBot?.apiKey),
      googleCalendarConnected: !!googleConnected,
    });
```

- [ ] **Step 2: Accept and persist `includeUnreadEmails` in `PATCH`**

In the `PATCH` handler, add `includeUnreadEmails` to the destructured body (currently lines 64-76):

```tsx
    const {
      enabled,
      frequency,
      customDays,
      weeklyDay,
      monthlyDay,
      hour,
      minute,
      includeGoogleCalendar,
      includeUnreadEmails,
      calendarRemindDayBefore,
      calendarRemindMinutesBefore,
      aiModelId,
    } = body;
```

Add `includeUnreadEmails: includeUnreadEmails !== false,` to both the `update` block (currently lines 88-100) and the `create` block (currently lines 101-115) of the `prisma.digestSchedule.upsert` call, right after the existing `includeGoogleCalendar: includeGoogleCalendar !== false,` line in each block. The `update` block becomes:

```tsx
      update: {
        enabled: !!enabled,
        frequency: frequency || "daily",
        customDays: JSON.stringify(parsedDays),
        weeklyDay: typeof weeklyDay === "number" ? weeklyDay : 1,
        monthlyDay: typeof monthlyDay === "number" ? Math.min(28, Math.max(1, monthlyDay)) : 1,
        hour: typeof hour === "number" ? Math.min(23, Math.max(0, hour)) : 8,
        minute: typeof minute === "number" ? Math.min(59, Math.max(0, minute)) : 0,
        includeGoogleCalendar: includeGoogleCalendar !== false,
        includeUnreadEmails: includeUnreadEmails !== false,
        calendarRemindDayBefore: calendarRemindDayBefore !== false,
        calendarRemindMinutesBefore: parsedMinutes,
        aiModelId: parsedModelId,
      },
```

and the `create` block becomes:

```tsx
      create: {
        userId: session.user.id,
        organizationId: orgId,
        enabled: !!enabled,
        frequency: frequency || "daily",
        customDays: JSON.stringify(parsedDays),
        weeklyDay: typeof weeklyDay === "number" ? weeklyDay : 1,
        monthlyDay: typeof monthlyDay === "number" ? Math.min(28, Math.max(1, monthlyDay)) : 1,
        hour: typeof hour === "number" ? Math.min(23, Math.max(0, hour)) : 8,
        minute: typeof minute === "number" ? Math.min(59, Math.max(0, minute)) : 0,
        includeGoogleCalendar: includeGoogleCalendar !== false,
        includeUnreadEmails: includeUnreadEmails !== false,
        calendarRemindDayBefore: calendarRemindDayBefore !== false,
        calendarRemindMinutesBefore: parsedMinutes,
        aiModelId: parsedModelId,
      },
```

Finally, add `includeUnreadEmails: schedule.includeUnreadEmails,` to the `PATCH` response object (currently lines 125-137), right after `includeGoogleCalendar: schedule.includeGoogleCalendar,`:

```tsx
    return NextResponse.json({
      enabled: schedule.enabled,
      frequency: schedule.frequency,
      customDays: parsedCustomDays,
      weeklyDay: schedule.weeklyDay,
      monthlyDay: schedule.monthlyDay,
      hour: schedule.hour,
      minute: schedule.minute,
      lastSentAt: schedule.lastSentAt,
      includeGoogleCalendar: schedule.includeGoogleCalendar,
      includeUnreadEmails: schedule.includeUnreadEmails,
      calendarRemindDayBefore: schedule.calendarRemindDayBefore,
      calendarRemindMinutesBefore: schedule.calendarRemindMinutesBefore,
      aiModelId: schedule.aiModelId,
    });
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. With the app open and logged in, in the browser DevTools console (or via `curl` with a valid session cookie) call:
```
fetch("/api/settings/digest").then(r => r.json()).then(console.log)
```
Expected: response JSON includes `"includeUnreadEmails": true` (default, since no PATCH has set it yet).

- [ ] **Step 5: Commit**

```bash
git add app/api/settings/digest/route.ts
git commit -m "feat: expose includeUnreadEmails in settings/digest API"
```

---

### Task 4: Add the "Incluir correos sin leer" toggle to the Settings UI

**Files:**
- Modify: `app/settings/digest/page.tsx`

**Interfaces:**
- Consumes: `includeUnreadEmails` field from `GET /api/settings/digest` and sent via `PATCH /api/settings/digest` (Task 3).
- No new exports; purely internal to `DigestSettingsPage`.

- [ ] **Step 1: Add state for `includeUnreadEmails`**

Read `app/settings/digest/page.tsx` first. Add a new `useState` right after the existing `includeGoogleCalendar` state (currently line 41):

```tsx
  const [includeGoogleCalendar, setIncludeGoogleCalendar] = useState(true);
  const [includeUnreadEmails, setIncludeUnreadEmails] = useState(true);
```

- [ ] **Step 2: Load it from `GET /api/settings/digest`**

In the `useEffect` that fetches `/api/settings/digest` (currently lines 57-78), add right after `setIncludeGoogleCalendar(d.includeGoogleCalendar ?? true);` (currently line 69):

```tsx
        setIncludeUnreadEmails(d.includeUnreadEmails ?? true);
```

- [ ] **Step 3: Send it in `PATCH /api/settings/digest`**

In `handleSave` (currently lines 86-118), add `includeUnreadEmails` to the request body (currently lines 95-107), right after `includeGoogleCalendar,`:

```tsx
        body: JSON.stringify({
          enabled,
          frequency,
          customDays,
          weeklyDay,
          monthlyDay,
          hour,
          minute,
          includeGoogleCalendar,
          includeUnreadEmails,
          calendarRemindDayBefore,
          calendarRemindMinutesBefore,
          aiModelId,
        }),
```

- [ ] **Step 4: Add the toggle UI**

In the JSX, add a new section right after the closing `<hr className="border-border-subtle" />` that follows the "Modelo de IA" section and right before the "Google Calendar" `<div className="flex flex-col gap-3">` section (currently right before line 299 `<div className="flex flex-col gap-3">`). Insert:

```tsx
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-text-primary">Correos sin leer</p>
                <p className="text-xs text-text-secondary">Incluye el total de correos sin leer de tu organización en el resumen</p>
              </div>
              <button
                type="button"
                onClick={() => setIncludeUnreadEmails((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative ${includeUnreadEmails ? "bg-emerald-500" : "bg-nav-active"}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${includeUnreadEmails ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </label>

            <hr className="border-border-subtle" />

```

This mirrors the existing "Activar resumen automático" toggle pattern (lines 187-199) exactly, and sits between the "Modelo de IA" and "Google Calendar" sections as its own separated block.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, navigate to `/settings/digest`.
- Confirm the new "Correos sin leer" toggle appears between "Modelo de IA" and "Google Calendar", on by default.
- Toggle it off, click "Guardar" (the form's submit button), reload the page — confirm it stays off (persisted).
- Click "Vista previa" — confirm the preview context no longer includes a `CORREOS SIN LEER` line when the toggle is off, and does include it when on (toggle back on, save, preview again).

- [ ] **Step 7: Commit**

```bash
git add app/settings/digest/page.tsx
git commit -m "feat: add unread-emails toggle to WhatsApp digest settings"
```

# Adjuntos de correo y enlaces externos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show and let users download real attachments from received emails (previously silently discarded), and make links inside a rendered email's body open in a new browser tab instead of doing nothing.

**Architecture:** A new `EmailAttachment` Prisma model stores attachment binaries as MySQL `LONGBLOB` (no external file-storage service exists in this project). `mailparser` already parses attachments during IMAP sync (`syncMailbox()` in the fetch-emails cron) — this plan captures that already-parsed data instead of discarding it, using a nested Prisma `create`. A new download route streams a single attachment's bytes with the right headers. The email detail view renders a small attachments list. Separately, the two iframes that render email HTML via `srcDoc` get an `allow-popups` sandbox permission plus an injected `<base target="_blank">` so links open in a new tab.

**Tech Stack:** Next.js 16 (App Router), Prisma 6 / MySQL, `mailparser` (already a dependency, already used), `@hugeicons/react` (already installed — `FileAttachmentIcon` and `Download01Icon` both exist in the installed `@hugeicons/core-free-icons` package).

## Global Constraints

- This project has no test framework. Verification is `npx tsc --noEmit` at every task, plus `npm run build` after the tasks that touch route handlers or the email page. There is no live IMAP server reachable from this environment — functional confirmation of real attachments arriving happens when the user syncs against their real mailbox after this ships.
- `prisma migrate dev` fails on this project's hosted MySQL (no `CREATE DATABASE` privilege for the shadow database, confirmed repeatedly in this module's prior changes). Apply schema changes with `npm run db:push`, never `npm run db:migrate`.
- Only attachments with `contentDisposition === "attachment"` are captured — NOT `"inline"` ones (typically `cid:`-embedded images used by the HTML body itself, which are not "files" the user should see in a downloadable list).
- The attachment metadata endpoint (`GET /api/emails/[id]`) must NEVER include the binary `content` field in its response — only `id`, `filename`, `contentType`, `size`. The binary is only ever served by the dedicated download route.
- The download route must enforce the same organization-scoping pattern already used by every other `/api/emails/*` route (verify `email.organizationId === currentOrganizationId` from the session before returning anything).
- The `Content-Disposition` filename must be sanitized (no raw quotes or control characters) before being placed in an HTTP header, to prevent header injection from a malicious sender-controlled filename.
- Do NOT add `allow-scripts` to either iframe's `sandbox` attribute — email HTML must remain script-inert. Only `allow-popups` and `allow-popups-to-escape-sandbox` are added, alongside the existing `allow-same-origin`.
- Do NOT add file upload / compose-time attachment support — out of scope per the confirmed design (view/download only for now).
- Full design spec: `docs/superpowers/specs/2026-07-15-email-attachments-and-links-design.md`.

---

### Task 1: Add `EmailAttachment` model

**Files:**
- Modify: `prisma/schema.prisma` (the `Email` model, currently at lines 841-869, plus a new model added after it)

**Interfaces:**
- Produces: `EmailAttachment` Prisma model with fields `id: string`, `filename: string`, `contentType: string`, `size: number`, `content: Buffer`, `createdAt: Date`, `emailId: string`; `Email.attachments: EmailAttachment[]` relation. Consumed by Task 2 (cron write) and Task 3 (API read).

- [ ] **Step 1: Read the current `Email` model**

Read `prisma/schema.prisma` around lines 841-869 to confirm the current text matches what's shown below.

- [ ] **Step 2: Add the relation field and the new model**

Change:

```prisma
model Email {
  id          String    @id @default(cuid())
  messageId   String?   @db.VarChar(500) // Message-ID header for deduplication
  uid         Int?      // IMAP UID for incremental sync
  subject     String    @db.Text
  fromAddress String
  fromName    String?
  toAddress   String    @db.Text
  ccAddress   String?   @db.Text
  bodyText    String?   @db.LongText
  bodyHtml    String?   @db.LongText
  type        EmailType @default(RECEIVED)
  isRead      Boolean   @default(false)
  isArchived  Boolean   @default(false)
  isSpam      Boolean   @default(false)
  receivedAt  DateTime  @default(now())
  scheduledAt DateTime? // null = not scheduled; future date = send at this time
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  companyId      String
  company        Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([organizationId])
  @@index([type])
  @@index([isArchived])
  @@index([isSpam])
  @@index([scheduledAt])
}
```

to:

```prisma
model Email {
  id          String    @id @default(cuid())
  messageId   String?   @db.VarChar(500) // Message-ID header for deduplication
  uid         Int?      // IMAP UID for incremental sync
  subject     String    @db.Text
  fromAddress String
  fromName    String?
  toAddress   String    @db.Text
  ccAddress   String?   @db.Text
  bodyText    String?   @db.LongText
  bodyHtml    String?   @db.LongText
  type        EmailType @default(RECEIVED)
  isRead      Boolean   @default(false)
  isArchived  Boolean   @default(false)
  isSpam      Boolean   @default(false)
  receivedAt  DateTime  @default(now())
  scheduledAt DateTime? // null = not scheduled; future date = send at this time
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  companyId      String
  company        Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  attachments EmailAttachment[]

  @@index([companyId])
  @@index([organizationId])
  @@index([type])
  @@index([isArchived])
  @@index([isSpam])
  @@index([scheduledAt])
}

model EmailAttachment {
  id          String   @id @default(cuid())
  filename    String
  contentType String
  size        Int
  content     Bytes    @db.LongBlob
  createdAt   DateTime @default(now())

  emailId String
  email   Email  @relation(fields: [emailId], references: [id], onDelete: Cascade)

  @@index([emailId])
}
```

- [ ] **Step 3: Apply the schema change**

Run: `npm run db:push`
Expected: completes without errors, reports the new `EmailAttachment` table and the `Email.attachments` relation were created.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add EmailAttachment model for storing email attachment binaries"
```

---

### Task 2: Capture attachments during IMAP sync

**Files:**
- Modify: `app/api/cron/fetch-emails/route.ts:63-134` (inside `syncMailbox()`)

**Interfaces:**
- Consumes: `EmailAttachment` (Task 1), `parsed.attachments` from `mailparser`'s `simpleParser` result (already available at this call site, currently unused).
- No new exports — internal to the route handler.

- [ ] **Step 1: Read the current file**

Read `app/api/cron/fetch-emails/route.ts` in full (309 lines) to confirm the parsing block (lines 63-78) and the `prisma.email.create` call (lines 117-134) match what's shown below before editing.

- [ ] **Step 2: Capture and filter attachments during parsing**

Change:

```ts
      let bodyHtml: string | null = null;
      let bodyText: string | null = null;
      let parsedFrom: { name?: string; address?: string } | null = null;
      let parsedTo: { address?: string } | null = null;
      let parsedSubject: string | null = null;
      let parsedDate: Date | null = null;
      let parsedMessageId: string | null = null;

      if (msg.source) {
        try {
          const parsed = await simpleParser(msg.source);
          bodyHtml = parsed.html || null;
          bodyText = parsed.text || null;
          parsedFrom = parsed.from?.value?.[0] ?? null;
          parsedTo = parsed.to
            ? (Array.isArray(parsed.to.value) ? parsed.to.value[0] : null)
            : null;
          parsedSubject = parsed.subject || null;
          parsedDate = parsed.date ?? null;
          parsedMessageId = parsed.messageId || null;
        } catch {
          bodyText = msg.source.toString("utf-8").substring(0, 50000);
        }
      }
```

to:

```ts
      let bodyHtml: string | null = null;
      let bodyText: string | null = null;
      let parsedFrom: { name?: string; address?: string } | null = null;
      let parsedTo: { address?: string } | null = null;
      let parsedSubject: string | null = null;
      let parsedDate: Date | null = null;
      let parsedMessageId: string | null = null;
      let parsedAttachments: { filename: string; contentType: string; size: number; content: Buffer }[] = [];

      if (msg.source) {
        try {
          const parsed = await simpleParser(msg.source);
          bodyHtml = parsed.html || null;
          bodyText = parsed.text || null;
          parsedFrom = parsed.from?.value?.[0] ?? null;
          parsedTo = parsed.to
            ? (Array.isArray(parsed.to.value) ? parsed.to.value[0] : null)
            : null;
          parsedSubject = parsed.subject || null;
          parsedDate = parsed.date ?? null;
          parsedMessageId = parsed.messageId || null;
          // Only real attachments — exclude "inline" cid:-embedded images used by the HTML body itself
          parsedAttachments = (parsed.attachments || [])
            .filter((att: any) => att.contentDisposition === "attachment")
            .map((att: any) => ({
              filename: att.filename || "adjunto",
              contentType: att.contentType || "application/octet-stream",
              size: att.size ?? att.content?.length ?? 0,
              content: att.content as Buffer,
            }));
        } catch {
          bodyText = msg.source.toString("utf-8").substring(0, 50000);
        }
      }
```

- [ ] **Step 3: Attach the nested create to the email insert**

Change:

```ts
      await prisma.email.create({
        data: {
          messageId,
          uid,
          subject,
          fromAddress,
          fromName,
          toAddress,
          bodyHtml,
          bodyText,
          type: "RECEIVED",
          isRead: false,
          isSpam,
          companyId: company.id,
          organizationId: company.organizationId,
          receivedAt,
        },
      });
```

to:

```ts
      await prisma.email.create({
        data: {
          messageId,
          uid,
          subject,
          fromAddress,
          fromName,
          toAddress,
          bodyHtml,
          bodyText,
          type: "RECEIVED",
          isRead: false,
          isSpam,
          companyId: company.id,
          organizationId: company.organizationId,
          receivedAt,
          attachments: parsedAttachments.length > 0
            ? { create: parsedAttachments.map((a) => ({ filename: a.filename, contentType: a.contentType, size: a.size, content: a.content })) }
            : undefined,
        },
      });
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/fetch-emails/route.ts
git commit -m "feat: capture email attachments during IMAP sync"
```

(This applies identically to both `INBOX` and the real Spam/Junk folder sync, since both already go through this same `syncMailbox()` function — no further change needed for that.)

---

### Task 3: Expose attachment metadata + a download route

**Files:**
- Modify: `app/api/emails/[id]/route.ts:19-22` (the `GET` handler's `include`)
- Create: `app/api/emails/[id]/attachments/[attachmentId]/route.ts`

**Interfaces:**
- Consumes: `EmailAttachment` (Task 1).
- Produces: `GET /api/emails/{id}` response now includes `attachments: { id, filename, contentType, size }[]`. New `GET /api/emails/{id}/attachments/{attachmentId}` returns the raw file. Consumed by Task 4 (frontend).

- [ ] **Step 1: Read the current files**

Read `app/api/emails/[id]/route.ts` in full (113 lines) to confirm the `GET` handler's `include` (lines 19-22) matches what's shown below.

- [ ] **Step 2: Add attachment metadata to the existing detail route**

Change:

```ts
    const email = await prisma.email.findUnique({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });
```

to:

```ts
    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        attachments: { select: { id: true, filename: true, contentType: true, size: true } },
      },
    });
```

- [ ] **Step 3: Create the download route**

Create `app/api/emails/[id]/attachments/[attachmentId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

function sanitizeFilenameForHeader(filename: string): string {
  // Strip quotes and control characters — a sender-controlled filename must never
  // be able to inject extra HTTP header fields via CRLF or unescaped quotes.
  return filename.replace(/[\r\n"]/g, "").trim() || "adjunto";
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { attachmentId } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const attachment = await prisma.emailAttachment.findUnique({
      where: { id: attachmentId },
      include: { email: { select: { organizationId: true } } },
    });

    if (!attachment || attachment.email.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const safeName = sanitizeFilenameForHeader(attachment.filename);
    const encodedName = encodeURIComponent(attachment.filename);

    return new NextResponse(new Uint8Array(attachment.content), {
      status: 200,
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(attachment.size),
      },
    });
  } catch (error: any) {
    console.error("GET /api/emails/[id]/attachments/[attachmentId] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Production build**

Run: `npm run build`
Expected: completes with zero errors/warnings; `/api/emails/[id]/attachments/[attachmentId]` appears in the route manifest.

- [ ] **Step 6: Commit**

```bash
git add app/api/emails/[id]/route.ts app/api/emails/[id]/attachments/[attachmentId]/route.ts
git commit -m "feat: expose attachment metadata and add attachment download route"
```

---

### Task 4: Show attachments in the email detail view

**Files:**
- Modify: `app/emails/page.tsx`

**Interfaces:**
- Consumes: `EmailDetail.attachments: { id: string; filename: string; contentType: string; size: number }[]` (Task 3's API shape), `FileAttachmentIcon` and `Download01Icon` from `@hugeicons/core-free-icons`.
- Produces: `formatFileSize(bytes: number): string`, used only within this file.

- [ ] **Step 1: Add the new icon imports**

In the `@hugeicons/core-free-icons` import block (lines 6-27), add `FileAttachmentIcon` and `Download01Icon`:

```ts
import {
  InboxIcon,
  SentIcon,
  ArchiveIcon,
  Refresh01Icon,
  PencilEdit01Icon,
  Delete01Icon,
  Archive01Icon,
  MailReplyIcon,
  Cancel01Icon,
  Mail01Icon,
  Settings01Icon,
  ViewIcon,
  ViewOffIcon,
  Building04Icon,
  SourceCodeIcon,
  Clock01Icon,
  SparklesIcon,
  Megaphone01Icon,
  SpamIcon,
  CheckmarkCircle02Icon,
  FileAttachmentIcon,
  Download01Icon,
} from "@hugeicons/core-free-icons";
```

- [ ] **Step 2: Add `attachments` to `EmailDetail`**

Change:

```ts
type EmailDetail = EmailSummary & {
  bodyHtml: string | null;
  bodyText: string | null;
  ccAddress: string | null;
  messageId: string | null;
};
```

to:

```ts
type EmailAttachmentInfo = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
};

type EmailDetail = EmailSummary & {
  bodyHtml: string | null;
  bodyText: string | null;
  ccAddress: string | null;
  messageId: string | null;
  attachments: EmailAttachmentInfo[];
};
```

- [ ] **Step 3: Add a `formatFileSize` helper**

Add this right after the existing `sanitizeEmail` function (around line 38):

```ts
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 4: Render the attachments list below the email body**

Read the "Email body" block (around lines 823-841, which renders `bodyHtml`/`bodyText`/empty-state) first to confirm current text, then add the attachments list right after the closing `</div>` of the body's white card, still inside the `<div className="flex-1 overflow-y-auto p-6">` wrapper. Change:

```tsx
              {/* Email body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
                  {selectedEmail.bodyHtml ? (
                    <iframe
                      srcDoc={selectedEmail.bodyHtml}
                      sandbox="allow-same-origin"
                      className="w-full border-0"
                      style={{ minHeight: "500px", height: "600px" }}
                      title="Email body"
                    />
                  ) : selectedEmail.bodyText ? (
                    <pre className="p-6 text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedEmail.bodyText}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-2">
                      <HugeiconsIcon icon={Mail01Icon} size={32} className="opacity-30" />
                      <p className="text-sm">Este correo no tiene contenido</p>
                    </div>
                  )}
                </div>
              </div>
```

to:

```tsx
              {/* Email body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-lg border border-border-subtle overflow-hidden">
                  {selectedEmail.bodyHtml ? (
                    <iframe
                      srcDoc={selectedEmail.bodyHtml}
                      sandbox="allow-same-origin"
                      className="w-full border-0"
                      style={{ minHeight: "500px", height: "600px" }}
                      title="Email body"
                    />
                  ) : selectedEmail.bodyText ? (
                    <pre className="p-6 text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedEmail.bodyText}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-2">
                      <HugeiconsIcon icon={Mail01Icon} size={32} className="opacity-30" />
                      <p className="text-sm">Este correo no tiene contenido</p>
                    </div>
                  )}
                </div>

                {selectedEmail.attachments.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={`/api/emails/${selectedEmail.id}/attachments/${att.id}`}
                        download={att.filename}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs text-text-primary hover:bg-surface-sidebar transition-colors"
                      >
                        <HugeiconsIcon icon={FileAttachmentIcon} size={14} color="#9ca3af" />
                        <span className="max-w-[200px] truncate">{att.filename}</span>
                        <span className="text-text-secondary">· {formatFileSize(att.size)}</span>
                        <HugeiconsIcon icon={Download01Icon} size={13} color="#9ca3af" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
```

Note: this step deliberately leaves the iframe's `srcDoc`/`sandbox` untouched — that's Task 5's job, done independently so these two tasks don't depend on each other's edits landing first.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/emails/page.tsx
git commit -m "feat: show attachments in the email detail view"
```

---

### Task 5: External links in the email body iframe

**Files:**
- Modify: `app/emails/page.tsx`

**Interfaces:**
- Produces: `withExternalLinks(html: string): string`, used by this file's two `srcDoc` iframes (the received-email view and the compose preview, both edited in this task).
- This task is independent of Task 4 — it touches the same file but a disjoint set of lines (the iframe `srcDoc`/`sandbox` attributes, not the attachments list Task 4 adds). Do not assume Task 4 has or hasn't run; just make the edits below against the file as you find it.

- [ ] **Step 1: Add the `withExternalLinks` helper**

Read `app/emails/page.tsx` first. Add this near the top-level helper functions, right after `sanitizeEmail` (or after `formatFileSize`, if Task 4 already added it there — either position is fine, just keep it with the other top-level helpers):

```ts
function withExternalLinks(html: string): string {
  if (!html) return html;
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}<base target="_blank">`);
  }
  return `<head><base target="_blank"></head>${html}`;
}
```

- [ ] **Step 2: Update the received-email iframe**

Find the email-detail iframe (search for `title="Email body"`) and change:

```tsx
                    <iframe
                      srcDoc={selectedEmail.bodyHtml}
                      sandbox="allow-same-origin"
                      className="w-full border-0"
                      style={{ minHeight: "500px", height: "600px" }}
                      title="Email body"
                    />
```

to:

```tsx
                    <iframe
                      srcDoc={withExternalLinks(selectedEmail.bodyHtml)}
                      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                      className="w-full border-0"
                      style={{ minHeight: "500px", height: "600px" }}
                      title="Email body"
                    />
```

- [ ] **Step 3: Update the compose preview iframe**

Read the compose preview block first (search for `title="Previsualización del correo"`) to confirm the current text matches below. Change:

```tsx
                      <iframe
                        srcDoc={composeData.bodyHtml}
                        sandbox="allow-same-origin"
                        className="w-full border-0"
                        style={{ minHeight: "200px", height: "200px" }}
                        title="Previsualización del correo"
                      />
```

to:

```tsx
                      <iframe
                        srcDoc={withExternalLinks(composeData.bodyHtml)}
                        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        className="w-full border-0"
                        style={{ minHeight: "200px", height: "200px" }}
                        title="Previsualización del correo"
                      />
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Production build**

Run: `npm run build`
Expected: zero errors/warnings.

- [ ] **Step 6: Manual browser verification**

Run: `npm run dev`, open `/emails`, open a received email that has an HTML body containing at least one link (or open the compose modal, write `<a href="https://example.com">test</a>` in the body, and switch to the "Vista previa" tab).
- Click the link — expect it to open in a **new browser tab**, not navigate within the app or do nothing.
- Confirm the app itself is unaffected (the current tab still shows the CRM, unchanged).
- Confirm no console errors related to the sandboxed iframe.

- [ ] **Step 7: Commit**

```bash
git add app/emails/page.tsx
git commit -m "feat: open links inside email body/preview in a new tab"
```

---

### Task 6: Guard against oversized attachments stalling sync + accurate `Content-Length`

**Files:**
- Modify: `app/api/cron/fetch-emails/route.ts:62-147`
- Modify: `app/api/emails/[id]/attachments/[attachmentId]/route.ts:40-46`

**Interfaces:**
- No new exports. Internal hardening only.

Found during the final whole-branch review of Tasks 1-5: `prisma.email.create` (with its nested attachment `create`) is not wrapped in its own try/catch. If the INSERT throws — the realistic trigger being MySQL's `max_allowed_packet` limit on this shared hosting (commonly 4-16MB, while mail providers allow attachments up to ~25MB) — the error escapes the message loop and is only caught by the outer per-company handler. Since `imapLastUid`/`imapSpamLastUid` are only persisted when `syncMailbox` returns normally, a single oversized message that trips this permanently stalls that company's sync: every subsequent run re-fetches from the same UID, re-hits the same message, and fails again forever. This is worse than the pre-attachments behavior (where the email row was small and this failure mode was unreachable). Fix with two layers: skip storing content for attachments over a size cap (so the common case never risks the packet limit), and a retry-without-attachments fallback if the insert still fails for any other reason (so the email itself always lands and `lastUid` always advances). Also fixes a related Minor finding: the download route's `Content-Length` header used the stored `size` field instead of the actual serialized byte length.

- [ ] **Step 1: Read both current files**

Read `app/api/cron/fetch-emails/route.ts` (lines 62-147) and `app/api/emails/[id]/attachments/[attachmentId]/route.ts` (full file, 53 lines) to confirm they match the before-blocks below.

- [ ] **Step 2: Cap attachment size at capture time**

In `app/api/cron/fetch-emails/route.ts`, change:

```ts
          // Only real attachments — exclude "inline" cid:-embedded images used by the HTML body itself
          parsedAttachments = (parsed.attachments || [])
            .filter((att: any) => att.contentDisposition === "attachment")
            .map((att: any) => ({
              filename: att.filename || "adjunto",
              contentType: att.contentType || "application/octet-stream",
              size: att.size ?? att.content?.length ?? 0,
              content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
            }));
```

to:

```ts
          // Only real attachments — exclude "inline" cid:-embedded images used by the HTML body itself.
          // Skip anything over MAX_ATTACHMENT_BYTES: this shared-hosting MySQL's max_allowed_packet is
          // commonly well under what mail providers allow per attachment (~25MB), and a single oversized
          // INSERT would otherwise throw and permanently stall this company's sync (see Step 3 below).
          parsedAttachments = (parsed.attachments || [])
            .filter((att: any) => att.contentDisposition === "attachment")
            .map((att: any) => ({
              filename: att.filename || "adjunto",
              contentType: att.contentType || "application/octet-stream",
              size: att.size ?? att.content?.length ?? 0,
              content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
            }))
            .filter((att) => {
              if (att.size > MAX_ATTACHMENT_BYTES) {
                console.error(`Skipping oversized attachment "${att.filename}" (${att.size} bytes, over ${MAX_ATTACHMENT_BYTES} cap)`);
                return false;
              }
              return true;
            });
```

Then add the constant near the top of the file, right after the existing `SPAM_FOLDER_NAMES` constant:

```ts
const SPAM_FOLDER_NAMES = ["spam", "junk", "junk e-mail"];

// Conservative cap well under typical shared-hosting MySQL max_allowed_packet values (often 4-16MB) —
// an attachment over this is skipped (not stored) rather than risking a failed INSERT for the whole email.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
```

(Read the file first to confirm the exact current text around `SPAM_FOLDER_NAMES` before this edit — it's a few lines, shown in Task 2/3's earlier edits.)

- [ ] **Step 3: Add a retry-without-attachments fallback around the create**

In `app/api/cron/fetch-emails/route.ts`, change:

```ts
      await prisma.email.create({
        data: {
          messageId,
          uid,
          subject,
          fromAddress,
          fromName,
          toAddress,
          bodyHtml,
          bodyText,
          type: "RECEIVED",
          isRead: false,
          isSpam,
          companyId: company.id,
          organizationId: company.organizationId,
          receivedAt,
          attachments: parsedAttachments.length > 0
            ? { create: parsedAttachments.map((a) => ({ filename: a.filename, contentType: a.contentType, size: a.size, content: a.content })) }
            : undefined,
        },
      });
```

to:

```ts
      const emailData = {
        messageId,
        uid,
        subject,
        fromAddress,
        fromName,
        toAddress,
        bodyHtml,
        bodyText,
        type: "RECEIVED" as const,
        isRead: false,
        isSpam,
        companyId: company.id,
        organizationId: company.organizationId,
        receivedAt,
      };

      try {
        await prisma.email.create({
          data: {
            ...emailData,
            attachments: parsedAttachments.length > 0
              ? { create: parsedAttachments.map((a) => ({ filename: a.filename, contentType: a.contentType, size: a.size, content: a.content })) }
              : undefined,
          },
        });
      } catch (createErr: any) {
        if (parsedAttachments.length === 0) throw createErr;
        // The insert failed with attachments attached (most likely MySQL's max_allowed_packet) —
        // retry without them so the email itself still lands and lastUid still advances, instead
        // of permanently stalling this company's sync on the same message every run.
        console.error(
          `Failed to store email with attachments for ${company.name} (uid ${uid}), retrying without attachments:`,
          createErr?.message || createErr
        );
        await prisma.email.create({ data: emailData });
      }
```

- [ ] **Step 4: Fix `Content-Length` in the download route**

In `app/api/emails/[id]/attachments/[attachmentId]/route.ts`, change:

```ts
    return new NextResponse(new Uint8Array(attachment.content), {
      status: 200,
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(attachment.size),
      },
    });
```

to:

```ts
    return new NextResponse(new Uint8Array(attachment.content), {
      status: 200,
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(attachment.content.length),
      },
    });
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Production build**

Run: `npm run build`
Expected: zero errors/warnings.

- [ ] **Step 7: Commit**

```bash
git add app/api/cron/fetch-emails/route.ts app/api/emails/[id]/attachments/[attachmentId]/route.ts
git commit -m "fix: prevent oversized attachments from stalling IMAP sync"
```

---

### Task 7: Backfill attachments for already-synced emails

**Files:**
- Modify: `app/api/cron/fetch-emails/route.ts:130-137`

**Interfaces:**
- No new exports. Internal fix only.

Found after shipping Tasks 1-6 to production and testing against real mail accounts: emails that were already synced BEFORE this attachments feature existed never get their attachments captured, even after a full `?reset=true` history resync. The dedup-by-`messageId` check runs before the attachment-parsing logic ever gets a chance to matter for that message — if `existing` is found, the loop does `continue` immediately, so the freshly-parsed `parsedAttachments` for that message (which mailparser computed just fine) are simply thrown away. This task adds a one-time backfill: when a message's email row already exists in the database AND that existing row currently has zero attachments AND the freshly re-parsed message actually has real attachments, create those attachment rows for the existing email before skipping — so a user can fix this by clicking "Sincronizar todo el historial" once, without needing a new UI element or endpoint.

- [ ] **Step 1: Read the current file**

Read `app/api/cron/fetch-emails/route.ts` around lines 130-137 to confirm the dedup block matches what's shown below.

- [ ] **Step 2: Add the backfill to the dedup check**

Change:

```ts
      // Dedup by messageId to avoid storing the same email twice
      if (messageId) {
        const existing = await prisma.email.findFirst({
          where: { messageId, companyId: company.id },
          select: { id: true },
        });
        if (existing) continue;
      }
```

to:

```ts
      // Dedup by messageId to avoid storing the same email twice
      if (messageId) {
        const existing = await prisma.email.findFirst({
          where: { messageId, companyId: company.id },
          select: { id: true, _count: { select: { attachments: true } } },
        });
        if (existing) {
          // Backfill: this email was synced before attachment support existed (or its attachments
          // were previously skipped/oversized) — attach anything real we can see now, without
          // creating a duplicate Email row.
          if (existing._count.attachments === 0 && parsedAttachments.length > 0) {
            await prisma.emailAttachment.createMany({
              data: parsedAttachments.map((a) => ({
                emailId: existing.id,
                filename: a.filename,
                contentType: a.contentType,
                size: a.size,
                content: a.content,
              })),
            });
          }
          continue;
        }
      }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: zero errors/warnings.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/fetch-emails/route.ts
git commit -m "fix: backfill attachments for emails synced before attachment support existed"
```

- [ ] **Step 6: Note for the user (not an automated step)**

After this ships, the user needs to click "Sincronizar" → "Sincronizar todo el historial" in `/emails` once (this resets `imapLastUid`/`imapSpamLastUid` to 0, so already-synced old messages are re-fetched from the server and reach this backfill check — an incremental sync alone won't re-visit them, since their UID is already below the stored `lastUid`).

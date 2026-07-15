# Sincronización de la carpeta real de Spam IMAP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing "Spam" folder in the CRM's email module also show emails that are already in Spam/Junk on the user's real mail server, not only emails flagged by the app's own heuristic.

**Architecture:** The IMAP sync cron currently only opens `INBOX`. This adds a second mailbox pass over the server's real Junk/Spam folder (located via the IMAP `SPECIAL-USE` extension, with a common-name fallback), storing those emails with `isSpam: true` directly (trusting the mail server's own classification, no heuristic involved). The per-message fetch/parse/dedupe/create logic — currently duplicated inline for one mailbox — is extracted into a shared `syncMailbox()` helper so both passes reuse identical logic. A new `Company.imapSpamLastUid` column tracks this second mailbox's incremental sync state independently of the existing `imapLastUid` (each IMAP mailbox has its own UID numbering).

**Tech Stack:** Next.js 16 (App Router), Prisma 6 / MySQL, `imapflow` (already a dependency, already used for INBOX sync), `mailparser` (already a dependency).

## Global Constraints

- This project has no test framework. Verification is `npx tsc --noEmit` at every task, plus `npm run build` after Task 2. There is no live IMAP server reachable from this environment to functionally test the real sync end-to-end — that final check happens when the user clicks "Sincronizar todo el historial" in the running app against their real mailbox after this ships. Do not attempt to hit a live IMAP server as part of task verification.
- `prisma migrate dev` fails on this project's hosted MySQL (no `CREATE DATABASE` privilege for the shadow database, confirmed in the earlier spam-emails feature). Apply schema changes with `npm run db:push`, never `npm run db:migrate`.
- A missing or undetectable spam folder for a given company must NOT break that company's `INBOX` sync — wrap the spam-folder lookup/sync in its own `try/catch`, separate from the outer per-company `try/catch` that already exists.
- Emails pulled from the real server Spam/Junk folder must be created with `isSpam: true` directly — do NOT run `detectSpam(...)` on them (the server already classified them; re-running the heuristic could produce a false `false` and defeat the point of this feature).
- No in-app notification (`createNotification`) for emails synced from the spam folder — same rule as the existing heuristic-detected spam.
- Dedup by `messageId` must stay scoped to `companyId` only (not per-mailbox) — reuse the existing dedup logic unchanged, so a message that somehow appears in both mailboxes is never double-inserted.
- Full design spec: `docs/superpowers/specs/2026-07-15-spam-imap-sync-design.md`.

---

### Task 1: Add `imapSpamLastUid` column to `Company`

**Files:**
- Modify: `prisma/schema.prisma` (the `Company` model's IMAP fields, around line 255-261)

**Interfaces:**
- Produces: `Company.imapSpamLastUid: number | null` (Prisma Client field), consumed by Task 2.

- [ ] **Step 1: Read the current model section**

Read `prisma/schema.prisma` around lines 255-261 to confirm the current text matches what's shown below.

- [ ] **Step 2: Add the field**

Change:

```prisma
  // Custom IMAP settings for receiving emails
  imapHost      String?
  imapPort      Int?
  imapUser      String?
  imapPass      String?
  imapSecure    Boolean? @default(true)
  imapLastUid   Int?     @default(0)
```

to:

```prisma
  // Custom IMAP settings for receiving emails
  imapHost        String?
  imapPort        Int?
  imapUser        String?
  imapPass        String?
  imapSecure      Boolean? @default(true)
  imapLastUid     Int?     @default(0)
  imapSpamLastUid Int?     @default(0)
```

(Realigned the `Int?`/`Boolean?` columns for readability since the new field name is longer — this is a cosmetic alignment of the block being touched, not a wider reformat.)

- [ ] **Step 3: Apply the schema change**

Run: `npm run db:push`
Expected: completes without errors, reports the `imapSpamLastUid` column was added.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (nothing references the new field yet).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add imapSpamLastUid column to Company for spam-folder sync tracking"
```

---

### Task 2: Sync the real IMAP Spam/Junk folder in the fetch-emails cron

**Files:**
- Modify: `app/api/cron/fetch-emails/route.ts` (full-file rewrite — the per-message logic is extracted into a shared helper, so this replaces the whole file rather than a series of small edits)

**Interfaces:**
- Consumes: `Company.imapSpamLastUid` (Task 1), `detectSpam` from `@/src/lib/spam-detector` (unchanged, pre-existing), `createNotification` from `@/src/lib/notifications` (unchanged, pre-existing).
- Produces: no new exports — this is a route handler, not a module other code imports.

- [ ] **Step 1: Read the current file**

Read `app/api/cron/fetch-emails/route.ts` in full (250 lines) to confirm it matches the file this task replaces.

- [ ] **Step 2: Replace the entire file**

Replace the full contents of `app/api/cron/fetch-emails/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { createNotification } from "@/src/lib/notifications";
import { detectSpam } from "@/src/lib/spam-detector";
import { auth } from "@/auth";

// Common Spam/Junk folder names used as a fallback when the server doesn't
// advertise the IMAP SPECIAL-USE "\Junk" flag (RFC 6154).
const SPAM_FOLDER_NAMES = ["spam", "junk", "junk e-mail", "[gmail]/spam", "inbox.spam", "inbox.junk"];

async function findSpamMailboxPath(client: any): Promise<string | null> {
  const mailboxes = await client.list();
  const bySpecialUse = mailboxes.find((mb: any) => mb.specialUse === "\\Junk");
  if (bySpecialUse) return bySpecialUse.path;

  const byName = mailboxes.find((mb: any) => SPAM_FOLDER_NAMES.includes(String(mb.name).toLowerCase()));
  return byName ? byName.path : null;
}

async function syncMailbox(
  client: any,
  mailboxPath: string,
  lastUid: number,
  company: { id: string; organizationId: string; imapUser: string },
  simpleParser: any,
  options: { forceSpam: boolean; notifyOnNew: boolean }
): Promise<{ fetched: number; newMaxUid: number }> {
  const lock = await client.getMailboxLock(mailboxPath);
  let newMaxUid = lastUid;
  let fetched = 0;

  try {
    // Fetch ALL messages by sequence number '1:*' — always fetch all, skip by UID.
    // This guarantees we don't miss anything regardless of UID gaps.
    for await (const msg of client.fetch("1:*", {
      uid: true,       // include UID in result
      envelope: true,  // from, to, subject, date
      source: true,    // raw RFC822 source for body parsing
    })) {
      if (!msg.uid || !msg.envelope) continue;

      const uid = msg.uid as number;

      // Skip already-synced messages
      if (uid <= lastUid) continue;
      if (uid > newMaxUid) newMaxUid = uid;

      const envelope = msg.envelope as any;

      // Parse the full RFC822 source first — mailparser correctly handles
      // encoded headers (From, To, Subject, Date) that the IMAP envelope
      // may return with undefined mailbox/host fields.
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

      // Prefer mailparser values; fall back to IMAP envelope
      const messageId: string | null =
        parsedMessageId || envelope.messageId || null;
      const subject: string =
        parsedSubject || envelope.subject || "(sin asunto)";
      const receivedAt: Date =
        parsedDate ?? (envelope.date ? new Date(envelope.date) : new Date());

      // From address: mailparser first, then IMAP envelope
      const envFrom = envelope.from?.[0] as any;
      const fromAddress: string =
        parsedFrom?.address ||
        envFrom?.address ||
        (envFrom?.mailbox && envFrom?.host ? `${envFrom.mailbox}@${envFrom.host}` : null) ||
        "desconocido@desconocido";
      const fromName: string | null =
        parsedFrom?.name || envFrom?.name || null;

      // To address: mailparser first, then IMAP envelope
      const envTo = envelope.to?.[0] as any;
      const toAddress: string =
        parsedTo?.address ||
        envTo?.address ||
        (envTo?.mailbox && envTo?.host ? `${envTo.mailbox}@${envTo.host}` : null) ||
        company.imapUser;

      // Dedup by messageId to avoid storing the same email twice
      if (messageId) {
        const existing = await prisma.email.findFirst({
          where: { messageId, companyId: company.id },
          select: { id: true },
        });
        if (existing) continue;
      }

      const isSpam = options.forceSpam || detectSpam({ subject, bodyText, fromAddress, fromName });

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

      // In-app notification for new email (skip for spam — no notification noise)
      if (options.notifyOnNew && !isSpam) {
        createNotification({
          organizationId: company.organizationId,
          type: "NEW_EMAIL",
          title: subject,
          body: `De: ${fromName || fromAddress}`,
          link: "/emails",
          entityId: undefined,
        });
      }

      fetched++;
    }
  } finally {
    lock.release();
  }

  return { fetched, newMaxUid };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const hasCronSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // Allow access via CRON_SECRET (external cron service) OR valid user session (UI sync button)
  if (process.env.NODE_ENV === "production" && !hasCronSecret) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  // ?reset=true resets lastUid to 0 so ALL historical emails are re-fetched
  const reset = searchParams.get("reset") === "true";
  // ?companyId=xxx to sync only one company
  const onlyCompanyId = searchParams.get("companyId") || null;

  try {
    const whereClause: any = {
      imapHost: { not: null },
      imapUser: { not: null },
      imapPass: { not: null },
    };
    if (onlyCompanyId) whereClause.id = onlyCompanyId;

    const companies = await prisma.company.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        organizationId: true,
        imapHost: true,
        imapPort: true,
        imapUser: true,
        imapPass: true,
        imapSecure: true,
        imapLastUid: true,
        imapSpamLastUid: true,
      },
    });

    if (companies.length === 0) {
      return NextResponse.json({ message: "No hay empresas con IMAP configurado" }, { status: 200 });
    }

    // Reset lastUid for all if requested (force full re-sync, both mailboxes)
    if (reset) {
      await prisma.company.updateMany({
        where: { id: { in: companies.map((c) => c.id) } },
        data: { imapLastUid: 0, imapSpamLastUid: 0 },
      });
      companies.forEach((c) => {
        c.imapLastUid = 0;
        c.imapSpamLastUid = 0;
      });
    }

    let ImapFlow: any;
    let simpleParser: any;
    try {
      const imapMod = await import("imapflow");
      ImapFlow = imapMod.ImapFlow;
    } catch {
      return NextResponse.json({ error: "imapflow no instalado. Ejecuta: npm install imapflow" }, { status: 500 });
    }
    try {
      const parserMod = await import("mailparser");
      simpleParser = parserMod.simpleParser;
    } catch {
      return NextResponse.json({ error: "mailparser no instalado. Ejecuta: npm install mailparser" }, { status: 500 });
    }

    let totalFetched = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    for (const company of companies) {
      try {
        const client = new ImapFlow({
          host: company.imapHost!,
          port: company.imapPort || 993,
          secure: company.imapSecure ?? true,
          auth: { user: company.imapUser!, pass: company.imapPass! },
          logger: false,
          // Disable TLS rejection in case of self-signed certs (common in corporate servers)
          tls: { rejectUnauthorized: false },
        });

        await client.connect();

        const companyRef = { id: company.id, organizationId: company.organizationId, imapUser: company.imapUser! };

        const inboxLastUid = company.imapLastUid ?? 0;
        const inboxResult = await syncMailbox(client, "INBOX", inboxLastUid, companyRef, simpleParser, {
          forceSpam: false,
          notifyOnNew: true,
        });
        totalFetched += inboxResult.fetched;
        if (inboxResult.newMaxUid > inboxLastUid) {
          await prisma.company.update({
            where: { id: company.id },
            data: { imapLastUid: inboxResult.newMaxUid },
          });
        }

        // Sync the server's real Spam/Junk folder, if one can be found. A failure here
        // (missing folder, permissions, transient error) must not affect the INBOX sync above.
        try {
          const spamMailboxPath = await findSpamMailboxPath(client);
          if (spamMailboxPath) {
            const spamLastUid = company.imapSpamLastUid ?? 0;
            const spamResult = await syncMailbox(client, spamMailboxPath, spamLastUid, companyRef, simpleParser, {
              forceSpam: true,
              notifyOnNew: false,
            });
            totalFetched += spamResult.fetched;
            if (spamResult.newMaxUid > spamLastUid) {
              await prisma.company.update({
                where: { id: company.id },
                data: { imapSpamLastUid: spamResult.newMaxUid },
              });
            }
          }
        } catch (spamErr: any) {
          console.error(`IMAP spam-folder sync error for ${company.name}:`, spamErr?.message || spamErr);
        }

        await client.logout();
      } catch (err: any) {
        const msg = `${company.name}: ${err.message || "Error desconocido"}`;
        console.error("IMAP fetch error —", msg);
        errors.push(msg);
        totalErrors++;
      }
    }

    return NextResponse.json(
      {
        message: "Sincronización IMAP completada",
        companiesProcessed: companies.length,
        newEmailsFetched: totalFetched,
        errors: totalErrors,
        errorDetails: errors.length ? errors : undefined,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Cron / fetch-emails error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: completes with zero errors and zero warnings (this route is server-only, so this is the strongest available check in an environment with no live IMAP server to test against).

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/fetch-emails/route.ts
git commit -m "feat: sync the real IMAP Spam/Junk folder alongside INBOX"
```

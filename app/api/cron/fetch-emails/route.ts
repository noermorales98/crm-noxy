import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { createNotification } from "@/src/lib/notifications";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      },
    });

    if (companies.length === 0) {
      return NextResponse.json({ message: "No hay empresas con IMAP configurado" }, { status: 200 });
    }

    // Reset lastUid for all if requested (force full re-sync)
    if (reset) {
      await prisma.company.updateMany({
        where: { id: { in: companies.map((c) => c.id) } },
        data: { imapLastUid: 0 },
      });
      companies.forEach((c) => (c.imapLastUid = 0));
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

        const lock = await client.getMailboxLock("INBOX");
        const lastUid = company.imapLastUid ?? 0;
        let newMaxUid = lastUid;

        try {
          // Fetch ALL messages by sequence number '1:*' — always fetch all, skip by UID
          // This guarantees we don't miss anything regardless of UID gaps
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
              company.imapUser!;

            // Dedup by messageId to avoid storing the same email twice
            if (messageId) {
              const existing = await prisma.email.findFirst({
                where: { messageId, companyId: company.id },
                select: { id: true },
              });
              if (existing) continue;
            }

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
                companyId: company.id,
                organizationId: company.organizationId,
                receivedAt,
              },
            });

            // In-app notification for new email
            createNotification({
              organizationId: company.organizationId,
              type: "NEW_EMAIL",
              title: subject,
              body: `De: ${fromName || fromAddress}`,
              link: "/emails",
              entityId: undefined,
            });

            totalFetched++;
          }

          // Persist the highest UID seen so next sync only fetches newer messages
          if (newMaxUid > lastUid) {
            await prisma.company.update({
              where: { id: company.id },
              data: { imapLastUid: newMaxUid },
            });
          }
        } finally {
          lock.release();
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

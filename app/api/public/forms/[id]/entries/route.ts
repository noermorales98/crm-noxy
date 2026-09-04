import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import {
  getBearerToken,
  parseFormDetails,
  parseIsoDateParam,
  parseLimitParam,
  parseOffsetParam,
  tokensMatch,
} from "@/src/lib/form-entries-api";

export const dynamic = "force-dynamic";

function corsHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return headers;
}

function json(body: unknown, init: ResponseInit = {}) {
  return new NextResponse(JSON.stringify(body), {
    ...init,
    headers: corsHeaders(init.headers),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: formId } = await context.params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        apiEnabled: true,
        apiAuthRequired: true,
        apiToken: true,
      },
    });

    if (!form) {
      return json({ error: "Form not found" }, { status: 404 });
    }

    if (!form.apiEnabled) {
      return json({ error: "API disabled" }, { status: 403 });
    }

    if (form.apiAuthRequired) {
      const token = getBearerToken(req);
      if (!token || !form.apiToken || !tokensMatch(token, form.apiToken)) {
        return json(
          { error: "Unauthorized" },
          {
            status: 401,
            headers: { "WWW-Authenticate": 'Bearer realm="form-entries"' },
          }
        );
      }
    }

    const url = new URL(req.url);
    const limit = parseLimitParam(url.searchParams.get("limit"));
    const offset = parseOffsetParam(url.searchParams.get("offset"));
    const since = parseIsoDateParam(url.searchParams.get("since"));
    const until = parseIsoDateParam(url.searchParams.get("until"));

    if (!since.ok || !until.ok) {
      return json({ error: "since and until must be ISO 8601 dates" }, { status: 400 });
    }

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (since.date) createdAt.gte = since.date;
    if (until.date) createdAt.lte = until.date;

    const where = {
      sourceFormId: formId,
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    };

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          createdAt: true,
          sourceVariant: { select: { id: true, name: true } },
          tasks: {
            take: 1,
            orderBy: { createdAt: "desc" },
            where: { formId },
            select: { description: true },
          },
        },
      }),
    ]);

    const entries = contacts.map((contact) => ({
      id: contact.id,
      createdAt: contact.createdAt.toISOString(),
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      variant: contact.sourceVariant,
      fields: parseFormDetails(contact.tasks[0]?.description),
    }));

    return json({
      form: { id: form.id, name: form.name },
      total,
      limit,
      offset,
      entries,
    });
  } catch (error) {
    console.error("GET /api/public/forms/[id]/entries error:", error);
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

// Allow CORS for cross-origin fetches if needed
function corsResponse(body: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Content-Type', 'application/json');
  return new NextResponse(JSON.stringify(body), { ...init, headers });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: formId } = await context.params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          orderBy: { order: "asc" }
        },
        appointmentType: {
          select: {
            id: true,
            name: true,
            duration: true,
            color: true,
            description: true,
            location: true,
            maxAdvanceDays: true,
            bufferAfter: true,
            schedule: { include: { slots: true } }
          }
        }
      }
    });

    if (!form) {
       return corsResponse({ error: "Form not found" }, { status: 404 });
    }

    if (!form.isActive) {
       return corsResponse({ error: "This form is no longer accepting submissions." }, { status: 400 });
    }

    // Never return sensitive organization or company DB IDs to the public internet
    // Strip everything except what is strictly needed to render the UI safely.
    const safeForm = {
        name: form.name,
        description: form.description,
        successAction: form.successAction,
        successMessage: form.successMessage,
        redirectUrl: form.redirectUrl,
        accentColor: form.accentColor,
        backgroundColor: form.backgroundColor,
        fields: form.fields.map(f => ({
            id: f.id,
            type: f.type,
            label: f.label,
            name: f.name,
            placeholder: f.placeholder,
            isRequired: f.isRequired,
            options: f.options ? f.options.split(",").map(o => o.trim()) : null
        })),
        appointmentType: form.appointmentType ? form.appointmentType : null
    };

    return corsResponse(safeForm);
  } catch (error: any) {
    console.error("GET /api/public/forms/[id] error:", error);
    return corsResponse({ error: "Internal Server Error" }, { status: 500 });
  }
}

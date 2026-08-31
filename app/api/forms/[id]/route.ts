import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const form = await prisma.form.findUnique({
      where: { id },
      include: {
         fields: {
            orderBy: { order: "asc" }
         },
         welcomeEmail: {
            select: { subject: true }
         }
      }
    });

    if (!form || form.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error: any) {
    console.error("GET /api/forms/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const existingForm = await prisma.form.findUnique({
      where: { id }
    });

    if (!existingForm || existingForm.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, isActive, successAction, successMessage, redirectUrl, welcomeEmailId, appointmentTypeId, accentColor, backgroundColor, fields } = body;

    // Colores de apariencia: hex "#RGB" o "#RRGGBB", o vacío/null para quitar
    const hexRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    const isValidColor = (value: unknown) =>
      value == null || String(value).trim() === "" || hexRe.test(String(value).trim());
    if (!isValidColor(accentColor) || !isValidColor(backgroundColor)) {
      return NextResponse.json({ error: "Los colores deben estar en formato hex (#RGB o #RRGGBB)" }, { status: 400 });
    }
    const cleanColor = (value: unknown): string | null => {
      if (value == null || String(value).trim() === "") return null;
      return String(value).trim();
    };

    // Use a transaction to safely update the form and recreate its fields
    const updatedForm = await prisma.$transaction(async (tx) => {
        // Update form base settings
        const formUpdate = await tx.form.update({
            where: { id: id },
            data: {
               name,
               description,
               isActive,
               successAction,
               successMessage,
               redirectUrl,
               welcomeEmailId: welcomeEmailId || null,
               appointmentTypeId: appointmentTypeId || null,
               accentColor: cleanColor(accentColor),
               backgroundColor: cleanColor(backgroundColor)
            }
        });

        if (fields && Array.isArray(fields)) {
            // Delete old fields
            await tx.formField.deleteMany({
                where: { formId: id }
            });

            // Insert new ones exactly matching the array
            if (fields.length > 0) {
                await tx.formField.createMany({
                   data: fields.map((f: any, index: number) => ({
                      formId: id,
                      type: f.type,
                      label: f.label,
                      name: f.name,
                      placeholder: f.placeholder || null,
                      isRequired: f.isRequired || false,
                      options: f.options || null,
                      order: index
                   }))
                });
            }
        }

        return formUpdate;
    });

    return NextResponse.json(updatedForm);
  } catch (error: any) {
    console.error("PUT /api/forms/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const session = await auth();
    if (!session?.user?.id) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const form = await prisma.form.findUnique({
      where: { id }
    });

    if (!form || form.organizationId !== currentOrganizationId) {
       return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    await prisma.form.delete({
       where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/forms/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

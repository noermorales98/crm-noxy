import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function generateApiToken(): string {
  return `noxy_${randomBytes(32).toString("hex")}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: formId } = await params;
    const orgId = (session as any).currentOrganizationId as string | undefined;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 400 }
      );
    }

    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: orgId,
      },
      include: {
        apiConfig: true,
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Formulario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: form.apiConfig || {
        id: null,
        formId,
        isEnabled: false,
        isPublic: false,
        apiToken: null,
      },
    });
  } catch (error) {
    console.error("Error fetching API config:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: formId } = await params;
    const orgId = (session as any).currentOrganizationId as string | undefined;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 400 }
      );
    }

    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: orgId,
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: "Formulario no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { isEnabled, isPublic } = body;

    const apiToken = !isPublic ? generateApiToken() : null;

    const apiConfig = await prisma.formApiConfig.upsert({
      where: {
        formId,
      },
      create: {
        formId,
        isEnabled: isEnabled ?? false,
        isPublic: isPublic ?? false,
        apiToken,
      },
      update: {
        isEnabled: isEnabled ?? false,
        isPublic: isPublic ?? false,
        ...(isPublic === false && { apiToken }),
      },
    });

    return NextResponse.json({
      success: true,
      data: apiConfig,
    });
  } catch (error) {
    console.error("Error updating API config:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: formId } = await params;
    const orgId = (session as any).currentOrganizationId as string | undefined;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 400 }
      );
    }

    const form = await prisma.form.findFirst({
      where: {
        id: formId,
        organizationId: orgId,
      },
      include: {
        apiConfig: true,
      },
    });

    if (!form || !form.apiConfig) {
      return NextResponse.json(
        { error: "Configuración de API no encontrada" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { regenerateToken } = body;

    if (regenerateToken === true) {
      const newToken = generateApiToken();
      
      const updatedConfig = await prisma.formApiConfig.update({
        where: {
          formId,
        },
        data: {
          apiToken: newToken,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedConfig,
      });
    }

    return NextResponse.json(
      { error: "Acción no válida" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error regenerating API token:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

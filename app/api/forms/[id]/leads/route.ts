import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
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

    if (!form.apiConfig || !form.apiConfig.isEnabled) {
      return NextResponse.json(
        { error: "La API no está habilitada para este formulario" },
        { status: 403 }
      );
    }

    if (!form.apiConfig.isPublic) {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (!token || token !== form.apiConfig.apiToken) {
        return NextResponse.json(
          { error: "Token de autorización inválido o faltante" },
          { status: 401 }
        );
      }
    }

    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "50"),
      100
    );
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.contact.findMany({
        where: {
          sourceFormId: formId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          sourceVariantId: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.contact.count({
        where: {
          sourceFormId: formId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching form leads:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

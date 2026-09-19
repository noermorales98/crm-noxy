import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { requireTeamManager } from "@/src/lib/require-team";
import {
  ALL_PERMISSIONS,
  normalizePermissions,
  parsePermissionsFromBody,
  type RoleName,
} from "@/src/lib/permissions";
import { isSexo } from "@/src/lib/user-sexo";

const USER_SELECT = { id: true, name: true, email: true, sexo: true } as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTeamManager();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const member = await prisma.organizationMember.findFirst({
    where: { id, organizationId: ctx.orgId },
    include: { user: { select: USER_SELECT } },
  });
  if (!member) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { role?: RoleName; permissions?: ReturnType<typeof parsePermissionsFromBody> } = {};
  const sexo = isSexo(body?.sexo) ? body.sexo : undefined;

  if (body?.role === "ADMIN" || body?.role === "MEMBER") {
    if (member.role === "OWNER") {
      return NextResponse.json({ error: "No se puede cambiar el rol del propietario" }, { status: 400 });
    }
    data.role = body.role;
  }

  if (body?.permissions && member.role !== "OWNER" && (data.role ?? member.role) !== "OWNER") {
    const nextRole = data.role ?? (member.role as RoleName);
    data.permissions = nextRole === "ADMIN" ? ALL_PERMISSIONS : parsePermissionsFromBody(body.permissions);
  }

  if (!data.role && !data.permissions && !sexo) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  if (sexo) {
    await prisma.user.update({
      where: { id: member.userId },
      data: { sexo },
    });
  }

  const updated = data.role || data.permissions
    ? await prisma.organizationMember.update({
        where: { id },
        data: {
          ...(data.role ? { role: data.role } : {}),
          ...(data.permissions ? { permissions: data.permissions as Prisma.InputJsonValue } : {}),
        },
        include: { user: { select: USER_SELECT } },
      })
    : await prisma.organizationMember.findFirstOrThrow({
        where: { id },
        include: { user: { select: USER_SELECT } },
      });

  return NextResponse.json({
    id: updated.id,
    role: updated.role,
    permissions: normalizePermissions(updated.permissions, updated.role as RoleName),
    createdAt: updated.createdAt,
    user: updated.user,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTeamManager();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const member = await prisma.organizationMember.findFirst({
    where: { id, organizationId: ctx.orgId },
  });
  if (!member) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (member.role === "OWNER") {
    return NextResponse.json({ error: "No se puede eliminar al propietario" }, { status: 400 });
  }
  if (member.userId === ctx.session.user.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  const userId = member.userId;
  await prisma.organizationMember.delete({ where: { id } });

  const remaining = await prisma.organizationMember.count({ where: { userId } });
  if (remaining === 0) {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}

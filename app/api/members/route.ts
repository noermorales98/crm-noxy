import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { hashPassword } from "@/src/lib/auth-utils";
import { requireTeamManager } from "@/src/lib/require-team";
import {
  ALL_PERMISSIONS,
  normalizePermissions,
  parsePermissionsFromBody,
  type RoleName,
} from "@/src/lib/permissions";
import { parseSexo, type Sexo } from "@/src/lib/user-sexo";

const USER_SELECT = { id: true, name: true, email: true, sexo: true } as const;

function serializeMember(member: {
  id: string;
  role: RoleName;
  permissions: Prisma.JsonValue | null;
  createdAt: Date;
  user: { id: string; name: string | null; email: string; sexo: Sexo };
}) {
  return {
    id: member.id,
    role: member.role,
    permissions: normalizePermissions(member.permissions, member.role),
    createdAt: member.createdAt,
    user: member.user,
  };
}

export async function GET() {
  const ctx = await requireTeamManager();
  if ("error" in ctx) return ctx.error;

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.orgId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: USER_SELECT } },
  });

  const rank: Record<RoleName, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
  members.sort((a, b) => rank[a.role as RoleName] - rank[b.role as RoleName]);

  return NextResponse.json(members.map((m) => serializeMember({ ...m, role: m.role as RoleName })));
}

export async function POST(req: Request) {
  const ctx = await requireTeamManager();
  if ("error" in ctx) return ctx.error;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role: RoleName = body?.role === "ADMIN" ? "ADMIN" : "MEMBER";
  const sexo = parseSexo(body?.sexo);

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nombre, correo y contraseña son obligatorios" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo" }, { status: 409 });
  }

  const permissions = role === "ADMIN" ? ALL_PERMISSIONS : parsePermissionsFromBody(body?.permissions);
  const passwordHash = await hashPassword(password);

  const member = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, passwordHash, sexo },
    });
    return tx.organizationMember.create({
      data: {
        role,
        permissions: permissions as Prisma.InputJsonValue,
        organizationId: ctx.orgId,
        userId: user.id,
      },
      include: { user: { select: USER_SELECT } },
    });
  });

  return NextResponse.json(serializeMember({ ...member, role: member.role as RoleName }), { status: 201 });
}

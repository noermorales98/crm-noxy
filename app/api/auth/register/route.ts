import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { hashPassword } from "@/src/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, organizationName } = await req.json();

    if (!email || !password || !organizationName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create User, Organization, and Member link in one transaction
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        organizations: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: organizationName,
                pipelines: {
                  create: {
                    name: "Sales Pipeline",
                    stages: {
                      create: [
                        { name: "Lead", order: 1, color: "#6B7280" },
                        { name: "Contactado", order: 2, color: "#3B82F6" },
                        { name: "Propuesta", order: 3, color: "#F59E0B" },
                        { name: "Ganado", order: 4, isWon: true, color: "#10B981" },
                        { name: "Perdido", order: 5, isLost: true, color: "#EF4444" },
                      ]
                    }
                  }
                }
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      { message: "User registered successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

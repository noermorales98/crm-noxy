import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const contacts = await prisma.contact.findMany({
      where: {
        organizationId: currentOrganizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(contacts);
  } catch (error: any) {
    console.error("GET /api/contacts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, companyId } = body;

    if (!firstName) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 });
    }

    // Verify company belongs to the same organization if provided
    if (companyId) {
       const company = await prisma.company.findUnique({
           where: { id: companyId }
       });
       if (!company || company.organizationId !== currentOrganizationId) {
           return NextResponse.json({ error: "Invalid company" }, { status: 400 });
       }
    }

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        companyId,
        organizationId: currentOrganizationId,
      },
      include: {
        company: { select: { id: true, name: true } }
      }
    });

    // Fire & Forget WhatsApp Notification Trigger
    if (session.user.id) {
      prisma.callMeBot.findUnique({
        where: { userId: session.user.id }
      }).then((config: any) => {
        if (config && config.phone && config.apiKey) {
           sendWhatsAppNotification(
             config.phone, 
             config.apiKey, 
             `🚨 New Lead Added: ${firstName} ${lastName || ""}\nCRM Noxy`
           );
        }
      });
    }

    return NextResponse.json(contact, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/contacts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentOrganizationId = (session as any).currentOrganizationId;
    if (!currentOrganizationId) {
      return NextResponse.json({ error: "No organization context" }, { status: 400 });
    }

    const body = await req.json();
    const { id, firstName, lastName, email, phone, companyId } = body;

    if (!id || !firstName) {
      return NextResponse.json({ error: "Contact ID and First name are required" }, { status: 400 });
    }

    // Verify contact belongs to the user's current organization
    const existingContact = await prisma.contact.findUnique({
      where: { id },
    });

    if (!existingContact || existingContact.organizationId !== currentOrganizationId) {
      return NextResponse.json({ error: "Contact not found or unauthorized" }, { status: 404 });
    }

    // Verify company belongs to the same organization if provided
    if (companyId) {
       const company = await prisma.company.findUnique({
           where: { id: companyId }
       });
       if (!company || company.organizationId !== currentOrganizationId) {
           return NextResponse.json({ error: "Invalid company" }, { status: 400 });
       }
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        companyId,
      },
      include: {
        company: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(contact);
  } catch (error: any) {
    console.error("PUT /api/contacts error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

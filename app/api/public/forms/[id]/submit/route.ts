import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

// Handle preflight CORS for cross-origin iframes
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Ensure proper headers are attached for cross-origin
function corsResponse(body: any, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Content-Type', 'application/json');
  return new NextResponse(JSON.stringify(body), { ...init, headers });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: formId } = await context.params;

    // Load the form to verify it exists, is active, and retrieve target company ID
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
         fields: true
      }
    });

    if (!form) {
      return corsResponse({ error: "Form not found" }, { status: 404 });
    }

    if (!form.isActive) {
      return corsResponse({ error: "This form is no longer accepting submissions." }, { status: 400 });
    }

    // Parse the submission data directly from the dynamic fields
    const submissionData = await req.json();

    // 1. We need to map standard fields like Name, Email, Phone if they exist in the form.
    // Different users might name their fields differently (e.g. "email" vs "correo").
    // We will attempt a best-guess mapping based on the `type` property of the `FormField`.

    let email = null;
    let phone = null;
    let firstName = "New Lead"; // Default if not found
    let lastName = null;

    // Extract custom mapped fields and standard ones
    const customNotes: string[] = [];

    // Loop through all database-saved fields for this exact form
    for (const field of form.fields) {
        if (field.type === "PREDEFINED_NAME") {
             const first = submissionData[`${field.name}_first`];
             const last = submissionData[`${field.name}_last`];
             if (first) firstName = String(first);
             if (last) lastName = String(last);
             continue;
        }

        if (field.type === "PHONE_LADA") {
             const code = submissionData[`${field.name}_code`];
             const num = submissionData[`${field.name}_number`];
             if (num) {
                 phone = `${code || "+52"} ${num}`;
             }
             continue;
        }

        const submittedValue = submissionData[field.name];

        if (submittedValue !== undefined && submittedValue !== null && submittedValue !== "") {
            
            const fName = field.name.toLowerCase();
            const fLabel = field.label.toLowerCase();

            // Try to map to standard Contact object properties
            if (field.type === "EMAIL" && !email) {
                email = typeof submittedValue === 'string' ? submittedValue : String(submittedValue);
            } else if ((field.type === "PHONE" || field.type === "NUMBER") && (fName.includes("phone") || fLabel.includes("phone") || fName.includes("tel") || fLabel.includes("tel") || fName.includes("numero") || fLabel.includes("numero") || fName.includes("número") || fLabel.includes("número")) && !phone) {
                phone = typeof submittedValue === 'string' ? submittedValue : String(submittedValue);
            } else if (field.type === "TEXT" && (fName.includes("last") || fName.includes("apellido") || fLabel.includes("last") || fLabel.includes("apellido")) && !lastName) {
                lastName = String(submittedValue);
            } else if (field.type === "TEXT" && (fName.includes("name") || fName.includes("nombre") || fLabel.includes("name") || fLabel.includes("nombre")) && firstName === "New Lead") {
                firstName = String(submittedValue);
            } else {
                // Formatting array values (like checkboxes)
                const valueString = Array.isArray(submittedValue) ? submittedValue.join(", ") : String(submittedValue);
                customNotes.push(`${field.label}: ${valueString}`);
            }
        }
    }

    const noteBody = customNotes.length > 0 ? `Form Details:\n${customNotes.join("\n")}` : "No additional fields provided.";

    // 2. Create the Lead Contact in the CRM immediately
    // Assigned automatically to the Form's Organization and Target Company.
    const newContact = await prisma.contact.create({
        data: {
             firstName,
             lastName,
             email,
             phone,
             organizationId: form.organizationId,
             companyId: form.companyId,
             source: `Form: ${form.name}`
        }
    });

    // 3. Log a Task describing the form fill if custom details were passed, 
    // to give sales reps immediate visibility.
    const owner = await prisma.organizationMember.findFirst({
        where: { organizationId: form.organizationId, role: "OWNER" }
    });

    if (owner) {
        await prisma.task.create({
            data: {
                title: `New Lead from Form: ${form.name}`,
                description: noteBody,
                isCompleted: false,
                organizationId: form.organizationId,
                contactId: newContact.id,
                assignedToId: owner.userId
            }
        });
    }

    // 4. Trigger Welcome Email if configured
    if (form.welcomeEmailId && email) {
        // Enqueue the email to be sent by creating a PENDING log
        await prisma.emailLog.create({
            data: {
                 campaignId: form.welcomeEmailId,
                 contactId: newContact.id,
                 status: "PENDING"
            }
        });
    }

    return corsResponse({ 
         success: true, 
         action: form.successAction, 
         message: form.successMessage, 
         redirectUrl: form.redirectUrl 
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST /api/public/forms/[id]/submit error:", error);
    return corsResponse({ error: "Internal Server Error" }, { status: 500 });
  }
}

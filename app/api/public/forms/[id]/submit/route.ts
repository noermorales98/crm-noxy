import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { sendWhatsAppNotification } from "@/src/lib/whatsapp";
import nodemailer from "nodemailer";

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
        fields: true,
        company: true,
        welcomeEmail: true,
        appointmentType: {
          include: { schedule: { include: { slots: true } } }
        }
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
        source: `Form: ${form.name}`,
        sourceFormId: form.id
      }
    });

    // 2b. If form is linked to an appointment type and __appointment_slot was submitted, book the appointment
    const appointmentSlot = submissionData["__appointment_slot"];
    if (form.appointmentType && appointmentSlot) {
      const { randomUUID } = await import("crypto");
      const apptType = form.appointmentType;
      const start = new Date(appointmentSlot);
      const end = new Date(start.getTime() + apptType.duration * 60000);

      // Check for conflicts
      const conflict = await prisma.appointment.findFirst({
        where: {
          appointmentTypeId: apptType.id,
          status: { not: "CANCELLED" },
          startTime: { lt: end },
          endTime: { gt: start }
        }
      });

      if (!conflict) {
        await prisma.appointment.create({
          data: {
            appointmentTypeId: apptType.id,
            organizationId: form.organizationId,
            contactId: newContact.id,
            startTime: start,
            endTime: end,
            timezone: submissionData["__timezone"] || "America/Mexico_City",
            status: "CONFIRMED",
            guestName: `${firstName}${lastName ? " " + lastName : ""}`,
            guestEmail: email || "",
            guestPhone: phone || null,
            notes: customNotes.length > 0 ? customNotes.join("\n") : null,
            cancelToken: randomUUID()
          }
        });
      }
    }

    // 3. Log a Task + send notifications to the owner
    const owner = await prisma.organizationMember.findFirst({
      where: { organizationId: form.organizationId, role: "OWNER" },
      include: { user: { select: { email: true, callMeBot: true } } }
    });

    if (owner) {
      await prisma.task.create({
        data: {
          title: `Nuevo lead en ${form.name}`,
          description: noteBody,
          isCompleted: false,
          organizationId: form.organizationId,
          contactId: newContact.id,
          formId: form.id,
          assignedToId: owner.userId
        }
      });

      const fullName = `${firstName}${lastName ? " " + lastName : ""}`;
      const appointmentSlotForNotif = submissionData["__appointment_slot"];
      const appointmentLine = appointmentSlotForNotif
        ? `\n📅 Cita agendada: ${new Date(appointmentSlotForNotif).toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" })}`
        : "";

      // 3a. Notificación por email — usa SMTP de la empresa del formulario
      const company = (form as any).company;
      const destEmail = owner.user?.callMeBot?.notificationEmail || owner.user?.email;

      if (destEmail && company?.smtpHost && company?.smtpUser && company?.smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: company.smtpHost,
            port: company.smtpPort || 465,
            secure: company.smtpSecure ?? true,
            auth: { user: company.smtpUser, pass: company.smtpPass },
          });

          const fieldsHtml = customNotes.map(n => `<li style="margin-bottom:4px">${n}</li>`).join("");
          await transporter.sendMail({
            from: `"Noxy CRM" <${company.smtpFromEmail || company.smtpUser}>`,
            to: destEmail,
            subject: `🔔 Nuevo lead en "${form.name}"`,
            html: `
                      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
                        <div style="background:#111;padding:20px 28px;border-radius:12px 12px 0 0">
                          <h2 style="color:#fff;margin:0;font-size:18px">🔔 Nuevo lead recibido</h2>
                          <p style="color:#aaa;margin:4px 0 0;font-size:13px">Formulario: <strong style="color:#fff">${form.name}</strong></p>
                        </div>
                        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
                          <table style="width:100%;border-collapse:collapse;font-size:14px">
                            <tr><td style="padding:6px 0;color:#6b7280;width:110px">Nombre</td><td style="padding:6px 0;font-weight:600">${fullName}</td></tr>
                            ${email ? `<tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0">${email}</td></tr>` : ""}
                            ${phone ? `<tr><td style="padding:6px 0;color:#6b7280">Teléfono</td><td style="padding:6px 0">${phone}</td></tr>` : ""}
                            ${appointmentSlotForNotif ? `<tr><td style="padding:6px 0;color:#6b7280">Cita</td><td style="padding:6px 0;color:#059669;font-weight:600">${new Date(appointmentSlotForNotif).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })}</td></tr>` : ""}
                          </table>
                          ${fieldsHtml ? `<div style="margin-top:16px;padding:14px;background:#f9fafb;border-radius:8px"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase">Campos adicionales</p><ul style="margin:0;padding-left:16px;font-size:13px;color:#374151">${fieldsHtml}</ul></div>` : ""}
                          <p style="margin-top:20px;font-size:12px;color:#9ca3af">Este lead fue creado automáticamente en tu CRM Noxy.</p>
                        </div>
                      </div>
                    `
          });
        } catch (err) {
          console.error("Email notification error:", err);
        }
      }

      // 3b. Notificación por WhatsApp vía CallMeBot
      if (owner.user?.callMeBot?.phone && owner.user?.callMeBot?.apiKey) {
        const waMsg = [
          `🔔 *Nuevo lead - ${form.name}*`,
          `👤 ${fullName}`,
          email ? `📧 ${email}` : null,
          phone ? `📞 ${phone}` : null,
          appointmentLine || null,
          customNotes.length > 0 ? `📋 ${customNotes.join(" | ")}` : null,
        ].filter(Boolean).join("\n");

        await sendWhatsAppNotification(
          owner.user.callMeBot.phone,
          owner.user.callMeBot.apiKey,
          waMsg
        ).catch(err => console.error("WhatsApp notification error:", err));
      }
    }

    // 4. Trigger Welcome Email if configured
    if (form.welcomeEmail && email) {
      // Enqueue the email log
      const log = await prisma.emailLog.create({
        data: {
          campaignId: form.welcomeEmail.id,
          contactId: newContact.id,
          status: "PENDING"
        }
      });
      
      // Attempt to send immediately since it's just 1 email
      const company = (form as any).company;
      if (company?.smtpHost && company?.smtpUser && company?.smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: company.smtpHost,
            port: company.smtpPort || 465,
            secure: company.smtpSecure ?? true,
            auth: { user: company.smtpUser, pass: company.smtpPass },
          });

          await transporter.sendMail({
            from: `"${company.name}" <${company.smtpFromEmail || company.smtpUser}>`,
            to: email,
            subject: form.welcomeEmail.subject,
            html: form.welcomeEmail.body,
          });

          await prisma.emailLog.update({
            where: { id: log.id },
            data: { status: "SENT", sentAt: new Date() }
          });
        } catch (err: any) {
          await prisma.emailLog.update({
            where: { id: log.id },
            data: { status: "FAILED", errorReason: err.message || "Failed to deliver welcome email" }
          });
        }
      } else {
        await prisma.emailLog.update({
          where: { id: log.id },
          data: { status: "FAILED", errorReason: "Company SMTP credentials not configured." }
        });
      }
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

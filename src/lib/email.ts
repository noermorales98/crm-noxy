import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Global SMTP transporter setup
 * Expects environment variables for SMTP details.
 * For local development, recommend something like Ethereal Email or direct SMTP config.
 */
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("SMTP credentials missing. Email send skipped.", { to, subject });
    // In dev mode without SMTP, you might just resolve to true
    return true; 
  }

  try {
    const info = await transporter.sendMail({
      from: `"CRM Noxy" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    
    console.log(`Message sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

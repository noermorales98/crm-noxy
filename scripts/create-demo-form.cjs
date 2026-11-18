// Crea (una sola vez) el formulario «Demo de Noxy CRM» al que envía la landing pública /demo.
// Uso: node scripts/create-demo-form.cjs   (lee DATABASE_URL del entorno). Es idempotente.
const { PrismaClient } = require("@prisma/client");

const NAME = "Demo de Noxy CRM";
const FIELDS = [
  { type: "TEXT", label: "Nombre", name: "nombre", isRequired: true, order: 0 },
  { type: "EMAIL", label: "Correo", name: "correo", isRequired: true, order: 1 },
  { type: "PHONE", label: "Teléfono", name: "phone", isRequired: false, order: 2 },
  { type: "TEXT", label: "Empresa", name: "empresa", isRequired: false, order: 3 },
  { type: "TEXTAREA", label: "¿Qué te gustaría resolver?", name: "mensaje", isRequired: false, order: 4 },
];

(async () => {
  const p = new PrismaClient();
  try {
    const existing = await p.form.findFirst({ where: { name: NAME }, select: { id: true, isActive: true } });
    if (existing) return console.log(`Ya existe «${NAME}» (${existing.isActive ? "activo" : "inactivo"}). No se crea nada.`);

    const org = await p.organization.findFirst({ where: { name: "Noxy Digital" }, select: { id: true } });
    if (!org) throw new Error("No se encontró la organización «Noxy Digital».");
    const company = await p.company.findFirst({ where: { organizationId: org.id, name: "Noxy Digital" }, select: { id: true } });
    if (!company) throw new Error("No se encontró la empresa «Noxy Digital».");

    const form = await p.form.create({
      data: {
        organizationId: org.id,
        companyId: company.id,
        name: NAME,
        description: "Solicitudes de demo que llegan desde la landing pública (/demo).",
        isActive: true,
        successMessage: "¡Gracias! Te contactaremos pronto para agendar tu demo.",
        showNoxyBrand: true,
        fields: { create: FIELDS },
      },
      select: { id: true },
    });
    console.log(`Formulario «${NAME}» creado (${form.id}) con ${FIELDS.length} campos.`);
  } finally {
    await p.$disconnect();
  }
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });

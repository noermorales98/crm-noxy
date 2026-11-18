export type LeadPerson = {
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
};

/** Bloque parseable al inicio de las notas del deal (form → deal sin Contact). */
export function formatLeadPersonNotes(person: LeadPerson, rest: string): string {
  const lines = [
    `Nombre: ${person.firstName}${person.lastName ? ` ${person.lastName}` : ""}`.trim(),
    person.email ? `Email: ${person.email}` : null,
    person.phone ? `Teléfono: ${person.phone}` : null,
    "",
    rest,
  ].filter((line): line is string => line !== null);
  return lines.join("\n").trim();
}

const lineValue = (notes: string, label: RegExp) => {
  const match = notes.match(label);
  return match?.[1]?.trim() || null;
};

/** Lee Nombre/Email/Teléfono del bloque guardado en notes del deal. */
export function parseLeadPersonFromNotes(notes: string | null | undefined, titleFallback?: string | null): LeadPerson | null {
  const text = (notes ?? "").trim();
  if (!text && !titleFallback?.trim()) return null;

  const email = lineValue(text, /^Email:\s*(.+)$/im);
  const phone = lineValue(text, /^Tel[eé]fono:\s*(.+)$/im);
  const full = lineValue(text, /^Nombre:\s*(.+)$/im) ?? titleFallback?.trim() ?? null;
  if (!full && !email && !phone) return null;

  const parts = (full ?? "Lead").split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Lead";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return { firstName, lastName, email, phone };
}

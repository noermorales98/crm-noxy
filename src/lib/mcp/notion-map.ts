export type LeadNotionFields = {
  title: string;
  email?: string | null;
  phone?: string | null;
  value?: number | null;
  stage?: string | null;
  source?: string | null;
  dealId?: string | null;
};

function text(content: string) {
  return [{ text: { content } }];
}

function filled(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Propiedades fijas de la base de leads. El título de la base debe llamarse Name. */
export function leadToNotionProperties(fields: LeadNotionFields): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Name: { title: text(fields.title) },
  };
  const email = filled(fields.email);
  const phone = filled(fields.phone);
  const stage = filled(fields.stage);
  const source = filled(fields.source);
  const dealId = filled(fields.dealId);
  if (email) properties.Email = { email };
  if (phone) properties.Phone = { phone_number: phone };
  if (fields.value != null) properties.Value = { number: fields.value };
  if (stage) properties.Stage = { rich_text: text(stage) };
  if (source) properties.Source = { rich_text: text(source) };
  if (dealId) properties["CRM Deal ID"] = { rich_text: text(dealId) };
  return properties;
}

export type ProjectSubmission = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  sourceForm: { id: string; name: string } | null;
  sourceVariant: { id: string; name: string } | null;
  extraFields: string | null;
};

export function isPlaceholderExtraFields(value: string | null | undefined): boolean {
  return !value || value === "No additional fields provided.";
}

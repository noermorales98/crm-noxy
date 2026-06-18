/** Display name for relation chips (strips legacy email suffix on contacts). */
export function displayRelationLabel(entityType: string, entityLabel: string): string {
  if (entityType === "CONTACT") {
    return entityLabel.replace(/\s*\([^)]*\)\s*$/, "").trim();
  }
  return entityLabel;
}

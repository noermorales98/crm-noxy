// Detección de duplicados (solo lectura): contactos que comparten correo o teléfono y
// formularios con el mismo nombre. Nunca borra ni fusiona: propone, tú confirmas.

export type ContactLite = { id: string; firstName: string; lastName: string | null; email: string | null; phone: string | null; createdAt: Date | string; sourceFormId?: string | null };
export type FormLite = { id: string; name: string; companyId?: string | null; isActive: boolean; createdAt: Date | string; submissions?: number };

export const normalizeEmail = (value: string | null | undefined): string | null => {
  const v = value?.trim().toLowerCase();
  return v && v.includes("@") ? v : null;
};

/** Últimos 10 dígitos: ignora lada (+52), espacios y guiones. Menos de 7 dígitos no cuenta. */
export const normalizePhone = (value: string | null | undefined): string | null => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : null;
};

export const normalizeName = (value: string): string =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type DuplicateGroup<T> = { reason: string; keep: T; duplicates: T[] };

function cluster<T extends { id: string; createdAt: Date | string }>(items: T[], keysOf: (item: T) => { key: string; reason: string }[]): DuplicateGroup<T>[] {
  const parent = new Map<string, string>(items.map((i) => [i.id, i.id]));
  const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  const seen = new Map<string, string>();
  for (const item of items) {
    for (const { key } of keysOf(item)) {
      const other = seen.get(key);
      if (other) {
        parent.set(find(item.id), find(other));
      } else seen.set(key, item.id);
    }
  }
  const groups = new Map<string, T[]>();
  for (const item of items) (groups.get(find(item.id)) ?? groups.set(find(item.id), []).get(find(item.id))!).push(item);
  const out: DuplicateGroup<T>[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const sorted = [...members].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const allReasons = new Set<string>();
    for (const m of members) for (const k of keysOf(m)) if (members.filter((x) => keysOf(x).some((kk) => kk.key === k.key)).length > 1) allReasons.add(k.reason);
    out.push({ reason: [...allReasons].join(" + "), keep: sorted[0], duplicates: sorted.slice(1) });
  }
  return out.sort((a, b) => b.duplicates.length - a.duplicates.length);
}

/** Se conserva el contacto más antiguo; el resto se propone como duplicado. */
export function findDuplicateContacts(contacts: ContactLite[]): DuplicateGroup<ContactLite>[] {
  return cluster(contacts, (c) => {
    const keys: { key: string; reason: string }[] = [];
    const email = normalizeEmail(c.email);
    const phone = normalizePhone(c.phone);
    if (email) keys.push({ key: `e:${email}`, reason: "mismo correo" });
    if (phone) keys.push({ key: `p:${phone}`, reason: "mismo teléfono" });
    return keys;
  });
}

/** Formularios con el mismo nombre (y misma empresa): se conserva el más antiguo. */
export function findDuplicateForms(forms: FormLite[]): DuplicateGroup<FormLite>[] {
  return cluster(forms, (f) => {
    const name = normalizeName(f.name);
    return name ? [{ key: `n:${f.companyId ?? ""}:${name}`, reason: "mismo nombre" }] : [];
  });
}

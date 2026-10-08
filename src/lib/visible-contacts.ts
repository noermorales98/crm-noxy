import type { Prisma } from "@prisma/client";

/** Contactos visibles en listas y selectores. Los de una empresa con contactos ocultos no entran. */
export const visibleContactWhere: Prisma.ContactWhereInput = {
  OR: [
    { companyId: null },
    { company: { is: { hideContacts: false } } },
  ],
};

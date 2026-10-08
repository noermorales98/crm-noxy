import { prisma } from "@/src/lib/db";
import { shareMetadata } from "@/src/lib/share-metadata";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await prisma.quote.findFirst({
    where: { publicToken: token },
    select: { folio: true, clientName: true, clientCompany: true },
  });
  const client = quote?.clientName?.trim();
  const company = quote?.clientCompany?.trim();
  const who = client ? `${client}${company ? `, ${company}` : ""}` : "";
  return shareMetadata({
    title: quote && client ? `Cotización ${quote.folio} — ${client}` : "Cotización",
    description: quote && who ? `Cotización ${quote.folio} para ${who}.` : "Cotización compartida.",
    path: `/cotizar/${token}`,
  });
}

export default function PublicQuoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}

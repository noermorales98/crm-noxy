import type { Metadata } from "next";
import { getPublicBaseUrl } from "@/src/lib/url";

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function clip(text: string, max = 160): string {
  const compact = clean(text);
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}

export function sharedDocCopy(isFolder: boolean, title: string): { title: string; description: string } {
  const name = clean(title);
  const kind = isFolder ? "Carpeta" : "Documento";
  const shared = isFolder ? "Carpeta compartida" : "Documento compartido";
  return {
    title: `${kind} — ${name}`,
    description: `${shared}: ${name}.`,
  };
}

export function shareMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const title = clean(input.title);
  const description = clip(input.description);
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  let url: string | undefined;
  try {
    url = `${getPublicBaseUrl()}${path}`;
  } catch {
    url = undefined;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(url ? { url } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

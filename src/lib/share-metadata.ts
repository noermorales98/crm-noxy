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

export function normalizeShareTags(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const tags = raw
    .split(",")
    .map((tag) => clean(tag))
    .filter(Boolean);
  if (tags.length === 0) return null;
  return tags.join(", ").slice(0, 500);
}

export function sharedDocCopy(
  isFolder: boolean,
  title: string,
  extras?: { publicTitle?: string | null; shareTags?: string | null },
): { title: string; description: string } {
  const folderName = clean(title);
  const publicName = clean(extras?.publicTitle ?? "");
  const name = publicName || folderName;
  const kind = isFolder ? "Carpeta" : "Documento";
  const shared = isFolder ? "Carpeta compartida" : "Documento compartido";
  const tags = normalizeShareTags(extras?.shareTags ?? "");
  const categories = tags ? ` Categorías: ${tags}.` : "";
  return {
    title: publicName || `${kind} — ${folderName}`,
    description: `${shared}: ${name}.${categories}`,
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

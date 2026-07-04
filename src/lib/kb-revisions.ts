import { prisma } from "@/src/lib/db";
import { DEFAULT_MARKDOWN_THEME } from "@/src/lib/kb-markdown-themes";

const MAX_REVISIONS_PER_PAGE = 100;

export type KbRevisionSnapshot = {
  title: string;
  emoji: string | null;
  iconColor: string | null;
  iconBg: string | null;
  content: string | null;
  markdownTheme: string;
  isPublished: boolean;
};

function snapshotsEqual(a: KbRevisionSnapshot, b: KbRevisionSnapshot) {
  return (
    a.title === b.title &&
    a.emoji === b.emoji &&
    a.iconColor === b.iconColor &&
    a.iconBg === b.iconBg &&
    (a.content ?? "") === (b.content ?? "") &&
    a.markdownTheme === b.markdownTheme &&
    a.isPublished === b.isPublished
  );
}

export async function createKbPageRevisionIfChanged(
  pageId: string,
  organizationId: string,
  savedById: string | undefined,
  snapshot: KbRevisionSnapshot
) {
  const last = await prisma.kbPageRevision.findFirst({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      emoji: true,
      iconColor: true,
      iconBg: true,
      content: true,
      markdownTheme: true,
      isPublished: true,
    },
  });

  if (last && snapshotsEqual(last, snapshot)) return null;

  const revision = await prisma.kbPageRevision.create({
    data: {
      pageId,
      organizationId,
      savedById: savedById ?? null,
      title: snapshot.title,
      emoji: snapshot.emoji,
      iconColor: snapshot.iconColor,
      iconBg: snapshot.iconBg,
      content: snapshot.content,
      markdownTheme: snapshot.markdownTheme || DEFAULT_MARKDOWN_THEME,
      isPublished: snapshot.isPublished,
    },
  });

  const overflow = await prisma.kbPageRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    skip: MAX_REVISIONS_PER_PAGE,
    select: { id: true },
  });

  if (overflow.length > 0) {
    await prisma.kbPageRevision.deleteMany({
      where: { id: { in: overflow.map((r) => r.id) } },
    });
  }

  return revision;
}

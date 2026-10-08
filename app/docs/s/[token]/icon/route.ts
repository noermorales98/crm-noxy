import { getShareByToken } from "@/src/lib/kb-share-access";
import { renderShareFaviconSvg } from "@/src/lib/share-favicon";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getShareByToken(token);
  const svg =
    share?.page.shareIcon && share.page.shareIconBg
      ? renderShareFaviconSvg(share.page.shareIcon, share.page.shareIconBg)
      : null;
  if (!svg) return new Response("Not found", { status: 404 });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

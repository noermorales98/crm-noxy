// Qué ha funcionado en los videos de una marca: rendimiento por tipo de gancho, plataforma y formato. Función pura.

export type VideoStat = {
  title: string;
  platform: string;
  hookType?: string | null;
  format?: string | null;
  views?: number | null;
  leadsGenerated?: number | null;
  durationSeconds?: number | null;
};

export type Bucket = { key: string; count: number; avgViews: number; totalLeads: number };

function bucketBy(videos: VideoStat[], pick: (v: VideoStat) => string | null | undefined): Bucket[] {
  const groups = new Map<string, VideoStat[]>();
  for (const v of videos) {
    const key = pick(v)?.trim();
    if (!key || v.views == null) continue;
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({
      key,
      count: list.length,
      avgViews: Math.round(list.reduce((s, v) => s + (v.views ?? 0), 0) / list.length),
      totalLeads: list.reduce((s, v) => s + (v.leadsGenerated ?? 0), 0),
    }))
    .sort((a, b) => b.avgViews - a.avgViews);
}

export type VideoInsights = { total: number; withViews: number; byHook: Bucket[]; byPlatform: Bucket[]; byFormat: Bucket[]; top: VideoStat[]; avgDuration: number | null };

export function summarizeVideos(videos: VideoStat[]): VideoInsights {
  const withViews = videos.filter((v) => v.views != null);
  const durations = withViews.map((v) => v.durationSeconds).filter((d): d is number => typeof d === "number" && d > 0);
  return {
    total: videos.length,
    withViews: withViews.length,
    byHook: bucketBy(videos, (v) => v.hookType),
    byPlatform: bucketBy(videos, (v) => v.platform),
    byFormat: bucketBy(videos, (v) => v.format),
    top: [...withViews].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 3),
    avgDuration: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null,
  };
}

const line = (label: string, buckets: Bucket[]) =>
  buckets.length ? `${label}: ${buckets.slice(0, 4).map((b) => `${b.key} (${b.count} video${b.count === 1 ? "" : "s"}, ${b.avgViews.toLocaleString("es-MX")} vistas en promedio${b.totalLeads ? `, ${b.totalLeads} leads` : ""})`).join("; ")}` : "";

/** Texto para la IA; si no hay datos suficientes lo dice, para que no invente tendencias. */
export function insightsText(name: string, insights: VideoInsights): string {
  if (insights.withViews < 3) {
    return `RENDIMIENTO DE VIDEOS DE «${name}»: hay ${insights.withViews} video(s) con vistas registradas; son pocos para sacar conclusiones. Dilo y propone ideas basadas en la voz de la marca, sin afirmar tendencias.`;
  }
  return [
    `RENDIMIENTO DE VIDEOS DE «${name}» (${insights.withViews} con vistas; cita los títulos al proponer):`,
    line("Por tipo de gancho", insights.byHook),
    line("Por plataforma", insights.byPlatform),
    line("Por formato", insights.byFormat),
    insights.avgDuration ? `Duración media: ${insights.avgDuration} s` : "",
    `Los que más rindieron: ${insights.top.map((v) => `«${v.title}» (${(v.views ?? 0).toLocaleString("es-MX")} vistas, ${v.platform}${v.hookType ? `, gancho ${v.hookType}` : ""})`).join("; ")}`,
  ].filter(Boolean).join("\n");
}

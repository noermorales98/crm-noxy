export type VideoMetrics = { reach: number | null; shares: number | null; saves: number | null; predictorScore: number | null; views: number | null; hookType: string | null; format: string | null; durationSeconds: number | null; publishedAt: Date | null; title: string };
export function engagement(v: Pick<VideoMetrics,'reach'|'shares'|'saves'>) {
 return v.reach && v.reach > 0 ? 100 * ((v.shares ?? 0) + (v.saves ?? 0)) / v.reach : null;
}
export function weeklyComparison(videos: VideoMetrics[]) {
 const ranked = videos.map(v=>({...v, engagementPct:engagement(v)})).filter(v=>v.engagementPct!==null).sort((a,b)=>b.engagementPct!-a.engagementPct!);
 const count = ranked.length ? Math.max(1,Math.ceil(ranked.length*.2)) : 0;
 const project=(rows:typeof ranked)=>rows.map(v=>({title:v.title,engagementPct:v.engagementPct,hookType:v.hookType,format:v.format,durationSeconds:v.durationSeconds,hour:v.publishedAt?.getUTCHours()??null,predictorScore:v.predictorScore,views:v.views}));
 return {total:videos.length, ranked:ranked.length, best:project(ranked.slice(0,count)),worst:project(ranked.slice(-count).reverse())};
}
export function weeklyText(result:ReturnType<typeof weeklyComparison>) {
 return `Videos: ${result.total}; con alcance: ${result.ranked}. Mejor 20%: ${result.best.map(v=>`${v.title} (${v.engagementPct?.toFixed(2)}%, hook ${v.hookType??'sin dato'}, formato ${v.format??'sin dato'}, ${v.durationSeconds??'?'}s, hora UTC ${v.hour??'?'}, predictor ${v.predictorScore??'?'}, vistas ${v.views??'?'})`).join('; ')||'sin datos'}. Peor 20%: ${result.worst.map(v=>`${v.title} (${v.engagementPct?.toFixed(2)}%)`).join('; ')||'sin datos'}.`;
}

// Tablero único de /pipeline: junta las etapas de todos los pipelines (o del elegido) en un solo conjunto de columnas.
// Funciones puras, sin base de datos.

export type BoardStage = { id: string; name: string; order: number; color?: string | null; isWon: boolean; isLost: boolean; deals: BoardDeal[] };
export type BoardDeal = { id: string; pipelineId?: string | null; createdAt?: string | Date | null; stageId?: string | null };
export type BoardPipeline = { id: string; name: string; stages: BoardStage[] };

export type BoardColumn = {
  key: string;
  name: string;
  color: string;
  isWon: boolean;
  isLost: boolean;
  /** Etapa que corresponde a esta columna en cada pipeline que la tiene. */
  stageByPipeline: Record<string, string>;
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const kindOf = (s: { isWon: boolean; isLost: boolean }) => (s.isLost ? 2 : s.isWon ? 1 : 0);

/**
 * Columnas del tablero: primero las abiertas, luego las ganadas y al final las perdidas; dentro de cada grupo, en el orden
 * de los pipelines y de sus etapas. Las etapas con el mismo nombre y tipo se juntan en una sola columna (p. ej. «Perdido»).
 */
export function buildBoardColumns(pipelines: BoardPipeline[]): BoardColumn[] {
  const columns = new Map<string, BoardColumn & { kind: number; seq: number }>();
  let seq = 0;
  for (const pipeline of pipelines) {
    for (const stage of [...pipeline.stages].sort((a, b) => a.order - b.order)) {
      const kind = kindOf(stage);
      const key = `${kind}:${norm(stage.name)}`;
      const existing = columns.get(key);
      if (existing) {
        existing.stageByPipeline[pipeline.id] = stage.id;
      } else {
        columns.set(key, { key, name: stage.name, color: stage.color || "#6B7280", isWon: stage.isWon, isLost: stage.isLost, stageByPipeline: { [pipeline.id]: stage.id }, kind, seq: seq++ });
      }
    }
  }
  return [...columns.values()].sort((a, b) => a.kind - b.kind || a.seq - b.seq).map(({ kind: _k, seq: _s, ...column }) => column);
}

/** Deals de una columna (de todos sus pipelines), el más reciente primero. */
export function dealsForColumn(pipelines: BoardPipeline[], column: BoardColumn): BoardDeal[] {
  const stageIds = new Set(Object.values(column.stageByPipeline));
  const deals = pipelines.flatMap((p) => p.stages.filter((s) => stageIds.has(s.id)).flatMap((s) => s.deals));
  return deals.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
}

/** Etapa a la que va un deal al soltarlo en una columna: la de su propio pipeline, o `null` si ese pipeline no tiene esa etapa. */
export function dropStageFor(column: BoardColumn, dealPipelineId: string | null | undefined): string | null {
  return (dealPipelineId && column.stageByPipeline[dealPipelineId]) || null;
}

/** Etapa para «Agregar deal» en una columna: la del pipeline elegido, o la primera que tenga. */
export function addStageFor(column: BoardColumn, preferredPipelineId?: string | null): string {
  return (preferredPipelineId && column.stageByPipeline[preferredPipelineId]) || Object.values(column.stageByPipeline)[0];
}

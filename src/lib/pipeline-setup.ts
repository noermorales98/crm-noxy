// Plan idempotente de etapas: compara las etapas existentes con las deseadas y devuelve
// operaciones (conservar / actualizar / crear). Nunca borra: lo que sobra queda como «legado».

export type DesiredStage = { name: string; aliases?: string[]; isWon?: boolean; isLost?: boolean; color: string };
export type ExistingStage = { id: string; name: string; order: number; isWon: boolean; isLost: boolean; color: string };
export type StageOp = {
  type: "keep" | "update" | "create";
  stageId?: string;
  name: string;
  order: number;
  isWon: boolean;
  isLost: boolean;
  color: string;
  changes: string[];
  legacy?: boolean;
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export const SALES_STAGES: DesiredStage[] = [
  { name: "Lead", color: "#6B7280" },
  { name: "Contactado", color: "#6B7280" },
  { name: "Cotizado", aliases: ["Propuesta"], color: "#8b5cf6" },
  { name: "Anticipo pagado", isWon: true, color: "#14b8a6" },
  { name: "En producción", isWon: true, color: "#0ea5e9" },
  { name: "Entregado", isWon: true, color: "#10b981" },
  { name: "Perdido", isLost: true, color: "#ef4444" },
];

export const EDITORIAL_PIPELINE_NAME = "Noxy Editorial";
export const EDITORIAL_STAGES: DesiredStage[] = [
  { name: "Entrevista", color: "#6B7280" },
  { name: "Manuscrito", color: "#8b5cf6" },
  { name: "Revisión", color: "#f59e0b" },
  { name: "Publicación KDP", isWon: true, color: "#10b981" },
  { name: "Perdido", isLost: true, color: "#ef4444" },
];

export function planStages(existing: ExistingStage[], desired: DesiredStage[]): StageOp[] {
  const pool = [...existing].sort((a, b) => a.order - b.order);
  const used = new Set<string>();
  const matched = desired.map((d) => {
    const names = [d.name, ...(d.aliases ?? [])].map(norm);
    const hit = pool.find((e) => !used.has(e.id) && names.includes(norm(e.name)));
    if (hit) used.add(hit.id);
    return { d, hit };
  });
  const leftovers = pool.filter((e) => !used.has(e.id));

  const open = matched.filter((m) => !m.d.isLost);
  const lost = matched.filter((m) => m.d.isLost);
  const ops: StageOp[] = [];
  const push = (op: Omit<StageOp, "order">) => ops.push({ ...op, order: ops.length + 1 });

  for (const { d, hit } of open) push(toOp(d, hit, ops.length + 1));
  for (const e of leftovers.filter((l) => !l.isLost)) {
    push({ type: "keep", stageId: e.id, name: e.name, isWon: e.isWon, isLost: e.isLost, color: e.color, changes: [], legacy: true });
  }
  for (const { d, hit } of lost) push(toOp(d, hit, ops.length + 1));
  for (const e of leftovers.filter((l) => l.isLost)) {
    push({ type: "keep", stageId: e.id, name: e.name, isWon: e.isWon, isLost: e.isLost, color: e.color, changes: [], legacy: true });
  }
  // «keep» solo si tampoco cambia el orden
  return ops.map((op) => {
    if (op.type !== "keep") return op;
    const prev = existing.find((e) => e.id === op.stageId)!;
    return prev.order === op.order ? op : { ...op, type: "update", changes: [`orden ${prev.order} → ${op.order}`] };
  });
}

function toOp(d: DesiredStage, hit: ExistingStage | undefined, order: number): Omit<StageOp, "order"> {
  const isWon = !!d.isWon;
  const isLost = !!d.isLost;
  if (!hit) return { type: "create", name: d.name, isWon, isLost, color: d.color, changes: ["crear"] };
  const changes: string[] = [];
  if (hit.name !== d.name) changes.push(`nombre «${hit.name}» → «${d.name}»`);
  if (hit.isWon !== isWon) changes.push(`isWon ${hit.isWon} → ${isWon}`);
  if (hit.isLost !== isLost) changes.push(`isLost ${hit.isLost} → ${isLost}`);
  if (hit.order !== order) changes.push(`orden ${hit.order} → ${order}`);
  // El color existente se respeta salvo que la etapa cambie de nombre/rol.
  const color = changes.some((c) => c.startsWith("nombre") || c.startsWith("isWon")) ? d.color : hit.color;
  return { type: changes.length ? "update" : "keep", stageId: hit.id, name: d.name, isWon, isLost, color, changes };
}

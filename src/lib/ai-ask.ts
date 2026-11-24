// Preguntas sugeridas para «Preguntarle a la IA», según el tipo de registro. Función pura.

const BY_PAGE: Record<string, string[]> = {
  appointment: ["Resume lo acordado en esta cita", "¿Qué pasos siguientes salen de esta cita?", "Redacta un correo de seguimiento para esta persona"],
  kb: ["Resume este doc en 5 puntos", "¿Qué le falta a este doc?", "Mejora la redacción de este doc"],
  deal: ["¿Cómo va este deal y qué sigue?", "Redacta un mensaje de seguimiento para este deal", "¿Qué riesgos ves en este deal?", "¿Esta venta ya terminó o sigue a mitad de proceso?"],
  content_client: ["Propón 5 ideas de contenido para esta marca", "¿Qué tipo de gancho le ha funcionado mejor?", "¿Qué piezas están atrasadas o por subir?"],
  content_item: ["Mejora el gancho de esta pieza", "Escribe un guion para esta pieza", "Revisa el tono y la ortografía de esta pieza"],
};

const FALLBACK = ["¿Qué debería revisar aquí?", "Hazme un resumen de esto"];

export function suggestedQuestions(page: string): string[] {
  return BY_PAGE[page] ?? FALLBACK;
}

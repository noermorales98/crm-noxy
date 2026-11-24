import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listSkills, saveSkills } from "@/src/lib/ai-skills-store";
import { expandSkill, matchSkill, slugCommand } from "@/src/lib/ai-skills";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

/** Habilidades del asistente (comandos /…): ver, pedir su prompt ya armado y guardar nuevas. Borrar se hace desde Ajustes. */
export function registerSkillTools(server: McpServer, organizationId: string) {
  server.registerTool(
    "list_ai_skills",
    { description: "Lista las habilidades del asistente (comandos /guion, /resumen-semanal…) con sus instrucciones.", inputSchema: {} },
    async () => json(await listSkills(organizationId)),
  );

  server.registerTool(
    "get_ai_skill_prompt",
    {
      description: "Devuelve el prompt ya armado de una habilidad para un pedido, listo para ejecutarlo tú: `/guion reel de café` → instrucciones + pedido.",
      inputSchema: { command: z.string().describe("Comando con o sin barra, p. ej. guion"), request: z.string().optional().describe("Lo que se pide a la habilidad") },
    },
    async ({ command, request }) => {
      const skills = await listSkills(organizationId);
      const matched = matchSkill(`/${slugCommand(command)} ${request ?? ""}`, skills);
      if (!matched) return err(`No hay una habilidad activa con el comando /${slugCommand(command)}`);
      return json({ command: matched.skill.command, prompt: expandSkill(matched.skill, matched.rest) });
    },
  );

  server.registerTool(
    "save_ai_skill",
    {
      description: "Crea o actualiza una habilidad propia del asistente. No toca las de fábrica.",
      inputSchema: {
        command: z.string().describe("Comando sin barra, p. ej. ideas"),
        name: z.string().optional(),
        description: z.string().optional(),
        instructions: z.string().describe("Qué debe hacer la IA"),
        enabled: z.boolean().optional(),
      },
    },
    async ({ command, name, description, instructions, enabled }) => {
      const slug = slugCommand(command);
      if (!slug) return err("Comando no válido");
      const all = await listSkills(organizationId);
      const custom = all.filter((s) => !s.builtin && s.command !== slug);
      const disabledFactory = all.filter((s) => s.builtin && !s.enabled).map((s) => s.id);
      if (all.some((s) => s.builtin && s.command === slug)) return err(`/${slug} es una habilidad de fábrica; elige otro comando`);
      const saved = await saveSkills(organizationId, {
        custom: [...custom, { id: `custom-${slug}`, command: slug, name: name ?? slug, description: description ?? "", instructions, enabled: enabled ?? true }],
        disabledFactory,
      });
      return json(saved.find((s) => s.command === slug) ?? { error: "No se guardó" });
    },
  );
}

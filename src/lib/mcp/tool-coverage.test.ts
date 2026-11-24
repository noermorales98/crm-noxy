import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

// Lee el código de las herramientas (sin base de datos) y fija qué verbos tiene cada entidad: crear, ver, editar, borrar.
const dir = new URL(".", import.meta.url);
const source = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
const tools = new Set([...source.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]));

/** entidad → herramientas que debe tener para poder crearla, verla, editarla y borrarla. */
const COVERAGE: Record<string, string[]> = {
  contactos: ["create_contact", "list_contacts", "get_contact", "update_contact", "delete_contact"],
  empresas: ["create_company", "list_companies", "get_company", "update_company", "delete_company"],
  deals: ["create_deal", "list_deals", "get_deal", "update_deal", "delete_deal", "archive_deal"],
  tareas: ["create_task", "list_tasks", "get_task", "update_task", "delete_task"],
  cotizaciones: ["create_quote_for_deal", "list_quotes", "get_quote", "update_quote", "delete_quote"],
  pipelines: ["create_pipeline", "list_pipelines", "update_pipeline", "delete_pipeline"],
  etapas: ["create_stage", "update_stage", "delete_stage"],
  formularios: ["create_form", "list_forms", "get_form", "update_form", "delete_form"],
  proyectos: ["create_project", "list_projects", "get_project", "update_project", "delete_project"],
  "clientes recurrentes": ["create_client", "list_clients", "get_client", "update_client", "delete_client"],
  citas: ["create_appointment", "list_appointments", "get_appointment", "update_appointment", "delete_appointment"],
  docs: ["create_kb_page", "list_kb_pages", "get_kb_page", "update_kb_page", "delete_kb_page"],
  "clientes de contenido": ["create_content_client", "list_content_clients", "get_content_client", "update_content_client", "delete_content_client"],
  "piezas de contenido": ["create_content_item", "list_content_items", "get_content_item", "update_content_item", "delete_content_item"],
  "habilidades de la IA": ["list_ai_skills", "get_ai_skill_prompt", "save_ai_skill"],
  notificaciones: ["list_notifications", "mark_notification_read", "delete_notification"],
  organizaciones: ["list_organizations", "get_organization", "create_organization", "update_organization", "get_agency_overview"],
};

test("cada entidad del CRM se puede crear, ver, editar y borrar desde el MCP", () => {
  for (const [entity, expected] of Object.entries(COVERAGE)) {
    const missing = expected.filter((name) => !tools.has(name));
    assert.deepEqual(missing, [], `${entity}: faltan ${missing.join(", ")}`);
  }
});

test("todo borrado exige aprobación humana (approvalToken) y ninguna herramienta borra una organización", () => {
  const deletes = [...tools].filter((name) => name.startsWith("delete_") && name !== "delete_notification");
  for (const name of deletes) {
    const start = source.indexOf(`"${name}"`);
    const block = source.slice(start, start + 1600);
    assert.ok(/approvalToken|TOKEN/.test(block), `${name} debe pedir approvalToken`);
    assert.ok(/gate\(|gateWrite\(/.test(source.slice(start, start + 3200)), `${name} debe pasar por la compuerta de aprobación`);
  }
  assert.equal(tools.has("delete_organization"), false);
});

test("no hay nombres de herramienta repetidos", () => {
  const all = [...source.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(all).size, all.length);
});

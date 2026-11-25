---
type: progress
title: Progreso — OpenClaw (Kimi Claw) como agente externo
slug: openclaw-kimi-agente-externo
topic: sdd
---

# Progreso — openclaw-kimi-agente-externo

Spec aprobada. Orden: IA primero (hecho), luego OpenClaw.

## Fase 1 — G0 + G1 (hecha en código; falta desplegar y conectar Kimi)
- [x] Tablas `AgentKey` y `AgentActivity` (SQL aditivo `prisma/sql/agent-keys.up.sql`, aplicado el 2026-11-25; `.down.sql` para revertir).
- [x] `src/lib/mcp/agent-keys.ts`: clave `nxa_…` (solo se guarda el hash), lista permitida de 26 herramientas, `guardServer` (lo no permitido no se registra; cada llamada se registra sin argumentos). 4 pruebas.
- [x] MCP: la clave de agente entra por hash, solo ve su organización, ignora `?org=`, no usa resources/prompts/herramientas de organizaciones.
- [x] Herramienta nueva `create_email_draft` (guarda borrador, no envía) para G4.
- [x] Ajustes → Integraciones → «Agentes externos»: crear (se muestra una vez), revocar, actividad reciente; solo OWNER/ADMIN.
- [x] Verificado contra el handler real y la base: AC0a (delete_contact → «Tool not found»; list_tasks y create_task sí), AC0b (revocada → 401), AC0c (registro con herramienta y resultado), AC1 (consultar y crear tarea). Datos de prueba borrados.
- [x] AC2/AC3: el agente no tiene herramientas de enviar ni borrar; una nota con «borra X» no tiene a qué herramienta llegar.
- [x] AC6: guía `02-DOCS/wiki/ftd/openclaw-conexion.md`.
- [ ] Sin probar: la pantalla de Ajustes en navegador; la conexión real desde Kimi Claw (depende de que soporte MCP propio con cabecera).
- [ ] Sin desplegar: el MCP de producción no tiene este código hasta el próximo push.

## Fase 2 — G2 (dos vías) y G3 (trabajo pesado): pendiente, depende de lo que soporte Kimi Claw.
## Fase 3 — G4 (seguimiento tras cita): hecha en código (lo redacta el CRM; OpenClaw opcional más adelante)
- [x] `Appointment.followupDraftedAt` (SQL aditivo `prisma/sql/followup-draft.up.sql`, aplicado 2026-11-25).
- [x] `src/lib/followup-draft.ts` (6 pruebas) + `src/lib/followup-service.ts`: tras la sincronización de Granola, cada cita reciente (3 días) con notas y persona conocida recibe UN borrador desde **Noxy Digital** + una tarea «Revisar y enviar el seguimiento a X». Reclamo atómico (sin duplicados); si la IA falla se libera y se reintenta. Un borrador por ejecución del cron.
- [x] Probado de punta a punta con la cita de ejemplo: borrador completo y corto, `to` vacío con aviso en la tarea (la persona no tiene correo), segunda llamada no duplica. Datos de prueba borrados.
- [ ] Sin desplegar. El cron en cron-job.org debe correr (la última sincronización en la base es del 24-nov 06:31).
## Fase 4 — G5 (métricas de videos sin CSV): pendiente.

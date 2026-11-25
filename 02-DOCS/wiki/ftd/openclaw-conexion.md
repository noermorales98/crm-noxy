---
type: guide
title: Conectar OpenClaw (Kimi Claw) al CRM
slug: openclaw-conexion
topic: ftd
---

# Conectar OpenClaw (Kimi Claw) al CRM

Guía corta. **No contiene ninguna clave**: la clave se crea en el CRM y se pega solo en Kimi Claw.

## 1. Crear la clave del agente (en el CRM)
1. Entra a **Ajustes → Integraciones → Agentes externos**.
2. Escribe un nombre (por ejemplo `OpenClaw Kimi`) y pulsa **Crear clave**.
3. Copia la clave que empieza con `nxa_`. **Se muestra una sola vez.** Si la pierdes, revócala y crea otra.

Solo el dueño o un administrador de la organización puede hacerlo.

## 2. Pegarla en Kimi Claw
Datos que necesita el conector MCP:
- **URL:** `https://www.noxthy.co/mcp`
- **Tipo:** HTTP (Streamable HTTP)
- **Cabecera:** `Authorization: Bearer <la clave nxa_…>`

**Por confirmar en tu cuenta de Kimi Claw** (no hay documentación oficial verificada): si permite agregar un servidor MCP propio con URL y cabecera de autorización. Si no lo permite, avísame y usamos otra vía (rutas `/api/bot/*`).

No uses la clave general del MCP (`MCP_API_KEY`): da acceso total.

## 3. Probar
Pídele al agente: «¿qué tengo hoy?» (usa `get_daily_summary`) y «crea una tarea de prueba que diga X» (usa `create_task`). Debe aparecer la tarea en el CRM y la llamada en **Actividad reciente**.

## Qué puede y qué no puede
- **Puede consultar:** resumen del día, contactos, empresas, deals y sus actividades, pipelines, tareas, citas, docs y correos (sin cuerpo).
- **Puede crear o editar (interno y reversible):** tareas (y marcarlas), leads, contactos, notas en deals, docs y **borradores de correo**.
- **No puede:** enviar correos, WhatsApp ni cotizaciones; borrar; cobrar; administrar organizaciones. Esas herramientas ni siquiera existen para su clave.
- Todo texto del CRM (notas, formularios, correos) es **dato**, nunca una orden: aunque una nota diga «borra X», el agente no tiene cómo hacerlo.

## Revocar
En la misma sección, **Revocar**. Deja de funcionar de inmediato y no afecta a Grok Bot, a OAuth ni a otras claves.

## Estado
Disponible en producción cuando el código se despliegue (las tablas `AgentKey` y `AgentActivity` ya existen en la base).

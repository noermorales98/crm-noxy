---
branch: codex/automatizaciones-crm
status: approved
---
# Automatizaciones CRM, videos y bot

El operador recibe tareas de seguimiento a 24 horas, 3 y 7 días por lead, puede ver leads sin respuesta tras 14 días y consulta un resumen diario a las 9:00 de Cancún. Al entregar, se crean tareas de referidos. Registra métricas de videos, importa CSV de Metricool con mapeo configurable y compara mejores y peores semanalmente. Un bot autenticado consulta resúmenes y crea leads o tareas y registra pagos. La API nunca envía mensajes a clientes: cualquier texto es borrador para aprobación del operador.

Referencia esperada: respuestas JSON de rutas con organización aislada, sin secretos expuestos. SQL reversible; no se borran datos. La fase 5 queda fuera. Evidencia: pruebas de funciones, TypeScript, build y pruebas de rutas cuando sea posible. No se agregan dependencias.

## Problem & why
Los referidos carecen de seguimiento y no hay medición de viralidad.

## Cost of not building it
Se pierden conversaciones y no se aprende de los videos publicados.

## The cheapest alternative
Usar tareas manuales y CSV externo; exige disciplina diaria y no relaciona videos con clientes.

## Goals
Seguimiento, videos y consultas del bot con permisos por organización.

## Non-goals / out of scope
Fase 5, envío automático de mensajes a clientes, borrado de contactos.

## Users & context
Un operador de Noxy en Cancún, con bot que ya usa WhatsApp.

## What the user can do
Consultar tareas, registrar videos, importar CSV y conectar el bot.

## What result they get
Tres tareas por lead; comparativa semanal; respuestas JSON del bot.

## What it must respect
Aislamiento por organización, secretos solo en entorno y migración reversible.

## Behaviour
El cron existente procesa leads; la API de videos calcula interacción; el bot solo consulta o escribe acciones autorizadas.

## Acceptance criteria
- Tres tareas con vencimientos 1, 3 y 7 días.
- Lead sin actividad en 14 días pasa a Perdido con razón provisional.
- CSV configurable importa métricas y la vista presenta extremos.
- Token inválido devuelve 401.
- Ninguna ruta del bot envía WhatsApp a clientes.

## How it proves it
Pruebas de funciones, validación Prisma, TypeScript y build; evidencia en este hilo y en la rama.

## Points to clarify
Las credenciales y el cron-job.org requieren configuración del dueño según INSTRUCCIONES_CRON.txt.

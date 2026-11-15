---
title: Verificación de API del bot y MCP
---

# Verificación de API del bot y MCP

## Intención

Explicar los códigos 401 y 400 observados y asegurar que el bot pueda crear leads con fuente y referente, tareas y confirmar pagos pendientes mediante HTTP o MCP.

## Alcance

- Mantener autenticación Bearer separada: `NOXY_BOT_TOKEN` para HTTP y OAuth o `MCP_API_KEY` para MCP.
- Validar entradas y pertenencia de contactos, referentes y deals a la organización.
- Mantener las rutas de lectura y escritura ya publicadas; no enviar WhatsApp a clientes.
- Evitar convertir pagos cancelados en recibidos y detectar cambios concurrentes.

## Checklist

- [x] Diagnóstico: 401 sin token y 400 con JSON incompleto eran respuestas esperadas.
- [x] HTTP lead acepta fuente, contacto y referente; tarea acepta fecha y vínculos; videos acepta semanas.
- [x] MCP lead acepta referente y pago rechaza estados distintos de Pendiente.
- [x] Pruebas de esquemas de entrada y aprobación MCP.
- [x] Build local con `DATABASE_URL` configurada y revisión de tipos en los archivos modificados.
- [ ] Verificación de rutas en producción tras publicar.

## Evidencia

Las pruebas iniciales de producción dieron 200 en `/api/bot/daily` y `/api/bot/weekly-videos` con token, 401 sin token, y 400 para POST con cuerpos vacíos. La prueba directa de `/mcp` con `vercel env pull` no fue válida: Vercel entrega secretos vacíos al exportarlos desde este acceso. No se debe interpretar ese 401 como fallo del conector OAuth de Grok.

Después del cambio, `node --test src/lib/bot-input.test.ts src/lib/mcp/approval.test.ts` pasó 5/5. La suite completa pasó 301/305; los cuatro fallos son los mismos contratos de marca anteriores. `npm run build` terminó con código 0 al usar la URL de base de datos del entorno local.

## Siguiente paso

Publicar en main, confirmar despliegue Ready y verificar las respuestas de las rutas sin crear datos falsos en producción.

# Pendientes del CRM de Noxy

Actualizado: 2026-11-14. Marca `[x]` cuando algo quede hecho y verificado.
Detalle técnico de la Fase 1: `02-DOCS/wiki/ftd/fase1-crm-seguimiento-referidos.md`.

## 1. Cosas que solo puedes hacer tú
- [ ] Dar de alta el cron en cron-job.org: `GET https://crm-noxy.vercel.app/api/cron/payment-alerts`, cada hora, header `Authorization: Bearer <CRON_SECRET>`. Sin esto no salen las alertas de cobro (2 días antes).
- [ ] Decidir a qué etapa pasan los 3 deals que están en «Ganado» (etapa legado): «Entregado» o «En producción». Cuando queden vacíos, «Ganado» se puede quitar.
- [ ] Revisar y confirmar la limpieza de duplicados (nada se ha borrado):
  - Formularios: «Agenda tu demo para tu website» (2 copias) y «Solicita información» (2 copias). Se propone conservar el más antiguo de cada uno.
  - Contactos: 22 grupos, 30 sobrantes (reporte en `/api/reports/duplicates`).
- [ ] Revisar y editar las plantillas de tareas por servicio (Videos con IA, Gestión de redes, Sitio web, Libro Editorial, General). Son un borrador mío; viven en `src/lib/project-templates.ts` y, una vez usadas, en la tabla `ProjectTemplate`.
- [ ] Confirmar si «Publicación KDP» debe contar como venta ganada (hoy sí: es la etapa final del pipeline Editorial y está marcada como ganada).
- [ ] Decidir qué hacer con la organización «Test Agency» (no se tocó; no tiene el pipeline Editorial ni las etapas nuevas).
- [ ] Revisar las 212 tareas y 2 citas que existen en la base: me dijiste 0. Puede que estén completadas o que vengan de formularios.
- [ ] Hacer commit de la Fase 1 (todo está sin commit en `main`).

## 2. Pruebas de la Fase 1 que faltan (no se ejercitaron en la app real)
- [ ] Enviar un formulario real y ver que aparece contacto + tarea + deal en «Lead» con su fuente.
- [ ] Mover un deal a «Anticipo pagado» y ver que se crea el proyecto con sus tareas base (y que al pasar a «En producción» o «Entregado» no se duplica).
- [ ] Ver el pipeline Editorial en pantalla (ver sección 6).
- [ ] Elegir un cliente en «Referido por» dentro de un lead y comprobar que aparece en la ficha del cliente («Referidos que trajo»).
- [ ] Probar la alerta de cobro con un pago pendiente que venza en 2 días.
- [ ] Probar el script `down` (`prisma/sql/fase1_crm.down.sql`) en una copia de la base antes de necesitarlo de verdad.
- [ ] Levantar la app y revisar en navegador: ficha del cliente, selector «Referido por», etiquetas TikTok/Facebook.

## 3. Mejoras menores de la Fase 1 que quedaron fuera
- [ ] «Referido por» solo lista clientes en la pantalla; contactos solo por API/MCP. Añadir buscador de contactos.
- [ ] Los pagos de un deal no muestran el chip «Vencido» en pantalla (las mensualidades de clientes sí).
- [ ] El contenido y los videos de un cliente no están ligados a `Client` (hoy `ContentClient` va aparte). Se resuelve junto con la Fase 3.
- [ ] Limpieza de duplicados: falta la acción de fusionar con confirmación (hoy solo hay reporte).
- [ ] Deals retroactivos para los ~213 contactos de formularios: decidido que NO; solo reporte. Reabrir si cambias de idea.
- [ ] El proyecto creado al ganar un deal no se liga automáticamente a un cliente recurrente si el contacto no está registrado como cliente.
- [ ] Hay una prueba de `rsc risk` / revisión de código pendiente sobre estos cambios (no se corrió el revisor).

## 4. Deuda que ya existía (no es de esta fase)
- [ ] 4 pruebas que fallan desde antes: contratos de diseño (`primary action foreground…`), formularios públicos sin movimiento (2) y favicon/metadata.
- [ ] 20 errores de TypeScript preexistentes, casi todos en archivos `*.test.ts`.
- [ ] `prisma/migrations` casi vacía y SQL suelto en `prisma/`; el flujo real es `db:push`.

## 5. Fases siguientes (sin empezar)
### Fase 2: seguimiento automático
- [ ] Al crear un lead: tareas a las 24 h, 3 días y 7 días, con mensaje sugerido de WhatsApp para aprobar y copiar.
- [ ] Lead sin respuesta en 14 días → «Perdido» y pedir motivo.
- [ ] Resumen diario a las 9 am (Cancún): tareas vencidas, deals estancados, cotizaciones sin respuesta, pagos por vencer. Ya existe `/api/cron/digest` (IA + CallMeBot); falta ampliarlo.
- [ ] Al entregar un proyecto: tarea «pedir 2 referidos» y «agradecer a quien refirió».

### Fase 3: métricas de videos
- [ ] Tabla `videos` ligada a cliente/marca y a la pieza de contenido, con todos los campos pedidos (hook, tipo de hook, formato, duración, herramienta de IA, prompt, alcance, vistas, retención a 3 s, compartidos, guardados, comentarios, leads, puntaje predictor, notas).
- [ ] Cálculo (compartidos + guardados) / alcance.
- [ ] Importar CSV de Metricool con mapeo de columnas configurable (API de Metricool como opción futura).
- [ ] Vista semanal: tu 20 % mejor contra el 20 % peor por tipo de hook, formato, duración y hora.
- [ ] Comparar puntaje predictor contra resultado real.
- [ ] Endpoint con el resumen semanal en texto para el bot.

### Fase 4: integración con el bot (Grok)
- [ ] Endpoints o webhooks protegidos con token (sin secretos en código).
- [ ] El bot podrá: pedir el resumen diario, pedir el reporte semanal de videos, crear un lead o tarea y marcar un pago como recibido.
- [ ] Todo mensaje a un cliente requiere tu aprobación explícita.
- [ ] Decidir: ¿el bot habla con el CRM por el MCP que ya existe o por endpoints HTTP nuevos?

### Fase 5: servicio para clientes (solo ideas)
- [ ] «Seguimiento automatizado a tu base»: plantilla reutilizable de la Fase 2 para listas de contactos de clientes.
- [ ] Reporte mensual de Muse reenviado al cliente en PDF.

## 6. Dónde ver lo hecho
- **Pipeline Editorial:** menú Pipeline (`/pipeline`). Arriba del tablero hay un selector de pipeline (aparece porque ahora hay dos). Elige «Noxy Editorial».
- **Reporte de referidos:** `/api/reports/referrals` (aún sin pantalla propia; en la ficha de cada cliente ves sus referidos).
- **Duplicados:** `/api/reports/duplicates` (solo lectura, aún sin pantalla).
- **Perfil del cliente:** `/pipeline/clientes/<id>`.

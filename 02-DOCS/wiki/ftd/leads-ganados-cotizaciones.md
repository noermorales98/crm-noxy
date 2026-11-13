---
author: Noeli
branch: main
status: in-progress
---

# Leads ganados, cotizaciones ligadas al lead y rediseño del lead

## Intent
Que los leads ganados cuenten como ventas en resúmenes y MCP, que una cotización pueda crearse desde un lead o vincularse a uno existente, y mejorar la UX/UI del lead (`/pipeline/:id`), los interruptores de formularios y la barra de `/kb/:id`.

## Scope
- Ronda 1 (datos): `Quote.dealId` opcional (un lead, varias cotizaciones). Crear desde el lead abre `/cotizaciones/nueva?dealId=…` con cliente, moneda y un concepto con el valor. Vincular/desvincular con `PATCH /api/quotes/:id`.
- Ventas = leads en etapa ganada; «este mes» por `updatedAt`, igual que Inicio. Resumen (`digest`), `/api/sales/metrics` y `get_sales_metrics` incluyen `wonSales`.
- MCP: `list_quotes` (dealId/unlinked), `link_quote_to_deal`, `create_quote_for_deal`, `get_deal` con cotizaciones, `list_deals` con `status`.
- Ronda 2 (diseño): cabecera del lead en tres bandas, datos sin duplicar, pestañas; `Switch`/`CheckRow` en formularios; barra de `/kb/:id` con una sola escala (32 px) y radios concéntricos.
- Fuera de alcance: conversión entre monedas, fecha real de cierre (no hay `wonAt`), Notion.

## Checklist
- [x] Lógica pura probada (`deal-sales.ts`, 5 pruebas)
- [x] API de cotizaciones con `dealId`, pestaña «Cotizaciones» en el lead, vínculo en la cotización
- [x] Ventas ganadas en resumen, métricas y MCP
- [x] Interruptores de formularios y barra del `/kb`
- [x] Cabecera y pestañas del lead rediseñadas
- [x] tsc 20 (igual), tests 241/245 (4 de siempre), build OK
- [x] Columna `Quote.dealId` aplicada en la BD (`prisma/add_quote_deal.sql`); Prisma la lee: 7 cotizaciones sin lead y la consulta de leads ganados con cotizaciones responde
- [ ] Revisado a ojo en pantalla (el navegador del panel no tiene sesión)

## Ronda 3 (icono y probabilidad del lead)
- [x] `RangeBar` propio en lugar del `input range` del navegador (puntero, táctil y teclado; 3 pruebas de `range-math`)
- [x] Icono Hugeicons del lead en lugar de las iniciales; 18 iconos elegibles (`deal-icons.ts`, 2 pruebas); `PATCH /api/deals` valida la clave
- [x] Columna `Deal.icon` aplicada en la BD (`prisma/add_deal_icon.sql`); Prisma la lee: 4 leads, ninguno con icono elegido aún

## Ronda 4 (rediseño a fondo del lead y fichas nuevas)
- [x] Lead: recorrido de etapas clicable bajo el título, panel fijo de «Propiedades» a la derecha (filas etiqueta-valor), el resto en pestañas
- [x] Probabilidad: medidor de 10 tramos sin perilla (`RangeBar`), con vista previa al pasar el cursor
- [x] `/contacts/:id`: cifras, leads, cotizaciones, cliente de mensualidad, citas, tareas y correos de campañas (`record-summary.ts`, 3 pruebas)
- [x] `/pipeline/clientes/:id`: cobrado, por cobrar y atrasados, historial de pagos, leads y cotizaciones del contacto; sin la bóveda
- [x] Enlaces: nombre en la lista de contactos y «Ver ficha completa» en el panel del cliente
- [ ] Revisado a ojo en pantalla (el navegador del panel no tiene sesión)

## Ronda 5 (citas manuales)
- [x] `POST /api/appointments`: cita sin pasar por disponibilidad; hora leída en la zona de la organización (`manual-appointment.ts`, 3 pruebas); un empalme no la rechaza, avisa
- [x] `ManualAppointmentDialog` reutilizable: tipo, fecha, hora, duración (por defecto la del tipo), persona, correo y teléfono opcionales, notas
- [x] Botón «Nueva cita» en `/appointments`, «Cita manual» en la pestaña Citas del lead, «Nueva cita» en la ficha de contacto y de cliente
- [x] Google Calendar: se sincroniza si está conectado; sin correo no se agrega invitado
- [ ] Probado en pantalla (el navegador del panel no tiene sesión)
- Cita sin tipo (horario apartado): `Appointment.appointmentTypeId` opcional + `title`; el título es obligatorio sin tipo, 60 min por defecto, la descripción vive en `notes`
- Una cita sin tipo bloquea todas las agendas de la organización: `busyAppointmentsWhere` (3 pruebas) usado en horarios libres, reserva pública, formularios y reserva desde el lead
- Recordatorios, panel de Inicio, citas del lead/contacto/cliente y MCP aceptan citas sin tipo
- [x] Migración `prisma/add_appointment_title.sql` aplicada en la BD (tipo opcional + columna `title`); Prisma la lee: 1 cita existente con su tipo, 0 sin tipo, y el filtro de horarios ocupados responde

## Ronda 6 (selectores propios de fecha y hora)
- [x] `DateField` (calendario que se despliega dentro del formulario; teclado: flechas, Re Pág/Av Pág, Inicio/Fin, Intro, Esc) y `TimeField` (lista cada 15 min y campo para escribir «930», «3 pm», «15:45»)
- [x] Cálculo probado en `date-time-math.ts` (6 pruebas): cuadrícula del mes, años bisiestos, fechas inválidas, formato en español, lectura de horas escritas
- [x] Usados en `ManualAppointmentDialog` en lugar de `type="date"` y `type="time"`; Esc cierra el selector sin cerrar el diálogo
- [ ] Revisado a ojo en pantalla (el navegador del panel no tiene sesión)

## Next
Aplicar el SQL, desplegar, revisar visualmente lead, formularios y `/kb`, y reconectar el conector de Claude.

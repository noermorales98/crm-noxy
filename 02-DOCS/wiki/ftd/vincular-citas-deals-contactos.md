---
author: Noeli
branch: main
status: in-progress
---

# Vincular citas a leads y contactos

## Intent
Poder vincular una cita que ya existe a un lead (deal) o a un contacto, igual que las cotizaciones, y desvincularla sin borrarla.

## Scope
- `Appointment` ya tiene `dealId` y `contactId`: sin cambios de schema.
- `PATCH /api/appointments/[id]` acepta `dealId` / `contactId` (id = vincular, null = desvincular).
- `GET /api/appointments` devuelve `deal` para el selector.
- `LinkAppointmentDialog` (selector) en la pestaña Citas del lead y en el bloque Citas del contacto.
- Fuera de alcance: ficha de cliente de mensualidad, MCP, citas desde el correo.

## Checklist
- [x] Helper `appointment-links` con tests — prueba: `node --test src/lib/appointment-links.test.ts` (5 pasan).
- [x] API PATCH y GET — prueba: `tsc` sin errores fuera de tests antiguos.
- [x] Selector y botones en lead y contacto — prueba: `tsc` sin errores.
- [ ] Probar en la app: vincular, desvincular y ver que el lead adopta el contacto — sin verificar aún.

## Evidence
- `node --test src/lib/appointment-links.test.ts`: 5 pass, 0 fail.
- `npx tsc --noEmit`: los únicos errores son de `*.test.ts` previos (rutas `.ts` y tipos), ninguno en archivos tocados.

## Next
Probar de punta a punta en el navegador con la base real (vincular una cita a un lead y a un contacto, desvincular).

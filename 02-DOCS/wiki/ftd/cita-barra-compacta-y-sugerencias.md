---
author: Claude Code
branch: main
status: done
---

# /appointments/[id]: barra compacta, notas legibles y sugerencias de IA

## Intent
Que la página de una cita se lea como un CRM SaaS: barra baja con el contacto dentro, títulos de las notas sin gritar y sugerencias de IA que se vean trabajar.

## Scope
- `src/components/appointments/AppointmentNavbar.tsx`, `app/appointments/[id]/page.tsx`: barra de una franja (título + estado, y debajo persona · deal · fecha); acciones solo icono salvo «Nota».
- `app/globals.css` (`.kb-compact`), `AppointmentMeetingPanel.tsx`: encabezados `#`/`##`/`###` de las notas a 17/15/14 px, sin línea bajo el H1. `/kb` no cambia.
- `AppointmentSuggestions.tsx`: tarjetas apiladas, botón «Sugerir» propio, estado «Leyendo las notas…».
- Fuera de alcance: el modelo de IA predeterminado y su tiempo de espera.

## Checklist
- [x] El contacto vive dentro de la barra (enlace al contacto; si no hay, el nombre de la reserva).
- [x] Barra más baja; título a 14 px aunque `.noxy-product-frame h1` fuerce 22 px (`text-sm!`).
- [x] Títulos de notas más chicos.
- [x] Sugerencias: tarjetas legibles y estado de progreso visible.
- [x] Causa de «no funcionan» identificada.

## Evidence
- Capturas en la página real (localhost:3000): antes, contacto suelto y H1 de 32 px; después, contacto en la barra y H1 a 17 px.
- Generación en servidor medida: **~32 s** por cita. El modelo predeterminado `nvidia:nvidia/nemotron-3.5-lightning-30b-a3b` no responde en 22 s con notas largas y entra el de respaldo (`bolt-e4b`). Con eso la generación sí crea sugerencias (5 y 3 nuevas en dos citas), tanto a mano como por `after()` al guardar una nota.
- Sin aviso en el panel, esos 32 s parecían un botón roto. Ahora el panel muestra el progreso.
- ESLint limpio en los archivos tocados. `tsc` solo falla en archivos `*.test.ts` que no se tocaron.

## Ronda 2: barra como /kb/:id y sugerencias como sidebar
- [x] `AppointmentNavbar` con el diseño de `KbEditorNavbar`: franja `h-12` en `bg-surface-elevated`, migas «‹ Citas › Título», botones de 32 px con texto (desde `lg`; iconos en móvil) y avatar con menú.
- [x] Menú de usuario extraído a `src/components/NavbarUserMenu.tsx` y reutilizado por la barra de `/kb` (sin cambio de comportamiento).
- [x] Sugerencias: columna de 22 rem pegada al borde derecho, alto completo, `border-l`, con scroll propio; en pantallas angostas va debajo de las notas.
- [x] Sin buscador en la barra: a 1698 px cortaba el nombre del contacto, y la barra lateral ya tiene «Buscar».
- Evidencia: capturas a 1698×893; contacto, fecha y 5 botones con texto visibles en la franja; ESLint limpio.

## Ronda 3: título arriba, pastillas, «Acciones» y Granola
- [x] Avatar fuera de la barra de la cita y de `/kb/:id`; `NavbarUserMenu` eliminado (quedó sin uso).
- [x] Título en la primera línea; debajo pastillas redondas: estado, persona, deal, fecha, tipo, lugar, correo, teléfono.
- [x] «Acciones» junta Nota, Notion y Granola, cada una con su explicación. «Sugerir con IA» y «Preguntar a la IA» quedan aparte.
- [x] Menú de tres puntos (`MoreHorizontalIcon`): «Desvincular «…»» por cada sesión de Granola vinculada y «Copiar enlace». El icono de desvincular por nota se retiró.
- [x] Sesiones sin asignar: solo si la cita no tiene ya una sesión de Granola (`showUnassignedSessions`, con prueba: 4 pasan).
- [x] Cita sin notas: tarjeta con «Sincronizar Granola» y «Escribir una nota», y debajo las sesiones sin asignar si las hay.
- Evidencia: capturas del menú «Acciones» y del menú ⋯ en la cita con Granola vinculada; ESLint limpio.
- **No verificado visualmente:** la cita sin notas (`cmwl3t0se0001i6085v22s77m`); el navegador cortó la sesión antes de esa captura.

## Ronda 4: pastillas fuera de la barra
- [x] Las pastillas pasan a `AppointmentInfoPills`, justo debajo de la barra (al inicio de las notas). La barra queda solo con el título y las acciones.
- [x] Sin el encabezado «Notas»: el filtro por origen solo sale si hay más de un origen.
- [x] En cada nota: título primero y debajo una fila ligera (origen · fecha, enlace, editar/borrar). El origen ya no es una cápsula.
- [x] Selector Editar/Vista previa de `/kb/:id` circular.
- Evidencia: ESLint y `tsc` sin errores en los archivos tocados. **Sin comprobar en pantalla** (el navegador quedó pausado).

## Next
- Decidir si el modelo predeterminado (Ajustes › Modelos de IA) pasa a uno que responda rápido, o si el failover debe saltarse un modelo que expira.
- `modelUsed` del servicio informa el modelo pedido, no el que respondió.

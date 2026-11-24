---
author: Noeli
branch: main
status: done
---
# /appointments/:id: minimalista, con las notas al centro

## Hecho
- **Barra fija arriba** (`AppointmentNavbar`): volver, título, estado, fecha y hora, y las acciones con icono: **Nota**, **Notion**, **Granola** (sincronizar) y **Sugerir con IA**. En móvil son solo iconos de 44 px. Cada botón le pide la acción a su panel por un bus de eventos (`src/lib/appointment-actions.ts`) y muestra «Sincronizando…» / «Leyendo…» mientras trabaja.
- **Datos en una línea** con iconos (persona, correo, teléfono, lugar, contacto y lead enlazados) en vez de una caja con borde.
- **Notas como protagonistas:** columna ancha, título de la nota grande (`text-lg`) y cuerpo en markdown cómodo de leer (`text-base`, interlineado amplio), sin tarjetas con borde; las sugerencias de la IA van en una columna a la derecha (debajo en móvil).
- **Se ve de dónde viene cada nota:** etiqueta con icono y color propio — **Granola** (sincronizada, icono de recarga), **Nota escrita** (lápiz) y **Notion** — con la explicación al pasar el puntero, el enlace «Abrir en Granola/Notion» y, cuando hay más de un origen, un filtro «Todas · Granola · Nota escrita · Notion» con conteo.
- **Siempre se pueden agregar más notas:** botón «Nota» en la barra y, debajo de la lista, «Agregar otra nota» (aunque ya haya varias). La nota nueva se abre con su editor markdown arriba de la lista. Las de Granola se desvinculan (icono) y las escritas o de Notion se editan y borran.
- Estado vacío con icono y una acción clara.

## Evidence
`npm test`: 577 pasan, 4 fallan (previos y ajenos). `tsc` limpio. 3 pruebas nuevas de los orígenes y filtros (`appointment-actions.test.ts`). Sin ver en navegador.

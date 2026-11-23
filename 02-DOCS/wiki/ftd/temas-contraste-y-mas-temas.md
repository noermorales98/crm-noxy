---
author: Noeli
branch: main
status: done
---
# Temas: contraste arreglado y 8 temas nuevos

## Causa medida
Auditoría de todos los pares de color de los 10 temas contra WCAG AA (4.5 texto, 3 foco): el color de acción se usaba también como **texto, enlace e icono** (`text-action-primary`, 66 usos) y en dos temas es demasiado claro: **Lima 1.1–1.2:1** y **Azul Recuerdo 2.4–2.75:1** sobre blanco; Discord y Jazmín quedaban en 4.19–4.49. Además un botón (`app/form/[id]`) llevaba `text-white` fijo sobre `bg-action-primary`: blanco sobre lima.

## Arreglo
- Token nuevo `--color-action-ink` / `-ink-hover` (`text-action-ink`): el color de acción del tema oscurecido hacia el texto principal, en pasos pequeños, hasta llegar a 4.5:1 en app, barra, tarjeta, activo y hover. Conserva el matiz (Lima → verde oliva `#5B7126`, Recuerdo → azul `#5260A1`). `actionInk()` y `actionInkHover()` en `src/lib/crm-themes.ts`.
- 57 archivos migrados (118 usos): `text-/border-/ring-/outline-/decoration-/fill-/stroke-/accent-action-primary` → `-action-ink`; `text-action-secondary` → `text-action-ink-hover`. El fondo de botones (`bg-action-primary` con `text-action-primary-foreground`) no cambia. El CSS editorial usa la tinta como `--accent`.
- El botón con `text-white` pasa a `text-action-primary-foreground` (arregla además una prueba de contrato que ya fallaba).

## Temas nuevos (8; ahora 18, todos claros)
Océano, Bosque, Cielo, Arena, Atardecer, Coral, Rosa y Pizarra. Cada uno pasa la misma auditoría (botón 4.5, tinta 4.5 en cinco superficies, foco 3).

## Evidence
`npm test`: 546 pasan, 4 fallan (previos y ajenos: formularios sin movimiento, favicon, tamaño 11 px). 3 pruebas nuevas de contraste/tinta y la de recuento de temas (10 → 18). Auditoría: 0 fallos en 18 temas. Sin ver en navegador.

---
author: Noeli
branch: nav/conocimientos-ia
status: done
---
# Separar Espacios / Conocimiento e IA

## Intent

Partir el grupo «Espacios» para que Correo, Bóveda y Gestión de contenido queden juntos, y Docs + Asistente vivan en un grupo nuevo «Conocimiento e IA», sin cambiar rutas ni permisos.

## Scope

- `NAV_GROUPS` y el modo `spaces` de `NAV_MODES` en `src/lib/crm-navigation.ts`.
- Menú móvil (`MobileMoreSheet`) para mostrar etiquetas de grupo cuando hay más de uno.
- Tests de contrato de navegación.
- Fuera de alcance: quinto modo en la sidebar, cambios de permisos/rutas, las fallas previas de diseño/favicon.

## Checklist

- [x] Worktree `nav/conocimientos-ia` creado.
- [x] `NAV_GROUPS` con Espacios (3) + Conocimiento e IA (2).
- [x] Modo `spaces` con dos grupos; Docs/Asistente siguen en `spaces`.
- [x] `MobileMoreSheet` muestra `group.label` si el modo tiene varios grupos.
- [x] Tests de navegación actualizados; `npm test` sin fallos nuevos (5 fallas previas de marca/diseño).
- [x] Capturas escritorio y móvil.

## Evidence

- `NAV_GROUPS` / modo `spaces`: Espacios = Correo, Bóveda (+ Gestión en el modelo plano); Conocimiento e IA = Docs, Asistente.
- Escritorio: modo Espacios muestra Correo y Bóveda, luego la etiqueta «Conocimiento e IA» con Docs y Asistente.
- Móvil (hoja Más): sección Espacios con subtítulos Espacios (Correo, Bóveda) y Conocimiento e IA (Docs, Asistente).
- `npm test`: 472 pass / 5 fail (contratos de diseño, formularios públicos, favicon).

## Next

Fusionado en main. Probar en navegador escritorio y móvil.

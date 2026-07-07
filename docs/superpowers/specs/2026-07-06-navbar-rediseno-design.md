# Rediseño de Navbar — Design Spec

**Fecha:** 2026-07-06
**Estado:** Aprobado
**Alcance:** Solo el navbar/header global. El rediseño del dashboard (widgets) es un spec separado.

---

## Resumen

Rediseño visual del header global (`src/components/Header.tsx`) para que se funda con el fondo de la página, reubica y restiliza el buscador global en forma de píldora sobre el lado derecho, unifica la forma del botón de notificaciones con la del avatar de usuario, y elimina todos los inputs de búsqueda/filtro locales que hoy duplican o compiten con el buscador global (⌘K).

---

## Decisiones de diseño

### 1. Fondo del navbar

- `Header.tsx` (el `<header>`) y el wrapper de contenido en `DashboardShell.tsx` cambian de `bg-surface-elevated` (`#FFFFFF`) a `bg-surface-app` (`#FBFBFA`) — el mismo color que usan las páginas (`app/page.tsx` y el resto del CRM).
- Se elimina el `border-b border-border-subtle` que hoy se aplica condicionalmente en rutas `/emails`. Sin excepciones: el header queda visualmente fusionado con el contenido en todas las páginas, sin borde ni sombra.

### 2. Buscador global (⌘K)

- El componente `GlobalSearchTrigger` se reposiciona al lado derecho del header (hoy vive en un contenedor `flex-1 max-w-2xl` alineado a la izquierda/centro).
- Cambia su forma de `rounded-lg` a `rounded-full` (píldora).
- Mantiene su fondo actual (`bg-surface-sidebar`, `#F7F7F5`) para diferenciarse del fondo del navbar (`#FBFBFA`) y seguir leyéndose como elemento interactivo.
- Mantiene su comportamiento actual (abre el command palette / modal de búsqueda global).

### 3. Orden de elementos del lado derecho

De izquierda a derecha: **Buscador → Notificación → Avatar de usuario**.

### 4. Botón de notificación

- Cambia de tamaño `w-9 h-9` a `w-8 h-8` (igual al avatar).
- Mantiene forma `rounded-lg`.
- Gana fondo blanco explícito (`bg-white`) para destacar sobre el navbar, que ahora comparte color con el fondo de página. Esto replica cómo el avatar ya destaca hoy gracias a su propio fondo (`bg-accent-charcoal`).
- El dropdown de notificaciones (lista, badge de no leídas) no cambia.

### 5. Avatar de usuario

- Sin cambios de forma, tamaño o color. Sirve como referencia de forma para el punto 4. Pasa a ser el elemento más a la derecha del header.

### 6. Eliminación de buscadores/filtros locales

Se elimina toda búsqueda o filtro que no sea el buscador global:

- El input de filtro local ligado a `HeaderContext` (`searchQuery` / `setConfig({ searchPlaceholder })`), renderizado condicionalmente en `Header.tsx`. Esto incluye limpiar las páginas que hoy configuran `searchPlaceholder` para mostrarlo (p. ej. Contactos, Empresas, Tareas).
- El buscador local dentro de la pestaña Pipeline (`app/pipeline/page.tsx`, input "Buscar deal o empresa...", independiente de `HeaderContext`).

**Efecto funcional:** las páginas de Contactos, Empresas, Tareas y Pipeline pierden su filtro rápido de tabla propio. La única forma de buscar queda siendo el buscador global (⌘K), que busca en todo el CRM y no filtra dentro de una lista específica. Este trade-off fue confirmado explícitamente por el usuario.

**Limpieza de código asociada:**
- Remover el bloque condicional del `<input>` en `Header.tsx` (líneas ~96-107 según exploración).
- Remover `searchQuery`/`setSearchQuery` de `HeaderContext` si no tiene otros consumidores tras esta limpieza (verificar antes de borrar).
- Remover las llamadas a `setConfig({ searchPlaceholder: ... })` y cualquier lógica de filtrado derivada de `searchQuery` en Contactos, Empresas y Tareas.
- Remover el toolbar de búsqueda local y su estado (`search`/`setSearch`) en `app/pipeline/page.tsx` (líneas ~1224-1249).

---

## Fuera de alcance

- Cualquier cambio al dashboard, sus widgets o la tabla inferior (spec separado).
- Cambios al contenido/lógica del dropdown de notificaciones más allá de tamaño/forma/fondo del botón que lo abre.
- Agregar un avatar con imagen real (sigue siendo iniciales sobre fondo oscuro).

---

## Testing / verificación

- Verificar visualmente en al menos 3 páginas representativas (Dashboard, Contactos, Emails — esta última por el borde condicional que se elimina) que el header se ve fusionado con el fondo, sin línea divisoria.
- Confirmar que Contactos, Empresas, Tareas y Pipeline ya no muestran ningún input de búsqueda/filtro propio, y que no quedan referencias muertas a `searchQuery`/`setSearch` sin usar.
- Confirmar que el buscador global (⌘K) sigue abriendo el command palette y funcionando igual que antes, solo con la nueva posición/forma.
- Confirmar que el botón de notificaciones sigue abriendo su dropdown y mostrando el badge de no leídos correctamente en su nuevo tamaño/fondo.

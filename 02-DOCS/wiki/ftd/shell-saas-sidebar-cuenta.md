---
author: Noeli
branch: main
status: done
---

# Shell SaaS: sidebar con subsecciones, cuenta y asistente fijado

## Intent

Pulir el shell del CRM tras el rediseño «marco claro» para que se lea como un CRM SaaS maduro:

- El disparador de cuenta arriba a la derecha (antes era solo un avatar redondo).
- La barra del asistente (`/assistant/new`, `/assistant/[id]`) visible y fija por defecto.
- Una sola sidebar en árbol, con subsecciones plegables en línea, en lugar del panel «Volver».

## Scope

- `src/lib/crm-navigation.ts`: Historial de tratos en Ventas, Ajustes como rama, estado de ramas abiertas, atajo ⌘B y activo sin barra izquierda.
- `src/lib/crm-themes.ts`: la tinta del activo se mide sobre la pastilla `navActive`.
- `src/components/assistant-new-sidebar-state.ts`: el asistente arranca fijado y la preferencia se guarda en `localStorage`.
- `src/components/AccountMenu.tsx` (nuevo): el disparador y el menú de cuenta, compartidos por el header y el pie de la sidebar.
- `src/components/Sidebar.tsx`: el árbol, la cabecera con la marca, la búsqueda, el riel contraíble y el pie de cuenta.
- `src/components/AssistantSidebarShell.tsx`: navegar ya no desfija, y el control de fijar vive en la cabecera.
- `src/components/Header.tsx`: usa AccountMenu.
- Los tests de contrato se actualizan de forma deliberada donde cambia el diseño: «Volver» se retira y la barra de 3px también.

Fuera de alcance: el contenido de las páginas.

## Checklist

- [x] Modelo de navegación probado: ramas, persistencia, atajo y Historial (`node --test src/lib/crm-navigation.test.ts`, 17/17).
- [x] Asistente fijado por defecto y persistente, sin desfijarse al navegar (`assistant-new-sidebar-state.test.ts` y el contrato `closeForNavigation`).
- [x] AccountMenu con rol, Perfil, Equipo (admin), Ajustes, Modelos de IA, Tema y Cerrar sesión; Esc y clic fuera lo cierran (contrato `assistant-sidebar-navigation-contract.test.ts`).
- [x] Árbol con `aria-expanded`, `inert` en ramas cerradas, guía de sangría, activo `nav-active` sin barra y contador de no leídos (`redesign-shell-contract.test.ts`).
- [x] Riel de 64px con ⌘B, tooltips y flyouts, persistente.
- [x] `npm test` (177 pasan; 4 fallan igual que en HEAD y son ajenos), `tsc` sin errores fuera de los tests (los de tests ya existían), `eslint` limpio en los archivos tocados, `next build` correcto.

## Evidence

- `npm test`: 177 pass, 4 fail. Los 4 (favicon, color primario y dos de formularios públicos) fallan igual en HEAD limpio, comprobado en un worktree temporal.
- Los tests de contrato se actualizaron a propósito: se retiran «Volver» y la barra de 3px, la cuenta pasa a AccountMenu, la barra fijada mide w-60 y Ventas pasa a 18 destinos (con Historial de tratos).
- `npx next build`: correcto.
- La revisión en navegador queda pendiente para la vista previa de TasteCode: sin una sesión iniciada no se llega al shell.
- 2026-11-07: la vista previa con `npm run dev` falló porque ya había otro `next dev` corriendo en la carpeta (Next 16 bloquea `.next/dev/lock`). Se rehízo `next build` y se comprobó `npm run start -- --hostname 127.0.0.1 --port 3124`: arranca junto al dev server (✓ Ready), `/login` responde 200 y `/assistant/new` redirige a `/login` (307) sin sesión.

- 2026-11-07 (petición de Noeli): «Ajustes» al pie pasa a ser un enlace directo a /settings, sin desplegable, también en el riel. La cuenta queda **solo al pie de la sidebar** (opción elegida por Noeli entre tres): se quita de la barra superior, que conserva las notificaciones. `tsc` y `eslint` limpios; `npm test`: 177 pass y los mismos 4 fallos previos de HEAD.

## Next

Revisar en el navegador a 1440, 1024 y 390px con una sesión real: ramas, ⌘B, menú de cuenta, fijar y soltar en /assistant/new, y movimiento reducido.

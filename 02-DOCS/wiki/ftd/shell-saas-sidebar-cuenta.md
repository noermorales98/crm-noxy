---
author: Noeli
branch: main
status: in-progress
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

- [ ] Modelo de navegación probado (`node --test`): ramas, persistencia, atajo y Historial.
- [ ] Asistente fijado por defecto y persistente (test de estado + revisión en navegador).
- [ ] AccountMenu: menú con rol, Perfil, Equipo (admin), Ajustes, Modelos de IA, Tema y Cerrar sesión; Esc y clic fuera lo cierran.
- [ ] Árbol: `aria-expanded`, guía de sangría, activo `nav-active`, contador de no leídos.
- [ ] Riel de 64px con ⌘B y tooltips, persistente.
- [ ] `npm test`, `tsc`, `eslint` y `next build` en verde.

## Evidence

(pendiente)

## Next

Implementar la sidebar en árbol y verificar.

# Rediseño del módulo Proyectos + Categorías → Proyectos en Tareas

## Contexto

El módulo `/projects` ya existía (crear/listar/ver detalle, vincular tareas, formularios, campañas y empresas miembro), pero no aparecía como opción fija en el sidebar — solo se llegaba vía el dashboard o el buscador global. El usuario pidió reemplazar su propósito: dejar de ser un contenedor genérico de formularios/campañas/empresas miembro, y convertirse en el lugar para organizar un proyecto de cliente con sus asociaciones reales (cliente recurrente, empresa, contacto), sus tareas, su cuenta de correo, su documentación y un atajo a la bóveda del cliente.

En paralelo, la sección "Categorías" de `/tasks` (un modal de CRUD de `TaskCategory` sin relación con Proyectos) se reemplaza por un selector/badge de Proyecto, ya que `Task.projectId` existía en el esquema pero no se usaba en ninguna UI.

## Parte 1 — Tareas: Categorías → Proyectos (implementado)

- `app/tasks/page.tsx`: el botón "Categorías" (abría `TaskCategoriesModal`) se reemplaza por un link "Proyectos" hacia `/projects`. El dropdown "Categoría" del modal "Nueva tarea" pasa a ser "Proyecto" (fetch a `/api/projects`). El badge de categoría en cada fila de tarea pasa a mostrar `task.project.name`. El sort "Categoría" pasa a "Proyecto".
- `app/api/tasks/route.ts`: el `GET` incluye `project: { id, name, icon }` en vez de `category`; el `POST` acepta `projectId` en el body en vez de `categoryId`.
- Se eliminó `src/components/TaskCategoriesModal.tsx` (quedó sin ningún otro uso).
- **No se toca** el modelo `TaskCategory`, sus rutas API (`/api/task-categories`), ni `Task.categoryId` — se deja de usar en la UI de `/tasks`, pero no se borra el modelo ni se migran datos existentes. El filtro de categoría dentro de `ProjectAssetsManager` (pestaña Tareas) tampoco se toca — es un filtro interno secundario, fuera del alcance de este cambio.

## Parte 2 — Rediseño de Proyectos

### Modelo de datos (`Project`)

Se elimina:
- `companies Company[]` ("empresas miembro", relación `ProjectCompanies`) y el campo recíproco `Company.projectId`/`Company.project`. Verificado: sin uso en ninguna otra pantalla, solo se gestionaba desde `ProjectAssetsManager`.
- `contacts Contact[]` y el campo recíproco `Contact.projectId`/`Contact.project`. Verificado: 0 registros reales usándolo, sin UI en `/contacts`. Se reemplaza por la dirección opuesta (ver abajo).

Se mantiene sin cambios (uso real e independiente fuera de Proyectos):
- `forms Form[]` y `campaigns EmailCampaign[]` (y sus campos recíprocos `Form.projectId`, `EmailCampaign.projectId`). `/forms` y `/campaigns` tienen su propio selector "Asignar a proyecto" al crear un formulario/campaña — se deja intacto. Los 2 proyectos reales existentes conservan su formulario vinculado.
- `tasks Task[]`.
- `companyId`/`clientCompany` (ahora llamado conceptualmente "Empresa asociada", uno de tres campos hermanos).
- `organizationId`, `name`, `description`, `icon`, timestamps.

Se agrega (todos opcionales, `onDelete: SetNull`):
- `contactId String?` → `Contact` — "Contacto asociado" (dirección nueva, reemplaza a `Contact.projectId`).
- `clientId String?` → `Client` — "Cliente asociado" (cliente recurrente de `/pipeline/clientes`, modelo distinto de `Company`/`Contact`).
- `emailAccountCompanyId String?` → `Company` (relación con nombre propio, p. ej. `"ProjectEmailAccount"`, para no chocar con `companyId`) — "Cuenta de correo vinculada". El picker en la UI se filtra a empresas con `smtpHost` configurado, pero el campo no tiene esa restricción a nivel de esquema.

Sin cambios de esquema (se reutiliza infraestructura existente):
- **Docs/carpetas**: se usa `KbPageRelation` (`entityType: "PROJECT"`, `entityId: project.id`, `entityLabel: project.name`) ya existente en el modelo. Se agrega una ruta API de solo lectura para la dirección inversa (`GET` páginas relacionadas a una entidad dada), ya que hoy `KbPageRelation` solo se puede consultar desde el lado de la página (`GET /api/kb/[id]/relations`). Crear/quitar el vínculo reutiliza `POST /api/kb/[id]/relations` y `DELETE /api/kb/[id]/relations/[relId]` tal cual existen.
- **Bóveda**: no es un campo nuevo. Si el proyecto tiene `clientId`, la página muestra un atajo directo a la bóveda de ese cliente.

### Flujo de creación (`app/projects/create/page.tsx`)

Se agregan tres selectores opcionales al formulario existente (nombre*, descripción, ícono, empresa):
- **Cliente asociado** (`Client`, vía `/api/clients`).
- **Contacto asociado** (`Contact`, vía `/api/contacts`).
- **Cuenta de correo** (`Company` con `smtpHost` configurado, filtrado en el cliente sobre la misma lista de `/api/companies`).

Las tareas se siguen vinculando después de crear el proyecto (flujo ya existente vía `ProjectAssetsManager`), no en este formulario.

### Página de detalle (`app/projects/[id]/page.tsx`)

- **Encabezado**: ícono, nombre, descripción, y hasta 4 badges (Empresa / Cliente / Contacto / Cuenta de correo) en vez de solo "Negocio: X".
- **Atajo a bóveda**: visible solo si `clientId` está definido; enlaza a la bóveda del cliente en `/pipeline/clientes`.
- **Tarjeta de Tareas**: igual que hoy (últimas 5 + contador + "Ver todas"), pero el link "Ver todas" ahora apunta a `/tasks?projectId=X`, y `app/tasks/page.tsx` se actualiza para leer ese query param y pre-filtrar/resaltar.
- **Tarjeta nueva de Docs/Carpetas**: lista de páginas/carpetas del módulo Docs vinculadas a este proyecto (vía la nueva ruta de lectura inversa de `KbPageRelation`), con:
  - "Vincular existente" — picker de búsqueda sobre páginas/carpetas ya creadas en Docs.
  - "Crear carpeta para este proyecto" — crea una carpeta nueva (`isFolder: true`) en Docs y la vincula automáticamente.
- **Tarjetas de Formularios y Campañas**: se quedan, pero pasan a ser de solo lectura informativa (ya no se gestionan desde aquí).
- Se quita la tarjeta de "Empresas" (miembro), ya que esa relación desaparece.

`src/components/ProjectAssetsManager.tsx` se simplifica: pierde las pestañas Empresas/Formularios/Campañas (dejan de gestionarse desde aquí) y conserva la pestaña de Tareas, más una nueva pestaña/flujo para Docs/Carpetas.

### Navegación

Se agrega "Proyectos" como opción fija en `src/components/Sidebar.tsx`, dentro de `HomeNav()`, junto a Empresas/Contactos/Tareas/Ventas/Formularios, usando `FolderKanbanIcon` (ya usado para proyectos en el resto de la app) y enlazando a `/projects`.

## Fuera de alcance

- No se toca `TaskCategory` a nivel de esquema/API — solo se deja de usar en la UI de `/tasks`.
- No se toca la relación `Form.projectId` / `EmailCampaign.projectId` ni sus selectores en `/forms` y `/campaigns`.
- No se agrega un modelo de "cuenta de correo" independiente — se reutiliza `Company` con SMTP configurado, tal como ya funciona en el resto del CRM.
- No se agrega un campo de bóveda independiente en `Project` — es siempre la bóveda del `Client` ya asociado.

# Actividad del proyecto (notas + línea del tiempo)

## Contexto

Además del ajuste visual de quitar el fondo blanco del encabezado del workspace de proyecto (ya aplicado: `ProjectWorkspaceHeader.tsx` perdió su `bg-white`, hereda el fondo `surface-app` del layout), el usuario pidió poder agregar notas a un proyecto y ver una línea del tiempo de actividad. Se decidió que ambas cosas son una sola vista unificada: una línea del tiempo cronológica que mezcla notas manuales con eventos automáticos del sistema.

## Modelo de datos

```prisma
enum ProjectActivityType {
  NOTE
  PROJECT_CREATED
  TASK_CREATED
  TASK_COMPLETED
  ASSOCIATIONS_UPDATED
}

model ProjectActivity {
  id          String              @id @default(cuid())
  type        ProjectActivityType
  description String              @db.Text
  createdAt   DateTime            @default(now())

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdById String?
  createdBy   User?   @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([organizationId])
}
```

Solo las entradas `NOTE` son editables/borrables desde la UI. El resto (`PROJECT_CREATED`, `TASK_CREATED`, `TASK_COMPLETED`, `ASSOCIATIONS_UPDATED`) son de solo lectura, generadas por el backend con una `description` ya redactada (ej. "Tarea creada: Llamar a Juan", "Cliente asociado cambiado a Acme").

## API

- `GET /api/projects/[id]/activity` — lista completa ordenada por `createdAt desc`, incluye `createdBy.name`.
- `POST /api/projects/[id]/activity` — crea una entrada `NOTE` (`{ content }`), `createdById` = usuario de la sesión.
- `DELETE /api/projects/[id]/activity/[activityId]` — borra una entrada; rechaza (400) si el tipo no es `NOTE`.

## Puntos de auto-registro

- `POST /api/projects`: tras crear el proyecto, escribe `PROJECT_CREATED`.
- `POST /api/tasks`: si el body trae `projectId`, tras crear la tarea escribe `TASK_CREATED` con el título.
- `PATCH /api/tasks`: si la tarea pertenece a un proyecto (`task.projectId`) y `isCompleted` pasa a `true`, escribe `TASK_COMPLETED`. No se registra nada al des-completar (evita ruido).
- `PUT /api/projects/[id]` con `fields` (rama ya usada por `ProjectAssociationsEditor`): compara valores previos vs nuevos de `companyId`/`contactId`/`clientId`/`emailAccountCompanyId`; si algo cambió, escribe una sola entrada `ASSOCIATIONS_UPDATED` describiendo qué cambió.

No se instrumenta la vinculación de docs (esa ruta es genérica y compartida con el resto del módulo Docs, fuera de alcance).

## UI

Nueva pestaña **Actividad**, al final de la barra de pestañas del proyecto (Resumen · Tareas · Docs · Correo · Info · Actividad).

`app/projects/[id]/actividad/page.tsx` + `src/components/ProjectActivityView.tsx` (client):
- Arriba: textarea + botón "Agregar nota".
- Abajo: línea del tiempo en orden cronológico inverso, un ícono distinto por tipo (nota, proyecto creado, tarea creada, tarea completada, asociaciones actualizadas), autor y fecha relativa. Las notas muestran un botón de borrar; los eventos automáticos no.

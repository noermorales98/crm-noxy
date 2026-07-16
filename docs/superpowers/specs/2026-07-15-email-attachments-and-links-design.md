# Adjuntos de correo y enlaces externos en el cuerpo del mensaje

## Contexto

El módulo de correos no soporta adjuntos en absoluto: el modelo `Email` no tiene ningún campo/relación para ellos, el cron de sincronización IMAP (`app/api/cron/fetch-emails/route.ts`, ya refactorizado en el cambio anterior con un helper compartido `syncMailbox()`) usa `mailparser`, que sí extrae los adjuntos de cada mensaje (`parsed.attachments`), pero ese resultado se descarta por completo. La vista de detalle de un correo (`app/emails/page.tsx`) tampoco tiene ninguna sección para mostrarlos. Además, los enlaces dentro del HTML de un correo (mostrado en un `<iframe>` con `sandbox="allow-same-origin"`) no pueden abrir pestañas nuevas porque el sandbox actual no lo permite.

Confirmado con el usuario: no existe ningún servicio de almacenamiento de archivos en el proyecto (sin S3/Cloudinary/Vercel Blob ni variables de entorno para ninguno) — todo persiste en la base de datos MySQL compartida. El alcance de este feature es solo **ver y descargar** adjuntos de correos recibidos; adjuntar archivos al redactar/responder queda fuera de este ciclo.

## Parte 1: Adjuntos

### Modelo de datos

Nuevo modelo en `prisma/schema.prisma`:

```prisma
model EmailAttachment {
  id          String   @id @default(cuid())
  filename    String
  contentType String
  size        Int
  content     Bytes    @db.LongBlob
  createdAt   DateTime @default(now())

  emailId String
  email   Email  @relation(fields: [emailId], references: [id], onDelete: Cascade)

  @@index([emailId])
}
```

`Email` gana la relación inversa `attachments EmailAttachment[]`. El contenido binario se guarda directamente en MySQL como `LONGBLOB` (igual patrón que `bodyHtml`/`bodyText` con `@db.LongText`), confirmado con el usuario como la opción sin nueva infraestructura.

Aplicado con `npm run db:push` (mismo mecanismo ya usado en los dos cambios anteriores de este módulo; este hosting no permite `prisma migrate dev`).

### Captura durante la sincronización IMAP

Dentro de `syncMailbox()` (`app/api/cron/fetch-emails/route.ts`), justo donde ya se llama a `simpleParser(msg.source)`, se captura `parsed.attachments` y se filtra a solo los adjuntos reales:

```ts
attachments = (parsed.attachments || [])
  .filter((att) => att.contentDisposition === "attachment")
  .map((att) => ({
    filename: att.filename || "adjunto",
    contentType: att.contentType || "application/octet-stream",
    size: att.size ?? att.content?.length ?? 0,
    content: att.content,
  }));
```

Se excluyen los adjuntos con `contentDisposition === "inline"` (típicamente imágenes incrustadas en el cuerpo HTML vía `cid:`, que no son "archivos adjuntos" en el sentido que el usuario espera ver en una lista descargable).

Al crear el registro `Email`, se usa un `create` anidado de Prisma para insertar los adjuntos en la misma operación:

```ts
attachments: attachments.length > 0
  ? { create: attachments.map((a) => ({ filename: a.filename, contentType: a.contentType, size: a.size, content: a.content })) }
  : undefined,
```

Esto aplica igual para `INBOX` y para la carpeta real de Spam, sin código adicional, gracias a que ambas pasan por el mismo `syncMailbox()`.

### API

- `GET /api/emails/[id]` (ya existente) agrega `attachments` al `include`, seleccionando solo metadata (`id`, `filename`, `contentType`, `size`) — **nunca** el campo `content` en esta respuesta, para no inflar el JSON con datos binarios.
- Nueva ruta `app/api/emails/[id]/attachments/[attachmentId]/route.ts` (`GET`): busca el `EmailAttachment` con su `email.organizationId` incluido, verifica que coincide con `currentOrganizationId` de la sesión (mismo patrón de scoping que las demás rutas de `/api/emails`), y si es válido devuelve el binario:
  - `Content-Type`: el `contentType` guardado.
  - `Content-Disposition: attachment; filename="..."; filename*=UTF-8''...`: el nombre saneado (sin comillas ni caracteres de control, para evitar inyección de encabezados HTTP) más la variante RFC 5987 para nombres con caracteres no-ASCII.
  - Body: el `Buffer` del campo `content`.

### UI

En `app/emails/page.tsx`, debajo del cuerpo del correo (después del bloque que renderiza `bodyHtml`/`bodyText`), si `selectedEmail.attachments.length > 0` se muestra una lista de chips, cada uno con:
- Ícono `FileAttachmentIcon` (hugeicons, ya usado en otra parte del proyecto).
- Nombre del archivo.
- Tamaño formateado (`"245 KB"`, `"1.2 MB"`, etc., vía un helper `formatFileSize(bytes: number): string`).
- Ícono `Download01Icon` y enlace `<a href="/api/emails/{id}/attachments/{attachmentId}" download={filename}>` que dispara la descarga.

`EmailDetail`/`EmailSummary` (tipos en `page.tsx`) ganan `attachments: { id: string; filename: string; contentType: string; size: number }[]`.

## Parte 2: Enlaces del cuerpo del correo abren en pestaña nueva

Los dos `<iframe>` que renderizan `bodyHtml` vía `srcDoc` (la vista de detalle de un correo recibido, línea ~827-833, y la vista previa del compositor, línea ~1112-1113 de `app/emails/page.tsx`) tienen hoy `sandbox="allow-same-origin"`, que bloquea la apertura de popups/pestañas nuevas — cualquier enlace con `target="_blank"` dentro del correo simplemente no hace nada.

Cambios:
1. `sandbox` pasa a `"allow-same-origin allow-popups allow-popups-to-escape-sandbox"` en ambos iframes. Los scripts del correo siguen bloqueados (no se agrega `allow-scripts`), así que la postura de seguridad actual frente a contenido HTML no confiable de remitentes externos no cambia en ese aspecto.
2. Se inyecta `<base target="_blank">` en el HTML antes de pasarlo a `srcDoc`, mediante una función auxiliar:

```ts
function withExternalLinks(html: string): string {
  if (!html) return html;
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}<base target="_blank">`);
  }
  return `<head><base target="_blank"></head>${html}`;
}
```

Esto hace que **todo** enlace del correo (sin necesidad de tocar cada `<a>` individualmente) abra en una pestaña nueva del navegador por defecto, salvo que el propio correo ya especifique un `target` explícito en algún enlace (ese target explícito sigue ganando, comportamiento estándar de `<base target>`).

Se aplica tanto a la vista de correo recibido como a la vista previa del compositor, ya que ambas comparten el mismo patrón de iframe.

## Fuera de alcance

- No se permite adjuntar archivos al redactar o responder un correo (confirmado con el usuario — queda para un ciclo futuro).
- No se reescribe cada `<a>` del cuerpo del correo para agregar `rel="noopener noreferrer"` individualmente; se acepta el riesgo residual y menor de "reverse tabnabbing" dado que el iframe ya bloquea la ejecución de scripts del remitente (no tiene `allow-scripts`), lo que limita severamente cualquier explotación práctica de ese vector.
- No hay límite de tamaño explícito para adjuntos individuales más allá de lo que ya imponen los proveedores de correo (típicamente ~25MB por mensaje) y el límite de `LONGBLOB` de MySQL (~4GB).
- No se sanitiza ni se reescriben imágenes incrustadas (`cid:`) del cuerpo HTML — issue preexistente, no cubierto por este cambio.

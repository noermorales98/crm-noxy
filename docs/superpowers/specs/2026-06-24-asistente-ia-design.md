# Asistente IA — Design Spec

**Fecha:** 2026-06-24  
**Estado:** Aprobado  
**Provider:** Chatbase (API key via env)

---

## Resumen

Nueva sección "Asistente" en el CRM que integra un chat de IA estilo ChatGPT usando la API de Chatbase. El usuario puede crear múltiples conversaciones, retomar cualquiera desde el sidebar, y el asistente tiene acceso al historial completo de cada conversación para dar respuestas con contexto. Las conversaciones y mensajes se persisten en la base de datos.

---

## Arquitectura

### Enfoque elegido
Proxy API route + UI custom + DB storage (Enfoque A). La API key de Chatbase nunca se expone al cliente — un route handler de Next.js actúa como proxy que recibe el stream de Chatbase y lo reenvía al navegador via SSE.

### Flujo de mensaje
```
Cliente → POST /api/assistant/chat { conversationId, content }
       → Guarda AiMessage (role: "user") en DB
       → GET historial completo de la conversación desde DB
       → POST https://www.chatbase.co/api/v1/chat { messages: [...historial], chatbotId, stream: true }
       → Forwarded SSE stream al cliente (token a token)
       → Al cerrar el stream: guarda AiMessage (role: "assistant") en DB
```

---

## Modelos de datos (Prisma)

```prisma
model AiConversation {
  id        String       @id @default(cuid())
  title     String       @default("Nueva conversación")
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  AiMessage[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model AiMessage {
  id             String          @id @default(cuid())
  conversationId String
  conversation   AiConversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String          // "user" | "assistant"
  content        String          @db.Text
  createdAt      DateTime        @default(now())
}
```

**Título auto-generado:** Se toma los primeros 60 caracteres del primer mensaje del usuario al crear la conversación. No requiere llamada extra a la API.

---

## Estructura de archivos

```
app/
  assistant/
    page.tsx                         ← Redirect a última conversación o crea nueva
    [id]/
      page.tsx                       ← Server component: carga mensajes iniciales
      _components/
        ChatView.tsx                 ← UI principal (client component, maneja stream)
        MessageBubble.tsx            ← Burbuja individual user/assistant
        ChatInput.tsx                ← Textarea auto-expandible + botón send

app/api/assistant/
  conversations/
    route.ts                         ← GET (listar) + POST (crear)
    [id]/
      route.ts                       ← DELETE (eliminar)
  chat/
    route.ts                         ← POST → proxy streaming Chatbase

src/components/Sidebar.tsx           ← Añadir tab "assistant" + AssistantNav
```

---

## API Routes

### `GET /api/assistant/conversations`
- Auth requerida (session)
- Devuelve conversaciones del usuario ordenadas por `updatedAt DESC`

### `POST /api/assistant/conversations`
- Crea conversación vacía con título "Nueva conversación"
- Devuelve `{ id, title, createdAt }`

### `DELETE /api/assistant/conversations/[id]`
- Verifica que la conversación pertenece al usuario autenticado
- Elimina conversación (cascade elimina mensajes por FK)

### `POST /api/assistant/chat`
Body: `{ conversationId: string, content: string }`

1. Verifica que `conversationId` pertenece al usuario
2. Guarda `AiMessage { role: "user", content }`
3. Si es el primer mensaje, actualiza `AiConversation.title` con los primeros 60 chars del content
4. Carga historial completo de mensajes de la conversación
5. Llama a Chatbase con `stream: true`
6. Devuelve `ReadableStream` con los chunks al cliente
7. Al finalizar el stream, guarda `AiMessage { role: "assistant", content: fullResponse }`

**Env vars requeridas:**
```
CHATBASE_API_KEY=...
CHATBASE_BOT_ID=...
```

---

## UI

### Sidebar — tab "Asistente"
- Se añade al array `SECTIONS` en [Sidebar.tsx](src/components/Sidebar.tsx):
  ```ts
  { id: "assistant", label: "Asistente", href: "/assistant", icon: AiIcon, accent: "#6366F1", accentBg: "#EEF2FF" }
  ```
- `SidebarTab` type se extiende: `"home" | "mail" | "kb" | "assistant"`
- `getTabForPath` detecta `/assistant` → devuelve `"assistant"`

**AssistantNav (dentro de Sidebar.tsx):**
- Botón "Nueva conversación" (estilo oscuro igual que "Redactar" en Correo)
- Lista scrolleable de conversaciones: título truncado, fecha relativa
- Hover muestra icono de eliminar con confirmación inline
- Conversación activa marcada con fondo `bg-nav-active`

### Área principal — ChatView
- Layout centrado, `max-w-[720px] mx-auto`
- **Burbujas usuario:** alineadas derecha, fondo `#2D2D2D`, texto blanco
- **Burbujas asistente:** alineadas izquierda, fondo `bg-surface-elevated`, texto `text-text-primary`
- **Streaming:** cursor parpadeante `|` mientras llegan tokens
- **Markdown:** respuestas del asistente renderizan con `react-markdown` + `remark-gfm` (ya en el proyecto) — soporta negrita, listas, código inline y bloques de código
- **Estado vacío:** mensaje de bienvenida + 3-4 sugerencias rápidas CRM ("¿Qué contactos agregué esta semana?", "Crea una tarea para...", etc.)
- **Input bar (fija abajo):**
  - `<textarea>` auto-expandible (1-6 líneas)
  - `Enter` → envía, `Shift+Enter` → nueva línea
  - Botón send deshabilitado mientras hay stream activo
  - Loading spinner en el botón durante envío

---

## Edge cases

- **Stream interrumpido:** Si el cliente cierra la conexión antes de terminar, el mensaje parcial se descarta (no se guarda en DB)
- **Conversación sin mensajes:** Mostrar estado vacío con bienvenida, no un chat en blanco
- **Conversación no encontrada (404):** Redirigir a `/assistant` para crear nueva
- **Error de Chatbase:** Mostrar toast de error, no guardar mensaje del asistente en DB
- **Primer mensaje larga:** Truncar título a 60 chars con `...`

---

## Variables de entorno

```env
CHATBASE_API_KEY=sk-...
CHATBASE_BOT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Añadir a `.env.local` y documentar en `.env.example`.

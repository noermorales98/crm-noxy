# Asistente IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth "Asistente" sidebar section with a full ChatGPT-style AI chat backed by Chatbase, with multiple persistent conversations stored in the database.

**Architecture:** A Next.js API route at `/api/assistant/chat` proxies requests to Chatbase with `stream: true`, forwarding the SSE stream directly to the browser. Conversations and messages are stored in MySQL via Prisma. The sidebar tab "assistant" follows the exact same pattern as "home", "mail", and "kb" in `src/components/Sidebar.tsx`.

**Tech Stack:** Next.js 14 App Router, Prisma (MySQL), Chatbase REST API, `react-markdown` + `remark-gfm` (already installed), `@hugeicons/core-free-icons` (already installed).

## Global Constraints

- Auth pattern: always `const session = await auth()` → check `session?.user` → get `(session as any).currentOrganizationId`. See `app/api/companies/route.ts` for the exact boilerplate.
- All Prisma queries scope by `organizationId` AND `userId` for security.
- Env vars needed: `CHATBASE_API_KEY` and `CHATBASE_BOT_ID` — never expose to client.
- All UI text in Spanish (es-MX), consistent with the rest of the app.
- Follow existing class naming: `bg-surface-elevated`, `text-text-primary`, `text-text-secondary`, `bg-nav-active`, `bg-nav-hover`, `border-border-subtle`, `bg-surface-app`.
- No TypeScript `any` except where casting session (established pattern).

---

### Task 1: Prisma models

**Files:**
- Modify: `prisma/schema.prisma` — add `AiConversation` and `AiMessage` models, add relations to `User` and `Organization`

**Interfaces:**
- Produces:
  - `AiConversation { id: string, title: string, userId: string, organizationId: string, createdAt: Date, updatedAt: Date }`
  - `AiMessage { id: string, conversationId: string, role: "user"|"assistant", content: string, createdAt: Date }`

- [ ] **Step 1: Add models to schema**

Open `prisma/schema.prisma`. At the very end of the file, append:

```prisma
model AiConversation {
  id             String       @id @default(cuid())
  title          String       @default("Nueva conversación")
  userId         String
  organizationId String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  messages       AiMessage[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([userId])
  @@index([organizationId])
  @@index([updatedAt])
}

model AiMessage {
  id             String          @id @default(cuid())
  conversationId String
  conversation   AiConversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String
  content        String          @db.Text
  createdAt      DateTime        @default(now())

  @@index([conversationId])
  @@index([createdAt])
}
```

Also add the reverse relations on `User` and `Organization` models. Find `model User {` and add inside:
```prisma
  aiConversations AiConversation[]
```

Find `model Organization {` and add inside:
```prisma
  aiConversations AiConversation[]
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/noeli/Documents/Develop/crm/crm-noxy
npx prisma migrate dev --name add_ai_conversations
```

Expected: `✔  Generated Prisma Client` and a new file under `prisma/migrations/`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add AiConversation and AiMessage Prisma models"
```

---

### Task 2: Conversations CRUD API routes

**Files:**
- Create: `app/api/assistant/conversations/route.ts`
- Create: `app/api/assistant/conversations/[id]/route.ts`

**Interfaces:**
- Consumes: Prisma `AiConversation` model from Task 1
- Produces:
  - `GET /api/assistant/conversations` → `AiConversation[]` (no messages)
  - `POST /api/assistant/conversations` → `AiConversation`
  - `DELETE /api/assistant/conversations/[id]` → `{ ok: true }`

- [ ] **Step 1: Create `app/api/assistant/conversations/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const conversations = await prisma.aiConversation.findMany({
    where: { userId: session.user.id!, organizationId: orgId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(conversations);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const conversation = await prisma.aiConversation.create({
    data: {
      userId: session.user.id!,
      organizationId: orgId,
    },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(conversation, { status: 201 });
}
```

- [ ] **Step 2: Create `app/api/assistant/conversations/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const conversation = await prisma.aiConversation.findFirst({
    where: { id: params.id, userId: session.user.id!, organizationId: orgId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(conversation);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const existing = await prisma.aiConversation.findFirst({
    where: { id: params.id, userId: session.user.id!, organizationId: orgId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.aiConversation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/assistant/
git commit -m "feat: add assistant conversations CRUD API routes"
```

---

### Task 3: Chat streaming proxy API route

**Files:**
- Create: `app/api/assistant/chat/route.ts`

**Interfaces:**
- Consumes:
  - `POST` body: `{ conversationId: string, content: string }`
  - Env: `CHATBASE_API_KEY`, `CHATBASE_BOT_ID`
  - Prisma models from Task 1
- Produces: streaming `text/plain` response (raw token chunks)

- [ ] **Step 1: Add env vars to `.env.local`**

Open `.env.local` and append:
```
CHATBASE_API_KEY=your_chatbase_api_key_here
CHATBASE_BOT_ID=your_chatbase_bot_id_here
```

Replace the placeholder values with the real Chatbase credentials from the dashboard (Workspace Settings → API Keys and Agent Settings → General).

- [ ] **Step 2: Create `app/api/assistant/chat/route.ts`**

```typescript
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) {
    return new Response(JSON.stringify({ error: "No organization context" }), { status: 400 });
  }

  const { conversationId, content } = await req.json() as { conversationId: string; content: string };
  if (!conversationId || !content?.trim()) {
    return new Response(JSON.stringify({ error: "Missing conversationId or content" }), { status: 400 });
  }

  // Verify ownership
  const conversation = await prisma.aiConversation.findFirst({
    where: { id: conversationId, userId: session.user.id!, organizationId: orgId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  // Save user message
  await prisma.aiMessage.create({
    data: { conversationId, role: "user", content: content.trim() },
  });

  // Auto-title from first message
  if (conversation.messages.length === 0) {
    const title = content.trim().slice(0, 60) + (content.trim().length > 60 ? "…" : "");
    await prisma.aiConversation.update({ where: { id: conversationId }, data: { title } });
  }

  // Build history for Chatbase (include new user message)
  const history = [
    ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: content.trim() },
  ];

  // Call Chatbase with streaming
  const chatbaseRes = await fetch("https://www.chatbase.co/api/v1/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CHATBASE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: history,
      chatbotId: process.env.CHATBASE_BOT_ID,
      stream: true,
    }),
  });

  if (!chatbaseRes.ok || !chatbaseRes.body) {
    return new Response(JSON.stringify({ error: "Chatbase error" }), { status: 502 });
  }

  // Forward stream to client, accumulate full response
  let fullResponse = "";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = chatbaseRes.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } finally {
        controller.close();
        if (fullResponse.trim()) {
          await prisma.aiMessage.create({
            data: { conversationId, role: "assistant", content: fullResponse.trim() },
          });
          await prisma.aiConversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/assistant/ .env.local
git commit -m "feat: add Chatbase streaming proxy API route"
```

---

### Task 4: ChatInput component

**Files:**
- Create: `app/assistant/[id]/_components/ChatInput.tsx`

**Interfaces:**
- Produces: `<ChatInput onSend={(content: string) => void} disabled: boolean />`

- [ ] **Step 1: Create `app/assistant/[id]/_components/ChatInput.tsx`**

```tsx
"use client";
import { useRef, useState, useEffect } from "react";
import { Send } from "lucide-react";

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="border-t border-border-subtle bg-surface-elevated px-4 py-3">
      <div className="max-w-[720px] mx-auto flex items-end gap-3 bg-white border border-border-subtle rounded-xl px-4 py-3 shadow-sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: "144px", overflowY: "auto" }}
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#2D2D2D] text-white hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {disabled ? (
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
      <p className="text-[10px] text-text-secondary text-center mt-2">
        El asistente puede cometer errores. Verifica la información importante.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/assistant/
git commit -m "feat: add ChatInput component"
```

---

### Task 5: MessageBubble component

**Files:**
- Create: `app/assistant/[id]/_components/MessageBubble.tsx`

**Interfaces:**
- Consumes: `react-markdown`, `remark-gfm` (already in package.json)
- Produces: `<MessageBubble role: "user"|"assistant" content: string streaming?: boolean />`

- [ ] **Step 1: Create `app/assistant/[id]/_components/MessageBubble.tsx`**

```tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center mr-3 mt-0.5">
          <span className="text-[#6366F1] text-xs font-bold">AI</span>
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#2D2D2D] text-white rounded-br-sm"
            : "bg-surface-elevated border border-border-subtle text-text-primary rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-code:text-[#6366F1] prose-code:bg-[#EEF2FF] prose-code:px-1 prose-code:rounded prose-code:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-text-primary ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/assistant/
git commit -m "feat: add MessageBubble component with markdown support"
```

---

### Task 6: ChatView component

**Files:**
- Create: `app/assistant/[id]/_components/ChatView.tsx`

**Interfaces:**
- Consumes:
  - `ChatInput` from Task 4: `onSend(content: string) => void`, `disabled: boolean`
  - `MessageBubble` from Task 5: `role`, `content`, `streaming`
  - `POST /api/assistant/chat` from Task 3
- Produces: `<ChatView conversationId: string initialMessages: Array<{id:string, role:string, content:string, createdAt:string}> />`

- [ ] **Step 1: Create `app/assistant/[id]/_components/ChatView.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Props {
  conversationId: string;
  initialMessages: Message[];
}

const SUGGESTIONS = [
  "¿Cuántos contactos nuevos tengo esta semana?",
  "Crea una tarea para dar seguimiento a un cliente",
  "¿Qué ventas están en proceso actualmente?",
  "Ayúdame a redactar un email de seguimiento",
];

export default function ChatView({ conversationId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const assistantId = `assistant-${Date.now() + 1}`;
    streamingIdRef.current = assistantId;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setStreaming(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } finally {
      setStreaming(false);
      streamingIdRef.current = null;
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        <div className="max-w-[720px] mx-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
                <span className="text-[#6366F1] text-2xl font-bold">AI</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-1">¿En qué puedo ayudarte?</h2>
                <p className="text-sm text-text-secondary">Puedo consultar tu CRM, crear registros, redactar emails y más.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={streaming}
                    className="text-left text-xs text-text-secondary bg-white border border-border-subtle rounded-lg px-3 py-2.5 hover:bg-surface-elevated hover:text-text-primary transition-colors leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                streaming={streaming && m.id === streamingIdRef.current}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <ChatInput onSend={sendMessage} disabled={streaming} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/assistant/
git commit -m "feat: add ChatView with streaming support"
```

---

### Task 7: Pages — assistant routes

**Files:**
- Create: `app/assistant/page.tsx` — redirect to latest or create new conversation
- Create: `app/assistant/[id]/page.tsx` — load conversation and render ChatView

**Interfaces:**
- Consumes:
  - `GET /api/assistant/conversations` (Task 2)
  - `POST /api/assistant/conversations` (Task 2)
  - `GET /api/assistant/conversations/[id]` (Task 2)
  - `ChatView` from Task 6
- Produces: pages at `/assistant` and `/assistant/[id]`

- [ ] **Step 1: Create `app/assistant/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) redirect("/");

  // Find the most recent conversation
  const latest = await prisma.aiConversation.findFirst({
    where: { userId: session.user.id!, organizationId: orgId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (latest) {
    redirect(`/assistant/${latest.id}`);
  }

  // Create first conversation
  const newConv = await prisma.aiConversation.create({
    data: { userId: session.user.id!, organizationId: orgId },
    select: { id: true },
  });

  redirect(`/assistant/${newConv.id}`);
}
```

- [ ] **Step 2: Create `app/assistant/[id]/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/db";
import DashboardShell from "@/src/components/DashboardShell";
import ChatView from "./_components/ChatView";

interface Props {
  params: { id: string };
}

export default async function AssistantConversationPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = (session as any).currentOrganizationId as string | undefined;
  if (!orgId) redirect("/");

  const conversation = await prisma.aiConversation.findFirst({
    where: { id: params.id, userId: session.user.id!, organizationId: orgId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) notFound();

  const messages = conversation.messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <DashboardShell>
      <ChatView conversationId={conversation.id} initialMessages={messages} />
    </DashboardShell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/assistant/
git commit -m "feat: add assistant pages (index redirect + conversation view)"
```

---

### Task 8: Sidebar integration — AssistantNav + new tab

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/assistant/conversations` from Task 2
  - `DELETE /api/assistant/conversations/[id]` from Task 2
  - `POST /api/assistant/conversations` from Task 2
  - `AiChatIcon` from `@hugeicons/core-free-icons`
- Produces: visible "Asistente" tab in the sidebar switcher, `AssistantNav` with conversation list

- [ ] **Step 1: Add `AiChatIcon` to imports in `src/components/Sidebar.tsx`**

Find the existing import block from `@hugeicons/core-free-icons`:
```typescript
import {
  Home01Icon,
  Building04Icon,
  // ...all existing icons...
  Settings01Icon,
} from "@hugeicons/core-free-icons";
```

Add `AiChatIcon` to the list:
```typescript
import {
  Home01Icon,
  Building04Icon,
  UserMultipleIcon,
  Task01Icon,
  InboxIcon,
  BrowserIcon,
  Calendar01Icon,
  Clock01Icon,
  CalendarCheckIn01Icon,
  FolderKanbanIcon,
  Add01Icon,
  ZapIcon,
  Analytics01Icon,
  GitBranchIcon,
  BarChartIcon,
  Megaphone01Icon,
  Book01Icon,
  Archive01Icon,
  SentIcon,
  PencilEdit01Icon,
  Refresh01Icon,
  Settings01Icon,
  AiChatIcon,
} from "@hugeicons/core-free-icons";
```

- [ ] **Step 2: Extend `SidebarTab` type**

Find:
```typescript
type SidebarTab = "home" | "mail" | "kb";
```

Replace with:
```typescript
type SidebarTab = "home" | "mail" | "kb" | "assistant";
```

- [ ] **Step 3: Add "assistant" to `SECTIONS` array**

Find the `SECTIONS` array (ends with the `kb` entry). Add the new entry after `kb`:
```typescript
const SECTIONS: {
  id: SidebarTab;
  label: string;
  href: string;
  icon: typeof Home01Icon;
  accent: string;
  accentBg: string;
}[] = [
  { id: "home", label: "Inicio", href: "/", icon: Home01Icon, accent: "#5B9BF5", accentBg: "#E1F0FF" },
  { id: "mail", label: "Correo", href: "/emails", icon: InboxIcon, accent: "#F0A050", accentBg: "#FFECD2" },
  { id: "kb", label: "Docs", href: "/kb", icon: Book01Icon, accent: "#9B7EDE", accentBg: "#F0E6F9" },
  { id: "assistant", label: "Asistente", href: "/assistant", icon: AiChatIcon, accent: "#6366F1", accentBg: "#EEF2FF" },
];
```

Also add the description for "assistant" in the `SectionSwitcher` dropdown (inside the `{section.id === "kb" && ...}` block):
```tsx
{section.id === "home" && "Dashboard y proyectos"}
{section.id === "mail" && "Bandeja y campañas"}
{section.id === "kb" && "Documentación interna"}
{section.id === "assistant" && "Asistente de IA"}
```

- [ ] **Step 4: Update `getTabForPath`**

Find:
```typescript
const getTabForPath = (p: string): SidebarTab => {
  if (p.startsWith("/kb")) return "kb";
  if (p.startsWith("/emails") || p.startsWith("/campaigns")) return "mail";
  return "home";
};
```

Replace with:
```typescript
const getTabForPath = (p: string): SidebarTab => {
  if (p.startsWith("/kb")) return "kb";
  if (p.startsWith("/emails") || p.startsWith("/campaigns")) return "mail";
  if (p.startsWith("/assistant")) return "assistant";
  return "home";
};
```

- [ ] **Step 5: Add `AssistantNav` component (before the `export default function Sidebar`)**

Add this entire component just before the `// ─── Main Sidebar ──` comment:

```tsx
// ─── Tab 4: Asistente ─────────────────────────────────────────────────────────

type AiConversation = { id: string; title: string; updatedAt: string };

function AssistantNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/assistant/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  useEffect(() => {
    if (session?.user) fetchConversations();
  }, [session, fetchConversations]);

  const createNew = async () => {
    setCreating(true);
    const res = await fetch("/api/assistant/conversations", { method: "POST" });
    if (res.ok) {
      const conv = await res.json();
      await fetchConversations();
      router.push(`/assistant/${conv.id}`);
    }
    setCreating(false);
  };

  const deleteConv = async (id: string) => {
    await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
    setDeletingId(null);
    await fetchConversations();
    if (pathname === `/assistant/${id}`) router.push("/assistant");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-1 pb-3 shrink-0">
        <button
          onClick={createNew}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 bg-[#2D2D2D] text-white py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
        >
          <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} color="white" />
          {creating ? "Creando…" : "Nueva conversación"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
        {conversations.length === 0 ? (
          <p className="text-xs text-text-secondary px-1 py-2 italic">Sin conversaciones</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((conv) => {
              const isActive = pathname === `/assistant/${conv.id}`;
              return (
                <div key={conv.id} className="group relative">
                  <Link
                    href={`/assistant/${conv.id}`}
                    className={`${navItemClass(isActive)} pr-8 w-full block truncate`}
                  >
                    <HugeiconsIcon icon={AiChatIcon} size={ICON_SIZE} color={ICON_COLOR} className="shrink-0" />
                    <span className="truncate text-sm">{conv.title}</span>
                  </Link>
                  {deletingId === conv.id ? (
                    <div className="absolute inset-0 flex items-center justify-end gap-1 pr-1 bg-surface-elevated rounded-lg">
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-[10px] px-2 py-1 rounded hover:bg-nav-hover text-text-secondary transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => deleteConv(conv.id)}
                        className="text-[10px] px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(conv.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-nav-active rounded-md transition-all"
                      title="Eliminar conversación"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

Also add `useCallback` to the imports at the top of `Sidebar.tsx` if not already present:
```typescript
import { useState, useEffect, useRef, useCallback } from "react";
```

- [ ] **Step 6: Add `assistant` block in main `Sidebar` render**

Find the render section that has the three tab blocks:
```tsx
<div className={activeTab === "home" ? "block" : "hidden"}>
  <HomeNav projects={projects} />
</div>
<div className={activeTab === "mail" ? "flex flex-col h-full" : "hidden"}>
  <MailNav unreadCount={unreadEmailCount} />
</div>
<div className={activeTab === "kb" ? "flex flex-col h-full" : "hidden"}>
  <KbNav />
</div>
```

Add after the `kb` block:
```tsx
<div className={activeTab === "assistant" ? "flex flex-col h-full" : "hidden"}>
  <AssistantNav />
</div>
```

- [ ] **Step 7: Manual smoke test**

Start the dev server:
```bash
npm run dev
```

1. Navigate to the app. The sidebar switcher should now show "Asistente" as a 4th option with an indigo logo.
2. Click "Asistente" → should redirect to `/assistant/[new-id]` and show the empty welcome screen.
3. Type a message and press Enter → should see the user bubble appear, then the assistant's streaming response word by word.
4. Refresh the page → messages should persist (loaded from DB).
5. Click "Nueva conversación" → creates a new chat, sidebar list now shows 2 conversations.
6. Navigate between conversations → each shows its own message history.
7. Hover a conversation in the sidebar → delete button appears. Click → confirm → conversation removed.

- [ ] **Step 8: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Asistente tab and AssistantNav to sidebar"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** DB models ✓, GET/POST/DELETE conversations ✓, streaming proxy ✓, ChatInput ✓, MessageBubble w/ markdown ✓, ChatView w/ streaming ✓, empty state w/ suggestions ✓, sidebar tab + AssistantNav ✓, auto-title ✓, env vars ✓
- [x] **No placeholders:** All steps contain complete code
- [x] **Type consistency:** `AiConversation`, `AiMessage`, `Message` interface used consistently across tasks; `conversationId` string throughout; `role: "user" | "assistant"` consistent
- [x] **Auth pattern:** All routes use `auth()` → `session.user.id` + `currentOrganizationId` — matches `app/api/companies/route.ts`

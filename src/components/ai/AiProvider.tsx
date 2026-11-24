"use client";

import { createContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { AiFloatingBubble } from './AiFloatingBubble';

export type PageContext = {
  page: string;
  id?: string;
  label?: string;
  data?: Record<string, unknown>;
};

export type AiContextValue = {
  isOpen: boolean;
  conversationId: string | null;
  pageContext: PageContext | null;
  /** Pregunta que espera la burbuja para enviarse sola al abrirse. */
  pendingPrompt: string | null;
  /** Abre la burbuja y envía la pregunta con el contexto de la pantalla actual. */
  ask: (prompt: string) => void;
  consumePrompt: () => string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setConversationId: (id: string | null) => void;
  setPageContext: (ctx: PageContext | null) => void;
};

export const AiContext = createContext<AiContextValue | null>(null);

export function AiProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  // On mount: read conversationId from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ai_conversation_id');
      if (stored) {
        setConversationId(stored);
      }
    }
  }, []);

  // On conversationId change: write to sessionStorage (skip during SSR)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (conversationId !== null) {
        sessionStorage.setItem('ai_conversation_id', conversationId);
      } else {
        sessionStorage.removeItem('ai_conversation_id');
      }
    }
  }, [conversationId]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  const ask = (prompt: string) => {
    setPendingPrompt(prompt);
    setIsOpen(true);
  };
  const consumePrompt = () => {
    const current = pendingPrompt;
    setPendingPrompt(null);
    return current;
  };

  const value: AiContextValue = {
    pendingPrompt,
    ask,
    consumePrompt,
    isOpen,
    conversationId,
    pageContext,
    open,
    close,
    toggle,
    setConversationId,
    setPageContext,
  };

  return (
    <AiContext.Provider value={value}>
      {children}
      <ConditionalBubble />
    </AiContext.Provider>
  );
}

const BUBBLE_PATH_PREFIXES = [
  "/",
  "/emails",
  "/kb",
  "/companies",
  "/contacts",
  "/tasks",
  "/pipeline",
  "/forms",
  "/appointment-types",
  "/availability",
  "/appointments",
  "/clientes",
  "/contenido",
];

function ConditionalBubble() {
  const pathname = usePathname();
  const { status } = useSession();
  // `/` es landing pública o panel: la burbuja solo con sesión (antes la landing era `/demo`).
  const show = BUBBLE_PATH_PREFIXES.some((prefix) => {
    if (prefix === "/") return pathname === "/" && status === "authenticated";
    return pathname.startsWith(prefix);
  });
  if (!show) return null;
  return <AiFloatingBubble />;
}

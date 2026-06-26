"use client";

import { createContext, useState, useEffect } from 'react';
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

  const value: AiContextValue = {
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

function ConditionalBubble() {
  const pathname = usePathname();
  const show =
    pathname === "/" ||
    pathname.startsWith("/emails") ||
    pathname.startsWith("/kb");
  if (!show) return null;
  return <AiFloatingBubble />;
}

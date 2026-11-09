"use client";

import KbSidebarTree from "@/src/components/kb/KbSidebarTree";
import VaultNav from "@/src/components/vault/VaultNav";
import { MailNav, ContentNav } from "@/src/components/context-navs";
import { useNotifications } from "@/src/context/NotificationContext";
import type { ContextPanelKey } from "@/src/lib/crm-navigation";

/** Contenido de la lista propia de una pantalla (carpetas de correo, árbol de Docs, clientes de la bóveda, calendario). */
export function ContextContent({ section, onNavigate }: { section: ContextPanelKey; onNavigate?: () => void }) {
  const { notifications } = useNotifications();
  const unread = notifications.filter((n) => n.type === "NEW_EMAIL" && !n.isRead).length;
  switch (section) {
    case "mail":
      return <MailNav unreadCount={unread} onNavigate={onNavigate} />;
    case "kb":
      return <KbSidebarTree onNavigate={onNavigate} />;
    case "vault":
      return <VaultNav onNavigate={onNavigate} />;
    case "content":
      return <ContentNav onNavigate={onNavigate} />;
    default:
      return null;
  }
}

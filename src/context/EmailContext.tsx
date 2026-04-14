"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type Company = {
  id: string;
  name: string;
  smtpHost: string | null;
  imapHost: string | null;
};

export type EmailFolder = "inbox" | "sent" | "archived";

interface EmailContextValue {
  // Sidebar state
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
  folder: EmailFolder;
  setFolder: (folder: EmailFolder) => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;

  // Actions (set by the page)
  onCompose: () => void;
  setOnCompose: (fn: () => void) => void;
  onSync: (reset?: boolean) => void;
  setOnSync: (fn: (reset?: boolean) => void) => void;
  onOpenConfig: (company: Company) => void;
  setOnOpenConfig: (fn: (company: Company) => void) => void;
}

const EmailContext = createContext<EmailContextValue | null>(null);

export function EmailProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [folder, setFolder] = useState<EmailFolder>("inbox");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [onCompose, setOnComposeRaw] = useState<() => void>(() => () => {});
  const [onSync, setOnSyncRaw] = useState<(reset?: boolean) => void>(() => () => {});
  const [onOpenConfig, setOnOpenConfigRaw] = useState<(company: Company) => void>(() => () => {});

  // Wrap setters to handle function values correctly with useState
  const setOnCompose = (fn: () => void) => setOnComposeRaw(() => fn);
  const setOnSync = (fn: (reset?: boolean) => void) => setOnSyncRaw(() => fn);
  const setOnOpenConfig = (fn: (company: Company) => void) => setOnOpenConfigRaw(() => fn);

  return (
    <EmailContext.Provider
      value={{
        companies,
        setCompanies,
        selectedCompanyId,
        setSelectedCompanyId,
        folder,
        setFolder,
        unreadCount,
        setUnreadCount,
        isSyncing,
        setIsSyncing,
        onCompose,
        setOnCompose,
        onSync,
        setOnSync,
        onOpenConfig,
        setOnOpenConfig,
      }}
    >
      {children}
    </EmailContext.Provider>
  );
}

/** Use inside EmailProvider (emails page) — throws if not wrapped */
export function useEmailContext() {
  const ctx = useContext(EmailContext);
  if (!ctx) throw new Error("useEmailContext must be used within EmailProvider");
  return ctx;
}

/** Safe version — returns null when outside EmailProvider (used in Sidebar) */
export function useOptionalEmailContext() {
  return useContext(EmailContext);
}

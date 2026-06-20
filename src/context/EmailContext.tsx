"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

type Company = {
  id: string;
  name: string;
  smtpHost: string | null;
  imapHost: string | null;
};

export type EmailFolder = "inbox" | "sent" | "archived";

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

interface EmailContextValue {
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
  lastSyncedAt: Date | null;
  syncGeneration: number;
  notifySyncComplete: () => void;

  onCompose: () => void;
  setOnCompose: (fn: () => void) => void;
  onSync: (reset?: boolean) => void;
  setOnSync: (fn: (reset?: boolean) => void) => void;
  onOpenConfig: (company: Company) => void;
  setOnOpenConfig: (fn: (company: Company) => void) => void;
}

const EmailContext = createContext<EmailContextValue | null>(null);

export function EmailProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [folder, setFolder] = useState<EmailFolder>("inbox");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncGeneration, setSyncGeneration] = useState(0);
  const [onCompose, setOnComposeRaw] = useState<() => void>(() => () => {});
  const [onSync, setOnSyncRaw] = useState<(reset?: boolean) => void>(() => () => {});
  const [onOpenConfig, setOnOpenConfigRaw] = useState<(company: Company) => void>(() => () => {});

  const syncInFlightRef = useRef(false);
  const selectedCompanyIdRef = useRef(selectedCompanyId);
  selectedCompanyIdRef.current = selectedCompanyId;

  const setOnCompose = (fn: () => void) => setOnComposeRaw(() => fn);
  const setOnSync = (fn: (reset?: boolean) => void) => setOnSyncRaw(() => fn);
  const setOnOpenConfig = (fn: (company: Company) => void) => setOnOpenConfigRaw(() => fn);

  const notifySyncComplete = useCallback(() => {
    setLastSyncedAt(new Date());
    setSyncGeneration((g) => g + 1);
  }, []);

  const runBackgroundSync = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setIsSyncing(true);
    try {
      const params = new URLSearchParams();
      const companyId = selectedCompanyIdRef.current;
      if (companyId) params.set("companyId", companyId);
      const qs = params.toString();
      const res = await fetch(`/api/cron/fetch-emails${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        notifySyncComplete();
      }
    } catch {
      // ignore network errors in background sync
    } finally {
      setIsSyncing(false);
      syncInFlightRef.current = false;
    }
  }, [notifySyncComplete]);

  // Auto IMAP sync while user is logged in and tab is visible
  useEffect(() => {
    if (!session?.user) return;

    const sync = () => {
      if (document.visibilityState === "visible") {
        runBackgroundSync();
      }
    };

    sync();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId) return;
      intervalId = setInterval(sync, AUTO_SYNC_INTERVAL_MS);
    };

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sync();
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    if (document.visibilityState === "visible") start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session, runBackgroundSync]);

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
        lastSyncedAt,
        syncGeneration,
        notifySyncComplete,
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

export function useEmailContext() {
  const ctx = useContext(EmailContext);
  if (!ctx) throw new Error("useEmailContext must be used within EmailProvider");
  return ctx;
}

export function useOptionalEmailContext() {
  return useContext(EmailContext);
}

export function formatLastEmailSync(date: Date | null): string | null {
  if (!date) return null;
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "ahora";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  return `hace ${hours}h`;
}

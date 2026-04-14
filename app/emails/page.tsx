"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/src/components/Sidebar";
import Header from "@/src/components/Header";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InboxIcon,
  SentIcon,
  ArchiveIcon,
  Refresh01Icon,
  PencilEdit01Icon,
  Delete01Icon,
  Archive01Icon,
  MailReplyIcon,
  Cancel01Icon,
  Mail01Icon,
  Settings01Icon,
  ViewIcon,
  ViewOffIcon,
  Building04Icon,
  SourceCodeIcon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { useToast } from "@/src/context/ToastContext";
import { useConfirm } from "@/src/context/ConfirmContext";
import { EmailProvider, useEmailContext } from "@/src/context/EmailContext";

function sanitizeEmail(address: string | null | undefined, fallback = "desconocido"): string {
  if (!address) return fallback;
  if (address.includes("undefined") || address.includes("null")) return fallback;
  return address;
}

type Company = {
  id: string;
  name: string;
  smtpHost: string | null;
  imapHost: string | null;
  _count?: { emails: number };
};

type EmailSummary = {
  id: string;
  subject: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  type: "RECEIVED" | "SENT";
  isRead: boolean;
  isArchived: boolean;
  receivedAt: string;
  companyId: string;
  company: { id: string; name: string };
};

type EmailDetail = EmailSummary & {
  bodyHtml: string | null;
  bodyText: string | null;
  ccAddress: string | null;
  messageId: string | null;
};

type Folder = "inbox" | "sent" | "archived";

const FOLDERS: { key: Folder; label: string; icon: React.ReactNode }[] = [
  { key: "inbox", label: "Entrada", icon: <HugeiconsIcon icon={InboxIcon} size={15} /> },
  { key: "sent", label: "Enviados", icon: <HugeiconsIcon icon={SentIcon} size={15} /> },
  { key: "archived", label: "Archivados", icon: <HugeiconsIcon icon={Archive01Icon} size={15} /> },
];

export default function EmailsPage() {
  return (
    <EmailProvider>
      <EmailsPageInner />
    </EmailProvider>
  );
}

function EmailsPageInner() {
  const { addToast } = useToast();
  const { confirm } = useConfirm();
  const emailCtx = useEmailContext();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    cc: "",
    subject: "",
    bodyHtml: "",
    companyId: "",
    scheduledAt: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [previewCompose, setPreviewCompose] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  // Contact autocomplete
  type ContactOption = { id: string; firstName: string; lastName: string | null; email: string | null };
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactInputRef = useRef<HTMLInputElement>(null);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const [showImapModal, setShowImapModal] = useState(false);
  const [imapForm, setImapForm] = useState({
    imapHost: "",
    imapPort: "993",
    imapUser: "",
    imapPass: "",
    imapSecure: true,
    smtpHost: "",
    smtpPort: "465",
    smtpUser: "",
    smtpPass: "",
    smtpFromEmail: "",
    smtpSecure: true,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configCompanyId, setConfigCompanyId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // ── Sync state into EmailContext so Sidebar can display/control it ──────────
  useEffect(() => { emailCtx.setCompanies(companies); }, [companies]);
  useEffect(() => { emailCtx.setSelectedCompanyId(selectedCompanyId); }, [selectedCompanyId]);
  useEffect(() => { emailCtx.setFolder(folder); }, [folder]);
  useEffect(() => { emailCtx.setIsSyncing(isSyncing); }, [isSyncing]);
  useEffect(() => {
    const unread = emails.filter((e) => !e.isRead && e.type === "RECEIVED").length;
    emailCtx.setUnreadCount(unread);
  }, [emails]);

  // Context setters for compound state: selectedCompanyId and folder come FROM the context
  // (sidebar writes to context, page reads from context)
  useEffect(() => {
    if (emailCtx.selectedCompanyId !== selectedCompanyId) {
      setSelectedCompanyId(emailCtx.selectedCompanyId);
    }
  }, [emailCtx.selectedCompanyId]);

  useEffect(() => {
    if (emailCtx.folder !== folder) {
      setFolder(emailCtx.folder);
    }
  }, [emailCtx.folder]);

  // Register action callbacks into context
  useEffect(() => {
    emailCtx.setOnCompose(() => {
      setComposeData({ to: "", cc: "", subject: "", bodyHtml: "", companyId: selectedCompanyId || "", scheduledAt: "" });
      setPreviewCompose(false);
      setShowSchedulePicker(false);
      setIsComposing(true);
      loadContacts();
    });
  }, [selectedCompanyId]);

  useEffect(() => {
    emailCtx.setOnSync((reset?: boolean) => handleSync(reset ?? false));
  }, []);

  useEffect(() => {
    emailCtx.setOnOpenConfig((company) => openConfig(company));
  }, []);

  // Dismiss contact dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        contactDropdownRef.current &&
        !contactDropdownRef.current.contains(e.target as Node) &&
        contactInputRef.current &&
        !contactInputRef.current.contains(e.target as Node)
      ) {
        setShowContactDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchEmails = useCallback(async (background = false) => {
    if (!background) {
      setIsLoadingEmails(true);
      setSelectedEmail(null);
    }
    try {
      const params = new URLSearchParams({ folder });
      if (selectedCompanyId) params.set("companyId", selectedCompanyId);
      const res = await fetch(`/api/emails?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!background) setIsLoadingEmails(false);
    }
  }, [folder, selectedCompanyId]);

  useEffect(() => {
    // Carga inicial
    fetchEmails(false);

    // Auto-recarga en segundo plano cada 1 minuto (para reflejar lo que obtenga el cron-job)
    const intervalIds = setInterval(() => {
      fetchEmails(true);
    }, 60 * 1000);

    return () => clearInterval(intervalIds);
  }, [fetchEmails]);

  const openEmail = async (email: EmailSummary) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/emails/${email.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedEmail(data);
        // Update local read state
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleArchive = async (emailId: string) => {
    try {
      const res = await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });
      if (res.ok) {
        setEmails((prev) => prev.filter((e) => e.id !== emailId));
        if (selectedEmail?.id === emailId) setSelectedEmail(null);
        addToast("Correo archivado.", "success");
      }
    } catch (e) {
      addToast("Error al archivar.", "error");
    }
  };

  const handleDelete = async (emailId: string) => {
    const ok = await confirm({
      title: "Eliminar correo",
      description: "¿Estás seguro de que quieres eliminar este correo?",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/emails/${emailId}`, { method: "DELETE" });
      if (res.ok) {
        setEmails((prev) => prev.filter((e) => e.id !== emailId));
        if (selectedEmail?.id === emailId) setSelectedEmail(null);
        addToast("Correo eliminado.", "success");
      }
    } catch (e) {
      addToast("Error al eliminar.", "error");
    }
  };

  const handleToggleRead = async (email: EmailSummary) => {
    try {
      const res = await fetch(`/api/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !email.isRead }),
      });
      if (res.ok) {
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: !email.isRead } : e))
        );
        if (selectedEmail?.id === email.id) {
          setSelectedEmail((prev) => prev ? { ...prev, isRead: !email.isRead } : prev);
        }
      }
    } catch (e) {
      addToast("Error al actualizar.", "error");
    }
  };

  const handleSync = async (reset = false) => {
    // Check if the target company (or any company) has IMAP configured
    const targetCompany = selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId) : null;
    const hasImap = targetCompany ? !!targetCompany.imapHost : companies.some((c) => c.imapHost);
    if (!hasImap) {
      const company = targetCompany || companies[0];
      addToast("Configura el servidor IMAP para poder recibir correos.", "error");
      if (company) openConfig(company);
      return;
    }

    setIsSyncing(true);
    try {
      // On full reset, first remove corrupted records so they get re-fetched correctly
      if (reset) {
        await fetch("/api/emails/fix-corrupted", { method: "DELETE" });
      }

      const params = new URLSearchParams();
      if (reset) params.set("reset", "true");
      if (selectedCompanyId) params.set("companyId", selectedCompanyId);
      const res = await fetch(`/api/cron/fetch-emails?${params}`);
      const data = await res.json();
      if (res.ok) {
        const msg = data.newEmailsFetched > 0
          ? `${data.newEmailsFetched} correos nuevos sincronizados.`
          : "Bandeja al día, no hay correos nuevos.";
        addToast(msg, "success");
        if (data.errorDetails?.length) {
          addToast(`Errores: ${data.errorDetails[0]}`, "error");
        }
        fetchEmails();
      } else {
        addToast(data.error || "Error al sincronizar.", "error");
      }
    } catch (e) {
      addToast("Error de conexión.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: composeData.companyId || selectedCompanyId,
          to: composeData.to,
          cc: composeData.cc || undefined,
          subject: composeData.subject,
          bodyHtml: composeData.bodyHtml,
          scheduledAt: composeData.scheduledAt || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.scheduled ? "Correo programado exitosamente." : "Correo enviado exitosamente.", "success");
        setIsComposing(false);
        setPreviewCompose(false);
        setShowSchedulePicker(false);
        setComposeData({ to: "", cc: "", subject: "", bodyHtml: "", companyId: "", scheduledAt: "" });
        if (folder === "sent") fetchEmails();
      } else {
        addToast(data.error || "Error al enviar.", "error");
      }
    } catch (e) {
      addToast("Error de conexión.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const loadContacts = () => {
    if (contacts.length === 0) {
      fetch("/api/contacts")
        .then((r) => r.json())
        .then((data: ContactOption[]) => setContacts(data.filter((c) => c.email)))
        .catch(() => {});
    }
  };

  const openReply = (email: EmailDetail) => {
    setComposeData({
      to: sanitizeEmail(email.fromAddress, ""),
      cc: "",
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      bodyHtml: `<br><br><hr><p><b>De:</b> ${email.fromName || email.fromAddress} &lt;${email.fromAddress}&gt;</p><p><b>Asunto:</b> ${email.subject}</p><div>${email.bodyHtml || email.bodyText || ""}</div>`,
      companyId: email.companyId,
      scheduledAt: "",
    });
    setPreviewCompose(false);
    setShowSchedulePicker(false);
    setIsComposing(true);
    loadContacts();
  };

  const openConfig = async (company: Company) => {
    setConfigCompanyId(company.id);
    // Load existing SMTP
    try {
      const smtpRes = await fetch(`/api/companies/${company.id}/smtp`);
      const imapRes = await fetch(`/api/companies/${company.id}/imap`);
      const smtp = smtpRes.ok ? await smtpRes.json() : {};
      const imap = imapRes.ok ? await imapRes.json() : {};
      setImapForm({
        imapHost: imap.imapHost || "",
        imapPort: String(imap.imapPort || 993),
        imapUser: imap.imapUser || "",
        imapPass: "",
        imapSecure: imap.imapSecure ?? true,
        smtpHost: smtp.smtpHost || "",
        smtpPort: String(smtp.smtpPort || 465),
        smtpUser: smtp.smtpUser || "",
        smtpPass: "",
        smtpFromEmail: smtp.smtpFromEmail || "",
        smtpSecure: smtp.smtpSecure ?? true,
      });
    } catch (e) {}
    setShowImapModal(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configCompanyId) return;
    setIsSavingConfig(true);
    try {
      const [smtpRes, imapRes] = await Promise.all([
        fetch(`/api/companies/${configCompanyId}/smtp`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            smtpHost: imapForm.smtpHost,
            smtpPort: imapForm.smtpPort,
            smtpUser: imapForm.smtpUser,
            smtpPass: imapForm.smtpPass || undefined,
            smtpFromEmail: imapForm.smtpFromEmail,
            smtpSecure: imapForm.smtpSecure,
          }),
        }),
        fetch(`/api/companies/${configCompanyId}/imap`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imapHost: imapForm.imapHost,
            imapPort: imapForm.imapPort,
            imapUser: imapForm.imapUser,
            imapPass: imapForm.imapPass || undefined,
            imapSecure: imapForm.imapSecure,
          }),
        }),
      ]);

      if (smtpRes.ok && imapRes.ok) {
        addToast("Configuración guardada.", "success");
        setShowImapModal(false);
        fetchCompanies();
      } else {
        addToast("Error al guardar la configuración.", "error");
      }
    } catch (e) {
      addToast("Error de conexión.", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const unread = emails.filter((e) => !e.isRead && e.type === "RECEIVED").length;

  return (
    <div className="flex h-screen bg-[#f5f4ef] font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      {/* Email Client Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: Email list */}
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0">
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              {FOLDERS.find((f) => f.key === folder)?.icon}
              {FOLDERS.find((f) => f.key === folder)?.label}
              {selectedCompany && (
                <span className="text-xs font-normal text-gray-400 truncate">· {selectedCompany.name}</span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{emails.length} correos</p>
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingEmails ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              </div>
            ) : emails.length === 0 ? (
              (() => {
                // Determine WHY the inbox is empty to show the right message
                const noImapCompanies = companies.filter((c) => !c.imapHost);
                const allLackImap = companies.length > 0 && companies.every((c) => !c.imapHost);
                const selectedLacksImap =
                  selectedCompanyId && companies.find((c) => c.id === selectedCompanyId) && !companies.find((c) => c.id === selectedCompanyId)?.imapHost;

                if (folder === "inbox" && (allLackImap || selectedLacksImap)) {
                  const targetCompany = selectedCompanyId
                    ? companies.find((c) => c.id === selectedCompanyId)
                    : null;
                  return (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
                      <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                        <HugeiconsIcon icon={InboxIcon} size={22} color="#fbbf24" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">IMAP no configurado</p>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          Para recibir correos necesitas configurar el servidor IMAP de{" "}
                          {targetCompany ? <strong>{targetCompany.name}</strong> : "la empresa"}.
                          <br />
                          El SMTP solo sirve para <em>enviar</em>.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const company = targetCompany || companies.find((c) => !c.imapHost);
                          if (company) openConfig(company);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition-colors"
                      >
                        <HugeiconsIcon icon={Settings01Icon} size={13} />
                        Configurar IMAP
                      </button>
                      {!targetCompany && noImapCompanies.length > 1 && (
                        <p className="text-xs text-gray-400">
                          {noImapCompanies.length} empresas sin IMAP configurado
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2 px-4 text-center">
                    <HugeiconsIcon icon={Mail01Icon} size={32} className="opacity-30" />
                    <p className="text-sm">No hay correos en esta carpeta</p>
                    {folder === "inbox" && (
                      <button
                        onClick={() => handleSync(true)}
                        disabled={isSyncing}
                        className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 mt-1"
                      >
                        <HugeiconsIcon icon={Refresh01Icon} size={11} className={isSyncing ? "animate-spin" : ""} />
                        Sincronizar ahora
                      </button>
                    )}
                  </div>
                );
              })()
            ) : (
              emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selectedEmail?.id === email.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!email.isRead && email.type === "RECEIVED" && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${email.isRead || email.type === "SENT" ? "pl-4" : ""}`}>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-sm truncate ${
                            !email.isRead && email.type === "RECEIVED"
                              ? "font-semibold text-gray-900"
                              : "font-medium text-gray-700"
                          }`}
                        >
                          {email.type === "SENT"
                            ? `→ ${sanitizeEmail(email.toAddress)}`
                            : email.fromName || sanitizeEmail(email.fromAddress)}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(email.receivedAt).toLocaleDateString("es-MX", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{email.subject}</p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {email.company.name}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Email detail */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f4ef]">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center flex-1">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : selectedEmail ? (
            <>
              {/* Email detail header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 mb-2 leading-snug">
                      {selectedEmail.subject}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>
                        <span className="text-gray-400 text-xs">De:</span>{" "}
                        {selectedEmail.fromName
                          ? `${selectedEmail.fromName} <${sanitizeEmail(selectedEmail.fromAddress)}>`
                          : sanitizeEmail(selectedEmail.fromAddress)}
                      </span>
                      <span>
                        <span className="text-gray-400 text-xs">Para:</span>{" "}
                        {sanitizeEmail(selectedEmail.toAddress)}
                      </span>
                      {selectedEmail.ccAddress && (
                        <span>
                          <span className="text-gray-400 text-xs">CC:</span>{" "}
                          {selectedEmail.ccAddress}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(selectedEmail.receivedAt).toLocaleString("es-MX", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {selectedEmail.company.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedEmail.type === "RECEIVED" && (
                      <button
                        onClick={() => openReply(selectedEmail)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <HugeiconsIcon icon={MailReplyIcon} size={13} />
                        Responder
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleRead(selectedEmail)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title={selectedEmail.isRead ? "Marcar como no leído" : "Marcar como leído"}
                    >
                      {selectedEmail.isRead ? <HugeiconsIcon icon={ViewOffIcon} size={15} /> : <HugeiconsIcon icon={ViewIcon} size={15} />}
                    </button>
                    {!selectedEmail.isArchived && (
                      <button
                        onClick={() => handleArchive(selectedEmail.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Archivar"
                      >
                        <HugeiconsIcon icon={ArchiveIcon} size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedEmail.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <HugeiconsIcon icon={Delete01Icon} size={15} />
                    </button>
                    <button
                      onClick={() => setSelectedEmail(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Email body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {selectedEmail.bodyHtml ? (
                    <iframe
                      srcDoc={selectedEmail.bodyHtml}
                      sandbox="allow-same-origin"
                      className="w-full border-0"
                      style={{ minHeight: "500px", height: "600px" }}
                      title="Email body"
                    />
                  ) : selectedEmail.bodyText ? (
                    <pre className="p-6 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedEmail.bodyText}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                      <HugeiconsIcon icon={Mail01Icon} size={32} className="opacity-30" />
                      <p className="text-sm">Este correo no tiene contenido</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
              <HugeiconsIcon icon={Mail01Icon} size={48} className="opacity-20" />
              <p className="text-base font-medium text-gray-500">Selecciona un correo</p>
              <p className="text-sm text-gray-400">para ver su contenido aquí</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center bg-gray-900/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <HugeiconsIcon icon={PencilEdit01Icon} size={15} color="#9ca3af" />
                Nuevo correo
              </h3>
              <button
                onClick={() => { setIsComposing(false); setPreviewCompose(false); setShowSchedulePicker(false); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </button>
            </div>

            <form onSubmit={handleSend} className="flex-1 overflow-y-auto flex flex-col">
              <div className="flex flex-col divide-y divide-gray-100 px-5">
                {/* Company selector */}
                <div className="py-3 flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 shrink-0">Cuenta</span>
                  <select
                    required
                    value={composeData.companyId || selectedCompanyId || ""}
                    onChange={(e) => setComposeData((p) => ({ ...p, companyId: e.target.value }))}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-gray-900"
                  >
                    <option value="" disabled>Seleccionar empresa</option>
                    {companies
                      .filter((c) => c.smtpHost)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                {/* To — with contact autocomplete */}
                <div className="py-3 flex items-center gap-3 relative">
                  <span className="text-xs text-gray-400 w-16 shrink-0">Para</span>
                  <div className="flex-1 relative">
                    <input
                      ref={contactInputRef}
                      type="email"
                      required
                      placeholder="destinatario@email.com"
                      value={composeData.to}
                      onChange={(e) => {
                        const val = e.target.value;
                        setComposeData((p) => ({ ...p, to: val }));
                        setShowContactDropdown(val.length >= 1);
                      }}
                      onFocus={() => {
                        if (composeData.to.length >= 1) setShowContactDropdown(true);
                      }}
                      className="w-full text-sm bg-transparent focus:outline-none text-gray-900 placeholder-gray-300"
                    />
                    {showContactDropdown && (() => {
                      const q = composeData.to.toLowerCase();
                      const matches = contacts.filter(
                        (c) =>
                          c.email!.toLowerCase().includes(q) ||
                          c.firstName.toLowerCase().includes(q) ||
                          (c.lastName?.toLowerCase() || "").includes(q)
                      ).slice(0, 8);
                      return matches.length > 0 ? (
                        <div
                          ref={contactDropdownRef}
                          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                        >
                          {matches.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setComposeData((p) => ({ ...p, to: c.email! }));
                                setShowContactDropdown(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {c.firstName} {c.lastName || ""}
                              </span>
                              <span className="text-xs text-gray-400 truncate ml-2 shrink-0">{c.email}</span>
                            </button>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                {/* CC */}
                <div className="py-3 flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 shrink-0">CC</span>
                  <input
                    type="text"
                    placeholder="copia@email.com"
                    value={composeData.cc}
                    onChange={(e) => setComposeData((p) => ({ ...p, cc: e.target.value }))}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-gray-900 placeholder-gray-300"
                  />
                </div>
                {/* Subject */}
                <div className="py-3 flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 shrink-0">Asunto</span>
                  <input
                    type="text"
                    required
                    placeholder="Asunto del correo"
                    value={composeData.subject}
                    onChange={(e) => setComposeData((p) => ({ ...p, subject: e.target.value }))}
                    className="flex-1 text-sm bg-transparent focus:outline-none text-gray-900 placeholder-gray-300"
                  />
                </div>
              </div>

              {/* Body with write/preview toggle */}
              <div className="flex-1 px-5 pt-3 pb-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Mensaje</span>
                  <div className="flex items-center gap-0.5 bg-gray-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewCompose(false)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        !previewCompose ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <HugeiconsIcon icon={SourceCodeIcon} size={12} />
                      Escribir
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewCompose(true)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        previewCompose ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <HugeiconsIcon icon={ViewIcon} size={12} />
                      Vista previa
                    </button>
                  </div>
                </div>

                {!previewCompose ? (
                  <textarea
                    required
                    placeholder="Escribe tu mensaje aquí... (HTML soportado)"
                    rows={8}
                    value={composeData.bodyHtml}
                    onChange={(e) => setComposeData((p) => ({ ...p, bodyHtml: e.target.value }))}
                    className="w-full text-sm bg-transparent focus:outline-none text-gray-900 placeholder-gray-300 resize-none"
                  />
                ) : (
                  <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-white" style={{ minHeight: "200px" }}>
                    {composeData.bodyHtml.trim() ? (
                      <iframe
                        srcDoc={composeData.bodyHtml}
                        sandbox="allow-same-origin"
                        className="w-full border-0"
                        style={{ minHeight: "200px", height: "200px" }}
                        title="Previsualización del correo"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400 gap-2" style={{ minHeight: "200px" }}>
                        <HugeiconsIcon icon={ViewIcon} size={24} className="opacity-40" />
                        <span className="text-xs">Escribe HTML en el editor para previsualizar</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center shrink-0 bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => { setIsComposing(false); setPreviewCompose(false); setShowSchedulePicker(false); }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <div className="flex items-center gap-2">
                  {/* Schedule */}
                  <div className="flex items-center gap-1">
                    {showSchedulePicker && (
                      <input
                        type="datetime-local"
                        value={composeData.scheduledAt}
                        min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        onChange={(e) => setComposeData((p) => ({ ...p, scheduledAt: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/5"
                      />
                    )}
                    <button
                      type="button"
                      title="Programar envío"
                      onClick={() => {
                        setShowSchedulePicker((v) => !v);
                        if (showSchedulePicker) setComposeData((p) => ({ ...p, scheduledAt: "" }));
                      }}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                        composeData.scheduledAt
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <HugeiconsIcon icon={Clock01Icon} size={14} />
                      {composeData.scheduledAt ? "Programado" : "Programar"}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    <HugeiconsIcon icon={SentIcon} size={14} />
                    {isSending ? "Guardando..." : composeData.scheduledAt ? "Programar" : "Enviar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAP/SMTP Config Modal */}
      {showImapModal && configCompanyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Configurar cuenta de correo
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {companies.find((c) => c.id === configCompanyId)?.name}
                </p>
              </div>
              <button
                onClick={() => setShowImapModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {/* SMTP Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <HugeiconsIcon icon={SentIcon} size={14} color="#3b82f6" />
                  Configuración de envío (SMTP)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Servidor SMTP</label>
                    <input
                      type="text"
                      placeholder="smtp.gmail.com"
                      value={imapForm.smtpHost}
                      onChange={(e) => setImapForm((p) => ({ ...p, smtpHost: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Puerto</label>
                    <input
                      type="number"
                      placeholder="465"
                      value={imapForm.smtpPort}
                      onChange={(e) => setImapForm((p) => ({ ...p, smtpPort: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Usuario</label>
                    <input
                      type="text"
                      placeholder="tu@email.com"
                      value={imapForm.smtpUser}
                      onChange={(e) => setImapForm((p) => ({ ...p, smtpUser: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Contraseña</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={imapForm.smtpPass}
                      onChange={(e) => setImapForm((p) => ({ ...p, smtpPass: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs text-gray-500">Email remitente (From)</label>
                    <input
                      type="email"
                      placeholder="noreply@tuempresa.com"
                      value={imapForm.smtpFromEmail}
                      onChange={(e) => setImapForm((p) => ({ ...p, smtpFromEmail: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <input
                      type="checkbox"
                      id="smtpSecure"
                      checked={imapForm.smtpSecure}
                      onChange={(e) => setImapForm((p) => ({ ...p, smtpSecure: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="smtpSecure" className="text-xs text-gray-600">
                      Usar conexión segura (SSL/TLS)
                    </label>
                  </div>
                </div>
              </div>

              {/* IMAP Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <HugeiconsIcon icon={InboxIcon} size={14} color="#22c55e" />
                  Configuración de recepción (IMAP)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Servidor IMAP</label>
                    <input
                      type="text"
                      placeholder="imap.gmail.com"
                      value={imapForm.imapHost}
                      onChange={(e) => setImapForm((p) => ({ ...p, imapHost: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Puerto</label>
                    <input
                      type="number"
                      placeholder="993"
                      value={imapForm.imapPort}
                      onChange={(e) => setImapForm((p) => ({ ...p, imapPort: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Usuario</label>
                    <input
                      type="text"
                      placeholder="tu@email.com"
                      value={imapForm.imapUser}
                      onChange={(e) => setImapForm((p) => ({ ...p, imapUser: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Contraseña</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={imapForm.imapPass}
                      onChange={(e) => setImapForm((p) => ({ ...p, imapPass: e.target.value }))}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <input
                      type="checkbox"
                      id="imapSecure"
                      checked={imapForm.imapSecure}
                      onChange={(e) => setImapForm((p) => ({ ...p, imapSecure: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="imapSecure" className="text-xs text-gray-600">
                      Usar conexión segura (SSL/TLS)
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowImapModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSavingConfig ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

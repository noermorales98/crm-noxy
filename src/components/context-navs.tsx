"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building04Icon, InboxIcon, Calendar01Icon, Add01Icon, Archive01Icon, SentIcon, SpamIcon, PencilEdit01Icon, Settings01Icon, Delete01Icon, MegaphoneIcon, Mail01Icon } from "@hugeicons/core-free-icons";
import { useOptionalEmailContext } from "@/src/context/EmailContext";
import ContentMiniMonth from "@/src/components/content/ContentMiniMonth";
import { useAssistantConversations } from "@/src/components/useAssistantConversations";
import { groupConversationsByDay } from "@/src/components/assistant-conversation-list-state";
import { ICON_SIZE, ICON_IDLE, branchActionClass, sectionLabelClass, navItemClass, rowClass, CountBadge, NavLeaf, CappedList } from "@/src/components/sidebar-parts";

// ─── Rama: Correo ──────────────────────────────────────────────────────────────

type EmailCompany = { id: string; name: string; smtpHost: string | null; imapHost: string | null };

const EMAIL_FOLDERS = [
  { key: "inbox" as const, label: "Bandeja de entrada", icon: InboxIcon },
  { key: "sent" as const, label: "Enviados", icon: SentIcon },
  { key: "archived" as const, label: "Archivados", icon: Archive01Icon },
  { key: "spam" as const, label: "Spam", icon: SpamIcon },
];

export function MailNav({ unreadCount, onNavigate }: { unreadCount: number; onNavigate?: () => void }) {
  const emailCtx = useOptionalEmailContext();
  const pathname = usePathname() ?? "/";
  const [companies, setCompanies] = useState<EmailCompany[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    setLoadState("loading");
    fetch("/api/companies")
      .then((r) => r.json())
      .then((data: Array<{ id: string; name: string; smtpHost?: string | null; imapHost?: string | null }>) => {
        if (Array.isArray(data)) {
          const withSmtp = data
            .filter((c) => c.smtpHost)
            .map((c) => ({ id: c.id, name: c.name, smtpHost: c.smtpHost ?? null, imapHost: c.imapHost ?? null }));
          setCompanies(withSmtp);
          if (emailCtx?.setCompanies) emailCtx.setCompanies(withSmtp);
        }
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isOnEmail = pathname.startsWith("/emails");
  const activeFolder: string | null = isOnEmail
    ? (emailCtx?.folder ??
      (pathname.includes("box=sent") ? "sent" : pathname.includes("box=archived") ? "archived" : pathname.includes("box=spam") ? "spam" : "inbox"))
    : null;
  const selectedCompanyId = emailCtx?.selectedCompanyId ?? null;

  return (
    <div className="flex flex-col">
      {emailCtx?.onCompose ? (
        <button type="button" onClick={emailCtx.onCompose} className={branchActionClass}>
          <HugeiconsIcon icon={PencilEdit01Icon} size={ICON_SIZE} aria-hidden="true" />
          Redactar
        </button>
      ) : (
        <Link href="/emails" onClick={onNavigate} className={branchActionClass}>
          <HugeiconsIcon icon={PencilEdit01Icon} size={ICON_SIZE} aria-hidden="true" />
          Redactar
        </Link>
      )}

      {EMAIL_FOLDERS.map((f) => {
        const isActive = activeFolder === f.key;
        const cls = navItemClass(isActive);
        const inner = (
          <>
            <HugeiconsIcon icon={f.icon} size={ICON_SIZE} aria-hidden="true" className={isActive ? "shrink-0" : ICON_IDLE} />
            <span className="min-w-0 flex-1 truncate">{f.label}</span>
            {f.key === "inbox" && <CountBadge count={unreadCount} label={`${unreadCount} correos sin leer`} />}
          </>
        );
        return isOnEmail && emailCtx ? (
          <button
            key={f.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              emailCtx.setFolder(f.key);
              onNavigate?.();
            }}
            className={cls}
          >
            {inner}
          </button>
        ) : (
          <Link key={f.key} href={f.key === "inbox" ? "/emails" : `/emails?box=${f.key}`} onClick={onNavigate} className={cls}>
            {inner}
          </Link>
        );
      })}
      <NavLeaf
        href="/campaigns"
        label="Campañas"
        icon={Mail01Icon}
        isActive={pathname === "/campaigns" || pathname.startsWith("/campaigns/")}
        onChoose={onNavigate}
      />

      <p className={sectionLabelClass}>Cuentas</p>
      {loadState === "loading" && companies.length === 0 ? (
        <div aria-hidden="true" className="flex flex-col gap-0 px-3 py-1">
          {[0, 1].map((i) => (
            <span key={i} className="my-[9px] h-3 w-32 rounded-sm bg-line" />
          ))}
          <span role="status" className="sr-only">Cargando cuentas de correo</span>
        </div>
      ) : loadState === "error" && companies.length === 0 ? (
        <p role="status" className="px-3 py-2 text-xs text-text-secondary-strong">
          No se pudieron cargar las cuentas.{" "}
          <button type="button" onClick={load} className="min-h-11 font-medium text-text-primary underline-offset-2 hover:underline">
            Reintentar
          </button>
        </p>
      ) : companies.length === 0 ? (
        <p className="px-3 py-2 text-xs text-text-secondary-strong">Sin cuentas de correo conectadas</p>
      ) : (
        <>
          {isOnEmail && emailCtx ? (
            <button
              type="button"
              onClick={() => {
                emailCtx.setSelectedCompanyId(null);
                onNavigate?.();
              }}
              className={navItemClass(selectedCompanyId === null)}
            >
              <HugeiconsIcon icon={Building04Icon} size={ICON_SIZE} aria-hidden="true" className={ICON_IDLE} />
              <span className="truncate">Todas</span>
            </button>
          ) : null}
          <CappedList
            items={companies}
            noun="todas"
            render={(company) => {
              const isSelected = isOnEmail && selectedCompanyId === company.id;
              const inner = (
                <>
                  <HugeiconsIcon
                    icon={company.imapHost ? InboxIcon : SentIcon}
                    size={14}
                    aria-hidden="true"
                    className={company.imapHost ? "shrink-0 text-success" : ICON_IDLE}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{company.name}</span>
                  </span>
                  {!company.imapHost && (
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-warning-soft px-1.5 text-xs font-medium text-warning">Sin IMAP</span>
                  )}
                </>
              );
              return (
                <div key={company.id} className="group relative">
                  {isOnEmail && emailCtx ? (
                    <button
                      type="button"
                      onClick={() => {
                        emailCtx.setSelectedCompanyId(company.id);
                        onNavigate?.();
                      }}
                      className={navItemClass(isSelected, "pr-11")}
                    >
                      {inner}
                    </button>
                  ) : (
                    <Link href={`/emails?company=${company.id}`} onClick={onNavigate} className={navItemClass(false)}>
                      {inner}
                    </Link>
                  )}
                  {isOnEmail && emailCtx?.onOpenConfig && (
                    <button
                      type="button"
                      onClick={() => emailCtx.onOpenConfig(company)}
                      aria-label={`Configurar SMTP / IMAP de ${company.name}`}
                      title="Configurar SMTP / IMAP"
                      className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-control text-text-secondary-strong opacity-0 transition-opacity duration-150 hover:text-text-primary focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
                    >
                      <HugeiconsIcon icon={Settings01Icon} size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            }}
          />
        </>
      )}
    </div>
  );
}

// ─── Rama: Gestión de contenido ────────────────────────────────────────────────

type ContentClientEntry = { id: string; name: string; kind: string; color: string };

export function ContentNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  const [clients, setClients] = useState<ContentClientEntry[]>([]);

  useEffect(() => {
    fetch("/api/content/clients")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Array<{ id: string; name: string; kind: string; color?: string | null }>) => {
        if (Array.isArray(data)) setClients(data.map((c) => ({ id: c.id, name: c.name, kind: c.kind, color: c.color || "#3545D6" })));
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="flex flex-col">
      <Link href="/contenido?new=1" onClick={onNavigate} className={branchActionClass}>
        <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} aria-hidden="true" />
        Nuevo
      </Link>
      <NavLeaf href="/contenido/general" label="Calendario general" icon={Calendar01Icon} isActive={pathname === "/contenido/general"} onChoose={onNavigate} />
      <NavLeaf href="/contenido" label="Todos los calendarios" icon={MegaphoneIcon} isActive={pathname === "/contenido"} onChoose={onNavigate} />

      <p className={sectionLabelClass}>Clientes y marcas</p>
      {clients.length === 0 ? (
        <p className="px-3 py-2 text-xs text-text-secondary-strong">Aún no hay calendarios de clientes</p>
      ) : (
        <CappedList
          items={clients}
          noun="todos"
          render={(c) => {
            const isActive = pathname === `/contenido/${c.id}`;
            return (
              <Link key={c.id} href={`/contenido/${c.id}`} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={navItemClass(isActive)}>
                {/* Identidad del cliente: su color, como punto pequeño; no es un dato. */}
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color || "#3545D6" }} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
              </Link>
            );
          }}
        />
      )}
      {pathname.startsWith("/contenido") && (
        <div className="-ml-2 pt-2">
          <Suspense fallback={null}>
            <ContentMiniMonth />
          </Suspense>
        </div>
      )}
    </div>
  );
}

// ─── Rama: Asistente ───────────────────────────────────────────────────────────

const HISTORY_CAP = 8;

export function AssistantNav() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  const {
    status: conversationStatus,
    conversations,
    hasSnapshot: hasConversationSnapshot,
    refresh: refreshConversations,
  } = useAssistantConversations(Boolean(session?.user));
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const deleteConv = async (id: string) => {
    try {
      await fetch(`/api/assistant/conversations/${id}`, { method: "DELETE" });
      void refreshConversations();
      if (pathname === `/assistant/${id}`) {
        router.push("/assistant/new");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const visible = showAll ? conversations : conversations.slice(0, HISTORY_CAP);
  const groups = groupConversationsByDay(visible);

  return (
    <div className="flex flex-col">
      <Link href="/assistant/new" prefetch className={branchActionClass} aria-current={pathname === "/assistant/new" ? "page" : undefined}>
        <HugeiconsIcon icon={Add01Icon} size={ICON_SIZE} aria-hidden="true" />
        Nuevo
      </Link>

      <div
        role="region"
        aria-label="Historial de conversaciones"
        aria-busy={conversationStatus === "loading" || conversationStatus === "refreshing"}
      >
        {conversationStatus === "loading" ? (
          <>
            <span role="status" className="sr-only">Cargando historial de conversaciones</span>
            <div className="flex flex-col px-3 py-1" aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <span key={row} className="my-4 h-3 w-36 rounded-sm bg-line" />
              ))}
            </div>
          </>
        ) : conversationStatus === "error" && !hasConversationSnapshot ? (
          <p role="status" className="px-3 py-2 text-xs text-text-secondary-strong">
            No se pudo cargar el historial.{" "}
            <button
              type="button"
              onClick={() => void refreshConversations()}
              className="min-h-11 font-medium text-text-primary underline-offset-2 hover:underline"
            >
              Reintentar
            </button>
          </p>
        ) : conversationStatus === "ready" && conversations.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-secondary-strong">Aún no hay conversaciones. Empieza una con el asistente.</p>
        ) : (
          <>
            {conversationStatus === "refreshing" && (
              <span role="status" className="sr-only">Actualizando historial de conversaciones</span>
            )}
            {conversationStatus === "error" && hasConversationSnapshot && (
              <p role="status" className="px-3 pb-1 pt-2 text-xs text-text-secondary-strong">
                No se pudo actualizar el historial. Se muestran los datos anteriores.
              </p>
            )}
            {groups.map((group) => (
              <div key={group.label}>
                <p className={sectionLabelClass}>{group.label}</p>
                {group.conversations.map((conv) => {
                  const isActive = pathname === `/assistant/${conv.id}`;
                  return (
                    <div key={conv.id} className="group relative">
                      <Link
                        href={`/assistant/${conv.id}`}
                        aria-current={isActive ? "page" : undefined}
                        className={navItemClass(isActive, "pr-11")}
                      >
                        <span className="min-w-0 flex-1 truncate">{conv.title}</span>
                      </Link>
                      {deletingId === conv.id ? (
                        <div className="absolute inset-y-1 right-0 left-0 z-10 flex items-center justify-end gap-1 rounded-control bg-surface-elevated pr-1">
                          <span className="mr-auto truncate pl-3 text-xs text-text-secondary">¿Eliminar?</span>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="min-h-11 rounded-control px-2 text-xs text-text-secondary-strong hover:text-text-primary"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            autoFocus
                            onClick={() => deleteConv(conv.id)}
                            className="min-h-11 rounded-control px-2 text-xs font-semibold text-danger hover:bg-danger-soft"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(conv.id)}
                          aria-label={`Eliminar conversación «${conv.title}»`}
                          title="Eliminar conversación"
                          className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-control text-text-secondary-strong opacity-0 transition-opacity duration-150 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 motion-reduce:transition-none max-lg:opacity-100"
                        >
                          <HugeiconsIcon icon={Delete01Icon} size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {conversations.length > HISTORY_CAP && (
              <button
                type="button"
                aria-expanded={showAll}
                onClick={() => setShowAll((v) => !v)}
                className={`${rowClass(false)} text-text-secondary-strong`}
              >
                {showAll ? "Ver menos" : `Ver todas (${conversations.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserMultipleIcon } from "@hugeicons/core-free-icons";
import { isPlaceholderExtraFields, type ProjectSubmission } from "@/src/lib/project-submission-types";

type FormOption = { id: string; name: string };

export default function ProjectSubmissionsView({
  fetchUrl,
  initialFormId,
}: {
  fetchUrl: string;
  initialFormId?: string;
}) {
  const [forms, setForms] = useState<FormOption[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [formId, setFormId] = useState(initialFormId || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const url = formId ? `${fetchUrl}${fetchUrl.includes("?") ? "&" : "?"}formId=${encodeURIComponent(formId)}` : fetchUrl;
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setForms(data.forms || []);
        setSubmissions(data.submissions || []);
      } catch {
        if (!cancelled) {
          setForms([]);
          setSubmissions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchUrl, formId]);

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-text-secondary">
          {loading ? "Cargando…" : `${submissions.length} registro${submissions.length === 1 ? "" : "s"}`}
        </p>
        {forms.length > 1 && (
          <select
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border-subtle bg-white text-sm focus:outline-none focus:ring-1 focus:ring-border-subtle"
          >
            <option value="">Todos los formularios</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-border-subtle">
          <HugeiconsIcon icon={UserMultipleIcon} size={48} color="#d1d5db" className="mx-auto mb-3" />
          <h3 className="text-[15px] font-medium text-text-primary">Sin leads registrados</h3>
          <p className="text-sm text-text-secondary">Nadie ha llenado los formularios de este proyecto aún.</p>
        </div>
      ) : (
        <ul className="bg-white rounded-lg border border-border-subtle divide-y divide-gray-100 overflow-hidden">
          {submissions.map((contact) => {
            const extra = isPlaceholderExtraFields(contact.extraFields) ? null : contact.extraFields;
            const variantName = contact.sourceVariant?.name;
            return (
              <li key={contact.id} className="p-5 hover:bg-surface-sidebar/40 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-bold text-text-primary">
                        {contact.firstName} {contact.lastName || ""}
                      </p>
                      {contact.sourceForm?.name && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {contact.sourceForm.name}
                        </span>
                      )}
                      {variantName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                          {variantName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary flex-wrap">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-text-secondary bg-gray-100 px-2 py-1 rounded shrink-0">
                    {new Date(contact.createdAt).toLocaleDateString("es-MX")}
                  </span>
                </div>
                {extra && (
                  <div className="mt-3 text-xs bg-surface-sidebar border border-border-subtle p-3 rounded-lg text-text-secondary whitespace-pre-line">
                    {extra}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

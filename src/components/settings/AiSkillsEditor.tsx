"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/src/components/ui";
import { input as inputCls } from "@/src/lib/crm-ui";
import { slugCommand, MAX_INSTRUCTIONS, type AiSkill } from "@/src/lib/ai-skills";

const btn =
  "crm-press inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface-elevated px-3 text-xs font-semibold text-text-primary hover:bg-surface-sidebar disabled:opacity-50 lg:min-h-9";
const iconBtn =
  "flex size-11 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-40 lg:size-9";

const EMPTY = { command: "", name: "", description: "", instructions: "" };

/** Habilidades del asistente: comandos que se escriben con «/» en el chat. Las de fábrica se activan o desactivan; las propias se crean y se borran. */
export function AiSkillsEditor() {
  const [skills, setSkills] = useState<AiSkill[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/ai-skills", { cache: "no-store" }).catch(() => null);
    if (res?.ok) setSkills((await res.json()) as AiSkill[]);
    else setSkills([]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: AiSkill[]) => {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/settings/ai-skills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        custom: next.filter((s) => !s.builtin),
        disabledFactory: next.filter((s) => s.builtin && !s.enabled).map((s) => s.id),
      }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setSkills((await res.json()) as AiSkill[]);
      return true;
    }
    const error = res ? ((await res.json().catch(() => ({}))) as { error?: string }).error : undefined;
    setMessage({ type: "error", text: error ?? "No se pudo guardar." });
    return false;
  };

  const add = async () => {
    const command = slugCommand(form.command);
    if (!command || !form.instructions.trim()) return setMessage({ type: "error", text: "Escribe un comando y sus instrucciones." });
    if (skills?.some((s) => s.command === command)) return setMessage({ type: "error", text: `Ya existe /${command}.` });
    const next: AiSkill[] = [...(skills ?? []), { id: `custom-${command}`, command, name: form.name.trim() || command, description: form.description.trim(), instructions: form.instructions.trim(), enabled: true }];
    if (await persist(next)) {
      setForm(EMPTY);
      setMessage({ type: "success", text: `Listo: escribe /${command} en el chat.` });
    }
  };

  if (skills === null) return null;

  return (
    <section aria-label="Habilidades del asistente" className="mt-8 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Habilidades</h2>
        <p className="text-sm text-text-secondary">Atajos que se escriben con «/» en el chat (por ejemplo /guion). Cada una guarda las instrucciones para la IA.</p>
      </div>

      <ul className="divide-y divide-line rounded-surface border border-line">
        {skills.map((s) => (
          <li key={s.id} className="flex items-start gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                <code className="mr-2 rounded-control bg-nav-active px-1.5 py-0.5 text-xs text-action-ink">/{s.command}</code>
                {s.name}
                {s.builtin && <span className="ml-2 text-xs font-normal text-text-secondary">de fábrica</span>}
              </p>
              {s.description && <p className="text-sm text-text-secondary">{s.description}</p>}
            </div>
            <Switch checked={s.enabled} disabled={busy} label={`Activar /${s.command}`} onChange={(v: boolean) => void persist(skills.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)))} />
            {!s.builtin && (
              <button type="button" className={iconBtn} aria-label={`Borrar /${s.command}`} disabled={busy} onClick={() => void persist(skills.filter((x) => x.id !== s.id))}>
                <HugeiconsIcon icon={Delete02Icon} size={16} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-2 rounded-surface border border-line p-3">
        <p className="text-sm font-semibold text-text-primary">Nueva habilidad</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} placeholder="Comando (ej. ideas)" value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} aria-label="Comando" />
          <input className={inputCls} placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Nombre" />
        </div>
        <input className={inputCls} placeholder="Descripción corta" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="Descripción" />
        <textarea className={`${inputCls} min-h-24`} placeholder="Instrucciones para la IA (qué debe hacer y cómo)" maxLength={MAX_INSTRUCTIONS} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} aria-label="Instrucciones" />
        <div className="flex items-center gap-3">
          <button type="button" className={btn} disabled={busy} onClick={() => void add()}>Agregar habilidad</button>
          {message && <p role="status" className={`text-xs ${message.type === "error" ? "text-danger" : "text-action-ink"}`}>{message.text}</p>}
        </div>
      </div>
    </section>
  );
}

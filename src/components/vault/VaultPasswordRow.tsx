"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Edit01Icon,
  Delete02Icon,
  LockPasswordIcon,
  EyeIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { inputCompact as inputCls } from "@/src/lib/crm-ui";

export default function VaultPasswordRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: any;
  onUpdate: (id: string, data: Partial<any>) => void;
  onDelete: (id: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    label: entry.label,
    username: entry.username || "",
    password: entry.password || "",
    url: entry.url || "",
    notes: entry.notes || "",
  });

  function save() {
    onUpdate(entry.id, form);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-surface-sidebar rounded-lg p-4 flex flex-col gap-3 border border-line">
        <input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          className={inputCls}
          placeholder="Etiqueta (ej. cPanel, WordPress)"
        />
        <input
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          className={inputCls}
          placeholder="Usuario / email"
        />
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className={`${inputCls} pr-10`}
            placeholder="Contraseña"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
          >
            <HugeiconsIcon icon={show ? ViewOffIcon : EyeIcon} size={16} />
          </button>
        </div>
        <input
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          className={inputCls}
          placeholder="URL (opcional)"
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className={`${inputCls} resize-none`}
          rows={2}
          placeholder="Notas adicionales"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-surface-sidebar hover:bg-nav-active rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 py-2 text-xs font-semibold text-action-primary-foreground bg-action-primary hover:bg-brand-obsidian rounded-lg transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/vault flex items-start gap-3 bg-surface-elevated border border-line rounded-lg p-4 hover:border-line transition-colors">
      <div className="w-9 h-9 rounded-lg bg-action-primary flex items-center justify-center shrink-0">
        <HugeiconsIcon icon={LockPasswordIcon} size={16} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary">{entry.label}</p>
        {entry.username && (
          <p className="text-xs text-text-secondary truncate">{entry.username}</p>
        )}
        {entry.password && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-text-primary">
              {show ? entry.password : "•".repeat(Math.min(entry.password.length, 12))}
            </span>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={show}
              className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover hover:text-text-primary lg:size-8"
            >
              <HugeiconsIcon icon={show ? ViewOffIcon : EyeIcon} size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(entry.password)}
              className="min-h-11 text-sm font-semibold text-text-secondary hover:text-text-primary bg-surface-sidebar hover:bg-nav-active px-3 rounded-control transition-colors lg:min-h-8"
            >
              Copiar
            </button>
          </div>
        )}
        {entry.url && (
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs leading-[44px] text-blue-600 hover:underline lg:mt-0.5 lg:leading-normal"
          >
            {entry.url}
          </a>
        )}
        {entry.notes && <p className="text-xs text-text-secondary mt-1">{entry.notes}</p>}
      </div>
      <div className="flex gap-1 transition-opacity lg:opacity-0 lg:group-hover/vault:opacity-100 lg:focus-within:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${entry.label}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-nav-hover hover:text-text-primary lg:size-8"
        >
          <HugeiconsIcon icon={Edit01Icon} size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          aria-label={`Eliminar ${entry.label}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-danger-soft hover:text-danger lg:size-8"
        >
          <HugeiconsIcon icon={Delete02Icon} size={16} />
        </button>
      </div>
    </div>
  );
}

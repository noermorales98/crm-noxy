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
      <div className="bg-surface-sidebar rounded-lg p-4 flex flex-col gap-3 border border-border-subtle">
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
            className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 py-2 text-xs font-semibold text-action-primary-foreground bg-action-primary hover:bg-black rounded-lg transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/vault flex items-start gap-3 bg-white border border-border-subtle rounded-lg p-4 hover:border-border-subtle transition-colors">
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
            <span className="text-xs font-mono text-text-primary tracking-wider">
              {show ? entry.password : "•".repeat(Math.min(entry.password.length, 12))}
            </span>
            <button
              onClick={() => setShow((s) => !s)}
              className="text-text-secondary hover:text-text-secondary"
            >
              <HugeiconsIcon icon={show ? ViewOffIcon : EyeIcon} size={13} />
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(entry.password)}
              className="text-[10px] font-semibold text-text-secondary hover:text-text-primary bg-gray-100 hover:bg-nav-active px-2 py-0.5 rounded-lg transition-colors"
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
            className="text-xs text-blue-500 hover:underline truncate block mt-0.5"
          >
            {entry.url}
          </a>
        )}
        {entry.notes && <p className="text-xs text-text-secondary mt-1">{entry.notes}</p>}
      </div>
      <div className="flex gap-1 opacity-0 group-hover/vault:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-nav-hover rounded-lg"
        >
          <HugeiconsIcon icon={Edit01Icon} size={13} />
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
        >
          <HugeiconsIcon icon={Delete02Icon} size={13} />
        </button>
      </div>
    </div>
  );
}

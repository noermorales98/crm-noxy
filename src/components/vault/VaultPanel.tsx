"use client";

import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, LockPasswordIcon, EyeIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { inputCompact as inputCls } from "@/src/lib/crm-ui";
import VaultPasswordRow from "./VaultPasswordRow";
import SocialRow from "./SocialRow";
import { SOCIAL_PLATFORMS } from "./constants";

export default function VaultPanel({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName?: string;
}) {
  const [vaultEntries, setVaultEntries] = useState<any[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [newCred, setNewCred] = useState({
    label: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });
  const [newSocial, setNewSocial] = useState({ platform: "instagram", url: "" });
  const [showNewPass, setShowNewPass] = useState(false);

  const fetchVault = useCallback(async () => {
    setLoadingVault(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/vault`);
      if (res.ok) setVaultEntries(await res.json());
    } finally {
      setLoadingVault(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  async function addCredential() {
    if (!newCred.label) return;
    const res = await fetch(`/api/clients/${clientId}/vault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "credential", ...newCred }),
    });
    if (res.ok) {
      const entry = await res.json();
      setVaultEntries((prev) => [entry, ...prev]);
      setNewCred({ label: "", username: "", password: "", url: "", notes: "" });
      setShowAddCredential(false);
    }
  }

  async function addSocial() {
    if (!newSocial.url) return;
    const res = await fetch(`/api/clients/${clientId}/vault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "social", label: newSocial.platform, url: newSocial.url }),
    });
    if (res.ok) {
      const entry = await res.json();
      setVaultEntries((prev) => [...prev, entry]);
      setNewSocial({ platform: "instagram", url: "" });
      setShowAddSocial(false);
    }
  }

  async function updateVaultEntry(entryId: string, data: Partial<any>) {
    const res = await fetch(`/api/clients/${clientId}/vault`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, ...data }),
    });
    if (res.ok) {
      const updated = await res.json();
      setVaultEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
    }
  }

  async function deleteVaultEntry(entryId: string) {
    const res = await fetch(`/api/clients/${clientId}/vault`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId }),
    });
    if (res.ok) setVaultEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  const credentials = vaultEntries.filter((e) => e.type === "credential");
  const socials = vaultEntries.filter((e) => e.type === "social");

  return (
    <div className="flex-1 overflow-y-auto">
      {clientName && (
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-text-primary">{clientName}</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Contraseñas y accesos del cliente
          </p>
        </div>
      )}

      <div className="p-6 flex flex-col gap-6">
        {loadingVault ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Redes sociales */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                  Redes sociales
                </p>
                <button
                  onClick={() => setShowAddSocial((s) => !s)}
                  className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  <HugeiconsIcon icon={Add01Icon} size={13} />
                  Agregar
                </button>
              </div>

              {showAddSocial && (
                <div className="bg-surface-sidebar rounded-lg p-4 flex flex-col gap-3 mb-3 border border-border-subtle">
                  <select
                    value={newSocial.platform}
                    onChange={(e) => setNewSocial((s) => ({ ...s, platform: e.target.value }))}
                    className={inputCls}
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={newSocial.url}
                    onChange={(e) => setNewSocial((s) => ({ ...s, url: e.target.value }))}
                    className={inputCls}
                    placeholder="https://..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddSocial(false)}
                      className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addSocial}
                      disabled={!newSocial.url}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-action-primary hover:bg-black rounded-lg transition-colors disabled:opacity-40"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {socials.length === 0 && !showAddSocial ? (
                <p className="text-sm text-text-secondary py-3 text-center">
                  Sin redes sociales guardadas.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {socials.map((e) => (
                    <SocialRow key={e.id} entry={e} onDelete={deleteVaultEntry} />
                  ))}
                </div>
              )}
            </div>

            {/* Contraseñas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                  Bóveda de contraseñas
                </p>
                <button
                  onClick={() => setShowAddCredential((s) => !s)}
                  className="flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  <HugeiconsIcon icon={Add01Icon} size={13} />
                  Agregar
                </button>
              </div>

              {showAddCredential && (
                <div className="bg-surface-sidebar rounded-lg p-4 flex flex-col gap-3 mb-3 border border-border-subtle">
                  <input
                    value={newCred.label}
                    onChange={(e) => setNewCred((c) => ({ ...c, label: e.target.value }))}
                    className={inputCls}
                    placeholder="Etiqueta (ej. cPanel, WordPress, Google Ads)"
                    autoFocus
                  />
                  <input
                    value={newCred.username}
                    onChange={(e) => setNewCred((c) => ({ ...c, username: e.target.value }))}
                    className={inputCls}
                    placeholder="Usuario o email"
                  />
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newCred.password}
                      onChange={(e) => setNewCred((c) => ({ ...c, password: e.target.value }))}
                      className={`${inputCls} pr-10`}
                      placeholder="Contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
                    >
                      <HugeiconsIcon icon={showNewPass ? ViewOffIcon : EyeIcon} size={16} />
                    </button>
                  </div>
                  <input
                    value={newCred.url}
                    onChange={(e) => setNewCred((c) => ({ ...c, url: e.target.value }))}
                    className={inputCls}
                    placeholder="URL (opcional)"
                  />
                  <textarea
                    value={newCred.notes}
                    onChange={(e) => setNewCred((c) => ({ ...c, notes: e.target.value }))}
                    className={`${inputCls} resize-none`}
                    rows={2}
                    placeholder="Notas adicionales"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddCredential(false)}
                      className="flex-1 py-2 text-xs font-semibold text-text-secondary bg-gray-100 hover:bg-nav-active rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addCredential}
                      disabled={!newCred.label}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-action-primary hover:bg-black rounded-lg transition-colors disabled:opacity-40"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}

              {credentials.length === 0 && !showAddCredential ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <HugeiconsIcon icon={LockPasswordIcon} size={18} color="#9ca3af" />
                  </div>
                  <p className="text-sm text-text-secondary">Sin contraseñas guardadas.</p>
                  <button
                    onClick={() => setShowAddCredential(true)}
                    className="mt-2 text-xs font-semibold text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors"
                  >
                    Guardar primera contraseña
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {credentials.map((e) => (
                    <VaultPasswordRow
                      key={e.id}
                      entry={e}
                      onUpdate={updateVaultEntry}
                      onDelete={deleteVaultEntry}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

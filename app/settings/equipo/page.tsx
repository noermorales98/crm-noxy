"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { btnPrimary, btnGhost, input } from "@/src/lib/crm-ui";
import {
  ALL_PERMISSIONS,
  MEMBER_DEFAULT_PERMISSIONS,
  PERMISSION_MODULES,
  type ModulePermissions,
  type RoleName,
} from "@/src/lib/permissions";

type MemberRow = {
  id: string;
  role: RoleName;
  permissions: ModulePermissions;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
};

const ROLE_LABEL: Record<RoleName, string> = {
  OWNER: "Propietario",
  ADMIN: "Admin",
  MEMBER: "Miembro",
};

function emptyPermissions(role: RoleName): ModulePermissions {
  return role === "ADMIN" ? { ...ALL_PERMISSIONS } : { ...MEMBER_DEFAULT_PERMISSIONS };
}

export default function EquipoPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "MEMBER" as Exclude<RoleName, "OWNER">,
    permissions: emptyPermissions("MEMBER"),
  });
  const [editing, setEditing] = useState<Record<string, { role: Exclude<RoleName, "OWNER">; permissions: ModulePermissions }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el equipo");
      setMembers(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onRoleChange = (role: Exclude<RoleName, "OWNER">) => {
    setForm((f) => ({
      ...f,
      role,
      permissions: emptyPermissions(role),
    }));
  };

  const togglePerm = (key: keyof ModulePermissions, checked: boolean) => {
    if (form.role === "ADMIN") return;
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [key]: checked } }));
  };

  const createMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el usuario");
      setSuccess(`Se creó ${data.user.email}. Ya puede entrar en /login.`);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "MEMBER",
        permissions: emptyPermissions("MEMBER"),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  };

  const saveMember = async (member: MemberRow) => {
    const draft = editing[member.id];
    if (!draft) return;
    setBusyId(member.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setEditing((prev) => {
        const next = { ...prev };
        delete next[member.id];
        return next;
      });
      setSuccess("Permisos actualizados. El usuario debe volver a iniciar sesión.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (member: MemberRow) => {
    if (!confirm(`¿Quitar a ${member.user.email} del equipo?`)) return;
    setBusyId(member.id);
    setError(null);
    try {
      const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setBusyId(null);
    }
  };

  const currentUserId = session?.user?.id;

  const permissionChecks = useMemo(() => PERMISSION_MODULES, []);

  return (
    <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 bg-surface-app">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Equipo</h1>
        <p className="text-sm text-text-secondary mt-1">
          Tú agregas a las personas. El CRM no acepta registros públicos.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 bg-red-50 text-red-600 p-3 rounded-control text-sm font-medium max-w-4xl">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-control text-sm font-medium max-w-4xl">
          {success}
        </div>
      )}

      <div className="bg-surface-elevated rounded-surface border border-border-subtle p-5 sm:p-8 max-w-4xl flex flex-col gap-8">
        <form onSubmit={createMember} className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">Agregar usuario</h2>
            <p className="text-sm text-text-secondary">
              Recibe correo, contraseña inicial, un rol y los módulos que puede ver.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="member-name">Nombre</label>
              <input id="member-name" className={input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ana Pérez" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="member-email">Correo</label>
              <input id="member-email" type="email" className={input} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="ana@noxy.co" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="member-password">Contraseña inicial</label>
              <input id="member-password" type="password" autoComplete="new-password" className={input} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="member-role">Rol</label>
              <select
                id="member-role"
                className={input}
                value={form.role}
                onChange={(e) => onRoleChange(e.target.value as Exclude<RoleName, "OWNER">)}
              >
                <option value="MEMBER">Miembro</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Permisos por módulo</p>
            {form.role === "ADMIN" && (
              <p className="text-xs text-text-secondary mb-3">Un admin tiene acceso completo, incluido gestionar el equipo.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {permissionChecks.map((mod) => (
                <label key={mod.key} className={`flex items-start gap-3 rounded-control border border-border-subtle px-3 py-2.5 ${form.role === "ADMIN" ? "opacity-70" : ""}`}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.permissions[mod.key]}
                    disabled={form.role === "ADMIN"}
                    onChange={(e) => togglePerm(mod.key, e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{mod.label}</span>
                    <span className="block text-xs text-text-secondary">{mod.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} className={`${btnPrimary} self-start px-5`}>
            {saving ? "Creando…" : "Agregar al equipo"}
          </button>
        </form>

        <hr className="border-border-subtle" />

        <div>
          <h2 className="text-lg font-bold text-text-primary mb-4">Personas</h2>
          {loading ? (
            <div className="h-24 rounded-control bg-surface-sidebar animate-pulse" />
          ) : (
            <div className="flex flex-col gap-4">
              {members.map((member) => {
                const isOwner = member.role === "OWNER";
                const draft = editing[member.id];
                const role = draft?.role ?? (member.role === "OWNER" ? "OWNER" : member.role);
                const perms = draft?.permissions ?? member.permissions;
                const isSelf = member.user.id === currentUserId;

                return (
                  <div key={member.id} className="rounded-surface border border-border-subtle p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{member.user.name || "Sin nombre"}</p>
                        <p className="text-xs text-text-secondary">{member.user.email}</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-control bg-nav-active text-action-primary">
                        {ROLE_LABEL[member.role]}
                      </span>
                    </div>

                    {isOwner ? (
                      <p className="text-xs text-text-secondary">Acceso total. No se puede editar ni eliminar.</p>
                    ) : (
                      <>
                        <div className="mb-3 max-w-xs">
                          <label className="block text-xs font-medium text-text-primary mb-1">Rol</label>
                          <select
                            className={input}
                            value={role}
                            onChange={(e) => {
                              const nextRole = e.target.value as Exclude<RoleName, "OWNER">;
                              setEditing((prev) => ({
                                ...prev,
                                [member.id]: {
                                  role: nextRole,
                                  permissions: nextRole === "ADMIN" ? { ...ALL_PERMISSIONS } : { ...member.permissions },
                                },
                              }));
                            }}
                          >
                            <option value="MEMBER">Miembro</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          {permissionChecks.map((mod) => (
                            <label key={mod.key} className={`flex items-center gap-2 text-sm text-text-primary ${role === "ADMIN" ? "opacity-70" : ""}`}>
                              <input
                                type="checkbox"
                                checked={perms[mod.key]}
                                disabled={role === "ADMIN"}
                                onChange={(e) => {
                                  setEditing((prev) => ({
                                    ...prev,
                                    [member.id]: {
                                      role: (draft?.role ?? member.role) as Exclude<RoleName, "OWNER">,
                                      permissions: { ...perms, [mod.key]: e.target.checked },
                                    },
                                  }));
                                }}
                              />
                              {mod.label}
                            </label>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={btnPrimary}
                            disabled={!draft || busyId === member.id}
                            onClick={() => void saveMember(member)}
                          >
                            {busyId === member.id ? "Guardando…" : "Guardar"}
                          </button>
                          <button
                            type="button"
                            className={btnGhost}
                            disabled={isSelf || busyId === member.id}
                            onClick={() => void removeMember(member)}
                          >
                            Quitar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

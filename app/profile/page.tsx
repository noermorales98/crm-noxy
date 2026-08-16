"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useToast } from "@/src/context/ToastContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { User02Icon, Mail01Icon, LockIcon, ViewIcon, ViewOffIcon, ShieldUserIcon, Logout01Icon, CheckmarkCircle01Icon, Alert01Icon } from "@hugeicons/core-free-icons";
import { input as inputClsBase } from "@/src/lib/crm-ui";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { addToast } = useToast();

  // Profile data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Password section
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // States
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setName(data.name || "");
          setEmail(data.email || "");
          setOriginalEmail(data.email || "");
          setMemberSince(
            new Date(data.createdAt).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          );
        }
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Información actualizada correctamente.", "success");
        setOriginalEmail(data.email);
      } else {
        addToast(data.error || "Error al actualizar.", "error");
      }
    } catch {
      addToast("Error de conexión.", "error");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("Las contraseñas no coinciden.", "error");
      return;
    }
    if (newPassword.length < 8) {
      addToast("La nueva contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Contraseña actualizada. Por seguridad, te recomendamos volver a iniciar sesión.", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        addToast(data.error || "Error al cambiar contraseña.", "error");
      }
    } catch {
      addToast("Error de conexión.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const passwordStrength = (pwd: string) => {
    if (!pwd) return null;
    if (pwd.length < 8) return { label: "Débil", color: "bg-red-400", width: "w-1/4" };
    if (pwd.length < 12 && !/[^a-zA-Z0-9]/.test(pwd)) return { label: "Regular", color: "bg-amber-400", width: "w-2/4" };
    if (pwd.length >= 12 && /[^a-zA-Z0-9]/.test(pwd)) return { label: "Fuerte", color: "bg-green-500", width: "w-full" };
    return { label: "Buena", color: "bg-blue-500", width: "w-3/4" };
  };
  const strength = passwordStrength(newPassword);

  const inputCls = inputClsBase + " py-3 placeholder:text-text-secondary/60";

  return (
    <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-6 py-8 bg-surface-app">
          <div className="max-w-3xl mx-auto">

            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">Mi Perfil</h1>
              <p className="text-text-secondary mt-1 text-sm">Administra tu información personal y seguridad de la cuenta.</p>
            </div>

            {loadingProfile ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-border-subtle border-t-gray-900 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-6">

                {/* Avatar Card */}
                <div className="bg-white rounded-lg border border-border-subtle p-6 flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-action-primary flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-white">
                      {name?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-text-primary truncate">{name || "Sin nombre"}</p>
                    <p className="text-sm text-text-secondary truncate">{originalEmail}</p>
                    {memberSince && (
                      <p className="text-xs text-text-secondary mt-1">Miembro desde {memberSince}</p>
                    )}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-2 text-sm font-medium text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors shrink-0"
                  >
                    <HugeiconsIcon icon={Logout01Icon} size={16} />
                    Cerrar sesión
                  </button>
                </div>

                {/* Personal Info */}
                <div className="bg-white rounded-lg border border-border-subtle p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                      <HugeiconsIcon icon={User02Icon} size={18} color="#2563eb" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary">Información Personal</h2>
                      <p className="text-xs text-text-secondary">Actualiza tu nombre y dirección de correo.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveInfo} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-text-primary">Nombre completo</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Tu nombre"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        <HugeiconsIcon icon={Mail01Icon} size={14} color="#9ca3af" /> Correo electrónico
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className={inputCls}
                      />
                      {email !== originalEmail && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <HugeiconsIcon icon={Alert01Icon} size={12} />
                          Cambiar el correo afectará tu próximo inicio de sesión.
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingInfo}
                        className="flex items-center gap-2 px-5 py-2.5 bg-action-primary hover:bg-black text-action-primary-foreground text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {savingInfo ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Change Password */}
                <div className="bg-white rounded-lg border border-border-subtle p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                      <HugeiconsIcon icon={LockIcon} size={18} color="#d97706" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-text-primary">Cambiar Contraseña</h2>
                      <p className="text-xs text-text-secondary">Usa una contraseña de al menos 8 caracteres con letras y números.</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="flex flex-col gap-5">
                    {/* Current password */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-text-primary">Contraseña actual</label>
                      <div className="relative">
                        <input
                          type={showCurrent ? "text" : "password"}
                          required
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="Tu contraseña actual"
                          className={inputCls + " pr-11"}
                        />
                        <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors">
                          {showCurrent ? <HugeiconsIcon icon={ViewOffIcon} size={18} /> : <HugeiconsIcon icon={ViewIcon} size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-text-primary">Nueva contraseña</label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className={inputCls + " pr-11"}
                        />
                        <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors">
                          {showNew ? <HugeiconsIcon icon={ViewOffIcon} size={18} /> : <HugeiconsIcon icon={ViewIcon} size={18} />}
                        </button>
                      </div>
                      {/* Strength bar */}
                      {strength && (
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${strength.color} ${strength.width}`} />
                          </div>
                          <span className="text-xs font-bold text-text-secondary shrink-0">{strength.label}</span>
                        </div>
                      )}
                    </div>

                    {/* Confirm new password */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-text-primary">Confirmar nueva contraseña</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Repite la nueva contraseña"
                          className={inputCls + " pr-11"}
                        />
                        <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors">
                          {showConfirm ? <HugeiconsIcon icon={ViewOffIcon} size={18} /> : <HugeiconsIcon icon={ViewIcon} size={18} />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <HugeiconsIcon icon={Alert01Icon} size={12} /> Las contraseñas no coinciden.
                        </p>
                      )}
                      {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} /> ¡Las contraseñas coinciden!
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        <HugeiconsIcon icon={ShieldUserIcon} size={16} />
                        {savingPassword ? "Actualizando..." : "Cambiar contraseña"}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            )}
          </div>
    </main>
  );
}

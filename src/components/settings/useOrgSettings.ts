"use client";

import { useCallback, useEffect, useState } from "react";

export type OrgSettings = {
  phone: string;
  callMeBotApiKey: string;
  notificationEmail: string;
  timezone: string;
  autoArchiveDays: number;
};

const DEFAULTS: OrgSettings = { phone: "", callMeBotApiKey: "", notificationEmail: "", timezone: "America/Cancun", autoArchiveDays: 30 };

/**
 * Ajustes de la organización compartidos por varias pantallas (General, Notificaciones). Cada pantalla
 * edita sus campos y guarda; el PATCH siempre envía el conjunto completo para no pisar los demás.
 */
export function useOrgSettings() {
  const [values, setValues] = useState<OrgSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data && active) {
            setValues({
              phone: data.phone || "",
              callMeBotApiKey: data.callMeBotApiKey || "",
              notificationEmail: data.notificationEmail || "",
              timezone: data.timezone || DEFAULTS.timezone,
              autoArchiveDays: data.autoArchiveDays ?? DEFAULTS.autoArchiveDays,
            });
          }
        }
      } catch {
        if (active) setError("No se pudieron cargar los ajustes.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const set = useCallback(<K extends keyof OrgSettings>(key: K, value: OrgSettings[K]) => {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error("No se pudo guardar la configuración.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.");
    } finally {
      setSaving(false);
    }
  }, [values]);

  return { values, set, save, ready, saving, saved, error };
}

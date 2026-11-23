"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Block } from "@/src/components/ui";
import { SaveBar } from "@/src/components/settings/SettingsScreen";
import OrgMark, { BRAND_ICON_COMPONENTS } from "@/src/components/org/OrgMark";
import { BRAND_COLORS, BRAND_ICON_KEYS, type BrandIconKey, type OrgBrand } from "@/src/lib/org-brand";
import { CRM_THEMES } from "@/src/lib/crm-themes";
import { canManageTeam, type RoleName } from "@/src/lib/permissions";

const ICON_LABEL: Record<BrandIconKey, string> = {
  building: "Edificio", people: "Personas", chart: "Gráfica", web: "Web", book: "Libro", megaphone: "Megáfono",
  calendar: "Calendario", invoice: "Factura", vault: "Caja fuerte", sparkles: "Destellos", tasks: "Tareas", folder: "Carpeta", money: "Dinero",
};

const CHOICE =
  "flex min-h-11 items-center gap-2 rounded-control px-2.5 text-sm text-text-primary outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none";

/** Identidad de la empresa actual: color, icono y tema propios. Sin elegir nada, la empresa usa el isotipo de Noxy y el tema de cada persona. */
export default function OrgBrandEditor() {
  const { data: session } = useSession();
  const role = (session as { role?: RoleName | null } | null)?.role;
  const [name, setName] = useState("");
  const [brand, setBrand] = useState<OrgBrand>({ brandColor: null, brandIcon: null, themeId: null });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/organizations/brand", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        setName(d.name ?? "");
        setBrand({ brandColor: d.brandColor ?? null, brandIcon: d.brandIcon ?? null, themeId: d.themeId ?? null });
      })
      .catch(() => {})
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  if (!canManageTeam(role)) return null;

  const set = (patch: Partial<OrgBrand>) => {
    setSaved(false);
    setBrand((b) => ({ ...b, ...patch }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations/brand", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brand) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "No se pudo guardar");
      setSaved(true);
      // Recarga completa: el tema y la marca de la barra lateral salen del servidor.
      window.setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <Block title="Identidad de la empresa">
        <div className="flex flex-col gap-5 px-4 py-4 sm:px-5" aria-busy={!ready}>
          <div className="flex items-center gap-3">
            <OrgMark brandColor={brand.brandColor} brandIcon={brand.brandIcon} name={name || "Noxy"} size={40} />
            <p className="text-sm text-text-secondary">
              Así se ve <span className="font-semibold text-text-primary">{name || "tu empresa"}</span> en la barra lateral. Sin color ni icono, usa el logotipo de Noxy.
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-text-primary">Color</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={brand.brandColor === null} onClick={() => set({ brandColor: null })} className={`${CHOICE} ${brand.brandColor === null ? "bg-nav-active" : ""}`}>
                Logotipo de Noxy
              </button>
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={brand.brandColor === c.hex}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => set({ brandColor: c.hex })}
                  className={`flex size-11 items-center justify-center rounded-control outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none lg:size-10 ${brand.brandColor === c.hex ? "bg-nav-active" : ""}`}
                >
                  <span className="size-6 rounded-full" style={{ backgroundColor: c.hex }} />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-text-primary">Icono</legend>
            <div className="flex flex-wrap gap-1">
              {BRAND_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={brand.brandIcon === key}
                  aria-label={ICON_LABEL[key]}
                  title={ICON_LABEL[key]}
                  onClick={() => set({ brandIcon: brand.brandIcon === key ? null : key, brandColor: brand.brandColor ?? BRAND_COLORS[0].hex })}
                  className={`flex size-11 items-center justify-center rounded-control text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none lg:size-10 ${brand.brandIcon === key ? "bg-nav-active text-text-primary" : ""}`}
                >
                  <HugeiconsIcon icon={BRAND_ICON_COMPONENTS[key]} size={20} aria-hidden="true" />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-text-primary">Tema de la empresa</legend>
            <p className="text-sm text-text-secondary">Si eliges uno, todas las personas ven esta empresa con ese tema. Si no, cada una usa el suyo.</p>
            <div className="flex flex-wrap gap-1">
              <button type="button" aria-pressed={brand.themeId === null} onClick={() => set({ themeId: null })} className={`${CHOICE} ${brand.themeId === null ? "bg-nav-active" : ""}`}>
                El de cada persona
              </button>
              {CRM_THEMES.map((theme) => (
                <button key={theme.id} type="button" aria-pressed={brand.themeId === theme.id} onClick={() => set({ themeId: theme.id })} className={`${CHOICE} ${brand.themeId === theme.id ? "bg-nav-active" : ""}`}>
                  <span className="flex -space-x-1" aria-hidden="true">
                    {theme.swatches.slice(0, 3).map((hex, i) => (
                      <span key={i} className="size-4 rounded-full" style={{ backgroundColor: hex, boxShadow: "0 0 0 1px var(--color-border-subtle)" }} />
                    ))}
                  </span>
                  {theme.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <SaveBar saving={saving} saved={saved} error={error} />
      </Block>
    </form>
  );
}

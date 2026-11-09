"use client";

import { SaveBar, SettingsScreen } from "@/src/components/settings/SettingsScreen";
import { Block, Enter, PageHeader } from "@/src/components/ui";
import { useOrgSettings } from "@/src/components/settings/useOrgSettings";
import { input as inputCls } from "@/src/lib/crm-ui";

const TIMEZONES = [
  // México
  { label: "── México ──", value: "", disabled: true },
  { label: "Ciudad de México, CDMX (UTC-6)", value: "America/Mexico_City" },
  { label: "Monterrey, Nuevo León (UTC-6)", value: "America/Monterrey" },
  { label: "Guadalajara, Jalisco (UTC-6)", value: "America/Mexico_City" },
  { label: "Mérida, Yucatán (UTC-6)", value: "America/Merida" },
  { label: "Cancún, Quintana Roo (UTC-5, sin cambio horario)", value: "America/Cancun" },
  { label: "Hermosillo, Sonora (UTC-7, sin cambio horario)", value: "America/Hermosillo" },
  { label: "Chihuahua, Chihuahua (UTC-6/-7)", value: "America/Chihuahua" },
  { label: "Mazatlán, Sinaloa (UTC-7)", value: "America/Mazatlan" },
  { label: "Tijuana / Mexicali, Baja California (UTC-8)", value: "America/Tijuana" },
  // EE.UU.
  { label: "── Estados Unidos ──", value: "", disabled: true },
  { label: "Nueva York / Miami / Boston (ET, UTC-5)", value: "America/New_York" },
  { label: "Chicago / Houston / Dallas (CT, UTC-6)", value: "America/Chicago" },
  { label: "Denver / Phoenix / Salt Lake (MT, UTC-7)", value: "America/Denver" },
  { label: "Los Ángeles / San Francisco / Seattle (PT, UTC-8)", value: "America/Los_Angeles" },
  { label: "Anchorage, Alaska (UTC-9)", value: "America/Anchorage" },
  { label: "Honolulu, Hawái (UTC-10)", value: "Pacific/Honolulu" },
  // Latinoamérica
  { label: "── Latinoamérica ──", value: "", disabled: true },
  { label: "Bogotá, Colombia (UTC-5)", value: "America/Bogota" },
  { label: "Lima, Perú (UTC-5)", value: "America/Lima" },
  { label: "Santiago, Chile (UTC-3)", value: "America/Santiago" },
  { label: "Buenos Aires, Argentina (UTC-3)", value: "America/Argentina/Buenos_Aires" },
  // Europa
  { label: "── Europa ──", value: "", disabled: true },
  { label: "Madrid, España (UTC+1)", value: "Europe/Madrid" },
];

export default function SettingsGeneralPage() {
  const { values, set, save, saving, saved, error } = useOrgSettings();
  return (
    <SettingsScreen title="General">
      <Enter index={0}>
        <PageHeader title="General" subtitle="Zona horaria y reglas del pipeline de tu organización." />
      </Enter>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="flex flex-col gap-5"
      >
        <Block title="Zona horaria">
          <div className="flex flex-col gap-2 px-4 py-4 sm:px-5">
            <p className="text-sm text-text-secondary">Se usa para guardar horarios bloqueados y la disponibilidad correctamente.</p>
            <label htmlFor="timezone" className="text-sm font-semibold text-text-primary">Zona horaria</label>
            <select id="timezone" value={values.timezone} onChange={(e) => set("timezone", e.target.value)} className={inputCls}>
              {TIMEZONES.map((tz, i) => (
                <option key={i} value={tz.value} disabled={tz.disabled}>{tz.label}</option>
              ))}
            </select>
          </div>
        </Block>

        <Block title="Pipeline de ventas">
          <div className="flex flex-col gap-2 px-4 py-4 sm:px-5">
            <p className="text-sm text-text-secondary">Los deals en la etapa Ganado se archivan solos después del periodo indicado. Las ventas perdidas solo se archivan a mano.</p>
            <label htmlFor="auto-archive" className="text-sm font-semibold text-text-primary">Auto-archivar deals ganados (días)</label>
            <div className="flex items-center gap-3">
              <input id="auto-archive" type="number" min={0} value={values.autoArchiveDays} onChange={(e) => set("autoArchiveDays", parseInt(e.target.value) || 0)} className={`${inputCls} w-28`} />
              <span className="text-sm text-text-secondary">{values.autoArchiveDays === 0 ? "Desactivado (nunca archivar)" : "días después de ganar"}</span>
            </div>
          </div>
          <SaveBar saving={saving} saved={saved} error={error} />
        </Block>
      </form>
    </SettingsScreen>
  );
}

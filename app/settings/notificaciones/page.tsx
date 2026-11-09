"use client";

import { SaveBar, SettingsScreen } from "@/src/components/settings/SettingsScreen";
import { Block, Enter, PageHeader } from "@/src/components/ui";
import { useOrgSettings } from "@/src/components/settings/useOrgSettings";
import { input as inputCls } from "@/src/lib/crm-ui";

export default function SettingsNotificationsPage() {
  const { values, set, save, saving, saved, error } = useOrgSettings();
  return (
    <SettingsScreen title="Notificaciones">
      <Enter index={0}>
        <PageHeader title="Notificaciones" subtitle="Cómo y dónde te avisamos de lo que ocurre en el CRM." />
      </Enter>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="flex flex-col gap-5"
      >
        <Block title="Correo">
          <div className="flex flex-col gap-2 px-4 py-4 sm:px-5">
            <p className="text-sm text-text-secondary">Recibe un correo cada vez que alguien llene un formulario. Usa el SMTP de la empresa vinculada al formulario.</p>
            <label htmlFor="notification-email" className="text-sm font-semibold text-text-primary">Correo de notificación</label>
            <input id="notification-email" type="email" placeholder="tu@correo.com" value={values.notificationEmail} onChange={(e) => set("notificationEmail", e.target.value)} className={inputCls} />
            <p className="text-xs text-text-secondary">Si lo dejas vacío, se usa el correo de tu cuenta.</p>
          </div>
        </Block>

        <Block title="WhatsApp">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <p className="text-sm text-text-secondary">
              Recibe alertas vía{" "}
              <a href="https://www.callmebot.com/" target="_blank" rel="noreferrer" className="text-action-primary hover:underline">CallMeBot</a>{" "}
              cuando ocurran eventos en tu CRM.
            </p>
            <div className="flex flex-col gap-2">
              <label htmlFor="wa-phone" className="text-sm font-semibold text-text-primary">Teléfono</label>
              <input id="wa-phone" type="text" placeholder="Ej. +34612345678" value={values.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
              <p className="text-xs text-text-secondary">Incluye el código de país (ej. +1, +34, +52).</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="wa-key" className="text-sm font-semibold text-text-primary">CallMeBot API Key</label>
              <input id="wa-key" type="password" placeholder="Tu clave de 6 o 7 dígitos" value={values.callMeBotApiKey} onChange={(e) => set("callMeBotApiKey", e.target.value)} className={inputCls} />
              <p className="text-xs text-text-secondary">Obtén la clave enviando &quot;I allow callmebot to send me messages&quot; al número de WhatsApp de CallMeBot.</p>
            </div>
          </div>
          <SaveBar saving={saving} saved={saved} error={error} />
        </Block>

        <Block title="Resumen por WhatsApp" action={{ label: "Configurar", href: "/settings/digest" }}>
          <p className="px-4 py-4 text-sm text-text-secondary sm:px-5">Un resumen diario o semanal generado por IA con pipelines, ventas pendientes, ingresos y cobros próximos.</p>
        </Block>
      </form>
    </SettingsScreen>
  );
}

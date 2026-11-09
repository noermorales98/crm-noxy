"use client";

import ThemeSelector from "@/src/components/settings/ThemeSelector";
import { SettingsScreen } from "@/src/components/settings/SettingsScreen";
import { Block, Enter, PageHeader, Switch } from "@/src/components/ui";
import { useSoundSettings } from "@/src/context/SoundContext";

export default function SettingsAppearancePage() {
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundSettings();
  return (
    <SettingsScreen title="Apariencia y sonidos">
      <Enter index={0}>
        <PageHeader title="Apariencia y sonidos" subtitle="Tema de color y sonidos de interacción de tu cuenta." />
      </Enter>
      <div className="flex flex-col gap-5">
      <Block title="Tema">
        <div className="px-4 py-4 sm:px-5">
          <ThemeSelector />
        </div>
      </Block>
      <Block title="Sonidos de interacción">
        <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <p className="text-sm text-text-secondary">Reproduce sonidos sutiles al pulsar botones, navegar y recibir notificaciones.</p>
          <Switch checked={soundEnabled} onChange={toggleSound} label="Sonidos de interacción" />
        </div>
      </Block>
      </div>
    </SettingsScreen>
  );
}

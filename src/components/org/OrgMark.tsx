"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  BarChartIcon,
  Book01Icon,
  BrowserIcon,
  Building04Icon,
  Calendar01Icon,
  FolderKanbanIcon,
  Invoice01Icon,
  MegaphoneIcon,
  Money02Icon,
  SafeIcon,
  SparklesIcon,
  Task01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { inkOn, type BrandIconKey } from "@/src/lib/org-brand";

export const BRAND_ICON_COMPONENTS: Record<BrandIconKey, typeof Building04Icon> = {
  building: Building04Icon,
  people: UserMultipleIcon,
  chart: BarChartIcon,
  web: BrowserIcon,
  book: Book01Icon,
  megaphone: MegaphoneIcon,
  calendar: Calendar01Icon,
  invoice: Invoice01Icon,
  vault: SafeIcon,
  sparkles: SparklesIcon,
  tasks: Task01Icon,
  folder: FolderKanbanIcon,
  money: Money02Icon,
};

type OrgMarkProps = { brandColor: string | null; brandIcon: string | null; name: string; size?: number };

/**
 * Marca de una empresa. Sin color ni icono propios es el isotipo de Noxy tal cual (sin cuadro de fondo);
 * con identidad propia, un cuadro del color de la empresa con su icono, con el mismo radio que los controles.
 */
export default function OrgMark({ brandColor, brandIcon, name, size = 28 }: OrgMarkProps) {
  if (!brandColor && !brandIcon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/Isotipo_Azul.svg" alt="" width={24} height={18} className="h-[18px] w-6 shrink-0" style={{ marginInline: (size - 24) / 2 }} />;
  }
  const color = brandColor ?? "#3545D6";
  const Icon = brandIcon && brandIcon in BRAND_ICON_COMPONENTS ? BRAND_ICON_COMPONENTS[brandIcon as BrandIconKey] : null;
  const ink = inkOn(color);
  return (
    <span
      aria-hidden="true"
      data-org-mark
      className="flex shrink-0 items-center justify-center rounded-control font-semibold leading-none"
      style={{ width: size, height: size, backgroundColor: color, color: ink, fontSize: size * 0.46 }}
    >
      {Icon ? <HugeiconsIcon icon={Icon} size={Math.round(size * 0.58)} aria-hidden="true" /> : name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

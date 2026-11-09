"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import NotificationsMenu from "@/src/components/NotificationsMenu";
import { useOptionalMobileChrome } from "@/src/context/MobileChromeContext";
import { useGlobalSearch } from "@/src/context/SearchContext";
import { sectionTitleFor } from "@/src/lib/crm-navigation";

const BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary-strong outline-none transition-colors hover:bg-nav-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus";

/** Barra superior fija del móvil: menú, nombre de la pantalla, búsqueda y notificaciones. En escritorio no existe. */
export default function MobileTopBar() {
  const pathname = usePathname() ?? "/";
  const mobileChrome = useOptionalMobileChrome();
  const { openSearch } = useGlobalSearch();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-[55] box-content flex h-14 items-center gap-1 border-b border-line bg-surface-sidebar px-2 pt-[env(safe-area-inset-top)] lg:hidden">
      <button type="button" aria-label="Abrir menú" aria-haspopup="dialog" onClick={() => mobileChrome?.openMobileSidebar()} className={BUTTON}>
        <HugeiconsIcon icon={Menu01Icon} size={20} aria-hidden="true" />
      </button>
      <Link href="/" aria-label="Noxy, ir a Inicio" className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Isotipo_Azul.svg" alt="" width={24} height={18} className="h-[18px] w-6" />
      </Link>
      <p className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">{sectionTitleFor(pathname)}</p>
      <button type="button" aria-label="Buscar" onClick={openSearch} className={BUTTON}>
        <HugeiconsIcon icon={Search01Icon} size={19} aria-hidden="true" />
      </button>
      <NotificationsMenu open={notifOpen} onOpenChange={setNotifOpen} placement="below" />
    </header>
  );
}

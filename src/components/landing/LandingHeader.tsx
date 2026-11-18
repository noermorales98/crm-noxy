"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./LandingMocks";

const BTN =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-control px-6 text-[15px] font-semibold outline-none transition-[transform,background-color,color] duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2";

/** Navbar integrado al hero: transparente arriba, sólido al bajar. Usa un centinela, sin escuchar el scroll. */
export default function LandingHeader() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setSolid(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-16" />
      <header className={`fixed inset-x-0 top-0 z-30 border-b transition-colors duration-300 ${solid ? "border-line bg-surface-elevated/90 text-text-primary backdrop-blur" : "border-transparent bg-transparent text-white"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-focus">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Isotipo_Azul.svg" alt="" width={26} height={26} className={solid ? "" : "brightness-0 invert"} />
            <span className="text-base font-semibold tracking-tight">Noxy CRM</span>
          </Link>
          <nav aria-label="Principal" className={`hidden items-center gap-7 text-sm font-medium md:flex ${solid ? "text-text-secondary-strong" : "text-white/80"}`}>
            <a href="#funciones" className="hover:opacity-100 hover:underline-offset-4 hover:underline">Funciones</a>
            <a href="#flujo" className="hover:underline hover:underline-offset-4">Cómo trabaja</a>
            <a href="#control" className="hover:underline hover:underline-offset-4">Control</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className={`${BTN} hidden md:inline-flex ${solid ? "border border-line bg-surface-elevated text-text-primary hover:bg-surface-app" : "border border-white/35 bg-transparent text-white hover:bg-white/10"}`}
            >
              Iniciar sesión
            </Link>
            <a href="#demo" className={`${BTN} ${solid ? "bg-brand-obsidian text-white hover:bg-brand-obsidian/85" : "bg-white text-brand-obsidian hover:bg-white/90"}`}>
              <Icon icon={Calendar03Icon} size={18} />
              Pide una demo
            </a>
          </div>
        </div>
      </header>
    </>
  );
}

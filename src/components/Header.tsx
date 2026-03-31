"use client";
import { Search, SlidersHorizontal, ArrowDownUp, Plus, Settings, LogOut, User } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-20 px-8 flex items-center justify-between border-b border-gray-100/0 bg-transparent flex-shrink-0">

      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center w-full h-10 rounded-full bg-white/50 backdrop-blur-sm px-4 focus-within:ring-2 focus-within:ring-gray-200 transition-all">
          <Search size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            className="w-full bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
          <ArrowDownUp size={16} />
          Ordenar por
        </button>

        <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
          <SlidersHorizontal size={16} />
          Filtros
        </button>

        <button className="ml-4 flex items-center gap-2 bg-[#2d2d2d] hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-[#2d2d2d] focus:ring-offset-[#f5f4ef]">
          <Plus size={16} />
          Añadir cliente
        </button>

        {/* User Menu */}
        <div className="relative ml-2" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-full bg-[#2d2d2d] flex items-center justify-center text-white font-semibold text-sm hover:bg-black transition-colors"
            title={session?.user?.name || "Usuario"}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.name || "Usuario"}</p>
                <p className="text-xs text-gray-400 truncate">{session?.user?.email || ""}</p>
              </div>
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User size={16} className="text-gray-400" />
                Mi perfil
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings size={16} className="text-gray-400" />
                Configuración
              </Link>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}

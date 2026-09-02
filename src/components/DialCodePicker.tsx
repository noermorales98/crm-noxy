"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL_CODE,
  findCountryByDial,
  isoToFlag,
  normalizeCountrySearch,
  type CountryDialCode,
} from "@/src/lib/country-dial-codes";

export default function DialCodePicker({
  value,
  onChange,
  isManual,
  onSelectManual,
}: {
  value: string;
  onChange: (dial: string) => void;
  isManual?: boolean;
  onSelectManual?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = isManual ? null : findCountryByDial(value || DEFAULT_DIAL_CODE, selectedIso);
  const query = normalizeCountrySearch(search);
  const showManual = !!onSelectManual && (!query || normalizeCountrySearch("otro").includes(query));

  const filtered = useMemo(() => {
    if (!query) return COUNTRY_DIAL_CODES;
    return COUNTRY_DIAL_CODES.filter((c) => {
      const haystack = normalizeCountrySearch(`${c.name} ${c.dial} ${c.iso}`);
      return haystack.includes(query);
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const pick = (country: CountryDialCode) => {
    setSelectedIso(country.iso);
    onChange(country.dial);
    setOpen(false);
  };

  const label = isManual
    ? "Otro"
    : selected
      ? `${isoToFlag(selected.iso)} ${selected.dial} ${selected.name}`
      : `${value || DEFAULT_DIAL_CODE}`;

  return (
    <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:max-w-[260px]" ref={rootRef}>
      <button
        type="button"
        aria-label="Lada del número de teléfono"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="noxy-form-control flex items-center gap-2 text-left px-3"
      >
        <span className="truncate flex-1 text-sm font-medium">{label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="shrink-0 text-text-secondary" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-surface border border-border-subtle overflow-hidden shadow-lg sm:min-w-[280px]">
          <div className="p-2 border-b border-border-subtle">
            <div className="flex items-center gap-2 bg-surface-sidebar rounded-lg px-3 py-2">
              <HugeiconsIcon icon={Search01Icon} size={14} color="#9ca3af" className="shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar país o lada..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder-gray-400"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && !showManual ? (
              <li className="px-4 py-3 text-xs text-text-secondary">Sin resultados</li>
            ) : (
              filtered.map((c) => {
                const active = !isManual && selected?.iso === c.iso;
                return (
                  <li key={c.iso}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(c)}
                      className={`w-full min-h-11 px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-surface-sidebar ${
                        active ? "bg-surface-sidebar/70 font-semibold text-text-primary" : "text-text-primary"
                      }`}
                    >
                      <span className="text-lg leading-none w-7 text-center shrink-0">{isoToFlag(c.iso)}</span>
                      <span className="truncate flex-1">{c.name}</span>
                      <span className="text-text-secondary font-medium shrink-0">{c.dial}</span>
                    </button>
                  </li>
                );
              })
            )}
            {showManual && (
              <li className="border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => {
                    onSelectManual?.();
                    setOpen(false);
                  }}
                  className={`w-full min-h-11 px-3 py-2.5 text-left text-sm hover:bg-surface-sidebar ${
                    isManual ? "bg-surface-sidebar/70 font-semibold" : "text-text-secondary"
                  }`}
                >
                  Otro (escribir manualmente)
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

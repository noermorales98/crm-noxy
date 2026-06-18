"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalendarCheckIn01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  align?: "left" | "right";
  compact?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className = "",
  label,
  align = "left",
  compact = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });
  const [viewDate, setViewDate] = useState(() =>
    value ? new Date(value + "T00:00:00") : new Date()
  );
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only use portal after hydration
  useEffect(() => { setMounted(true); }, []);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) setViewDate(new Date(value + "T00:00:00"));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    function recalc() { if (open) calcPos(); }
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open]);

  function calcPos() {
    if (!buttonRef.current) return;
    const DROPDOWN_H = 348;
    const DROPDOWN_W = 288;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < DROPDOWN_H && rect.top > DROPDOWN_H;
    const top = openUp ? rect.top - DROPDOWN_H - 6 : rect.bottom + 6;
    const rawLeft = align === "right" ? rect.right - DROPDOWN_W : rect.left;
    const left = Math.max(8, Math.min(rawLeft, window.innerWidth - DROPDOWN_W - 8));
    setPos({ top, left, openUp });
  }

  function toggle() {
    if (!open) calcPos();
    setOpen((v) => !v);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const adjustedFirst = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  function selectDay(day: number) {
    onChange(new Date(year, month, day).toISOString().slice(0, 10));
    setOpen(false);
  }

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const calendar = (
    <div
      ref={dropdownRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-white rounded-lg border border-border-subtle p-4 w-72 select-none"
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-nav-hover transition-colors text-text-secondary"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        </button>
        <span className="text-sm font-bold text-text-primary">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-nav-hover transition-colors text-text-secondary"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-text-secondary py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: adjustedFirst }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const thisDate = new Date(year, month, day);
          const isSelected = selectedDate?.getTime() === thisDate.getTime();
          const isToday = thisDate.getTime() === today.getTime();

          return (
            <button
              key={day}
              type="button"
              onClick={() => selectDay(day)}
              className={[
                "w-9 h-9 rounded-lg text-sm font-medium transition-all mx-auto flex items-center justify-center",
                isSelected ? "bg-accent-charcoal text-white font-bold" : "",
                isToday && !isSelected ? "bg-gray-100 text-text-primary font-bold ring-1 ring-gray-300" : "",
                !isSelected && !isToday ? "text-text-primary hover:bg-nav-hover" : "",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
        <button
          type="button"
          onClick={() => { selectDay(today.getDate()); setViewDate(new Date()); }}
          className="text-xs text-text-secondary hover:text-text-primary font-medium px-2 py-1 rounded-lg hover:bg-nav-hover transition-colors"
        >
          Hoy
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-text-primary mb-1.5">{label}</label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className={[
          "w-full bg-surface-sidebar hover:bg-nav-hover focus:bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-border-subtle transition-colors text-left flex items-center gap-2",
          compact ? "px-3 py-2 rounded-lg text-xs" : "px-4 py-2.5 rounded-lg text-sm",
        ].join(" ")}
      >
        <HugeiconsIcon icon={CalendarCheckIn01Icon} size={compact ? 14 : 16} color="#787774" />
        <span className={`flex-1 ${displayValue ? "text-text-primary" : "text-text-secondary"}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-gray-300 hover:text-text-secondary transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} />
          </span>
        )}
      </button>

      {open && mounted && createPortal(calendar, document.body)}
    </div>
  );
}

"use client";

import { useState } from "react";

const FIELD =
  "min-h-11 w-full rounded-control border border-line bg-surface-elevated px-3 text-sm text-text-primary placeholder:text-text-placeholder outline-none focus-visible:ring-2 focus-visible:ring-focus";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/** Solicitud de demo: llega al CRM como un lead nuevo. Sin animaciones: funciona igual con movimiento reducido. */
export default function DemoForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/public/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return setState({ kind: "error", message: body.error ?? "No pudimos enviar tu solicitud. Inténtalo de nuevo." });
      form.reset();
      setState({ kind: "done" });
    } catch {
      setState({ kind: "error", message: "No hay conexión. Revisa tu internet e inténtalo de nuevo." });
    }
  }

  if (state.kind === "done") {
    return (
      <div role="status" className="rounded-surface border border-line bg-surface-elevated p-6">
        <p className="text-lg font-semibold text-text-primary">¡Listo, recibimos tu solicitud!</p>
        <p className="mt-2 text-sm text-text-secondary-strong">Te escribiremos pronto al correo que dejaste para acordar un horario y mostrarte el CRM con tu caso.</p>
      </div>
    );
  }

  const sending = state.kind === "sending";
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-surface border border-line bg-surface-elevated p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
          Nombre
          <input name="name" required autoComplete="name" className={`${FIELD} font-normal`} placeholder="Tu nombre" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
          Correo
          <input name="email" type="email" required autoComplete="email" className={`${FIELD} font-normal`} placeholder="tu@empresa.com" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
          Empresa <span className="font-normal text-text-secondary">(opcional)</span>
          <input name="company" autoComplete="organization" className={`${FIELD} font-normal`} placeholder="Nombre de tu agencia o negocio" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
          Teléfono <span className="font-normal text-text-secondary">(opcional)</span>
          <input name="phone" type="tel" autoComplete="tel" className={`${FIELD} font-normal`} placeholder="+52 998 000 0000" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-text-primary">
        ¿Qué te gustaría resolver? <span className="font-normal text-text-secondary">(opcional)</span>
        <textarea name="message" rows={4} maxLength={1000} className={`${FIELD} py-2.5 font-normal`} placeholder="Cuéntanos cómo trabajas hoy con tus leads, citas o proyectos." />
      </label>

      {/* Campo trampa: las personas no lo ven ni lo llenan; los robots sí. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No llenar este campo
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.kind === "error" && (
        <p role="alert" className="rounded-control bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-5 text-sm font-semibold text-action-primary-foreground outline-none hover:bg-action-secondary focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {sending ? "Enviando…" : "Pide una demo"}
      </button>
      <p className="text-xs text-text-secondary">Usamos tus datos solo para contactarte sobre la demo.</p>
    </form>
  );
}

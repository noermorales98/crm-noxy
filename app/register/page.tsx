"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building04Icon } from "@hugeicons/core-free-icons";
import { btnPrimary, card, input } from "@/src/lib/crm-ui";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.email || !formData.password || !formData.organizationName || !formData.name) {
      setError("Completa todos los campos.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "No fue posible crear la cuenta.");
      }

      router.push("/login?registered=true");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app p-4">
      <div className={`${card} w-full max-w-md`}>
        <div className="flex justify-center mb-6 text-text-primary">
          <HugeiconsIcon icon={Building04Icon} size={40} />
        </div>
        <h1 className="text-2xl font-bold text-center text-text-primary mb-2">Crea tu espacio de trabajo</h1>
        <p className="text-sm text-text-secondary text-center mb-8">Configura tu empresa y empieza a gestionar clientes</p>

        {error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3 rounded-control text-sm mb-4 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="register-name" className="block text-sm font-medium text-text-primary mb-1">Nombre completo</label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={input}
              placeholder="María López"
            />
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-text-primary mb-1">Correo de trabajo</label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={input}
              placeholder="maria@empresa.com"
            />
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-text-primary mb-1">Contraseña</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={input}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="register-organization" className="block text-sm font-medium text-text-primary mb-1">Agencia o empresa</label>
            <input
              id="register-organization"
              type="text"
              autoComplete="organization"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              className={input}
              placeholder="Noxy Digital"
            />
          </div>

          <button type="submit" disabled={loading} className={`w-full ${btnPrimary} py-2.5 mt-2`}>
            {loading ? "Creando…" : "Crear espacio de trabajo"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="text-action-primary font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { LoginIcon } from "@hugeicons/core-free-icons";
import { btnPrimary, card, input } from "@/src/lib/crm-ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Completa todos los campos.");
      setLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("El correo o la contraseña no son correctos.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-app p-4">
      <div className={`${card} w-full max-w-md`}>
        <div className="flex justify-center mb-6 text-text-primary">
          <HugeiconsIcon icon={LoginIcon} size={40} />
        </div>
        <h1 className="text-2xl font-bold text-center text-text-primary mb-2">Bienvenido</h1>
        <p className="text-sm text-text-secondary text-center mb-8">Inicia sesión en tu CRM</p>

        {error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3 rounded-control text-sm mb-4 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-text-primary mb-1">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-text-primary mb-1">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className={`w-full ${btnPrimary} py-2.5 mt-2`}>
            {loading ? "Iniciando sesión…" : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}

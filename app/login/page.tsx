"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { btnPrimary, input } from "@/src/lib/crm-ui";

// 16 px en móvil evita que el teléfono haga zoom al tocar el campo.
const field = `${input} !text-base md:!text-sm`;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="grid min-h-dvh bg-surface-elevated lg:grid-cols-2">
      {/* Izquierda: el acceso. En móvil es toda la pantalla. */}
      <section className="flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:px-14 xl:px-20">
        <header>
          {/* Isotipo oficial (public/Isotipo_Azul.svg): la primera pantalla nombra el producto. */}
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Isotipo_Azul.svg" alt="" width={43} height={32} className="h-7 w-auto" />
            <span className="text-base font-semibold tracking-tight text-text-primary">Noxy CRM</span>
          </div>
        </header>

        <div className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Bienvenido de nuevo</h1>
            <p className="mt-2 text-base text-text-secondary">Inicia sesión para continuar en tu CRM.</p>

            {error && (
              <div role="alert" className="mt-6 rounded-control bg-red-50 p-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-text-primary">Correo electrónico</label>
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                  placeholder="tu@correo.com"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-text-primary">Contraseña</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${field} pr-20`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-1 my-1 rounded-control px-3 text-sm font-medium text-text-secondary outline-none transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className={`w-full ${btnPrimary} mt-1 py-3 text-base md:text-sm`}>
                {loading ? "Iniciando sesión…" : "Iniciar sesión"}
              </button>
            </form>
          </div>
        </div>

        <footer className="text-xs text-text-secondary">© {new Date().getFullYear()} Noxy Digital</footer>
      </section>

      {/* Derecha: imagen de fondo. Solo en pantallas grandes; en móvil se oculta para no cargarla. */}
      <aside className="relative hidden overflow-hidden bg-[#02030A] lg:block" aria-hidden="true">
        <Image src="/bg4.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#02030A]/70 via-transparent to-[#02030A]/30" />
        <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
          <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Tus clientes, ventas y seguimientos en un solo lugar.
          </p>
        </div>
      </aside>
    </main>
  );
}

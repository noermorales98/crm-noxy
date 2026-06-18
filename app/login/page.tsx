"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      setError("Please fill in all fields");
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
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
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
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className={`w-full ${btnPrimary} py-2.5 mt-2`}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Do not have an account?{" "}
          <Link href="/register" className="text-text-primary font-medium hover:underline">
            Register your agency
          </Link>
        </p>
      </div>
    </div>
  );
}

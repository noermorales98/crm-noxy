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
      setError("Please fill in all fields");
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
        throw new Error(data.message || "Something went wrong");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
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
        <h1 className="text-2xl font-bold text-center text-text-primary mb-2">Create Workspace</h1>
        <p className="text-sm text-text-secondary text-center mb-8">Setup your agency and start managing clients</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Your Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={input}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Work Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={input}
              placeholder="john@agency.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={input}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Agency / Company Name</label>
            <input
              type="text"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              className={input}
              placeholder="Acme Marketing Inc."
            />
          </div>

          <button type="submit" disabled={loading} className={`w-full ${btnPrimary} py-2.5 mt-2`}>
            {loading ? "Creating..." : "Create Workspace"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

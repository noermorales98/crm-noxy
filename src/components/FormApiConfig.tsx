"use client";

import { useState, useEffect } from "react";
import { Copy01Icon, RefreshIcon, CheckmarkCircle01Icon, LinkSquare02Icon, Code02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useToast } from "@/src/context/ToastContext";

interface ApiConfig {
  id: string | null;
  formId: string;
  isEnabled: boolean;
  isPublic: boolean;
  apiToken: string | null;
}

interface FormApiConfigProps {
  formId: string;
}

export default function FormApiConfig({ formId }: FormApiConfigProps) {
  const { showToast } = useToast();
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const apiUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/forms/${formId}/leads`
    : "";

  useEffect(() => {
    fetchConfig();
  }, [formId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/forms/${formId}/api-config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.data);
      }
    } catch (error) {
      console.error("Error fetching API config:", error);
      showToast("Error al cargar la configuración", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updates: Partial<ApiConfig>) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/forms/${formId}/api-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.data);
        showToast("Configuración guardada exitosamente", "success");
      } else {
        throw new Error("Error al guardar");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      showToast("Error al guardar la configuración", "error");
    } finally {
      setSaving(false);
    }
  };

  const regenerateToken = async () => {
    try {
      setRegenerating(true);
      const res = await fetch(`/api/forms/${formId}/api-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateToken: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.data);
        showToast("Token regenerado exitosamente", "success");
      } else {
        throw new Error("Error al regenerar token");
      }
    } catch (error) {
      console.error("Error regenerating token:", error);
      showToast("Error al regenerar el token", "error");
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast("Copiado al portapapeles", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast("Error al copiar", "error");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Cargando configuración...
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Error al cargar la configuración
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-surface-sidebar">
          <HugeiconsIcon icon={Code02Icon} className="w-6 h-6 text-action-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary mb-1">API de Leads</h3>
          <p className="text-sm text-text-secondary">
            Configura el acceso a la API para consultar los leads registrados en este formulario.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border-subtle bg-surface-sidebar">
          <div>
            <p className="text-sm font-medium text-text-primary">Habilitar API</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Permite consultar los leads a través de la API
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.isEnabled}
              onChange={(e) => saveConfig({ ...config, isEnabled: e.target.checked })}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-action-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-action-primary"></div>
          </label>
        </div>

        {config.isEnabled && (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border-subtle bg-surface-sidebar">
              <div>
                <p className="text-sm font-medium text-text-primary">Acceso Público</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {config.isPublic
                    ? "La API es pública, no requiere token de autenticación"
                    : "La API requiere un Bearer Token para acceder"}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isPublic}
                  onChange={(e) => saveConfig({ ...config, isPublic: e.target.checked })}
                  disabled={saving}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-action-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-action-primary"></div>
              </label>
            </div>

            {!config.isPublic && config.apiToken && (
              <div className="space-y-3 p-4 rounded-lg border border-border-subtle bg-surface-elevated">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">Bearer Token</p>
                  <button
                    onClick={regenerateToken}
                    disabled={regenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sidebar rounded-lg transition-colors disabled:opacity-50"
                  >
                    <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" />
                    {regenerating ? "Regenerando..." : "Regenerar"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 text-xs font-mono bg-surface-sidebar rounded-lg border border-border-subtle overflow-x-auto">
                    {config.apiToken}
                  </code>
                  <button
                    onClick={() => copyToClipboard(config.apiToken!)}
                    className="p-2 hover:bg-surface-sidebar rounded-lg transition-colors"
                    title="Copiar token"
                  >
                    <HugeiconsIcon 
                      icon={copied ? CheckmarkCircle01Icon : Copy01Icon} 
                      className={`w-4 h-4 ${copied ? "text-green-500" : "text-text-secondary"}`}
                    />
                  </button>
                </div>
                <p className="text-xs text-text-secondary">
                  Guarda este token de forma segura. No lo compartas públicamente.
                </p>
              </div>
            )}

            <div className="space-y-3 p-4 rounded-lg border border-border-subtle bg-surface-elevated">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={LinkSquare02Icon} className="w-4 h-4 text-text-secondary" />
                <p className="text-sm font-medium text-text-primary">URL del Endpoint</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 text-xs font-mono bg-surface-sidebar rounded-lg border border-border-subtle overflow-x-auto">
                  {apiUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(apiUrl)}
                  className="p-2 hover:bg-surface-sidebar rounded-lg transition-colors"
                  title="Copiar URL"
                >
                  <HugeiconsIcon icon={Copy01Icon} className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border-subtle bg-surface-elevated space-y-3">
              <p className="text-sm font-medium text-text-primary">Ejemplo de Uso</p>
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">
                  {config.isPublic ? "GET sin autenticación:" : "GET con Bearer Token:"}
                </p>
                <pre className="p-3 text-xs font-mono bg-surface-sidebar rounded-lg border border-border-subtle overflow-x-auto">
{config.isPublic ? `curl "${apiUrl}?page=1&limit=50"` : `curl "${apiUrl}?page=1&limit=50" \\
  -H "Authorization: Bearer ${config.apiToken}"`}
                </pre>
              </div>
              <div className="space-y-1 pt-2">
                <p className="text-xs font-medium text-text-primary">Parámetros opcionales:</p>
                <ul className="text-xs text-text-secondary space-y-0.5 pl-4">
                  <li>• <code className="text-xs font-mono bg-surface-sidebar px-1 py-0.5 rounded">page</code> - Número de página (default: 1)</li>
                  <li>• <code className="text-xs font-mono bg-surface-sidebar px-1 py-0.5 rounded">limit</code> - Leads por página (default: 50, máximo: 100)</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

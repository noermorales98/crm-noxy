"use client";

export default function DeleteClientVaultDialog({
  name,
  vaultCount,
  busy,
  onCancel,
  onKeepVault,
  onDeleteVault,
}: {
  name: string;
  vaultCount: number;
  busy?: boolean;
  onCancel: () => void;
  onKeepVault: () => void;
  onDeleteVault: () => void;
}) {
  const countLabel = vaultCount === 0
    ? "No tiene contraseñas en la bóveda."
    : vaultCount === 1
      ? "Tiene 1 contraseña en la bóveda."
      : `Tiene ${vaultCount} contraseñas en la bóveda.`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" onClick={onCancel}>
      <div className="absolute inset-0 bg-brand-obsidian/35" />
      <div
        className="relative bg-white rounded-surface border border-border-subtle p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-text-primary mb-1">¿Eliminar a &quot;{name}&quot;?</p>
        <p className="text-xs text-text-secondary mb-5">
          {countLabel} Puedes eliminarlas junto con el cliente, o conservarlas. Si las conservas, deja de aparecer en Clientes y sigue en la Bóveda.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onDeleteVault}
            disabled={busy}
            className="w-full py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            {busy ? "Eliminando…" : "Eliminar también la bóveda"}
          </button>
          <button
            type="button"
            onClick={onKeepVault}
            disabled={busy}
            className="w-full py-2.5 text-sm rounded-lg border border-border-subtle text-text-primary font-medium hover:bg-surface-sidebar transition-colors disabled:opacity-60"
          >
            Mantener la bóveda
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-full py-2 text-sm rounded-lg text-text-secondary hover:bg-surface-sidebar transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

import { HugeiconsIcon } from "@hugeicons/react";

export function EmptyState({ icon, message }: { icon: any; message: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-gray-300">
      <HugeiconsIcon icon={icon} size={32} color="#d1d5db" />
      <p className="text-sm text-text-secondary mt-3">{message}</p>
    </div>
  );
}

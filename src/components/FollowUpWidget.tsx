import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CalendarCheckIn01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

interface FollowUp {
  id: string;
  title: string;
  followUpAt: string;
  contact?: { firstName: string; lastName?: string | null } | null;
}

interface Props {
  followUps: FollowUp[];
}

export function FollowUpWidget({ followUps }: Props) {
  if (followUps.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl">
      <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={CalendarCheckIn01Icon} size={16} color="#dc2626" />
          <p className="text-sm font-bold text-red-700">Follow-ups vencidos ({followUps.length})</p>
        </div>
        <Link href="/pipeline" className="text-xs text-red-600 font-semibold flex items-center gap-1 hover:underline">
          Ver todos <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
        </Link>
      </div>
      <div className="divide-y divide-red-100">
        {followUps.map((f) => (
          <Link
            key={f.id}
            href={`/pipeline/${f.id}`}
            className="flex items-center justify-between px-5 py-3 hover:bg-red-100/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{f.title}</p>
              {f.contact && (
                <p className="text-xs text-gray-500">
                  {f.contact.firstName} {f.contact.lastName || ""}
                </p>
              )}
            </div>
            <span className="text-xs font-semibold text-red-600 shrink-0 ml-3">
              {new Date(f.followUpAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

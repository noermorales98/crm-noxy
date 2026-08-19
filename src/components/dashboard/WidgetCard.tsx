import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

interface WidgetCardProps {
  title: string;
  href: string;
  children: React.ReactNode;
}

export function WidgetCard({ title, href, children }: WidgetCardProps) {
  return (
    <div className="bg-surface-elevated rounded-surface overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle shrink-0">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <Link href={href} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors">
          Ver todo
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
        </Link>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

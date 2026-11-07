"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

type BlockAction = { label: string; href?: string; onClick?: () => void };

type BlockProps = {
  title: string;
  action?: BlockAction;
  children: ReactNode;
  className?: string;
};

export function Block({ title, action, children, className }: BlockProps) {
  return (
    <section className={cn("min-w-0 rounded-surface border border-line bg-surface-elevated", className)}>
      <header className="flex min-h-14 items-center gap-3 border-b border-line px-4 sm:px-5">
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">{title}</h2>
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              className="-mr-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-action-primary hover:underline"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="-mr-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-action-primary hover:underline"
            >
              {action.label}
            </button>
          ))}
      </header>
      {children}
    </section>
  );
}

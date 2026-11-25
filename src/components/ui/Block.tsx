"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

type BlockAction = { label: string; href?: string; onClick?: () => void };

type BlockProps = {
  title: string;
  action?: BlockAction | BlockAction[];
  children: ReactNode;
  className?: string;
};

export function Block({ title, action, children, className }: BlockProps) {
  return (
    <section className={cn("min-w-0 rounded-surface border border-line bg-surface-elevated", className)}>
      <header className="flex min-h-12 items-center gap-3 border-b border-line px-3.5 sm:min-h-14 sm:px-5">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text-primary sm:text-base">{title}</h2>
        {(Array.isArray(action) ? action : action ? [action] : []).map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="-mr-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-action-ink hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="-mr-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-action-ink hover:underline"
            >
              {item.label}
            </button>
          ),
        )}
      </header>
      {children}
    </section>
  );
}

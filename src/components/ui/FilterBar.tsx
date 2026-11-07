import type { ReactNode } from "react";

type FilterBarProps = {
  search?: ReactNode;
  segments?: ReactNode;
  actions?: ReactNode;
};

export function FilterBar({ search, segments, actions }: FilterBarProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 pb-3">
      {search && <div className="min-w-0 flex-1 basis-full sm:max-w-xs sm:basis-64">{search}</div>}
      {segments && <div className="min-w-0 max-w-full overflow-x-auto">{segments}</div>}
      {actions && <div className="ml-auto flex min-w-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

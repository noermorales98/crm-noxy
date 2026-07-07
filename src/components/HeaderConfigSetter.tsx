"use client";
import { useEffect } from "react";
import { useHeader, HeaderConfig } from "@/src/context/HeaderContext";
import { useRouter } from "next/navigation";

interface Props {
  sortOptions?: HeaderConfig["sortOptions"];
  filterGroups?: HeaderConfig["filterGroups"];
  addButtonLabel?: string;
  addButtonHref?: string;
}

export function HeaderConfigSetter({ sortOptions, filterGroups, addButtonLabel, addButtonHref }: Props) {
  const { setConfig, resetState } = useHeader();
  const router = useRouter();

  useEffect(() => {
    resetState();
    setConfig({
      sortOptions,
      filterGroups,
      addButton: addButtonLabel && addButtonHref
        ? { label: addButtonLabel, onClick: () => router.push(addButtonHref) }
        : undefined,
    });
    return () => setConfig({});
  }, []);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import DbUnavailableNotice from "@/src/components/DbUnavailableNotice";

export default function DbOutageBanner() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    function onUnavailable(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setMessage(detail?.message);
      setOpen(true);
    }
    function onAvailable() {
      setOpen(false);
    }
    window.addEventListener("crm:db-unavailable", onUnavailable);
    window.addEventListener("crm:db-available", onAvailable);
    return () => {
      window.removeEventListener("crm:db-unavailable", onUnavailable);
      window.removeEventListener("crm:db-available", onAvailable);
    };
  }, []);

  if (!open) return null;
  return <DbUnavailableNotice message={message} stale compact />;
}

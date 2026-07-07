"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useHeader } from "@/src/context/HeaderContext";

export function WelcomeHeaderTitle() {
  const { data: session } = useSession();
  const { setConfig, resetState } = useHeader();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0] || "";

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    setConfig({
      title: (
        <span className="flex items-center gap-2">
          Bienvenido,
          <img src="/avt.webp" alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
          {firstName}
        </span>
      ),
    });
    return () => setConfig({});
  }, [firstName]);

  return null;
}

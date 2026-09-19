"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (error) {
    console.warn("[pwa] service worker registration failed", error);
  }
}

export default function PwaRegister() {
  const { status } = useSession();

  useEffect(() => {
    void registerServiceWorker();

    const onPageShow = () => {
      void registerServiceWorker();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void registerServiceWorker();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status]);

  return null;
}

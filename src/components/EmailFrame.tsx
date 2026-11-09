"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cuerpo de un correo en un iframe que rellena todo el alto disponible del panel de lectura y crece
 * con su contenido (sin barra de desplazamiento interna). El padre debe ser una columna flex.
 */
export default function EmailFrame({ html, title, sandbox = "allow-same-origin allow-popups allow-popups-to-escape-sandbox" }: { html: string; title: string; sandbox?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (doc?.documentElement) setHeight(Math.ceil(doc.documentElement.scrollHeight));
  }, []);

  const onLoad = useCallback(() => {
    measure();
    observer.current?.disconnect();
    const body = ref.current?.contentDocument?.body;
    if (body && typeof ResizeObserver !== "undefined") {
      observer.current = new ResizeObserver(measure);
      observer.current.observe(body);
    }
  }, [measure]);

  useEffect(() => () => observer.current?.disconnect(), []);

  return (
    <iframe
      ref={ref}
      srcDoc={html}
      sandbox={sandbox}
      onLoad={onLoad}
      title={title}
      className="w-full flex-1 border-0"
      style={{ minHeight: Math.max(height, 320) }}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MODEL_ID, normalizeModelId } from "@/src/lib/ai-models";

const STORAGE_KEY = "assistant-model";
const UNAVAILABLE_FREE_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export function useStoredAiModel() {
  const [modelId, setModelIdState] = useState(DEFAULT_MODEL_ID);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const next = normalizeModelId(raw === UNAVAILABLE_FREE_MODEL ? null : raw);
      setModelIdState(next);
      if (raw && raw !== next) localStorage.setItem(STORAGE_KEY, next);
    } catch {
      setModelIdState(DEFAULT_MODEL_ID);
    }
  }, []);

  const setModelId = (id: string) => {
    const next = normalizeModelId(id);
    setModelIdState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // El selector sigue funcionando aunque el navegador bloquee el almacenamiento.
    }
  };

  return { modelId, setModelId };
}

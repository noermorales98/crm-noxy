"use client";
import { useContext } from 'react';
import { AiContext } from '../components/ai/AiProvider';

export function useAi() {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error('useAi must be used inside AiProvider');
  return ctx;
}

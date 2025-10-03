/**
 * Configuration du Whisper Bridge local
 */

export const BRIDGE_URL =
  (import.meta.env.VITE_BRIDGE_URL as string) || "http://127.0.0.1:27123";

export const BRIDGE_TOKEN =
  (import.meta.env.VITE_BRIDGE_TOKEN as string) || "devtoken";

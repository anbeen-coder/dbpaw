import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { invokeMock } from "@/services/mocks";
import {
  DRIVER_REGISTRY,
  type ImportDriverCapability,
} from "@/lib/driver-registry";

export const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

const isMockModeEnabled = () => {
  return import.meta.env.VITE_USE_MOCK === "true";
};

export const invoke = async <T>(cmd: string, args?: any): Promise<T> => {
  if (isTauri()) {
    return tauriInvoke(cmd, args);
  }
  if (isMockModeEnabled()) {
    return invokeMock<T>(cmd, args);
  }
  console.warn(`[API] invoke ${cmd}`, args);
  throw new Error(
    "Tauri API not available. Please run 'bun tauri dev' or enable Mock mode with 'VITE_USE_MOCK=true'.",
  );
};

export const normalizeImportDriver = (driver: string): string => {
  const normalized = (driver || "").trim().toLowerCase();
  if (normalized === "postgresql" || normalized === "pgsql") {
    return "postgres";
  }
  return normalized;
};

export const getImportDriverCapability = (
  driver: string,
): ImportDriverCapability => {
  const normalized = normalizeImportDriver(driver);
  const config = DRIVER_REGISTRY.find((d) => d.id === normalized);
  return config?.importCapability ?? "unsupported";
};

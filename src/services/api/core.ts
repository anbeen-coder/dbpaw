import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { invokeMock } from "@/services/mocks";
import {
  getImportDriverCapability,
  type ImportDriverCapability,
} from "@/lib/driver-metadata";
import { isTauri } from "../platform";

export { isTauri, getImportDriverCapability, type ImportDriverCapability };
import type { CommandMap, CommandArgs, CommandReturn } from "../commands";

const isMockModeEnabled = () => {
  return import.meta.env.VITE_USE_MOCK === "true";
};

// Typed overload — constrains args and return to CommandMap
export function invoke<T extends keyof CommandMap>(
  cmd: T,
  args: CommandArgs<T>,
): Promise<CommandReturn<T>>;

// Legacy overload — for commands not yet in CommandMap
export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;

// Implementation (unchanged)
export async function invoke<T>(cmd: string, args?: any): Promise<T> {
  if (isTauri()) {
    return tauriInvoke(cmd, args);
  }
  if (isMockModeEnabled()) {
    return invokeMock(cmd, args) as Promise<T>;
  }
  console.warn(`[API] invoke ${cmd}`, args);
  throw new Error(
    "Tauri API not available. Please run 'bun tauri dev' or enable Mock mode with 'VITE_USE_MOCK=true'.",
  );
};

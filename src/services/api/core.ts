import { invoke as tauriInvoke } from "@tauri-apps/api/core";
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

// Single typed overload — args and return constrained by CommandMap
export function invoke<C extends keyof CommandMap>(
  cmd: C,
  args: CommandArgs<C>,
): Promise<CommandReturn<C>>;

// Implementation (unchanged)
export async function invoke<T>(cmd: string, args?: any): Promise<T> {
  if (isTauri()) {
    return tauriInvoke(cmd, args);
  }
  if (isMockModeEnabled()) {
    const { invokeMock } = await import("@/services/mocks");
    return invokeMock(cmd, args) as Promise<T>;
  }
  console.warn(`[API] invoke ${cmd}`, args);
  throw new Error(
    "Tauri API not available. Please run 'bun tauri dev' or enable Mock mode with 'VITE_USE_MOCK=true'.",
  );
};

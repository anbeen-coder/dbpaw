export const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

export const isMockMode = () => import.meta.env.VITE_USE_MOCK === "true";

export const normalizeImportDriver = (driver: string): string => {
  const normalized = (driver || "").trim().toLowerCase();
  if (normalized === "postgresql" || normalized === "pgsql") {
    return "postgres";
  }
  return normalized;
};

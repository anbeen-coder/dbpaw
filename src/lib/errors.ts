import { toast } from "sonner";

export interface ParsedError {
  code: number;
  message: string;
  hint?: string;
  category: 'connection' | 'query' | 'validation' | 'ai' | 'unsupported' | 'internal';
}

function isStructuredError(e: unknown): e is ParsedError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    'message' in e &&
    'category' in e &&
    typeof (e as ParsedError).code === 'number' &&
    typeof (e as ParsedError).message === 'string'
  );
}

/**
 * Parse an error into structured error data.
 *
 * Accepts either:
 * - A structured error object from the backend (direct pass-through)
 * - A legacy string format: [ERR-XXXX] message (hint)
 *
 * @example
 * parseError({ code: 1001, message: 'connection refused', hint: 'check network', category: 'connection' })
 * // { code: 1001, message: 'connection refused', hint: 'check network', category: 'connection' }
 *
 * parseError('[ERR-1001] connection refused (check network)')
 * // { code: 1001, message: 'connection refused', hint: 'check network', category: 'connection' }
 */
export function parseError(error: unknown): ParsedError {
  if (isStructuredError(error)) {
    return error;
  }

  const str = typeof error === 'string' ? error : String(error);

  const match = str.match(/\[ERR-(\d+)\]\s*(.+?)(?:\s*\((.+)\))?$/);
  if (!match) {
    return { code: 0, message: str, category: 'internal' };
  }

  const code = parseInt(match[1]);
  const message = match[2].trim();
  const hint = match[3]?.trim();

  return {
    code,
    message,
    hint,
    category: getErrorCategory(code),
  };
}

/**
 * Get error category from error code.
 */
function getErrorCategory(code: number): ParsedError['category'] {
  if (code >= 1000 && code < 2000) return 'connection';
  if (code >= 2000 && code < 3000) return 'query';
  if (code >= 3000 && code < 4000) return 'validation';
  if (code >= 4000 && code < 5000) return 'ai';
  if (code >= 5000 && code < 5100) return 'unsupported';
  return 'internal';
}

/**
 * Extract error message from unknown error value.
 * Handles structured error objects from the backend, Error instances, and plain strings.
 *
 * @example
 * try { ... } catch (e) { console.error(errorMessage(e)); }
 */
export function errorMessage(e: unknown): string {
  if (isStructuredError(e)) {
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * Get user-friendly error message from error value.
 *
 * @example
 * getFriendlyErrorMessage({ code: 1001, message: 'timeout', hint: 'check network', category: 'connection' })
 * // 'Connection failed: timeout. check network'
 *
 * getFriendlyErrorMessage('[ERR-1001] timeout (check network)')
 * // 'Connection failed: timeout. check network'
 */
export function getFriendlyErrorMessage(error: unknown): string {
  const parsed = parseError(error);

  switch (parsed.category) {
    case 'connection':
      return `Connection failed: ${parsed.message}${parsed.hint ? `. ${parsed.hint}` : ''}`;
    case 'query':
      return `Query failed: ${parsed.message}`;
    case 'validation':
      return `Validation error: ${parsed.message}`;
    case 'ai':
      return `AI error: ${parsed.message}`;
    case 'unsupported':
      return `Unsupported: ${parsed.message}`;
    default:
      return parsed.message;
  }
}

/**
 * Show a toast error with the translated title and extracted error description.
 *
 * @example
 * handleApiError(t("redis.key.loadFailed"), e);
 */
export function handleApiError(title: string, e: unknown): void {
  toast.error(title, { description: errorMessage(e) });
}

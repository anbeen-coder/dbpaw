# Error Handling System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement structured error handling with numeric error codes while maintaining backward compatibility with existing `Result<T, String>` interfaces.

**Architecture:** Define `AppError` enum with error codes, implement `Display` for string compatibility, add frontend parser for friendly error messages. Zero breaking changes to existing code.

**Tech Stack:** Rust (thiserror-like manual impl), TypeScript (error parser)

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/src/error.rs` | Create | Core AppError enum, error codes, constructors |
| `src/lib/errors.ts` | Create | Frontend error parser |
| `src/lib/errors.test.ts` | Create | Frontend parser tests |
| `src-tauri/src/db/drivers/mod.rs` | Modify | Add From impl for existing conn_failed_error |
| `src-tauri/src/lib.rs` | Modify | Export error module |

---

## Task 1: Create AppError Core Type

**Files:**
- Create: `src-tauri/src/error.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create error.rs with error codes module**

```rust
use std::fmt;

/// Error code ranges by module
pub mod codes {
    // Connection 1xxx
    pub const CONN_FAILED: u16 = 1001;
    pub const CONN_TIMEOUT: u16 = 1002;
    pub const CONN_AUTH_FAILED: u16 = 1003;
    pub const CONN_TLS_ERROR: u16 = 1004;
    pub const CONN_POOL_ERROR: u16 = 1005;
    
    // Query 2xxx
    pub const QUERY_FAILED: u16 = 2001;
    pub const QUERY_SYNTAX: u16 = 2002;
    pub const QUERY_TIMEOUT: u16 = 2003;
    pub const QUERY_CANCELLED: u16 = 2004;
    
    // Validation 3xxx
    pub const VALIDATION: u16 = 3001;
    pub const VALIDATION_INPUT: u16 = 3002;
    pub const VALIDATION_STATE: u16 = 3003;
    
    // AI 4xxx
    pub const AI_PROVIDER: u16 = 4001;
    pub const AI_KEY: u16 = 4002;
    pub const AI_REQUEST: u16 = 4003;
    
    // Other 5xxx
    pub const UNSUPPORTED: u16 = 5001;
    pub const INTERNAL: u16 = 5002;
    pub const NOT_FOUND: u16 = 5003;
}
```

- [ ] **Step 2: Add AppError enum definition**

Append to `src-tauri/src/error.rs`:

```rust
/// Structured error type with numeric codes
pub enum AppError {
    /// Connection-related errors
    ConnectionFailed {
        code: u16,
        message: String,
        hint: Option<String>,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    /// Query execution errors
    Query {
        code: u16,
        message: String,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    /// Input validation errors
    Validation {
        code: u16,
        message: String,
    },
    /// AI provider errors
    Ai {
        code: u16,
        message: String,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    /// Unsupported operation
    Unsupported {
        code: u16,
        message: String,
    },
    /// Internal/unexpected errors
    Internal {
        code: u16,
        message: String,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
}
```

- [ ] **Step 3: Implement Display trait**

Append to `src-tauri/src/error.rs`:

```rust
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::ConnectionFailed { code, message, hint, .. } => {
                write!(f, "[ERR-{code}] {message}")?;
                if let Some(h) = hint {
                    write!(f, " ({h})")?;
                }
                Ok(())
            }
            AppError::Query { code, message, .. } => write!(f, "[ERR-{code}] {message}"),
            AppError::Validation { code, message } => write!(f, "[ERR-{code}] {message}"),
            AppError::Ai { code, message, .. } => write!(f, "[ERR-{code}] {message}"),
            AppError::Unsupported { code, message } => write!(f, "[ERR-{code}] {message}"),
            AppError::Internal { code, message, .. } => write!(f, "[ERR-{code}] {message}"),
        }
    }
}
```

- [ ] **Step 4: Implement From<AppError> for String**

Append to `src-tauri/src/error.rs`:

```rust
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
```

- [ ] **Step 5: Add error module export to lib.rs**

In `src-tauri/src/lib.rs`, add after line 300 (`pub mod ssh;`):

```rust
pub mod error;
```

- [ ] **Step 6: Verify compilation**

Run: `cargo check`
Expected: Compiles without errors

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/error.rs src-tauri/src/lib.rs
git commit -m "feat: add AppError core type with error codes"
```

---

## Task 2: Add AppError Convenience Constructors

**Files:**
- Modify: `src-tauri/src/error.rs`

- [ ] **Step 1: Add connection error constructors**

Append to `src-tauri/src/error.rs`:

```rust
impl AppError {
    /// Connection failed with hint
    pub fn conn_failed(message: impl Into<String>, hint: impl Into<String>) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_FAILED,
            message: message.into(),
            hint: Some(hint.into()),
            source: None,
        }
    }
    
    /// Connection failed with source error
    pub fn conn_failed_with(
        message: impl Into<String>,
        hint: impl Into<String>,
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_FAILED,
            message: message.into(),
            hint: Some(hint.into()),
            source: Some(Box::new(source)),
        }
    }
    
    /// Connection timeout
    pub fn conn_timeout(message: impl Into<String>) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_TIMEOUT,
            message: message.into(),
            hint: None,
            source: None,
        }
    }
    
    /// Authentication failed
    pub fn conn_auth_failed(message: impl Into<String>) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_AUTH_FAILED,
            message: message.into(),
            hint: Some("Check username and password".to_string()),
            source: None,
        }
    }
    
    /// TLS/SSL error
    pub fn conn_tls_error(message: impl Into<String>) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_TLS_ERROR,
            message: message.into(),
            hint: Some("TLS handshake failed - try disabling SSL".to_string()),
            source: None,
        }
    }
}
```

- [ ] **Step 2: Add query error constructors**

Append to `src-tauri/src/error.rs`:

```rust
impl AppError {
    /// Query failed
    pub fn query_failed(message: impl Into<String>) -> Self {
        AppError::Query {
            code: codes::QUERY_FAILED,
            message: message.into(),
            source: None,
        }
    }
    
    /// Query failed with source error
    pub fn query_failed_with(
        message: impl Into<String>,
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        AppError::Query {
            code: codes::QUERY_FAILED,
            message: message.into(),
            source: Some(Box::new(source)),
        }
    }
    
    /// Query syntax error
    pub fn query_syntax(message: impl Into<String>) -> Self {
        AppError::Query {
            code: codes::QUERY_SYNTAX,
            message: message.into(),
            source: None,
        }
    }
    
    /// Query timeout
    pub fn query_timeout(message: impl Into<String>) -> Self {
        AppError::Query {
            code: codes::QUERY_TIMEOUT,
            message: message.into(),
            source: None,
        }
    }
}
```

- [ ] **Step 3: Add validation, AI, and other constructors**

Append to `src-tauri/src/error.rs`:

```rust
impl AppError {
    /// Validation error
    pub fn validation(message: impl Into<String>) -> Self {
        AppError::Validation {
            code: codes::VALIDATION,
            message: message.into(),
        }
    }
    
    /// AI provider error
    pub fn ai_provider(message: impl Into<String>) -> Self {
        AppError::Ai {
            code: codes::AI_PROVIDER,
            message: message.into(),
            source: None,
        }
    }
    
    /// AI key error
    pub fn ai_key(message: impl Into<String>) -> Self {
        AppError::Ai {
            code: codes::AI_KEY,
            message: message.into(),
            source: None,
        }
    }
    
    /// Unsupported operation
    pub fn unsupported(message: impl Into<String>) -> Self {
        AppError::Unsupported {
            code: codes::UNSUPPORTED,
            message: message.into(),
        }
    }
    
    /// Internal error
    pub fn internal(message: impl Into<String>) -> Self {
        AppError::Internal {
            code: codes::INTERNAL,
            message: message.into(),
            source: None,
        }
    }
    
    /// Internal error with source
    pub fn internal_with(
        message: impl Into<String>,
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        AppError::Internal {
            code: codes::INTERNAL,
            message: message.into(),
            source: Some(Box::new(source)),
        }
    }
}
```

- [ ] **Step 4: Verify compilation**

Run: `cargo check`
Expected: Compiles without errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/error.rs
git commit -m "feat: add AppError convenience constructors"
```

---

## Task 3: Add Unit Tests for AppError

**Files:**
- Modify: `src-tauri/src/error.rs`

- [ ] **Step 1: Add test module**

Append to `src-tauri/src/error.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conn_failed_display() {
        let err = AppError::conn_failed("connection refused", "check host and port");
        assert_eq!(err.to_string(), "[ERR-1001] connection refused (check host and port)");
    }

    #[test]
    fn test_conn_failed_no_hint() {
        let err = AppError::ConnectionFailed {
            code: codes::CONN_FAILED,
            message: "timeout".to_string(),
            hint: None,
            source: None,
        };
        assert_eq!(err.to_string(), "[ERR-1001] timeout");
    }

    #[test]
    fn test_query_failed_display() {
        let err = AppError::query_failed("syntax error near SELECT");
        assert_eq!(err.to_string(), "[ERR-2001] syntax error near SELECT");
    }

    #[test]
    fn test_validation_display() {
        let err = AppError::validation("host cannot be empty");
        assert_eq!(err.to_string(), "[ERR-3001] host cannot be empty");
    }

    #[test]
    fn test_unsupported_display() {
        let err = AppError::unsupported("Routines not supported for this driver");
        assert_eq!(err.to_string(), "[ERR-5001] Routines not supported for this driver");
    }

    #[test]
    fn test_from_app_error_to_string() {
        let err = AppError::conn_auth_failed("invalid credentials");
        let s: String = err.into();
        assert!(s.starts_with("[ERR-1003]"));
        assert!(s.contains("invalid credentials"));
    }

    #[test]
    fn test_conn_timeout() {
        let err = AppError::conn_timeout("connection timed out");
        assert_eq!(err.to_string(), "[ERR-1002] connection timed out");
    }

    #[test]
    fn test_conn_tls_error() {
        let err = AppError::conn_tls_error("handshake failed");
        let s = err.to_string();
        assert!(s.contains("[ERR-1004]"));
        assert!(s.contains("TLS handshake failed"));
    }

    #[test]
    fn test_query_timeout() {
        let err = AppError::query_timeout("query execution timed out");
        assert_eq!(err.to_string(), "[ERR-2003] query execution timed out");
    }

    #[test]
    fn test_internal_error() {
        let err = AppError::internal("unexpected state");
        assert_eq!(err.to_string(), "[ERR-5002] unexpected state");
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cargo test error::tests -- --nocapture`
Expected: All 10 tests pass

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/error.rs
git commit -m "test: add AppError unit tests"
```

---

## Task 4: Integrate AppError with Existing conn_failed_error

**Files:**
- Modify: `src-tauri/src/db/drivers/mod.rs`

- [ ] **Step 1: Update conn_failed_error to use AppError**

In `src-tauri/src/db/drivers/mod.rs`, find the `conn_failed_error` function (line ~64) and replace the return statement:

```rust
pub(crate) fn conn_failed_error(e: &dyn std::fmt::Display) -> String {
    let raw = e.to_string();
    let lower = raw.to_ascii_lowercase();

    let hint = if lower.contains("dpi-1047")
        || lower.contains("cannot locate a 64-bit oracle client")
    {
        "hint: Oracle Instant Client is not installed — download it from \
         https://www.oracle.com/database/technologies/instant-client/downloads.html \
         and add the directory containing libclntsh to your library path \
         (macOS: DYLD_LIBRARY_PATH; Linux: LD_LIBRARY_PATH)"
    } else if lower.contains("handshake")
        || lower.contains("fatal alert")
        || lower.contains("tls")
        || lower.contains("ssl")
        || lower.contains("certificate")
    {
        "hint: TLS/SSL handshake failed — the server may use a TLS version or cipher suite \
         incompatible with the client (TLS 1.2+ required); try disabling SSL in the connection settings"
    } else if lower.contains("access denied")
        || lower.contains("authentication")
        || lower.contains("password")
        || lower.contains("login failed")
        || lower.contains("invalid password")
        || lower.contains("1045")
    {
        "hint: authentication failed — verify the username/password are correct; \
         if they contain special characters they must be URL-encoded"
    } else if lower.contains("connection refused")
        || lower.contains("timed out")
        || lower.contains("timeout")
        || lower.contains("broken pipe")
        || lower.contains("network unreachable")
    {
        "hint: could not reach the server — check host, port, firewall rules, and SSH tunnel settings"
    } else if lower.contains("name resolution")
        || lower.contains("no such host")
        || lower.contains("failed to lookup")
        || lower.contains("dns")
    {
        "hint: hostname could not be resolved — check that the host address is correct"
    } else {
        "hint: check host, port, credentials, and SSL settings"
    };

    // Use AppError internally, return String for compatibility
    crate::error::AppError::conn_failed(raw, hint).to_string()
}
```

- [ ] **Step 2: Run existing tests**

Run: `cargo test --lib drivers::tests::conn_failed_error`
Expected: All existing tests pass (output format unchanged)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/db/drivers/mod.rs
git commit -m "refactor: use AppError in conn_failed_error"
```

---

## Task 5: Create Frontend Error Parser

**Files:**
- Create: `src/lib/errors.ts`

- [ ] **Step 1: Create error parser module**

```typescript
export interface ParsedError {
  code: number;
  message: string;
  hint?: string;
  category: 'connection' | 'query' | 'validation' | 'ai' | 'unsupported' | 'internal';
}

/**
 * Parse an AppError string into structured error data.
 * 
 * Expected format: [ERR-XXXX] message (hint)
 * 
 * @example
 * parseError('[ERR-1001] connection refused (check network)')
 * // { code: 1001, message: 'connection refused', hint: 'check network', category: 'connection' }
 */
export function parseError(error: string): ParsedError {
  const match = error.match(/\[ERR-(\d+)\]\s*(.+?)(?:\s*\((.+)\))?$/);
  if (!match) {
    return { code: 0, message: error, category: 'internal' };
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
 * Get user-friendly error message from error string.
 * 
 * @example
 * getFriendlyErrorMessage('[ERR-1001] timeout (check network)')
 * // 'Connection failed: timeout. check network'
 */
export function getFriendlyErrorMessage(error: string): string {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/errors.ts
git commit -m "feat: add frontend error parser for AppError"
```

---

## Task 6: Add Frontend Parser Tests

**Files:**
- Create: `src/lib/errors.test.ts`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect } from 'vitest';
import { parseError, getFriendlyErrorMessage } from './errors';

describe('parseError', () => {
  it('should parse connection error with hint', () => {
    const result = parseError('[ERR-1001] connection refused (check network)');
    expect(result.code).toBe(1001);
    expect(result.message).toBe('connection refused');
    expect(result.hint).toBe('check network');
    expect(result.category).toBe('connection');
  });

  it('should parse connection error without hint', () => {
    const result = parseError('[ERR-1002] connection timed out');
    expect(result.code).toBe(1002);
    expect(result.message).toBe('connection timed out');
    expect(result.hint).toBeUndefined();
    expect(result.category).toBe('connection');
  });

  it('should parse query error', () => {
    const result = parseError('[ERR-2001] syntax error near SELECT');
    expect(result.code).toBe(2001);
    expect(result.category).toBe('query');
  });

  it('should parse validation error', () => {
    const result = parseError('[ERR-3001] host cannot be empty');
    expect(result.code).toBe(3001);
    expect(result.category).toBe('validation');
  });

  it('should parse AI error', () => {
    const result = parseError('[ERR-4001] provider not configured');
    expect(result.code).toBe(4001);
    expect(result.category).toBe('ai');
  });

  it('should parse unsupported error', () => {
    const result = parseError('[ERR-5001] routines not supported');
    expect(result.code).toBe(5001);
    expect(result.category).toBe('unsupported');
  });

  it('should handle non-AppError strings', () => {
    const result = parseError('some random error');
    expect(result.code).toBe(0);
    expect(result.message).toBe('some random error');
    expect(result.category).toBe('internal');
  });

  it('should handle empty string', () => {
    const result = parseError('');
    expect(result.code).toBe(0);
    expect(result.message).toBe('');
    expect(result.category).toBe('internal');
  });
});

describe('getFriendlyErrorMessage', () => {
  it('should format connection error with hint', () => {
    const msg = getFriendlyErrorMessage('[ERR-1001] timeout (check network)');
    expect(msg).toBe('Connection failed: timeout. check network');
  });

  it('should format connection error without hint', () => {
    const msg = getFriendlyErrorMessage('[ERR-1002] connection timed out');
    expect(msg).toBe('Connection failed: connection timed out');
  });

  it('should format query error', () => {
    const msg = getFriendlyErrorMessage('[ERR-2001] syntax error');
    expect(msg).toBe('Query failed: syntax error');
  });

  it('should format validation error', () => {
    const msg = getFriendlyErrorMessage('[ERR-3001] invalid input');
    expect(msg).toBe('Validation error: invalid input');
  });

  it('should return original message for non-AppError', () => {
    const msg = getFriendlyErrorMessage('something went wrong');
    expect(msg).toBe('something went wrong');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/lib/errors.test.ts`
Expected: All 13 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/lib/errors.test.ts
git commit -m "test: add frontend error parser tests"
```

---

## Task 7: Verify Full Compilation and Tests

**Files:** None (verification only)

- [ ] **Step 1: Run Rust compilation check**

Run: `cargo check`
Expected: Compiles without errors

- [ ] **Step 2: Run Rust tests**

Run: `cargo test --lib`
Expected: All tests pass

- [ ] **Step 3: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Run frontend tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address compilation or test issues"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Create AppError core type | 5 min |
| 2 | Add convenience constructors | 5 min |
| 3 | Add unit tests | 5 min |
| 4 | Integrate with conn_failed_error | 5 min |
| 5 | Create frontend parser | 5 min |
| 6 | Add frontend tests | 5 min |
| 7 | Verify compilation and tests | 5 min |

**Total:** ~35 minutes

---

## Success Criteria

- [ ] `AppError` enum compiles and implements `Display`
- [ ] `From<AppError> for String` works for backward compatibility
- [ ] All existing Rust tests pass
- [ ] Frontend parser correctly extracts error codes
- [ ] Frontend tests pass
- [ ] No breaking changes to existing `Result<T, String>` interfaces

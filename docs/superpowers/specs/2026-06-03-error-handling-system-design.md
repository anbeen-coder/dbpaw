# Error Handling System Design

**Date**: 2026-06-03
**Status**: Approved
**Scope**: Backend (Rust) error types + Frontend error parsing

## Problem Statement

Current error handling uses raw `String` for all errors (692 occurrences). Errors use inconsistent formats like `[CONN_FAILED]`, `[QUERY_ERROR]`, etc. This makes it hard to:
- Parse errors programmatically in frontend
- Provide consistent error codes for debugging
- Track error origins and causes

## Solution: AppError Enum + Display Compatibility

### Approach
- Define structured `AppError` enum with error codes
- Implement `Display` trait for backward compatibility (outputs `[ERR-XXXX] message (hint)`)
- Implement `From<AppError> for String` to maintain existing `Result<T, String>` interfaces
- Add frontend parser to extract error codes and display friendly messages

### Key Decisions
1. **Minimal changes**: Keep existing `Result<T, String>` signatures
2. **Numeric error codes**: Format `[ERR-XXXX]` for categorization
3. **Error chains**: Support `source` field for debugging
4. **Frontend parsing**: Parse error codes for friendly display

---

## Core Type Definition

### `src-tauri/src/error.rs`

```rust
use std::fmt;

/// Error code ranges
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

/// Structured error type
pub enum AppError {
    ConnectionFailed {
        code: u16,
        message: String,
        hint: Option<String>,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    Query {
        code: u16,
        message: String,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    Validation {
        code: u16,
        message: String,
    },
    Ai {
        code: u16,
        message: String,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    Unsupported {
        code: u16,
        message: String,
    },
    Internal {
        code: u16,
        message: String,
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
}

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

impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
```

---

## Convenience Constructors

```rust
impl AppError {
    pub fn conn_failed(message: impl Into<String>, hint: impl Into<String>) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_FAILED,
            message: message.into(),
            hint: Some(hint.into()),
            source: None,
        }
    }
    
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
    
    pub fn conn_timeout(message: impl Into<String>) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_TIMEOUT,
            message: message.into(),
            hint: None,
            source: None,
        }
    }
    
    pub fn conn_auth_failed(message: impl Into<String>) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_AUTH_FAILED,
            message: message.into(),
            hint: Some("Check username and password".to_string()),
            source: None,
        }
    }
    
    pub fn conn_tls_error(message: impl Into<String>) -> Self {
        AppError::ConnectionFailed {
            code: codes::CONN_TLS_ERROR,
            message: message.into(),
            hint: Some("TLS handshake failed - try disabling SSL".to_string()),
            source: None,
        }
    }
    
    pub fn query_failed(message: impl Into<String>) -> Self {
        AppError::Query {
            code: codes::QUERY_FAILED,
            message: message.into(),
            source: None,
        }
    }
    
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
    
    pub fn validation(message: impl Into<String>) -> Self {
        AppError::Validation {
            code: codes::VALIDATION,
            message: message.into(),
        }
    }
    
    pub fn unsupported(message: impl Into<String>) -> Self {
        AppError::Unsupported {
            code: codes::UNSUPPORTED,
            message: message.into(),
        }
    }
    
    pub fn internal(message: impl Into<String>) -> Self {
        AppError::Internal {
            code: codes::INTERNAL,
            message: message.into(),
            source: None,
        }
    }
    
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

---

## Frontend Error Parser

### `src/lib/errors.ts` (New)

```typescript
export interface ParsedError {
  code: number;
  message: string;
  hint?: string;
  category: 'connection' | 'query' | 'validation' | 'ai' | 'unsupported' | 'internal';
}

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

function getErrorCategory(code: number): ParsedError['category'] {
  if (code >= 1000 && code < 2000) return 'connection';
  if (code >= 2000 && code < 3000) return 'query';
  if (code >= 3000 && code < 4000) return 'validation';
  if (code >= 4000 && code < 5000) return 'ai';
  if (code >= 5000 && code < 5100) return 'unsupported';
  return 'internal';
}

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
    default:
      return parsed.message;
  }
}
```

---

## Migration Strategy

### Phase 1: Add error.rs (Zero Breaking Changes)
1. Create `src-tauri/src/error.rs` with `AppError` enum
2. Add convenience constructors
3. Add `From<AppError> for String` impl
4. No existing code changes required

### Phase 2: Gradual Migration (Incremental)
1. Replace `String` errors in new code with `AppError`
2. Update critical paths (connection, query) to use `AppError`
3. Keep `Result<T, String>` signatures - use `.into()` or `.to_string()`

### Phase 3: Frontend Integration
1. Add `src/lib/errors.ts` parser
2. Update error display components to use `parseError()`
3. Show friendly messages with hints

---

## Error Code Table

| Range | Module | Examples |
|-------|--------|----------|
| 1001-1099 | Connection | CONN_FAILED, CONN_TIMEOUT, CONN_AUTH_FAILED |
| 1100-1199 | Connection Pool | CONN_POOL_ERROR, CONN_POOL_CLOSED |
| 1200-1299 | SSH Tunnel | SSH_TUNNEL_FAILED, SSH_AUTH_FAILED |
| 2001-2099 | Query Execution | QUERY_FAILED, QUERY_TIMEOUT |
| 2100-2199 | Query Syntax | QUERY_SYNTAX, QUERY_CANCELLED |
| 3001-3099 | Validation | VALIDATION, VALIDATION_INPUT |
| 4001-4099 | AI | AI_PROVIDER, AI_KEY, AI_REQUEST |
| 5001-5099 | Other | UNSUPPORTED, INTERNAL, NOT_FOUND |

---

## Example Usage

### Before (Current)
```rust
Err(format!("[CONN_FAILED] {} (hint: check credentials)", e))
```

### After (With AppError)
```rust
Err(AppError::conn_failed(e.to_string(), "check credentials").to_string())
// Or for new code returning AppError:
Err(AppError::conn_failed(e.to_string(), "check credentials"))
```

### Frontend Parsing
```typescript
import { parseError, getFriendlyErrorMessage } from '@/lib/errors';

try {
  await api.executeQuery(...);
} catch (error) {
  const parsed = parseError(error as string);
  console.log(parsed.code);      // 2001
  console.log(parsed.category);  // 'query'
  console.log(parsed.message);   // 'syntax error near SELECT'
  
  toast.error(getFriendlyErrorMessage(error as string));
}
```

---

## Testing

### Unit Tests for AppError
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_display_format() {
        let err = AppError::conn_failed("timeout", "check network");
        assert_eq!(err.to_string(), "[ERR-1001] timeout (check network)");
    }

    #[test]
    fn test_to_string_conversion() {
        let err = AppError::validation("invalid input");
        let s: String = err.into();
        assert_eq!(s, "[ERR-3001] invalid input");
    }

    #[test]
    fn test_error_chain() {
        let source = std::io::Error::new(std::io::ErrorKind::ConnectionRefused, "refused");
        let err = AppError::conn_failed_with("connection failed", "check host", source);
        assert!(err.to_string().contains("[ERR-1001]"));
    }
}
```

### Frontend Parser Tests
```typescript
describe('parseError', () => {
  it('should parse connection error', () => {
    const result = parseError('[ERR-1001] connection refused (check network)');
    expect(result.code).toBe(1001);
    expect(result.category).toBe('connection');
    expect(result.hint).toBe('check network');
  });

  it('should handle non-AppError strings', () => {
    const result = parseError('some random error');
    expect(result.code).toBe(0);
    expect(result.category).toBe('internal');
  });
});
```

---

## Success Criteria

1. ✅ `AppError` enum compiles and implements `Display`
2. ✅ `From<AppError> for String` works for backward compatibility
3. ✅ Existing tests pass without modification
4. ✅ New code can use `AppError` directly
5. ✅ Frontend can parse `[ERR-XXXX]` format
6. ✅ Friendly error messages displayed to users

---

## Future Enhancements

- Add `Serialize` derive for JSON error responses
- Add internationalization (i18n) support for error messages
- Add error metrics/logging integration
- Add retry logic based on error codes

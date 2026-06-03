use std::fmt;

pub mod codes {
    pub const CONN_FAILED: u16 = 1001;
    pub const CONN_TIMEOUT: u16 = 1002;
    pub const CONN_AUTH_FAILED: u16 = 1003;
    pub const CONN_TLS_ERROR: u16 = 1004;
    pub const CONN_POOL_ERROR: u16 = 1005;

    pub const QUERY_FAILED: u16 = 2001;
    pub const QUERY_SYNTAX: u16 = 2002;
    pub const QUERY_TIMEOUT: u16 = 2003;
    pub const QUERY_CANCELLED: u16 = 2004;

    pub const VALIDATION: u16 = 3001;
    pub const VALIDATION_INPUT: u16 = 3002;
    pub const VALIDATION_STATE: u16 = 3003;

    pub const AI_PROVIDER: u16 = 4001;
    pub const AI_KEY: u16 = 4002;
    pub const AI_REQUEST: u16 = 4003;

    pub const UNSUPPORTED: u16 = 5001;
    pub const INTERNAL: u16 = 5002;
    pub const NOT_FOUND: u16 = 5003;
}

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

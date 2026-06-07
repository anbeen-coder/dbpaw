use crate::error::AppError;

pub type RedisResult<T> = Result<T, AppError>;

pub fn validation(message: impl Into<String>) -> AppError {
    AppError::validation(message)
}

pub fn unsupported(message: impl Into<String>) -> AppError {
    AppError::unsupported(message)
}

pub fn command(message: impl Into<String>) -> AppError {
    AppError::query_failed(message)
}

pub fn scan(message: impl Into<String>) -> AppError {
    AppError::query_failed(message)
}

pub fn to_command_error(err: impl std::fmt::Display) -> AppError {
    command(err.to_string())
}

pub fn to_scan_error(err: impl std::fmt::Display) -> AppError {
    scan(err.to_string())
}

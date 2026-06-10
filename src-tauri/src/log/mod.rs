use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{fmt, layer::SubscriberExt, reload, util::SubscriberInitExt, EnvFilter};

/// Handle for runtime log level changes, stored in AppState.
pub type LogReloadHandle = reload::Handle<EnvFilter, tracing_subscriber::Registry>;

/// Initialize tracing with stderr + file dual output.
/// Returns the reload handle and a guard that must be kept alive (keeps the file writer running).
pub fn init_logging(app_handle: &tauri::AppHandle) -> (LogReloadHandle, WorkerGuard) {
    let log_dir = log_directory(app_handle);

    let file_appender = tracing_appender::rolling::daily(&log_dir, "app.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    // Default level: debug in dev, warn in release
    let default_level = if cfg!(debug_assertions) {
        "debug"
    } else {
        "warn"
    };
    let env_filter = EnvFilter::try_new(default_level).unwrap_or_else(|_| EnvFilter::new("warn"));

    let (reload_layer, reload_handle) = reload::Layer::new(env_filter);

    // stderr layer: colored, human-readable
    let stderr_layer = fmt::layer()
        .with_writer(std::io::stderr)
        .with_ansi(true)
        .with_target(true)
        .with_span_events(fmt::format::FmtSpan::CLOSE);

    // file layer: JSON, no color
    let file_layer = fmt::layer()
        .with_writer(non_blocking)
        .json()
        .with_ansi(false)
        .with_target(true)
        .with_span_events(fmt::format::FmtSpan::CLOSE);

    tracing_subscriber::registry()
        .with(reload_layer)
        .with(stderr_layer)
        .with(file_layer)
        .init();

    (reload_handle, guard)
}

fn log_directory(app_handle: &tauri::AppHandle) -> std::path::PathBuf {
    let base = dirs::data_dir()
        .or_else(dirs::home_dir)
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    let app_name = app_handle
        .config()
        .identifier
        .split('.')
        .last()
        .unwrap_or("dbpaw");
    let log_dir = base.join(app_name).join("logs");
    std::fs::create_dir_all(&log_dir).ok();
    log_dir
}

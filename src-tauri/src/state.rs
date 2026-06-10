use crate::datasources::redis::RedisConnectionCache;
use crate::db::local::LocalDb;
use crate::db::pool_manager::{PoolConfig, PoolManager};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub local_db: Mutex<Option<Arc<LocalDb>>>,
    pub pool_manager: Arc<PoolManager>,
    pub redis_cache: Mutex<RedisConnectionCache>,
    pub mcp_process: Mutex<Option<tokio::process::Child>>,
    pub log_reload_handle: Mutex<Option<crate::log::LogReloadHandle>>,
    /// Must be kept alive for the lifetime of the app. Dropping stops the file writer.
    pub _log_guard: Mutex<Option<tracing_appender::non_blocking::WorkerGuard>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            local_db: Mutex::new(None),
            pool_manager: Arc::new(PoolManager::new(PoolConfig::default())),
            redis_cache: Mutex::new(RedisConnectionCache::new()),
            mcp_process: Mutex::new(None),
            log_reload_handle: Mutex::new(None),
            _log_guard: Mutex::new(None),
        }
    }
}

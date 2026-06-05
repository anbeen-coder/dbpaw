use crate::datasources::redis::{
    self, RedisBatchKeyOp, RedisBatchKeyOpResult, RedisClusterInfo, RedisDatabaseInfo,
    RedisGeoMember, RedisGeoPosition, RedisGeoSearchResult, RedisKeyPatchPayload, RedisKeyValue,
    RedisLInsertPosition, RedisLMoveDirection, RedisMgetEntry, RedisMutationResult, RedisRawResult,
    RedisScanResponse, RedisServerInfo, RedisSetKeyPayload, RedisSetOperation, RedisSlowlogEntry,
    RedisStreamEntry, RedisStreamView, RedisXClaimEntry, RedisXPendingResult,
    RedisZRangeByLexResult, RedisZRangeByScoreResult, RedisZSetMember,
};
use crate::datasources::redis::{connect, RedisConnection};
use crate::models::{ConnectionForm, RedisCommandLog};
use crate::state::AppState;
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use tauri::State;

type RedisCommandFuture<'a, T> = Pin<Box<dyn Future<Output = Result<T, String>> + Send + 'a>>;

/// Cache key: standalone uses "{id}:{db}" so different databases on the same
/// server each get their own persistent connection (SELECT is connection-level).
/// Cluster uses "{id}:cluster" since it only supports db0.
fn cache_key(id: i64, database: Option<&str>, is_cluster: bool) -> String {
    if is_cluster {
        format!("{id}:cluster")
    } else {
        format!("{id}:{}", database.unwrap_or(""))
    }
}

/// Returns true if the error string looks like a broken/dropped TCP connection.
fn is_io_error(e: &str) -> bool {
    e.contains("[REDIS_ERROR]") && {
        let lower = e.to_lowercase();
        lower.contains("broken pipe")
            || lower.contains("connection reset")
            || lower.contains("connection refused")
            || lower.contains("connection closed")
            || lower.contains("eof")
            || lower.contains("os error")
    }
}

/// Get a cached connection for (id, database), creating one if not present.
async fn acquire(
    state: &State<'_, AppState>,
    id: i64,
    form: &ConnectionForm,
    database: Option<&str>,
) -> Result<RedisConnection, String> {
    let is_cluster = form
        .host
        .as_deref()
        .map(|h| h.split(',').filter(|p| !p.trim().is_empty()).count() > 1)
        .unwrap_or(false);
    let key = cache_key(id, database, is_cluster);

    // Fast path: return a clone of the cached connection
    {
        let cache = state.redis_cache.lock().await;
        if let Some(conn) = cache.get(&key) {
            return Ok(conn);
        }
    }

    // Slow path: create a new connection and cache it
    let conn = connect(form, database).await?;
    {
        let mut cache = state.redis_cache.lock().await;
        // Another task might have raced in; prefer the one already in the cache
        if let Some(existing) = cache.get(&key) {
            return Ok(existing);
        }
        cache.insert(key, conn.clone());
    }
    Ok(conn)
}

/// Remove a stale connection from the cache (called after an IO error).
async fn evict(
    state: &State<'_, AppState>,
    id: i64,
    form: &ConnectionForm,
    database: Option<&str>,
) {
    let is_cluster = form
        .host
        .as_deref()
        .map(|h| h.split(',').filter(|p| !p.trim().is_empty()).count() > 1)
        .unwrap_or(false);
    let key = cache_key(id, database, is_cluster);
    let mut cache = state.redis_cache.lock().await;
    cache.remove(&key);
}

async fn retry_once_on_redis_io_error<T, Operation, OperationFuture, OnRetry, OnRetryFuture>(
    mut operation: Operation,
    mut on_retry: OnRetry,
) -> Result<T, String>
where
    Operation: FnMut() -> OperationFuture,
    OperationFuture: Future<Output = Result<T, String>>,
    OnRetry: FnMut() -> OnRetryFuture,
    OnRetryFuture: Future<Output = ()>,
{
    match operation().await {
        Err(ref e) if is_io_error(e) => {
            on_retry().await;
            operation().await
        }
        result => result,
    }
}

#[allow(dead_code)]
async fn with_redis_conn<T, F>(
    state: &State<'_, AppState>,
    id: i64,
    database: Option<&str>,
    operation: F,
) -> Result<T, String>
where
    F: for<'a> FnOnce(&'a ConnectionForm, &'a mut RedisConnection) -> RedisCommandFuture<'a, T>,
{
    let form = super::get_connection_form_by_id_with_driver_check(state, id, "redis").await?;
    let mut conn = acquire(state, id, &form, database).await?;
    operation(&form, &mut conn).await
}

async fn with_redis_retry<T, F>(
    state: &State<'_, AppState>,
    id: i64,
    database: Option<&str>,
    operation: F,
) -> Result<T, String>
where
    F: for<'a> Fn(&'a ConnectionForm, &'a mut RedisConnection) -> RedisCommandFuture<'a, T>,
{
    let form = super::get_connection_form_by_id_with_driver_check(state, id, "redis").await?;
    let operation = &operation;

    retry_once_on_redis_io_error(
        || {
            let form = &form;
            async move {
                let mut conn = acquire(state, id, form, database).await?;
                operation(form, &mut conn).await
            }
        },
        || {
            let form = &form;
            async move {
                evict(state, id, form, database).await;
            }
        },
    )
    .await
}

#[tauri::command]
pub async fn redis_list_databases(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Vec<RedisDatabaseInfo>, String> {
    with_redis_retry(&state, id, None, |form, conn| {
        Box::pin(async move {
            redis::ping(conn).await?;

            let db_count = if conn.is_cluster() {
                1
            } else {
                let mut cmd = ::redis::cmd("CONFIG");
                cmd.arg("GET").arg("databases");
                match conn.query::<Vec<String>>(cmd).await {
                    Ok(values) if values.len() >= 2 => {
                        values[1].parse::<i64>().unwrap_or(16).clamp(1, 256)
                    }
                    _ => 16,
                }
            };

            let mut dbs = redis::list_databases(form, db_count)?;

            if conn.is_cluster() {
                if let Some(db) = dbs.first_mut() {
                    let count: u64 = conn.query(::redis::cmd("DBSIZE")).await.unwrap_or(0);
                    db.key_count = Some(count);
                }
            } else {
                for db in &mut dbs {
                    let mut select_cmd = ::redis::cmd("SELECT");
                    select_cmd.arg(db.index);
                    let _ = conn.query::<()>(select_cmd).await;
                    let count: u64 = conn.query(::redis::cmd("DBSIZE")).await.unwrap_or(0);
                    db.key_count = Some(count);
                }
                // Restore to the originally selected database
                if let Some(selected) = dbs.iter().find(|d| d.selected) {
                    let mut select_cmd = ::redis::cmd("SELECT");
                    select_cmd.arg(selected.index);
                    let _ = conn.query::<()>(select_cmd).await;
                }
            }

            Ok(dbs)
        })
    })
    .await
}

#[tauri::command]
pub async fn redis_scan_keys(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    cursor: Option<String>,
    pattern: Option<String>,
    limit: Option<u32>,
) -> Result<RedisScanResponse, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::scan_keys(
            conn,
            cursor.clone(),
            pattern.clone(),
            limit,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_get_key(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
) -> Result<RedisKeyValue, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::get_key(conn, key.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_set_key(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    payload: RedisSetKeyPayload,
) -> Result<RedisMutationResult, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::set_key(conn, payload.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_update_key(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    payload: RedisSetKeyPayload,
) -> Result<RedisMutationResult, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::set_key(conn, payload.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_delete_key(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
) -> Result<RedisMutationResult, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::delete_key(conn, key.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_patch_key(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    payload: RedisKeyPatchPayload,
) -> Result<RedisMutationResult, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::patch_key(conn, payload.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_rename_key(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    old_key: String,
    new_key: String,
    force: Option<bool>,
) -> Result<RedisMutationResult, String> {
    let force = force.unwrap_or(false);
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::rename_key(
            conn,
            old_key.clone(),
            new_key.clone(),
            force,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_get_key_page(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    offset: u64,
    limit: u32,
) -> Result<RedisKeyValue, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::get_key_page(conn, key.clone(), offset, limit))
    })
    .await
}

#[tauri::command]
pub async fn redis_set_ttl(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    ttl_seconds: Option<i64>,
) -> Result<RedisMutationResult, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::set_ttl(conn, key.clone(), ttl_seconds))
    })
    .await
}

#[tauri::command]
pub async fn redis_get_stream_range(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    start_id: String,
    count: u32,
) -> Result<Vec<RedisStreamEntry>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::get_stream_range(
            conn,
            key.clone(),
            start_id.clone(),
            count,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_get_stream_view(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    start_id: String,
    end_id: String,
    count: u32,
) -> Result<RedisStreamView, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::get_stream_view(
            conn,
            key.clone(),
            start_id.clone(),
            end_id.clone(),
            count,
        ))
    })
    .await
}

async fn append_redis_command_log(
    state: &AppState,
    command: String,
    connection_id: i64,
    database: Option<String>,
    success: bool,
    error: Option<String>,
) {
    let db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };

    if let Some(local_db) = db {
        if let Err(e) = local_db
            .insert_redis_command_log(command, Some(connection_id), database, success, error)
            .await
        {
            eprintln!("[REDIS_LOG_APPEND_ERROR] {}", e);
        }
    }
}

#[tauri::command]
pub async fn redis_execute_raw(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    command: String,
) -> Result<RedisRawResult, String> {
    let result = with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::execute_raw(conn, command.clone()))
    })
    .await;

    match &result {
        Ok(_) => {
            append_redis_command_log(&state, command, id, database, true, None).await;
        }
        Err(e) => {
            append_redis_command_log(&state, command, id, database, false, Some(e.clone())).await;
        }
    }

    result
}

#[tauri::command]
pub async fn redis_bitmap_get_bit(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    offset: u64,
) -> Result<bool, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::bitmap_get_bit(conn, key.clone(), offset))
    })
    .await
}

#[tauri::command]
pub async fn redis_bitmap_count(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    start: Option<i64>,
    end: Option<i64>,
) -> Result<u64, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::bitmap_count(conn, key.clone(), start, end))
    })
    .await
}

#[tauri::command]
pub async fn redis_bitmap_pos(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    bit: bool,
    start: Option<u64>,
    end: Option<u64>,
    count: Option<u64>,
) -> Result<Vec<u64>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::bitmap_pos(conn, key.clone(), bit, start, end, count))
    })
    .await
}

#[tauri::command]
pub async fn redis_hll_pfadd(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    elements: Vec<String>,
) -> Result<bool, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::hll_pfadd(conn, key.clone(), elements.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_geo_add(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    members: Vec<RedisGeoMember>,
) -> Result<i64, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::geo_add(conn, key.clone(), members.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_geo_pos(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    members: Vec<String>,
) -> Result<Vec<Option<RedisGeoPosition>>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::geo_pos(conn, key.clone(), members.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_geo_dist(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    member1: String,
    member2: String,
    unit: Option<String>,
) -> Result<f64, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::geo_dist(
            conn,
            key.clone(),
            member1.clone(),
            member2.clone(),
            unit.clone(),
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_geo_search(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    member: Option<String>,
    longitude: Option<f64>,
    latitude: Option<f64>,
    radius: f64,
    unit: String,
    with_coord: bool,
    with_dist: bool,
    with_hash: bool,
    count: Option<u64>,
) -> Result<Vec<RedisGeoSearchResult>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::geo_search(
            conn,
            key.clone(),
            member.clone(),
            longitude,
            latitude,
            radius,
            unit.clone(),
            with_coord,
            with_dist,
            with_hash,
            count,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_server_info(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
) -> Result<RedisServerInfo, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::server_info(conn))
    })
    .await
}

#[tauri::command]
pub async fn redis_server_config(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
) -> Result<HashMap<String, String>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::server_config(conn))
    })
    .await
}

#[tauri::command]
pub async fn redis_slowlog_get(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    count: Option<i64>,
) -> Result<Vec<RedisSlowlogEntry>, String> {
    let n = count.unwrap_or(50);
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::slowlog_get(conn, n))
    })
    .await
}

#[tauri::command]
pub async fn redis_zrangebyscore(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    min: String,
    max: String,
    offset: Option<u64>,
    limit: Option<u64>,
) -> Result<RedisZRangeByScoreResult, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::zrangebyscore(
            conn,
            key.clone(),
            min.clone(),
            max.clone(),
            offset,
            limit,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_zrank(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    member: String,
    reverse: Option<bool>,
) -> Result<Option<i64>, String> {
    let rev = reverse.unwrap_or(false);
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::zrank(conn, key.clone(), member.clone(), rev))
    })
    .await
}

#[tauri::command]
pub async fn redis_set_operation(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    keys: Vec<String>,
    op: RedisSetOperation,
) -> Result<Vec<String>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::set_operation(conn, keys.clone(), op.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_sismember(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    member: String,
) -> Result<bool, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::sismember(conn, key.clone(), member.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_smove(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    source: String,
    destination: String,
    member: String,
) -> Result<bool, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::smove(
            conn,
            source.clone(),
            destination.clone(),
            member.clone(),
        ))
    })
    .await
}

// ── Stream Consumer Group commands ──────────────────────────────────────────

#[tauri::command]
pub async fn redis_xgroup_create(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    group: String,
    start_id: String,
    mkstream: Option<bool>,
) -> Result<bool, String> {
    let ms = mkstream.unwrap_or(false);
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::xgroup_create(
            conn,
            key.clone(),
            group.clone(),
            start_id.clone(),
            ms,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_xgroup_del(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    group: String,
) -> Result<bool, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::xgroup_del(conn, key.clone(), group.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_xgroup_setid(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    group: String,
    start_id: String,
) -> Result<bool, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::xgroup_setid(
            conn,
            key.clone(),
            group.clone(),
            start_id.clone(),
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_xack(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    group: String,
    ids: Vec<String>,
) -> Result<i64, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::xack(conn, key.clone(), group.clone(), ids.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_xpending(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    group: String,
    start: Option<String>,
    end: Option<String>,
    count: Option<i64>,
    consumer: Option<String>,
) -> Result<RedisXPendingResult, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::xpending(
            conn,
            key.clone(),
            group.clone(),
            start.clone(),
            end.clone(),
            count,
            consumer.clone(),
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_xclaim(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    group: String,
    consumer: String,
    min_idle_ms: i64,
    ids: Vec<String>,
) -> Result<Vec<RedisXClaimEntry>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::xclaim(
            conn,
            key.clone(),
            group.clone(),
            consumer.clone(),
            min_idle_ms,
            ids.clone(),
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_xtrim(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    strategy: String,
    threshold: String,
    approximate: Option<bool>,
) -> Result<i64, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::xtrim(
            conn,
            key.clone(),
            strategy.clone(),
            threshold.clone(),
            approximate,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_xreadgroup(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    group: String,
    consumer: String,
    start_id: String,
    count: Option<i64>,
) -> Result<Vec<RedisStreamEntry>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::xreadgroup(
            conn,
            key.clone(),
            group.clone(),
            consumer.clone(),
            start_id.clone(),
            count,
        ))
    })
    .await
}

// ── Batch operations ────────────────────────────────────────────────────────

#[tauri::command]
pub async fn redis_batch_key_ops(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    operations: Vec<RedisBatchKeyOp>,
) -> Result<Vec<RedisBatchKeyOpResult>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::batch_key_ops(conn, operations.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_mget(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    keys: Vec<String>,
) -> Result<Vec<RedisMgetEntry>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::mget_keys(conn, keys.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_mset(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    entries: HashMap<String, String>,
) -> Result<RedisMutationResult, String> {
    let pairs: Vec<(String, String)> = entries.into_iter().collect();
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::mset_keys(conn, pairs.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_cluster_info(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
) -> Result<RedisClusterInfo, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::cluster_info(conn))
    })
    .await
}

#[tauri::command]
pub async fn redis_zscore(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    member: String,
) -> Result<Option<f64>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::zscore(conn, key.clone(), member.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_zmscore(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    members: Vec<String>,
) -> Result<Vec<Option<f64>>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::zmscore(conn, key.clone(), members.clone()))
    })
    .await
}

#[tauri::command]
pub async fn redis_zrangebylex(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    min: String,
    max: String,
    offset: Option<u64>,
    limit: Option<u64>,
) -> Result<RedisZRangeByLexResult, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::zrangebylex(
            conn,
            key.clone(),
            min.clone(),
            max.clone(),
            offset,
            limit,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_zlexcount(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    min: String,
    max: String,
) -> Result<u64, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::zlexcount(
            conn,
            key.clone(),
            min.clone(),
            max.clone(),
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_zpopmin(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    count: Option<u64>,
) -> Result<Vec<RedisZSetMember>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::zpopmin(conn, key.clone(), count))
    })
    .await
}

#[tauri::command]
pub async fn redis_zpopmax(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    count: Option<u64>,
) -> Result<Vec<RedisZSetMember>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::zpopmax(conn, key.clone(), count))
    })
    .await
}

#[tauri::command]
pub async fn redis_lindex(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    index: i64,
) -> Result<Option<String>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::lindex(conn, key.clone(), index))
    })
    .await
}

#[tauri::command]
pub async fn redis_lpos(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    element: String,
    rank: Option<i64>,
    count: Option<u64>,
    maxlen: Option<u64>,
) -> Result<Vec<i64>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::lpos(
            conn,
            key.clone(),
            element.clone(),
            rank,
            count,
            maxlen,
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_ltrim(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    start: i64,
    stop: i64,
) -> Result<bool, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::ltrim(conn, key.clone(), start, stop))
    })
    .await
}

#[tauri::command]
pub async fn redis_linsert(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    key: String,
    position: RedisLInsertPosition,
    pivot: String,
    element: String,
) -> Result<i64, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::linsert(
            conn,
            key.clone(),
            position.clone(),
            pivot.clone(),
            element.clone(),
        ))
    })
    .await
}

#[tauri::command]
pub async fn redis_lmove(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    source: String,
    destination: String,
    src_direction: RedisLMoveDirection,
    dst_direction: RedisLMoveDirection,
) -> Result<Option<String>, String> {
    with_redis_retry(&state, id, database.as_deref(), |_, conn| {
        Box::pin(redis::lmove(
            conn,
            source.clone(),
            destination.clone(),
            src_direction.clone(),
            dst_direction.clone(),
        ))
    })
    .await
}

fn clamp_redis_command_logs_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(100).clamp(1, 100)
}

#[tauri::command]
pub async fn list_redis_command_logs(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<RedisCommandLog>, String> {
    let safe_limit = clamp_redis_command_logs_limit(limit);
    let local_db = {
        let lock = state.local_db.lock().await;
        lock.clone()
    };

    if let Some(db) = local_db {
        db.list_redis_command_logs(safe_limit).await
    } else {
        Err("Local DB not initialized".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_key_standalone_with_database() {
        assert_eq!(cache_key(1, Some("db0"), false), "1:db0");
    }

    #[test]
    fn cache_key_standalone_no_database() {
        assert_eq!(cache_key(1, None, false), "1:");
    }

    #[test]
    fn cache_key_cluster_with_database() {
        assert_eq!(cache_key(42, Some("db1"), true), "42:cluster");
    }

    #[test]
    fn cache_key_cluster_no_database() {
        assert_eq!(cache_key(42, None, true), "42:cluster");
    }

    #[test]
    fn cache_key_standalone_custom_db() {
        assert_eq!(cache_key(99, Some("mydb"), false), "99:mydb");
    }

    #[test]
    fn io_error_broken_pipe() {
        assert!(is_io_error("[REDIS_ERROR] broken pipe"));
    }

    #[test]
    fn io_error_connection_reset() {
        assert!(is_io_error("[REDIS_ERROR] connection reset by peer"));
    }

    #[test]
    fn io_error_connection_refused() {
        assert!(is_io_error("[REDIS_ERROR] connection refused"));
    }

    #[test]
    fn io_error_not_redis_error() {
        assert!(!is_io_error("some other error"));
    }

    #[test]
    fn io_error_redis_but_not_io() {
        assert!(!is_io_error("[REDIS_ERROR] ERR wrong number of arguments"));
    }

    #[tokio::test]
    async fn retry_once_retries_redis_io_error() {
        let mut attempts = 0;
        let mut retries = 0;

        let result = retry_once_on_redis_io_error(
            || {
                attempts += 1;
                async move {
                    if attempts == 1 {
                        Err("[REDIS_ERROR] connection reset by peer".to_string())
                    } else {
                        Ok("ok")
                    }
                }
            },
            || {
                retries += 1;
                async {}
            },
        )
        .await;

        assert_eq!(result, Ok("ok"));
        assert_eq!(attempts, 2);
        assert_eq!(retries, 1);
    }

    #[tokio::test]
    async fn retry_once_does_not_retry_non_io_error() {
        let mut attempts = 0;
        let mut retries = 0;

        let result = retry_once_on_redis_io_error(
            || {
                attempts += 1;
                async { Err::<(), _>("[REDIS_ERROR] ERR wrong number of arguments".to_string()) }
            },
            || {
                retries += 1;
                async {}
            },
        )
        .await;

        assert_eq!(
            result,
            Err("[REDIS_ERROR] ERR wrong number of arguments".to_string())
        );
        assert_eq!(attempts, 1);
        assert_eq!(retries, 0);
    }

    #[tokio::test]
    async fn retry_once_returns_second_io_error_without_third_attempt() {
        let mut attempts = 0;
        let mut retries = 0;

        let result = retry_once_on_redis_io_error(
            || {
                attempts += 1;
                async { Err::<(), _>("[REDIS_ERROR] broken pipe".to_string()) }
            },
            || {
                retries += 1;
                async {}
            },
        )
        .await;

        assert_eq!(result, Err("[REDIS_ERROR] broken pipe".to_string()));
        assert_eq!(attempts, 2);
        assert_eq!(retries, 1);
    }

    #[test]
    fn clamp_none_returns_default() {
        assert_eq!(clamp_redis_command_logs_limit(None), 100);
    }

    #[test]
    fn clamp_within_range() {
        assert_eq!(clamp_redis_command_logs_limit(Some(50)), 50);
    }

    #[test]
    fn clamp_below_minimum() {
        assert_eq!(clamp_redis_command_logs_limit(Some(0)), 1);
    }

    #[test]
    fn clamp_above_maximum() {
        assert_eq!(clamp_redis_command_logs_limit(Some(200)), 100);
    }
}

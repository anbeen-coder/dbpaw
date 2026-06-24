use crate::db::drivers::{DatabaseDriver, DriverResult};
use crate::error::AppError;
use crate::models::{
    QueryResult, SchemaOverview, TableDataResponse, TableInfo, TableMetadata, TableStructure,
};
use async_trait::async_trait;
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) struct FakeExportDriver {
    pub(crate) tables: Vec<TableInfo>,
    pub(crate) ddls: HashMap<(String, String), String>,
    pub(crate) rows: HashMap<(String, String), Vec<Value>>,
}

#[async_trait]
impl DatabaseDriver for FakeExportDriver {
    async fn test_connection(&self) -> DriverResult<()> {
        Ok(())
    }

    async fn list_databases(&self) -> DriverResult<Vec<String>> {
        Ok(vec!["db".to_string()])
    }

    async fn list_tables(&self, _schema: Option<String>) -> DriverResult<Vec<TableInfo>> {
        Ok(self.tables.clone())
    }

    async fn get_table_structure(
        &self,
        _schema: String,
        _table: String,
    ) -> DriverResult<TableStructure> {
        Err(AppError::unsupported("not implemented in mock").into())
    }

    async fn get_table_metadata(
        &self,
        schema: String,
        table: String,
    ) -> DriverResult<TableMetadata> {
        let key = (schema, table);
        let has_rows = self.rows.contains_key(&key);
        let columns = if has_rows {
            vec![crate::models::ColumnInfo {
                name: "id".to_string(),
                r#type: "INT".to_string(),
                nullable: false,
                default_value: None,
                primary_key: true,
                comment: None,
                default_constraint_name: None,
            }]
        } else {
            Vec::new()
        };
        Ok(TableMetadata {
            columns,
            indexes: Vec::new(),
            foreign_keys: Vec::new(),
            clickhouse_extra: None,
            cassandra_extra: None,
            special_type_summaries: Vec::new(),
        })
    }

    async fn get_table_ddl(&self, schema: String, table: String) -> DriverResult<String> {
        self.ddls
            .get(&(schema, table))
            .cloned()
            .ok_or_else(|| AppError::not_found("missing ddl"))
    }

    async fn get_table_data(
        &self,
        _schema: String,
        _table: String,
        _page: i64,
        _limit: i64,
        _sort_column: Option<String>,
        _sort_direction: Option<String>,
        _filter: Option<String>,
        _order_by: Option<String>,
        _include_total: bool,
    ) -> DriverResult<TableDataResponse> {
        Err(AppError::unsupported("not implemented in mock").into())
    }

    async fn get_table_data_chunk(
        &self,
        schema: String,
        table: String,
        page: i64,
        limit: i64,
        _sort_column: Option<String>,
        _sort_direction: Option<String>,
        _filter: Option<String>,
        _order_by: Option<String>,
    ) -> DriverResult<TableDataResponse> {
        let key = (schema, table);
        let all_rows = self.rows.get(&key).cloned().unwrap_or_default();
        let offset = ((page.max(1) - 1) * limit.max(1)) as usize;
        let chunk = all_rows
            .into_iter()
            .skip(offset)
            .take(limit.max(1) as usize)
            .collect::<Vec<_>>();
        Ok(TableDataResponse {
            total: Some(
                self.rows
                    .get(&key)
                    .map(|rows| rows.len() as i64)
                    .unwrap_or(0),
            ),
            data: chunk,
            page,
            limit,
            execution_time_ms: 0,
        })
    }

    async fn execute_query(&self, _sql: String) -> DriverResult<QueryResult> {
        Err(AppError::unsupported("not implemented in mock").into())
    }

    async fn get_schema_overview(
        &self,
        _schema: Option<String>,
    ) -> DriverResult<SchemaOverview> {
        Err(AppError::unsupported("not implemented in mock").into())
    }

    async fn close(&self) {}
}

pub(crate) fn tmp_path(suffix: &str) -> PathBuf {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!("dbpaw-transfer-test-{unique}-{suffix}"))
}

pub(crate) fn make_row(pairs: &[(&str, Value)]) -> Value {
    let mut map = serde_json::Map::new();
    for (k, v) in pairs {
        map.insert(k.to_string(), v.clone());
    }
    Value::Object(map)
}

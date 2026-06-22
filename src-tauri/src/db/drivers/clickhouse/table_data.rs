use super::super::DriverResult;
use super::ClickHouseDriver;
use super::helpers::{quote_ident, required_i64_from_json_row, table_ref};
use crate::error::AppError;
use crate::models::TableDataResponse;
use serde_json::Value;

impl ClickHouseDriver {
    pub async fn get_table_data(
        &self,
        schema: String,
        table: String,
        page: i64,
        limit: i64,
        sort_column: Option<String>,
        sort_direction: Option<String>,
        filter: Option<String>,
        order_by: Option<String>,
        include_total: bool,
    ) -> DriverResult<TableDataResponse> {
        let start = std::time::Instant::now();

        let target_schema = if schema.trim().is_empty() {
            self.database.clone()
        } else {
            schema
        };
        let safe_page = page.max(1);
        let safe_limit = limit.clamp(1, 10_000);
        let offset = (safe_page - 1) * safe_limit;
        let qualified = table_ref(&target_schema, &table);

        let filter = filter.map(|f| super::super::normalize_quotes(&f));
        let order_by = order_by.map(|f| super::super::normalize_quotes(&f));

        let where_clause = match &filter {
            Some(f) if !f.trim().is_empty() => format!(" WHERE {}", f.trim()),
            _ => String::new(),
        };

        let total = if include_total {
            Some(if where_clause.is_empty() {
                match self.estimate_total_rows(&target_schema, &table).await? {
                    Some(estimated) => estimated,
                    None => {
                        let count_sql = format!(
                            "SELECT count() AS total FROM {}{} FORMAT JSON",
                            qualified, where_clause
                        );
                        let count_resp = self.execute_json(&count_sql, None).await?;
                        required_i64_from_json_row(count_resp.data.first(), "total", &count_sql)?
                    }
                }
            } else {
                let count_sql = format!(
                    "SELECT count() AS total FROM {}{} FORMAT JSON",
                    qualified, where_clause
                );
                let count_resp = self.execute_json(&count_sql, None).await?;
                required_i64_from_json_row(count_resp.data.first(), "total", &count_sql)?
            })
        } else {
            None
        };

        let order_clause = if let Some(ref ob) = order_by {
            if ob.trim().is_empty() {
                String::new()
            } else {
                format!(" ORDER BY {}", ob.trim())
            }
        } else if let Some(ref col) = sort_column {
            if !col.chars().all(|c| c.is_alphanumeric() || c == '_') {
                return Err(AppError::validation("Invalid sort column name"));
            }
            let dir = match sort_direction.as_deref() {
                Some("desc") => "DESC",
                _ => "ASC",
            };
            format!(" ORDER BY {} {}", quote_ident(col), dir)
        } else {
            String::new()
        };

        let sql = format!(
            "SELECT * FROM {}{}{} LIMIT {} OFFSET {} FORMAT JSON",
            qualified, where_clause, order_clause, safe_limit, offset
        );
        let resp = self.execute_json(&sql, None).await?;

        let mut rows = Vec::new();
        for row in resp.data {
            match row {
                Value::Object(_) => rows.push(row),
                other => {
                    let mut obj = serde_json::Map::new();
                    obj.insert("value".to_string(), other);
                    rows.push(Value::Object(obj));
                }
            }
        }

        let duration = start.elapsed();
        Ok(TableDataResponse {
            data: rows,
            total,
            page: safe_page,
            limit: safe_limit,
            execution_time_ms: duration.as_millis() as i64,
        })
    }

    pub async fn get_table_data_chunk(
        &self,
        schema: String,
        table: String,
        page: i64,
        limit: i64,
        sort_column: Option<String>,
        sort_direction: Option<String>,
        filter: Option<String>,
        order_by: Option<String>,
    ) -> DriverResult<TableDataResponse> {
        self.get_table_data(
            schema,
            table,
            page,
            limit,
            sort_column,
            sort_direction,
            filter,
            order_by,
            true,
        )
        .await
    }
}

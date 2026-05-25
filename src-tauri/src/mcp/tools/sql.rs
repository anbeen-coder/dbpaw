use super::super::sql_safety::{SqlSafetyConfig, SqlSafetyCheck, check_sql_safety};
use super::super::types::*;
use crate::state::AppState;
use serde_json::Value;

pub fn get_definitions() -> Vec<ToolDefinition> {
    vec![ToolDefinition {
        name: "dbpaw_execute_query".to_string(),
        description: "Execute a SQL query on a relational database (PostgreSQL, MySQL, SQLite, SQL Server, ClickHouse, DuckDB, Oracle)".to_string(),
        input_schema: serde_json::json!({
            "type": "object",
            "properties": {
                "connection_id": {
                    "type": "integer",
                    "description": "Connection ID"
                },
                "database": {
                    "type": "string",
                    "description": "Database name (optional, uses connection default)"
                },
                "sql": {
                    "type": "string",
                    "description": "SQL query to execute"
                }
            },
            "required": ["connection_id", "sql"]
        }),
    }]
}

pub async fn execute_query(state: &AppState, args: Value) -> Result<ToolResult, String> {
    let connection_id = args["connection_id"]
        .as_i64()
        .ok_or("Missing connection_id")?;
    let database = args["database"].as_str().map(|s| s.to_string());
    let sql = args["sql"]
        .as_str()
        .ok_or("Missing sql")?
        .to_string();

    // SQL 安全检查
    let config = SqlSafetyConfig::from_env();
    match check_sql_safety(&sql, &config) {
        SqlSafetyCheck::Allowed => {}
        SqlSafetyCheck::Rejected(reason) => {
            return Ok(ToolResult::error(reason));
        }
    }

    // 执行查询
    let result = crate::commands::execute_with_retry_from_app_state(state, connection_id, database, |driver| {
        let sql = sql.clone();
        async move { driver.execute_query(sql).await }
    })
    .await?;

    // 格式化结果
    if !result.success {
        return Ok(ToolResult::error(
            result.error.unwrap_or_else(|| "Query failed".to_string()),
        ));
    }

    // 截断行数
    let max_rows = config.max_rows;
    let data = if result.data.len() > max_rows {
        &result.data[..max_rows]
    } else {
        &result.data
    };

    // 构建 Markdown 表格
    let mut output = String::new();

    if result.columns.is_empty() {
        output.push_str(&format!("Query executed successfully. {} row(s) affected.\n", result.row_count));
    } else {
        // 表头
        output.push_str("| ");
        for col in &result.columns {
            output.push_str(&col.name);
            output.push_str(" | ");
        }
        output.push('\n');

        // 分隔线
        output.push_str("|");
        for _ in &result.columns {
            output.push_str("---|");
        }
        output.push('\n');

        // 数据行
        for row in data {
            output.push_str("| ");
            for col in &result.columns {
                let value = row.get(&col.name).map(|v| format_value(v)).unwrap_or_else(|| "NULL".to_string());
                output.push_str(&value);
                output.push_str(" | ");
            }
            output.push('\n');
        }

        output.push_str(&format!("\n{} row(s)", result.row_count));
        if result.data.len() > max_rows {
            output.push_str(&format!(" (truncated to {})", max_rows));
        }
    }

    Ok(ToolResult::text(output))
}

fn format_value(v: &Value) -> String {
    match v {
        Value::Null => "NULL".to_string(),
        Value::String(s) => {
            if s.len() > 100 {
                format!("{}...", &s[..97])
            } else {
                s.clone()
            }
        }
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Array(_) => "[array]".to_string(),
        Value::Object(_) => "{object}".to_string(),
    }
}

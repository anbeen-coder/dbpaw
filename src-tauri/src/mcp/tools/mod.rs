mod connection;
mod schema;
mod sql;

use super::types::*;
use crate::state::AppState;
use serde_json::Value;

pub fn get_tool_definitions() -> Vec<ToolDefinition> {
    let mut tools = Vec::new();

    // 连接管理工具
    tools.extend(connection::get_definitions());

    // Schema 工具
    tools.extend(schema::get_definitions());

    // SQL 查询工具
    tools.extend(sql::get_definitions());

    tools
}

pub async fn execute_tool(
    state: &AppState,
    name: &str,
    arguments: Value,
) -> Result<ToolResult, String> {
    match name {
        // 连接管理
        "dbpaw_list_connections" => connection::list_connections(state).await,
        "dbpaw_list_databases" => connection::list_databases(state, arguments).await,
        "dbpaw_list_tables" => connection::list_tables(state, arguments).await,
        "dbpaw_describe_table" => connection::describe_table(state, arguments).await,
        "dbpaw_get_ddl" => connection::get_ddl(state, arguments).await,

        // Schema
        "dbpaw_get_schema_context" => schema::get_schema_context(state, arguments).await,

        // SQL
        "dbpaw_execute_query" => sql::execute_query(state, arguments).await,

        _ => Err(format!("Unknown tool: {}", name)),
    }
}

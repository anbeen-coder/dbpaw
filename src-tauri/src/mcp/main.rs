use dbpaw_lib::mcp::McpServer;
use dbpaw_lib::state::AppState;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 创建 AppState
    let state = Arc::new(AppState::new());

    // 创建并运行 MCP Server
    let mut server = McpServer::new(state);
    server.run().await?;

    Ok(())
}

use super::handler::RequestHandler;
use super::transport::StdioTransport;
use crate::state::AppState;
use std::sync::Arc;

pub struct McpServer {
    handler: RequestHandler,
    transport: StdioTransport,
}

impl McpServer {
    pub fn new(state: Arc<AppState>) -> Self {
        let handler = RequestHandler::new(state);
        let transport = StdioTransport::new();

        Self { handler, transport }
    }

    pub async fn run(&mut self) -> Result<(), String> {
        eprintln!("DbPaw MCP Server started");

        loop {
            match self.transport.receive() {
                Ok(Some(request)) => {
                    let response = self.handler.handle(request).await;
                    if let Some(resp) = response {
                        self.transport.send(&resp)?;
                    }
                }
                Ok(None) => {
                    // EOF
                    break;
                }
                Err(e) => {
                    eprintln!("Error receiving request: {}", e);
                    break;
                }
            }
        }

        eprintln!("DbPaw MCP Server stopped");
        Ok(())
    }
}

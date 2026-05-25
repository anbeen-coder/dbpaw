use super::types::{JsonRpcRequest, JsonRpcResponse};
use std::io::{self, BufRead, Write};

pub struct StdioTransport;

impl StdioTransport {
    pub fn new() -> Self {
        Self
    }

    pub fn receive(&self) -> Result<Option<JsonRpcRequest>, String> {
        let stdin = io::stdin();
        let mut line = String::new();

        match stdin.lock().read_line(&mut line) {
            Ok(0) => Ok(None), // EOF
            Ok(_) => {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    return Ok(None);
                }
                serde_json::from_str(trimmed)
                    .map(Some)
                    .map_err(|e| format!("Parse error: {}", e))
            }
            Err(e) => Err(format!("Read error: {}", e)),
        }
    }

    pub fn send(&self, response: &JsonRpcResponse) -> Result<(), String> {
        let json = serde_json::to_string(response)
            .map_err(|e| format!("Serialize error: {}", e))?;

        let mut stdout = io::stdout();
        stdout
            .write_all(json.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
        stdout
            .write_all(b"\n")
            .map_err(|e| format!("Write error: {}", e))?;
        stdout
            .flush()
            .map_err(|e| format!("Flush error: {}", e))?;

        Ok(())
    }
}

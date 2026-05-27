use crate::models::ConnectionForm;
use serde_json::Value;

/// Maps DBeaver provider names to DbPaw driver names.
fn map_provider_to_driver(provider: &str) -> Option<&'static str> {
    match provider {
        "postgresql" => Some("postgres"),
        "mysql" => Some("mysql"),
        "mariadb" => Some("mariadb"),
        "tidb" => Some("tidb"),
        "sqlite" => Some("sqlite"),
        "duckdb" => Some("duckdb"),
        "clickhouse" => Some("clickhouse"),
        "sqlserver" => Some("mssql"),
        "oracle" => Some("oracle"),
        "db2" => Some("db2"),
        "redis" => Some("redis"),
        "elasticsearch" => Some("elasticsearch"),
        "mongodb" => Some("mongodb"),
        "cassandra" => Some("cassandra"),
        "starrocks" => Some("starrocks"),
        "doris" => Some("doris"),
        _ => None,
    }
}

/// Parse DBeaver data-sources.json into ConnectionForm list.
/// Returns (parsed_forms, skipped_count).
pub fn parse_dbeaver_json(content: &str) -> Result<(Vec<ConnectionForm>, usize), String> {
    let root: Value =
        serde_json::from_str(content).map_err(|e| format!("DBeaver JSON parse failed: {e}"))?;

    let obj = root
        .as_object()
        .ok_or_else(|| "DBeaver JSON: expected top-level object".to_string())?;

    let mut forms = Vec::new();
    let mut skipped = 0usize;

    for (_key, entry) in obj {
        let provider = entry
            .get("provider")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let driver = match map_provider_to_driver(provider) {
            Some(d) => d.to_string(),
            None => {
                skipped += 1;
                continue;
            }
        };

        let config = entry.get("configuration").unwrap_or(&Value::Null);

        let name = entry
            .get("name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let host = config
            .get("host")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let port = config
            .get("port")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<i64>().ok())
            .or_else(|| config.get("port").and_then(|v| v.as_i64()));

        let database = config
            .get("database")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let username = config
            .get("user")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        forms.push(ConnectionForm {
            driver,
            name,
            host,
            port,
            database,
            username,
            ..Default::default()
        });
    }

    Ok((forms, skipped))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_dbeaver_json_basic() {
        let json = r#"{
            "conn-1": {
                "provider": "postgresql",
                "name": "My PG",
                "configuration": {
                    "host": "localhost",
                    "port": "5432",
                    "database": "mydb",
                    "user": "admin"
                }
            }
        }"#;
        let (forms, skipped) = parse_dbeaver_json(json).unwrap();
        assert_eq!(skipped, 0);
        assert_eq!(forms.len(), 1);
        assert_eq!(forms[0].driver, "postgres");
        assert_eq!(forms[0].name.as_deref(), Some("My PG"));
        assert_eq!(forms[0].host.as_deref(), Some("localhost"));
        assert_eq!(forms[0].port, Some(5432));
    }

    #[test]
    fn test_parse_dbeaver_skips_unsupported() {
        let json = r#"{
            "conn-1": { "provider": "snowflake", "configuration": {} },
            "conn-2": { "provider": "mysql", "configuration": { "host": "db.example.com" } }
        }"#;
        let (forms, skipped) = parse_dbeaver_json(json).unwrap();
        assert_eq!(skipped, 1);
        assert_eq!(forms.len(), 1);
        assert_eq!(forms[0].driver, "mysql");
    }

    #[test]
    fn test_parse_dbeaver_empty_object() {
        let json = r#"{}"#;
        let (forms, skipped) = parse_dbeaver_json(json).unwrap();
        assert_eq!(skipped, 0);
        assert_eq!(forms.len(), 0);
    }
}

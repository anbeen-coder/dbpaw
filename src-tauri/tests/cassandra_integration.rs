#[path = "common/cassandra_context.rs"]
mod cassandra_context;

use dbpaw_lib::db::drivers::cassandra::CassandraDriver;
use dbpaw_lib::db::drivers::DatabaseDriver;
use testcontainers::clients::Cli;

#[tokio::test]
#[ignore]
async fn test_cassandra_connection_and_list_keyspaces() {
    let docker = (!cassandra_context::should_reuse_local_db()).then(Cli::default);
    let (_container, form) = cassandra_context::cassandra_form_from_test_context(docker.as_ref());
    let driver: CassandraDriver =
        cassandra_context::connect_with_retry(|| CassandraDriver::connect(&form)).await;

    driver
        .test_connection()
        .await
        .expect("test_connection failed");

    let keyspaces = driver
        .list_databases()
        .await
        .expect("list_databases failed");
    assert!(!keyspaces.is_empty(), "list_databases returned empty");
    assert!(
        keyspaces.iter().any(|ks| ks == "system"),
        "list_databases should include 'system'"
    );
    assert!(
        keyspaces.iter().any(|ks| ks == "system_schema"),
        "list_databases should include 'system_schema'"
    );

    driver.close().await;
}

#[tokio::test]
#[ignore]
async fn test_cassandra_list_tables_in_system_schema() {
    let docker = (!cassandra_context::should_reuse_local_db()).then(Cli::default);
    let (_container, form) = cassandra_context::cassandra_form_from_test_context(docker.as_ref());
    let driver: CassandraDriver =
        cassandra_context::connect_with_retry(|| CassandraDriver::connect(&form)).await;

    let tables = driver
        .list_tables(Some("system_schema".to_string()))
        .await
        .expect("list_tables failed");
    assert!(
        !tables.is_empty(),
        "list_tables returned empty for system_schema"
    );
    assert!(
        tables.iter().any(|t| t.name == "tables"),
        "system_schema should contain 'tables' table"
    );
    assert!(
        tables.iter().any(|t| t.name == "columns"),
        "system_schema should contain 'columns' table"
    );

    driver.close().await;
}

#[tokio::test]
#[ignore]
async fn test_cassandra_table_structure() {
    let docker = (!cassandra_context::should_reuse_local_db()).then(Cli::default);
    let (_container, form) = cassandra_context::cassandra_form_from_test_context(docker.as_ref());
    let driver: CassandraDriver =
        cassandra_context::connect_with_retry(|| CassandraDriver::connect(&form)).await;

    let structure = driver
        .get_table_structure("system_schema".to_string(), "tables".to_string())
        .await
        .expect("get_table_structure failed");
    assert!(
        structure.columns.iter().any(|c| c.name == "keyspace_name"),
        "system_schema.tables should have 'keyspace_name' column"
    );
    assert!(
        structure.columns.iter().any(|c| c.name == "table_name"),
        "system_schema.tables should have 'table_name' column"
    );

    let ks_col = structure
        .columns
        .iter()
        .find(|c| c.name == "keyspace_name")
        .expect("keyspace_name column should exist");
    assert!(
        ks_col.primary_key,
        "keyspace_name should be a primary key column"
    );

    driver.close().await;
}

#[tokio::test]
#[ignore]
async fn test_cassandra_table_metadata() {
    let docker = (!cassandra_context::should_reuse_local_db()).then(Cli::default);
    let (_container, form) = cassandra_context::cassandra_form_from_test_context(docker.as_ref());
    let driver: CassandraDriver =
        cassandra_context::connect_with_retry(|| CassandraDriver::connect(&form)).await;

    let metadata = driver
        .get_table_metadata("system_schema".to_string(), "tables".to_string())
        .await
        .expect("get_table_metadata failed");
    assert!(
        metadata.columns.iter().any(|c| c.name == "keyspace_name"),
        "metadata should include keyspace_name"
    );
    assert!(
        metadata.cassandra_extra.is_some(),
        "metadata should include cassandra_extra"
    );

    driver.close().await;
}

#[tokio::test]
#[ignore]
async fn test_cassandra_execute_query_select() {
    let docker = (!cassandra_context::should_reuse_local_db()).then(Cli::default);
    let (_container, form) = cassandra_context::cassandra_form_from_test_context(docker.as_ref());
    let driver: CassandraDriver =
        cassandra_context::connect_with_retry(|| CassandraDriver::connect(&form)).await;

    let result = driver
        .execute_query("SELECT keyspace_name FROM system_schema.keyspaces LIMIT 5".to_string())
        .await
        .expect("execute_query failed");
    assert!(result.success, "query should succeed");
    assert!(result.row_count > 0, "should return at least one row");
    assert!(
        result.columns.iter().any(|c| c.name == "keyspace_name"),
        "result should include keyspace_name column"
    );

    driver.close().await;
}

#[tokio::test]
#[ignore]
async fn test_cassandra_create_insert_select_drop() {
    let docker = (!cassandra_context::should_reuse_local_db()).then(Cli::default);
    let (_container, form) = cassandra_context::cassandra_form_from_test_context(docker.as_ref());
    let driver: CassandraDriver =
        cassandra_context::connect_with_retry(|| CassandraDriver::connect(&form)).await;

    let keyspace = "dbpaw_test_ks";
    let table = "dbpaw_test_tbl";

    // Create keyspace
    let _ = driver
        .execute_query(format!("DROP KEYSPACE IF EXISTS {}", keyspace))
        .await;
    driver
        .execute_query(format!(
            "CREATE KEYSPACE {} WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}",
            keyspace
        ))
        .await
        .expect("create keyspace failed");

    // Create table
    driver
        .execute_query(format!(
            "CREATE TABLE {}.{} (id int PRIMARY KEY, name text, score double)",
            keyspace, table
        ))
        .await
        .expect("create table failed");

    // Insert
    driver
        .execute_query(format!(
            "INSERT INTO {}.{} (id, name, score) VALUES (1, 'alice', 95.5)",
            keyspace, table
        ))
        .await
        .expect("insert failed");
    driver
        .execute_query(format!(
            "INSERT INTO {}.{} (id, name, score) VALUES (2, 'bob', 87.0)",
            keyspace, table
        ))
        .await
        .expect("insert failed");

    // Select
    let result = driver
        .execute_query(format!(
            "SELECT id, name, score FROM {}.{} WHERE id = 1",
            keyspace, table
        ))
        .await
        .expect("select failed");
    assert_eq!(result.row_count, 1);
    let row = result.data.first().expect("should have one row");
    assert_eq!(
        row.get("id").expect("id should exist"),
        &serde_json::json!(1)
    );
    assert_eq!(
        row.get("name").expect("name should exist"),
        &serde_json::Value::String("alice".to_string())
    );

    // Select all with ALLOW FILTERING
    let all = driver
        .execute_query(format!(
            "SELECT * FROM {}.{} ALLOW FILTERING",
            keyspace, table
        ))
        .await
        .expect("select all failed");
    assert_eq!(all.row_count, 2);

    // List tables
    let tables = driver
        .list_tables(Some(keyspace.to_string()))
        .await
        .expect("list_tables failed");
    assert!(
        tables.iter().any(|t| t.name == table),
        "list_tables should include our test table"
    );

    // Schema overview
    let overview = driver
        .get_schema_overview(Some(keyspace.to_string()))
        .await
        .expect("get_schema_overview failed");
    assert!(
        overview.tables.iter().any(|t| t.name == table),
        "schema overview should include test table"
    );

    // Cleanup
    let _ = driver
        .execute_query(format!("DROP KEYSPACE IF EXISTS {}", keyspace))
        .await;
    driver.close().await;
}

#[tokio::test]
#[ignore]
async fn test_cassandra_get_table_data() {
    let docker = (!cassandra_context::should_reuse_local_db()).then(Cli::default);
    let (_container, form) = cassandra_context::cassandra_form_from_test_context(docker.as_ref());
    let driver: CassandraDriver =
        cassandra_context::connect_with_retry(|| CassandraDriver::connect(&form)).await;

    let keyspace = "dbpaw_test_grid_ks";
    let table = "dbpaw_test_grid_tbl";

    let _ = driver
        .execute_query(format!("DROP KEYSPACE IF EXISTS {}", keyspace))
        .await;
    driver
        .execute_query(format!(
            "CREATE KEYSPACE {} WITH replication = {{'class': 'SimpleStrategy', 'replication_factor': 1}}",
            keyspace
        ))
        .await
        .expect("create keyspace failed");
    driver
        .execute_query(format!(
            "CREATE TABLE {}.{} (id int PRIMARY KEY, name text, score int)",
            keyspace, table
        ))
        .await
        .expect("create table failed");

    for i in 1..=5 {
        driver
            .execute_query(format!(
                "INSERT INTO {}.{} (id, name, score) VALUES ({}, 'user_{}', {})",
                keyspace,
                table,
                i,
                i,
                i * 10
            ))
            .await
            .expect("insert failed");
    }

    // get_table_data with sort
    let page = driver
        .get_table_data(
            keyspace.to_string(),
            table.to_string(),
            1,
            3,
            Some("score".to_string()),
            Some("desc".to_string()),
            None,
            None,
            true,
        )
        .await
        .expect("get_table_data failed");
    assert_eq!(page.data.len(), 3);
    assert_eq!(
        page.data[0]["name"],
        serde_json::Value::String("user_5".to_string())
    );

    // get_table_data_chunk
    let chunk = driver
        .get_table_data_chunk(
            keyspace.to_string(),
            table.to_string(),
            2,
            2,
            Some("id".to_string()),
            Some("asc".to_string()),
            None,
            None,
        )
        .await
        .expect("get_table_data_chunk failed");
    assert_eq!(chunk.data.len(), 2);
    assert_eq!(chunk.data[0]["id"], serde_json::json!(3));

    let _ = driver
        .execute_query(format!("DROP KEYSPACE IF EXISTS {}", keyspace))
        .await;
    driver.close().await;
}

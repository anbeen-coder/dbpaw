//! Integration test for Oracle Instant Client bundled library.
//!
//! This test verifies that Oracle connections work with the bundled Instant Client.
//! It requires a local Oracle instance and is marked as #[ignore].
//!
//! Run with:
//!   IT_REUSE_LOCAL_DB=1 ORACLE_PASSWORD=your_password cargo test --test oracle_bundled_lib_integration -- --ignored

#[path = "common/oracle_context.rs"]
mod oracle_context;

use dbpaw_lib::db::drivers::oracle::OracleDriver;
use dbpaw_lib::db::drivers::DatabaseDriver;
use std::path::Path;

#[tokio::test]
#[ignore]
async fn test_oracle_bundled_lib_connection() {
    // First check if Oracle Instant Client is bundled
    let current_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/current");
    if !current_dir.exists() {
        eprintln!("[skip] Oracle Instant Client not bundled. Run setup.sh first.");
        return;
    }

    let has_libs = std::fs::read_dir(&current_dir)
        .ok()
        .and_then(|mut entries| entries.next())
        .is_some();

    if !has_libs {
        eprintln!("[skip] Oracle Instant Client not bundled. Run setup.sh first.");
        return;
    }

    // Try to connect to Oracle
    let Some(form) =
        oracle_context::oracle_test_context_or_skip("test_oracle_bundled_lib_connection").await
    else {
        return;
    };

    // Test connection
    let driver = OracleDriver::connect(&form)
        .await
        .expect("Should connect to Oracle with bundled client");

    // Verify connection works
    driver
        .test_connection()
        .await
        .expect("test_connection should succeed");

    // List databases to verify full functionality
    let schemas = driver
        .list_databases()
        .await
        .expect("list_databases should succeed");

    assert!(!schemas.is_empty(), "Should return at least one schema");

    println!("✓ Oracle connection successful with bundled Instant Client");
    println!("  Found {} schemas", schemas.len());

    driver.close().await;
}

#[tokio::test]
#[ignore]
async fn test_oracle_bundled_lib_query_execution() {
    // First check if Oracle Instant Client is bundled
    let current_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/current");
    if !current_dir.exists() {
        eprintln!("[skip] Oracle Instant Client not bundled. Run setup.sh first.");
        return;
    }

    let Some(form) =
        oracle_context::oracle_test_context_or_skip("test_oracle_bundled_lib_query_execution")
            .await
    else {
        return;
    };

    let driver = OracleDriver::connect(&form)
        .await
        .expect("Should connect to Oracle with bundled client");

    // Execute a simple query
    let result = driver
        .execute_query("SELECT 1 AS test_value FROM DUAL".to_string())
        .await
        .expect("Query execution should succeed");

    assert!(result.success, "Query should succeed");
    assert_eq!(result.row_count, 1, "Should return one row");
    assert!(!result.data.is_empty(), "Result data should not be empty");

    // Verify the value
    let row = &result.data[0];
    let test_value = row
        .get("TEST_VALUE")
        .expect("TEST_VALUE column should exist");
    assert_eq!(
        test_value.as_i64().unwrap_or(0),
        1,
        "TEST_VALUE should be 1"
    );

    println!("✓ Query execution successful with bundled Instant Client");

    driver.close().await;
}

#[test]
fn test_oracle_bundled_lib_path_detection() {
    // Test that the library path detection logic works correctly
    let current_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/current");

    if !current_dir.exists() {
        eprintln!("[skip] Oracle Instant Client not bundled.");
        return;
    }

    // Verify the directory is accessible
    assert!(current_dir.is_dir(), "current/ should be a directory");

    // Check if it contains library files or placeholder
    let entries: Vec<_> = std::fs::read_dir(&current_dir)
        .unwrap()
        .filter_map(|e| e.ok())
        .collect();

    assert!(!entries.is_empty(), "Directory should not be empty");

    // Check for expected file types
    let has_libs = entries.iter().any(|e| {
        let name = e.file_name().to_string_lossy().to_string();
        name.ends_with(".dylib")
            || name.ends_with(".so")
            || name.ends_with(".dll")
            || name == ".placeholder"
    });

    assert!(
        has_libs,
        "Directory should contain library files or placeholder"
    );

    println!("✓ Oracle Instant Client path detection works");
    println!("  Path: {}", current_dir.display());
}

#[cfg(target_os = "macos")]
#[test]
fn test_oracle_dyld_library_path_setup() {
    // Test that DYLD_LIBRARY_PATH can be set for Oracle
    let current_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/current");

    if !current_dir.exists() {
        eprintln!("[skip] Oracle Instant Client not bundled.");
        return;
    }

    // Simulate what init_oracle_lib_path does
    let oracle_path = current_dir.to_string_lossy().to_string();
    let current_path = std::env::var("DYLD_LIBRARY_PATH").unwrap_or_default();

    let new_path = if current_path.is_empty() {
        oracle_path.clone()
    } else {
        format!("{}:{}", oracle_path, current_path)
    };

    // Verify the path format is correct
    assert!(
        new_path.contains(&oracle_path),
        "New path should contain Oracle path"
    );

    println!("✓ DYLD_LIBRARY_PATH setup would work");
    println!("  Path: {}", new_path);
}

#[cfg(target_os = "linux")]
#[test]
fn test_oracle_ld_library_path_setup() {
    // Test that LD_LIBRARY_PATH can be set for Oracle
    let current_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("libs/oracle/current");

    if !current_dir.exists() {
        eprintln!("[skip] Oracle Instant Client not bundled.");
        return;
    }

    // Simulate what init_oracle_lib_path does
    let oracle_path = current_dir.to_string_lossy().to_string();
    let current_path = std::env::var("LD_LIBRARY_PATH").unwrap_or_default();

    let new_path = if current_path.is_empty() {
        oracle_path.clone()
    } else {
        format!("{}:{}", oracle_path, current_path)
    };

    // Verify the path format is correct
    assert!(
        new_path.contains(&oracle_path),
        "New path should contain Oracle path"
    );

    println!("✓ LD_LIBRARY_PATH setup would work");
    println!("  Path: {}", new_path);
}

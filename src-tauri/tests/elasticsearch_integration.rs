#[path = "common/elasticsearch_context.rs"]
mod elasticsearch_context;

use dbpaw_lib::datasources::elasticsearch::{build_base_url, ElasticsearchClient};
use serde_json::json;
use std::fs;
use testcontainers::clients::Cli;

fn setup() -> (ElasticsearchClient, String, reqwest::Client) {
    let docker = (!elasticsearch_context::should_reuse_local_db()).then(Cli::default);
    let (_container, form) =
        elasticsearch_context::elasticsearch_form_from_test_context(docker.as_ref());
    let client = ElasticsearchClient::connect(&form).expect("connect client");
    let base_url = build_base_url(&form).expect("base url");
    let http = reqwest::Client::new();
    (client, base_url, http)
}

async fn cleanup_index(http: &reqwest::Client, base_url: &str, index: &str) {
    let _ = http.delete(format!("{base_url}/{index}")).send().await;
}

async fn create_probe_index(
    client: &ElasticsearchClient,
    http: &reqwest::Client,
    base_url: &str,
    index: &str,
) {
    cleanup_index(http, base_url, index).await;
    client
        .create_index(
            index.to_string(),
            Some(json!({
                "mappings": {
                    "properties": {
                        "title": { "type": "text" },
                        "status": { "type": "keyword" },
                        "count": { "type": "integer" }
                    }
                }
            })),
        )
        .await
        .expect("create index");
}

#[tokio::test]
#[ignore]
async fn test_es_connection_and_list_indices() {
    let (client, _base_url, _http) = setup();
    let info = client.test_connection().await.expect("test connection");
    assert!(info.version.is_some(), "version should be present");

    let indices = client.list_indices().await.expect("list indices");
    // Just verify the call succeeds; empty cluster is valid
    let _ = indices;
}

#[tokio::test]
#[ignore]
async fn test_es_index_lifecycle() {
    let (client, base_url, http) = setup();
    let index = "dbpaw_es_lifecycle";

    create_probe_index(&client, &http, &base_url, index).await;

    let indices = client.list_indices().await.expect("list indices");
    assert!(indices.iter().any(|i| i.name == index));

    client.refresh_index(index.to_string()).await.expect("refresh");
    client.close_index(index.to_string()).await.expect("close");
    client.open_index(index.to_string()).await.expect("open");
    client.delete_index(index.to_string()).await.expect("delete");

    let after = client.list_indices().await.expect("list after delete");
    assert!(!after.iter().any(|i| i.name == index));
}

#[tokio::test]
#[ignore]
async fn test_es_document_crud() {
    let (client, base_url, http) = setup();
    let index = "dbpaw_es_crud";

    create_probe_index(&client, &http, &base_url, index).await;

    let upserted = client
        .upsert_document(
            index.to_string(),
            Some("doc1".to_string()),
            json!({"title": "Test", "status": "ok", "count": 1}),
            true,
        )
        .await
        .expect("upsert");
    assert_eq!(upserted.id.as_deref(), Some("doc1"));

    let doc = client
        .get_document(index.to_string(), "doc1".to_string())
        .await
        .expect("get");
    assert!(doc.found);
    assert_eq!(doc.source.unwrap()["status"], "ok");

    let deleted = client
        .delete_document(index.to_string(), "doc1".to_string(), true)
        .await
        .expect("delete");
    assert_eq!(deleted.result.as_deref(), Some("deleted"));

    cleanup_index(&http, &base_url, index).await;
}

#[tokio::test]
#[ignore]
async fn test_es_search_and_aggregations() {
    let (client, base_url, http) = setup();
    let index = "dbpaw_es_search";

    create_probe_index(&client, &http, &base_url, index).await;

    client
        .upsert_document(index.to_string(), Some("1".to_string()), json!({"title": "A", "status": "ok", "count": 10}), true)
        .await
        .expect("doc1");
    client
        .upsert_document(index.to_string(), Some("2".to_string()), json!({"title": "B", "status": "ok", "count": 20}), true)
        .await
        .expect("doc2");
    client
        .upsert_document(index.to_string(), Some("3".to_string()), json!({"title": "C", "status": "error", "count": 5}), true)
        .await
        .expect("doc3");

    let search = client
        .search_documents(index.to_string(), Some("status:ok".to_string()), None, 0, 50)
        .await
        .expect("search");
    assert_eq!(search.total, 2);

    let agg = client
        .search_documents(
            index.to_string(),
            None,
            Some(
                json!({"size": 0, "aggs": {"by_status": {"terms": {"field": "status"}}}})
                    .to_string(),
            ),
            0,
            50,
        )
        .await
        .expect("agg");
    let buckets = &agg.aggregations.unwrap()["by_status"]["buckets"];
    assert!(buckets.as_array().unwrap().len() >= 2);

    cleanup_index(&http, &base_url, index).await;
}

#[tokio::test]
#[ignore]
async fn test_es_mapping_metadata() {
    let (client, base_url, http) = setup();
    let index = "dbpaw_es_mapping";

    create_probe_index(&client, &http, &base_url, index).await;

    let mapping = client
        .get_index_mapping(index.to_string())
        .await
        .expect("mapping");
    assert!(
        mapping.get(index).is_some(),
        "mapping should include test index"
    );

    cleanup_index(&http, &base_url, index).await;
}

#[tokio::test]
#[ignore]
async fn test_es_export_import_cycle() {
    let (client, base_url, http) = setup();
    let source_index = "dbpaw_es_export_src";
    let import_index = "dbpaw_es_export_dst";

    create_probe_index(&client, &http, &base_url, source_index).await;
    client
        .upsert_document(source_index.to_string(), Some("1".to_string()), json!({"title": "Export", "status": "ok", "count": 1}), true)
        .await
        .expect("doc1");
    client
        .upsert_document(source_index.to_string(), Some("2".to_string()), json!({"title": "Export2", "status": "ok", "count": 2}), true)
        .await
        .expect("doc2");

    let export_path = std::env::temp_dir().join(format!(
        "dbpaw-es-export-{}.ndjson",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let exported = client
        .export_documents(
            source_index.to_string(),
            None,
            None,
            export_path.to_string_lossy().to_string(),
            Some(1),
        )
        .await
        .expect("export");
    assert_eq!(exported.documents, 2);

    cleanup_index(&http, &base_url, import_index).await;
    create_probe_index(&client, &http, &base_url, import_index).await;
    let imported = client
        .import_documents(
            import_index.to_string(),
            export_path.to_string_lossy().to_string(),
            Some(1),
            true,
        )
        .await
        .expect("import");
    assert_eq!(imported.successful, 2);
    assert_eq!(imported.failed, 0);

    let _ = fs::remove_file(&export_path);
    cleanup_index(&http, &base_url, source_index).await;
    cleanup_index(&http, &base_url, import_index).await;
}

#[tokio::test]
#[ignore]
async fn test_es_malformed_import_rejects() {
    let (client, base_url, http) = setup();
    let index = "dbpaw_es_malformed";

    create_probe_index(&client, &http, &base_url, index).await;

    let malformed_path = std::env::temp_dir().join("dbpaw-es-malformed.ndjson");
    fs::write(&malformed_path, "{\"delete\":{\"_id\":\"1\"}}\n{}\n")
        .expect("write malformed");
    assert!(client
        .import_documents(
            index.to_string(),
            malformed_path.to_string_lossy().to_string(),
            Some(1000),
            true,
        )
        .await
        .is_err());

    let _ = fs::remove_file(&malformed_path);
    cleanup_index(&http, &base_url, index).await;
}

#[tokio::test]
#[ignore]
async fn test_es_execute_raw() {
    let (client, base_url, http) = setup();
    let index = "dbpaw_es_raw";

    create_probe_index(&client, &http, &base_url, index).await;
    client
        .upsert_document(
            index.to_string(),
            Some("1".to_string()),
            json!({"title": "Raw", "status": "ok", "count": 1}),
            true,
        )
        .await
        .expect("doc");

    let raw = client
        .execute_raw("GET".to_string(), format!("/{index}/_count"), None)
        .await
        .expect("raw");
    assert_eq!(raw.status, 200);
    assert_eq!(raw.json.unwrap()["count"], 1);

    cleanup_index(&http, &base_url, index).await;
}

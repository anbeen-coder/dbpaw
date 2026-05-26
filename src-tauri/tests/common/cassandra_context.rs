mod shared;

use dbpaw_lib::models::ConnectionForm;
use std::time::Duration;
use testcontainers::clients::Cli;
use testcontainers::core::WaitFor;
use testcontainers::{Container, GenericImage, RunnableImage};

pub use shared::{connect_with_retry, should_reuse_local_db};

pub fn cassandra_form_from_test_context<'a>(
    docker: Option<&'a Cli>,
) -> (Option<Container<'a, GenericImage>>, ConnectionForm) {
    if should_reuse_local_db() {
        return (None, cassandra_form_from_local_env());
    }
    shared::ensure_docker_available();

    let docker = docker.expect("docker client is required when IT_REUSE_LOCAL_DB is not enabled");
    let image = GenericImage::new("cassandra", "4.1")
        .with_env_var("CASSANDRA_CLUSTER_NAME", "dbpaw_test")
        .with_wait_for(WaitFor::seconds(30))
        .with_exposed_port(9042);
    let runnable =
        RunnableImage::from(image).with_container_name(shared::unique_container_name("cassandra"));
    let container = docker.run(runnable);
    let port = container.get_host_port_ipv4(9042);

    shared::wait_for_port("127.0.0.1", port, Duration::from_secs(120));

    (
        Some(container),
        ConnectionForm {
            driver: "cassandra".to_string(),
            host: Some("127.0.0.1".to_string()),
            port: Some(i64::from(port)),
            database: Some("system".to_string()),
            ..Default::default()
        },
    )
}

fn cassandra_form_from_local_env() -> ConnectionForm {
    ConnectionForm {
        driver: "cassandra".to_string(),
        host: Some(shared::env_or("CASSANDRA_HOST", "127.0.0.1")),
        port: Some(shared::env_i64("CASSANDRA_PORT", 9042)),
        username: std::env::var("CASSANDRA_USER").ok(),
        password: std::env::var("CASSANDRA_PASSWORD").ok(),
        database: Some(shared::env_or("CASSANDRA_KEYSPACE", "system")),
        ..Default::default()
    }
}

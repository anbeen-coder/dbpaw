mod export_tests;
mod helpers;
mod import_plan_tests;
mod import_tests;

#[test]
fn transfer_module_boundaries_are_explicit() {
    let _ = super::export_service::DEFAULT_CHUNK_SIZE;
    let _ = super::import_types::MAX_IMPORT_STATEMENTS;
    let _ = super::writer::extension_for_format(&super::ExportFormat::Csv);
    let _ = super::sql_writer::quote_ident("id", "postgres");
}

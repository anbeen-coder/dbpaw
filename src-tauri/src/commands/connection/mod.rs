mod create_database;
mod connection_crud;
mod import;

pub use create_database::*;
pub use connection_crud::*;
pub use import::*;

#[macro_export]
macro_rules! connection_commands {
    () => {
        $crate::commands::connection::get_connections,
        $crate::commands::connection::create_connection,
        $crate::commands::connection::update_connection,
        $crate::commands::connection::delete_connection,
        $crate::commands::connection::import_connections,
        $crate::commands::connection::test_connection_ephemeral,
        $crate::commands::connection::list_databases,
        $crate::commands::connection::list_databases_by_id,
        $crate::commands::connection::create_database_by_id,
        $crate::commands::connection::get_mysql_charsets_by_id,
        $crate::commands::connection::get_mysql_collations_by_id,
    };
}

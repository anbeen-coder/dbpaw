const DEFAULT_SELECT_LIMIT: i64 = 1000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatementKind {
    Select,
    ReadOnly,
    Write,
    Dangerous,
    Other,
    Unknown,
}

fn normalize_for_guard(sql: &str) -> &str {
    sql.trim()
}

pub fn classify_statement(sql: &str) -> StatementKind {
    let tokens = collect_top_level_keywords(sql);
    let Some(first) = tokens.first().map(String::as_str) else {
        return StatementKind::Unknown;
    };

    if first == "select" {
        return StatementKind::Select;
    }
    if is_read_only_keyword(first) {
        return StatementKind::ReadOnly;
    }
    if is_write_keyword(first) {
        return StatementKind::Write;
    }
    if is_dangerous_keyword(first) {
        return StatementKind::Dangerous;
    }
    if first != "with" {
        return StatementKind::Other;
    }

    for token in tokens.iter().skip(1) {
        if token == "select" {
            return StatementKind::Select;
        }
        if is_read_only_keyword(token) {
            return StatementKind::ReadOnly;
        }
        if is_write_keyword(token) {
            return StatementKind::Write;
        }
        if is_dangerous_keyword(token) {
            return StatementKind::Dangerous;
        }
    }

    StatementKind::Other
}

fn is_read_only_keyword(keyword: &str) -> bool {
    matches!(
        keyword,
        "show" | "describe" | "explain" | "table" | "values"
    )
}

fn is_write_keyword(keyword: &str) -> bool {
    matches!(
        keyword,
        "insert" | "update" | "delete" | "upsert" | "merge" | "replace"
    )
}

fn is_dangerous_keyword(keyword: &str) -> bool {
    matches!(
        keyword,
        "drop" | "truncate" | "alter" | "create" | "grant" | "revoke"
    )
}

pub fn is_single_statement(sql: &str) -> bool {
    let bytes = sql.as_bytes();
    let mut i = 0;
    let mut depth = 0_i32;

    while i < bytes.len() {
        let b = bytes[i];
        if i + 1 < bytes.len() && b == b'-' && bytes[i + 1] == b'-' {
            i = crate::db::drivers::skip_line_comment(bytes, i);
            continue;
        }
        if i + 1 < bytes.len() && b == b'/' && bytes[i + 1] == b'*' {
            i = crate::db::drivers::skip_block_comment(bytes, i);
            continue;
        }
        if b == b'\'' {
            i = crate::db::drivers::skip_single_quote(bytes, i);
            continue;
        }
        if b == b'"' {
            i = crate::db::drivers::skip_double_quote(bytes, i);
            continue;
        }
        if b == b'`' {
            i = crate::db::drivers::skip_backtick_quote(bytes, i);
            continue;
        }
        if b == b'$' {
            let next = crate::db::drivers::skip_dollar_quote(bytes, i);
            if next != i + 1 {
                i = next;
                continue;
            }
        }
        if b == b'(' {
            depth += 1;
            i += 1;
            continue;
        }
        if b == b')' {
            depth -= 1;
            if depth < 0 {
                return false;
            }
            i += 1;
            continue;
        }
        if b == b';' && depth == 0 {
            i += 1;

            while i < bytes.len() {
                let c = bytes[i];
                if c.is_ascii_whitespace() || c == b';' {
                    i += 1;
                    continue;
                }
                if i + 1 < bytes.len() && c == b'-' && bytes[i + 1] == b'-' {
                    i = crate::db::drivers::skip_line_comment(bytes, i);
                    continue;
                }
                if i + 1 < bytes.len() && c == b'/' && bytes[i + 1] == b'*' {
                    i = crate::db::drivers::skip_block_comment(bytes, i);
                    continue;
                }
                return false;
            }
            return true;
        }
        i += 1;
    }

    depth == 0
}

pub(crate) fn collect_top_level_keywords(sql: &str) -> Vec<String> {
    let bytes = sql.as_bytes();
    let mut i = 0;
    let mut depth = 0_i32;
    let mut out = Vec::new();

    while i < bytes.len() {
        let b = bytes[i];
        if i + 1 < bytes.len() && b == b'-' && bytes[i + 1] == b'-' {
            i = crate::db::drivers::skip_line_comment(bytes, i);
            continue;
        }
        if i + 1 < bytes.len() && b == b'/' && bytes[i + 1] == b'*' {
            i = crate::db::drivers::skip_block_comment(bytes, i);
            continue;
        }
        if b == b'\'' {
            i = crate::db::drivers::skip_single_quote(bytes, i);
            continue;
        }
        if b == b'"' {
            i = crate::db::drivers::skip_double_quote(bytes, i);
            continue;
        }
        if b == b'`' {
            i = crate::db::drivers::skip_backtick_quote(bytes, i);
            continue;
        }
        if b == b'$' {
            let next = crate::db::drivers::skip_dollar_quote(bytes, i);
            if next != i + 1 {
                i = next;
                continue;
            }
        }
        if b == b'(' {
            depth += 1;
            i += 1;
            continue;
        }
        if b == b')' {
            depth = (depth - 1).max(0);
            i += 1;
            continue;
        }
        if depth == 0 && (b.is_ascii_alphabetic() || b == b'_') {
            let start = i;
            i += 1;
            while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
                i += 1;
            }
            out.push(sql[start..i].to_ascii_lowercase());
            continue;
        }
        i += 1;
    }

    out
}

fn has_top_level_limit(sql: &str) -> bool {
    fn is_reserved_after_limit(word: &str) -> bool {
        matches!(
            word,
            "from"
                | "where"
                | "group"
                | "having"
                | "order"
                | "union"
                | "intersect"
                | "except"
                | "join"
                | "left"
                | "right"
                | "inner"
                | "outer"
                | "cross"
                | "on"
                | "as"
                | "asc"
                | "desc"
                | "limit"
                | "offset"
                | "fetch"
        )
    }

    fn next_non_comment_token(bytes: &[u8], mut i: usize) -> Option<(bool, String)> {
        while i < bytes.len() {
            let b = bytes[i];
            if b.is_ascii_whitespace() {
                i += 1;
                continue;
            }
            if i + 1 < bytes.len() && b == b'-' && bytes[i + 1] == b'-' {
                i = crate::db::drivers::skip_line_comment(bytes, i);
                continue;
            }
            if i + 1 < bytes.len() && b == b'/' && bytes[i + 1] == b'*' {
                i = crate::db::drivers::skip_block_comment(bytes, i);
                continue;
            }

            if b.is_ascii_alphabetic() || b == b'_' {
                let start = i;
                i += 1;
                while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
                    i += 1;
                }
                return Some((
                    true,
                    String::from_utf8_lossy(&bytes[start..i]).to_ascii_lowercase(),
                ));
            }

            if b.is_ascii_digit() {
                let start = i;
                i += 1;
                while i < bytes.len() && (bytes[i].is_ascii_digit() || bytes[i] == b'.') {
                    i += 1;
                }
                return Some((false, String::from_utf8_lossy(&bytes[start..i]).to_string()));
            }

            return Some((false, (b as char).to_string()));
        }

        None
    }

    let bytes = sql.as_bytes();
    let mut i = 0;
    let mut depth = 0_i32;

    while i < bytes.len() {
        let b = bytes[i];
        if i + 1 < bytes.len() && b == b'-' && bytes[i + 1] == b'-' {
            i = crate::db::drivers::skip_line_comment(bytes, i);
            continue;
        }
        if i + 1 < bytes.len() && b == b'/' && bytes[i + 1] == b'*' {
            i = crate::db::drivers::skip_block_comment(bytes, i);
            continue;
        }
        if b == b'\'' {
            i = crate::db::drivers::skip_single_quote(bytes, i);
            continue;
        }
        if b == b'"' {
            i = crate::db::drivers::skip_double_quote(bytes, i);
            continue;
        }
        if b == b'`' {
            i = crate::db::drivers::skip_backtick_quote(bytes, i);
            continue;
        }
        if b == b'$' {
            let next = crate::db::drivers::skip_dollar_quote(bytes, i);
            if next != i + 1 {
                i = next;
                continue;
            }
        }
        if b == b'(' {
            depth += 1;
            i += 1;
            continue;
        }
        if b == b')' {
            depth = (depth - 1).max(0);
            i += 1;
            continue;
        }

        if depth == 0 && (b.is_ascii_alphabetic() || b == b'_') {
            let start = i;
            i += 1;
            while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
                i += 1;
            }

            if sql[start..i].eq_ignore_ascii_case("limit") {
                if let Some((is_word, token)) = next_non_comment_token(bytes, i) {
                    if is_word {
                        if !is_reserved_after_limit(&token) {
                            return true;
                        }
                    } else {
                        let ch = token.as_bytes()[0];
                        if ch.is_ascii_digit()
                            || matches!(ch, b'?' | b':' | b'$' | b'@' | b'(' | b'+' | b'-')
                        {
                            return true;
                        }
                    }
                }
            }
            continue;
        }

        i += 1;
    }

    false
}

fn has_top_level_fetch_first_next_rows_only(sql: &str) -> bool {
    let tokens = collect_top_level_keywords(sql);
    let mut i = 0;
    while i < tokens.len() {
        if tokens[i] == "fetch"
            && i + 1 < tokens.len()
            && (tokens[i + 1] == "first" || tokens[i + 1] == "next")
        {
            let mut j = i + 2;
            while j < tokens.len() {
                if tokens[j] == "only" {
                    return true;
                }
                if tokens[j] == "row" || tokens[j] == "rows" {
                    j += 1;
                    continue;
                }
                if tokens[j] == "offset" || tokens[j] == "limit" {
                    break;
                }
                j += 1;
            }
        }
        i += 1;
    }
    false
}

fn append_limit_1000(sql: &str) -> String {
    let mut trimmed = sql.trim_end();
    let had_semicolon = trimmed.ends_with(';');
    if had_semicolon {
        trimmed = trimmed.trim_end_matches(';').trim_end();
    }

    if had_semicolon {
        format!("{trimmed} LIMIT {DEFAULT_SELECT_LIMIT};")
    } else {
        format!("{trimmed} LIMIT {DEFAULT_SELECT_LIMIT}")
    }
}

fn insert_mssql_top_limit(sql: &str, limit: i64) -> String {
    let bytes = sql.as_bytes();
    let mut i = 0;
    let mut depth = 0_i32;

    while i < bytes.len() {
        let b = bytes[i];
        if i + 1 < bytes.len() && b == b'-' && bytes[i + 1] == b'-' {
            i = crate::db::drivers::skip_line_comment(bytes, i);
            continue;
        }
        if i + 1 < bytes.len() && b == b'/' && bytes[i + 1] == b'*' {
            i = crate::db::drivers::skip_block_comment(bytes, i);
            continue;
        }
        if b == b'\'' {
            i = crate::db::drivers::skip_single_quote(bytes, i);
            continue;
        }
        if b == b'"' {
            i = crate::db::drivers::skip_double_quote(bytes, i);
            continue;
        }
        if b == b'`' {
            i = crate::db::drivers::skip_backtick_quote(bytes, i);
            continue;
        }
        if b == b'$' {
            let next = crate::db::drivers::skip_dollar_quote(bytes, i);
            if next != i + 1 {
                i = next;
                continue;
            }
        }
        if b == b'(' {
            depth += 1;
            i += 1;
            continue;
        }
        if b == b')' {
            depth = (depth - 1).max(0);
            i += 1;
            continue;
        }
        if depth == 0 && (b.is_ascii_alphabetic() || b == b'_') {
            let start = i;
            i += 1;
            while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
                i += 1;
            }
            let word = &sql[start..i];
            if word.eq_ignore_ascii_case("select") {
                let insert_pos = i;
                while i < bytes.len() && bytes[i].is_ascii_whitespace() {
                    i += 1;
                }
                return format!("{} TOP ({limit}) {}", &sql[..insert_pos], &sql[i..]);
            }
            continue;
        }
        i += 1;
    }

    format!("SELECT TOP ({limit}) * FROM ({sql}) AS __limited")
}

fn append_mssql_fetch_1000(sql: &str) -> String {
    let mut trimmed = sql.trim_end();
    let had_semicolon = trimmed.ends_with(';');
    if had_semicolon {
        trimmed = trimmed.trim_end_matches(';').trim_end();
    }
    let has_offset_clause = has_top_level_mssql_offset_clause(trimmed);

    let limited = if has_offset_clause {
        format!("{trimmed} FETCH NEXT {DEFAULT_SELECT_LIMIT} ROWS ONLY")
    } else {
        insert_mssql_top_limit(trimmed, DEFAULT_SELECT_LIMIT)
    };

    if had_semicolon {
        format!("{limited};")
    } else {
        limited
    }
}

fn has_top_level_mssql_offset_clause(sql: &str) -> bool {
    let tokens = collect_top_level_keywords(sql);
    let mut order_by_seen = false;
    let mut i = 0;

    while i < tokens.len() {
        if i + 1 < tokens.len() && tokens[i] == "order" && tokens[i + 1] == "by" {
            order_by_seen = true;
            i += 2;
            continue;
        }

        if order_by_seen
            && i + 1 < tokens.len()
            && tokens[i] == "offset"
            && (tokens[i + 1] == "row" || tokens[i + 1] == "rows")
        {
            return true;
        }

        i += 1;
    }

    false
}

fn has_top_level_mssql_top(sql: &str) -> bool {
    let tokens = collect_top_level_keywords(sql);
    if tokens.first().map(|s| s.as_str()) == Some("select") {
        return tokens.iter().skip(1).take(3).any(|t| t == "top");
    }
    false
}

fn has_top_level_clickhouse_format_clause(sql: &str) -> bool {
    let tokens = collect_top_level_keywords(sql);
    tokens
        .iter()
        .enumerate()
        .any(|(idx, token)| token == "format" && idx + 1 < tokens.len() && idx + 3 >= tokens.len())
}

pub fn apply_default_limit(sql: &str, driver: Option<&str>) -> String {
    let normalized = normalize_for_guard(sql);
    if normalized.is_empty() {
        return sql.to_string();
    }
    if !is_single_statement(normalized) {
        return sql.to_string();
    }
    if classify_statement(normalized) != StatementKind::Select {
        return sql.to_string();
    }
    if has_top_level_limit(normalized) {
        return sql.to_string();
    }
    if has_top_level_fetch_first_next_rows_only(normalized) {
        return sql.to_string();
    }

    if driver
        .map(|d| d.eq_ignore_ascii_case("clickhouse"))
        .unwrap_or(false)
        && has_top_level_clickhouse_format_clause(normalized)
    {
        return sql.to_string();
    }

    if driver
        .map(|d| d.eq_ignore_ascii_case("mssql"))
        .unwrap_or(false)
    {
        if has_top_level_mssql_top(normalized) {
            return sql.to_string();
        }
        return append_mssql_fetch_1000(normalized);
    }

    append_limit_1000(normalized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_limit_to_simple_select() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t", None),
            "SELECT * FROM t LIMIT 1000"
        );
    }

    #[test]
    fn keeps_existing_limit() {
        assert_eq!(
            apply_default_limit("select * from t limit 10", None),
            "select * from t limit 10"
        );
    }

    #[test]
    fn ignores_limit_column_name() {
        assert_eq!(
            apply_default_limit("SELECT limit FROM t", None),
            "SELECT limit FROM t LIMIT 1000"
        );
    }

    #[test]
    fn ignores_limit_alias() {
        assert_eq!(
            apply_default_limit("SELECT a AS limit FROM t", None),
            "SELECT a AS limit FROM t LIMIT 1000"
        );
    }

    #[test]
    fn ignores_limit_identifier_in_where() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t WHERE limit > 10", None),
            "SELECT * FROM t WHERE limit > 10 LIMIT 1000"
        );
    }

    #[test]
    fn keeps_fetch_first_rows_only() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t FETCH FIRST 20 ROWS ONLY", None),
            "SELECT * FROM t FETCH FIRST 20 ROWS ONLY"
        );
    }

    #[test]
    fn supports_leading_comment() {
        assert_eq!(
            apply_default_limit("-- c\nSELECT * FROM t", None),
            "-- c\nSELECT * FROM t LIMIT 1000"
        );
    }

    #[test]
    fn ignores_subquery_limit() {
        assert_eq!(
            apply_default_limit("SELECT * FROM (SELECT * FROM t LIMIT 5) s", None),
            "SELECT * FROM (SELECT * FROM t LIMIT 5) s LIMIT 1000"
        );
    }

    #[test]
    fn preserves_trailing_semicolon() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t;", None),
            "SELECT * FROM t LIMIT 1000;"
        );
    }

    #[test]
    fn skips_multi_statement_sql() {
        assert_eq!(
            apply_default_limit("SELECT 1; SELECT 2;", None),
            "SELECT 1; SELECT 2;"
        );
    }

    #[test]
    fn applies_to_with_select_queries() {
        assert_eq!(
            apply_default_limit("WITH cte AS (SELECT 1) SELECT * FROM cte", None),
            "WITH cte AS (SELECT 1) SELECT * FROM cte LIMIT 1000"
        );
    }

    #[test]
    fn skips_with_non_select_queries() {
        assert_eq!(
            apply_default_limit(
                "WITH cte AS (SELECT 1) INSERT INTO t SELECT * FROM cte",
                None
            ),
            "WITH cte AS (SELECT 1) INSERT INTO t SELECT * FROM cte"
        );
    }

    #[test]
    fn ignores_limit_inside_string_literal() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t WHERE name = 'limit x'", None),
            "SELECT * FROM t WHERE name = 'limit x' LIMIT 1000"
        );
    }

    #[test]
    fn clickhouse_skips_default_limit_when_format_clause_exists() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t FORMAT JSON", Some("clickhouse")),
            "SELECT * FROM t FORMAT JSON"
        );
    }

    #[test]
    fn clickhouse_keeps_default_limit_for_regular_select() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t", Some("clickhouse")),
            "SELECT * FROM t LIMIT 1000"
        );
    }

    #[test]
    fn mssql_adds_top_to_simple_select() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t", Some("mssql")),
            "SELECT TOP (1000) * FROM t"
        );
    }

    #[test]
    fn mssql_adds_top_with_existing_order() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t ORDER BY id DESC", Some("mssql")),
            "SELECT TOP (1000) * FROM t ORDER BY id DESC"
        );
    }

    #[test]
    fn mssql_adds_top_to_cte_select() {
        assert_eq!(
            apply_default_limit("WITH cte AS (SELECT 1) SELECT * FROM cte", Some("mssql")),
            "WITH cte AS (SELECT 1) SELECT TOP (1000) * FROM cte"
        );
    }

    #[test]
    fn mssql_adds_top_to_select_with_semicolon() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t;", Some("mssql")),
            "SELECT TOP (1000) * FROM t;"
        );
    }

    #[test]
    fn mssql_keeps_existing_top() {
        assert_eq!(
            apply_default_limit("SELECT TOP 20 * FROM t", Some("mssql")),
            "SELECT TOP 20 * FROM t"
        );
    }

    #[test]
    fn mssql_adds_fetch_to_existing_offset_clause() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t ORDER BY id OFFSET 10 ROWS", Some("mssql")),
            "SELECT * FROM t ORDER BY id OFFSET 10 ROWS FETCH NEXT 1000 ROWS ONLY"
        );
    }

    #[test]
    fn mssql_adds_fetch_to_existing_offset_clause_with_semicolon() {
        assert_eq!(
            apply_default_limit("SELECT * FROM t ORDER BY id OFFSET 10 ROWS;", Some("mssql")),
            "SELECT * FROM t ORDER BY id OFFSET 10 ROWS FETCH NEXT 1000 ROWS ONLY;"
        );
    }

    #[test]
    fn is_single_statement_handles_comments_and_quotes() {
        assert!(is_single_statement("SELECT 1 -- comment\n"));
        assert!(is_single_statement("SELECT 'a; b'"));
        assert!(is_single_statement("SELECT \"a; b\""));
        assert!(is_single_statement("SELECT `a; b`"));
        assert!(is_single_statement(
            "CREATE FUNCTION f() RETURNS void AS $$ BEGIN PERFORM 1; END; $$ LANGUAGE plpgsql;"
        ));
        assert!(is_single_statement(
            "CREATE FUNCTION f() RETURNS text AS $tag$ BEGIN RETURN ';'; END; $tag$ LANGUAGE plpgsql;"
        ));
        assert!(!is_single_statement("SELECT 1; SELECT 2"));
    }

    #[test]
    fn is_single_statement_handles_nested_parens_and_unbalanced() {
        assert!(is_single_statement("SELECT (SELECT 1)"));
        assert!(!is_single_statement("SELECT (1;"));
        assert!(!is_single_statement("SELECT 1)"));
    }

    #[test]
    fn collect_top_level_keywords_skips_subqueries_and_strings() {
        let tokens =
            collect_top_level_keywords("WITH cte AS (SELECT 'from' AS v) SELECT * FROM cte");
        assert_eq!(tokens.first().map(String::as_str), Some("with"));
        assert!(tokens.contains(&"select".to_string()));
        assert!(tokens.contains(&"from".to_string()));
    }

    #[test]
    fn collect_top_level_keywords_skips_dollar_quoted_bodies() {
        let tokens = collect_top_level_keywords(
            "CREATE FUNCTION f() RETURNS void AS $$ BEGIN SELECT 1; END; $$ LANGUAGE plpgsql",
        );
        assert_eq!(tokens.first().map(String::as_str), Some("create"));
        assert!(tokens.contains(&"function".to_string()));
        assert!(!tokens
            .iter()
            .any(|token| token == "begin" || token == "end"));
    }

    #[test]
    fn classify_statement_classifies_with_queries() {
        assert_eq!(
            classify_statement("WITH c AS (SELECT 1) SELECT * FROM c"),
            StatementKind::Select
        );
        assert_eq!(
            classify_statement("WITH c AS (SELECT 1) UPDATE t SET a = 1"),
            StatementKind::Write
        );
    }
}

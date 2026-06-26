pub(crate) fn strip_trailing_statement_terminator(sql: &str) -> &str {
    let mut out = sql.trim_end();
    while let Some(stripped) = out.strip_suffix(';') {
        out = stripped.trim_end();
    }
    out
}

pub(crate) fn skip_single_quote(bytes: &[u8], mut i: usize) -> usize {
    i += 1;
    while i < bytes.len() {
        if bytes[i] == b'\'' {
            if i + 1 < bytes.len() && bytes[i + 1] == b'\'' {
                i += 2;
                continue;
            }
            return i + 1;
        }
        i += 1;
    }
    i
}

pub(crate) fn skip_double_quote(bytes: &[u8], mut i: usize) -> usize {
    i += 1;
    while i < bytes.len() {
        if bytes[i] == b'"' {
            if i + 1 < bytes.len() && bytes[i + 1] == b'"' {
                i += 2;
                continue;
            }
            return i + 1;
        }
        i += 1;
    }
    i
}

pub(crate) fn skip_backtick_quote(bytes: &[u8], mut i: usize) -> usize {
    i += 1;
    while i < bytes.len() {
        if bytes[i] == b'`' {
            if i + 1 < bytes.len() && bytes[i + 1] == b'`' {
                i += 2;
                continue;
            }
            return i + 1;
        }
        i += 1;
    }
    i
}

pub(crate) fn parse_dollar_quote_tag(bytes: &[u8], start: usize) -> Option<usize> {
    if bytes.get(start) != Some(&b'$') {
        return None;
    }
    let mut i = start + 1;
    while i < bytes.len() && (bytes[i].is_ascii_alphanumeric() || bytes[i] == b'_') {
        i += 1;
    }
    if bytes.get(i) == Some(&b'$') {
        Some(i)
    } else {
        None
    }
}

pub(crate) fn skip_dollar_quote(bytes: &[u8], start: usize) -> usize {
    let Some(tag_end) = parse_dollar_quote_tag(bytes, start) else {
        return start + 1;
    };
    let tag = &bytes[start..=tag_end];
    let tag_len = tag.len();
    let mut i = tag_end + 1;

    while i + tag_len <= bytes.len() {
        if &bytes[i..i + tag_len] == tag {
            return i + tag_len;
        }
        i += 1;
    }

    bytes.len()
}

pub(crate) fn skip_line_comment(bytes: &[u8], mut i: usize) -> usize {
    i += 2;
    while i < bytes.len() && bytes[i] != b'\n' {
        i += 1;
    }
    i
}

pub(crate) fn skip_block_comment(bytes: &[u8], mut i: usize) -> usize {
    i += 2;
    while i + 1 < bytes.len() {
        if bytes[i] == b'*' && bytes[i + 1] == b'/' {
            return i + 2;
        }
        i += 1;
    }
    i
}

pub(crate) fn skip_ignorable_sql_prefix(bytes: &[u8], mut i: usize) -> usize {
    while i < bytes.len() {
        if bytes[i].is_ascii_whitespace() {
            i += 1;
            continue;
        }
        if i + 1 < bytes.len() && bytes[i] == b'-' && bytes[i + 1] == b'-' {
            i = skip_line_comment(bytes, i);
            continue;
        }
        if i + 1 < bytes.len() && bytes[i] == b'/' && bytes[i + 1] == b'*' {
            i = skip_block_comment(bytes, i);
            continue;
        }
        break;
    }
    i
}

/// Check if `bytes[pos..]` starts with the given ASCII keyword (case-insensitive).
/// A keyword match requires the byte after the keyword to NOT be alphanumeric or underscore.
fn matches_keyword(bytes: &[u8], pos: usize, keyword: &[u8]) -> bool {
    let len = keyword.len();
    if pos + len > bytes.len() {
        return false;
    }
    let slice = &bytes[pos..pos + len];
    // Case-insensitive compare for ASCII
    for i in 0..len {
        if slice[i].to_ascii_uppercase() != keyword[i].to_ascii_uppercase() {
            return false;
        }
    }
    // Must be a full word (not part of a longer identifier)
    if pos + len < bytes.len() {
        let next = bytes[pos + len];
        if next.is_ascii_alphanumeric() || next == b'_' {
            return false;
        }
    }
    true
}

/// Skip whitespace and comments, then return the next non-whitespace byte (if any).
fn peek_next_significant_byte(bytes: &[u8], mut i: usize) -> Option<u8> {
    i = skip_ignorable_sql_prefix(bytes, i);
    if i < bytes.len() {
        Some(bytes[i])
    } else {
        None
    }
}

pub(crate) fn split_sql_statements(sql: &str) -> Vec<String> {
    let bytes = sql.as_bytes();
    let mut statements = Vec::new();
    let mut i = 0;
    let mut paren_depth = 0_i32;
    let mut begin_depth = 0_i32;
    let mut start = skip_ignorable_sql_prefix(bytes, 0);

    while i < bytes.len() {
        let b = bytes[i];
        if i + 1 < bytes.len() && b == b'-' && bytes[i + 1] == b'-' {
            i = skip_line_comment(bytes, i);
            continue;
        }
        if i + 1 < bytes.len() && b == b'/' && bytes[i + 1] == b'*' {
            i = skip_block_comment(bytes, i);
            continue;
        }
        if b == b'\'' {
            i = skip_single_quote(bytes, i);
            continue;
        }
        if b == b'"' {
            i = skip_double_quote(bytes, i);
            continue;
        }
        if b == b'`' {
            i = skip_backtick_quote(bytes, i);
            continue;
        }
        if b == b'$' {
            let next = skip_dollar_quote(bytes, i);
            if next != i + 1 {
                i = next;
                continue;
            }
        }
        if b == b'(' {
            paren_depth += 1;
            i += 1;
            continue;
        }
        if b == b')' {
            paren_depth = (paren_depth - 1).max(0);
            i += 1;
            continue;
        }
        // Track BEGIN...END blocks so semicolons inside stored procedures,
        // functions, triggers, and events are not treated as statement separators.
        if (b == b'B' || b == b'b') && matches_keyword(bytes, i, b"BEGIN") {
            // Distinguish compound BEGIN...END from transaction control BEGIN;
            // If the next significant byte after BEGIN is ';', it's a bare
            // transaction starter — skip it.
            if let Some(next) = peek_next_significant_byte(bytes, i + 5) {
                if next != b';' {
                    begin_depth += 1;
                }
            }
            i += 5;
            continue;
        }
        if (b == b'E' || b == b'e') && matches_keyword(bytes, i, b"END") {
            // In MySQL, END IF / END CASE / END LOOP / END REPEAT are compound
            // keywords inside a BEGIN...END block — they should NOT decrement
            // the block depth. Only a standalone END (possibly followed by a
            // label or semicolon) closes the block.
            let after_end = skip_ignorable_sql_prefix(bytes, i + 3);
            let is_compound = after_end < bytes.len()
                && (matches_keyword(bytes, after_end, b"IF")
                    || matches_keyword(bytes, after_end, b"CASE")
                    || matches_keyword(bytes, after_end, b"LOOP")
                    || matches_keyword(bytes, after_end, b"REPEAT")
                    || matches_keyword(bytes, after_end, b"WHILE"));
            if is_compound {
                // Skip past the END keyword; the loop will advance past the
                // following keyword (IF/CASE/…) on the next iterations.
                i += 3;
                continue;
            }
            begin_depth = (begin_depth - 1).max(0);
            i += 3;
            continue;
        }
        if b == b';' && paren_depth == 0 && begin_depth == 0 {
            let stmt = sql[start..i].trim();
            if !stmt.is_empty() {
                statements.push(stmt.to_string());
            }
            start = skip_ignorable_sql_prefix(bytes, i + 1);
        }
        i += 1;
    }

    let tail = sql[start..].trim();
    if !tail.is_empty() {
        statements.push(tail.to_string());
    }

    statements
}

pub(crate) fn first_sql_keyword(sql: &str) -> Option<String> {
    let bytes = sql.as_bytes();
    let start = skip_ignorable_sql_prefix(bytes, 0);
    if start >= bytes.len() {
        return None;
    }
    let mut end = start;
    while end < bytes.len() && (bytes[end].is_ascii_alphanumeric() || bytes[end] == b'_') {
        end += 1;
    }
    if end == start {
        return None;
    }
    Some(sql[start..end].to_ascii_uppercase())
}

/// Normalize macOS smart quotes (U+2018/U+2019/U+201C/U+201D) to ASCII equivalents.
/// WKWebView on macOS inherits the system "Smart Quotes" setting and may
/// automatically replace straight quotes typed by the user.
pub fn normalize_quotes(s: &str) -> String {
    s.replace('\u{2018}', "'")
        .replace('\u{2019}', "'")
        .replace('\u{201C}', "\"")
        .replace('\u{201D}', "\"")
}

#[cfg(test)]
mod tests {
    use super::{first_sql_keyword, split_sql_statements, strip_trailing_statement_terminator};

    #[test]
    fn strip_trailing_statement_terminator_removes_single_semicolon() {
        assert_eq!(strip_trailing_statement_terminator("SELECT 1;"), "SELECT 1");
    }

    #[test]
    fn strip_trailing_statement_terminator_removes_multiple_semicolons_and_spaces() {
        assert_eq!(
            strip_trailing_statement_terminator("SELECT 1;;;   "),
            "SELECT 1"
        );
    }

    #[test]
    fn strip_trailing_statement_terminator_keeps_sql_without_semicolon() {
        assert_eq!(strip_trailing_statement_terminator("SELECT 1"), "SELECT 1");
    }

    #[test]
    fn split_sql_statements_single_statement() {
        let stmts = split_sql_statements("SELECT 1");
        assert_eq!(stmts, vec!["SELECT 1"]);
    }

    #[test]
    fn split_sql_statements_multiple_statements() {
        let stmts = split_sql_statements("INSERT INTO t VALUES (1); INSERT INTO t VALUES (2);");
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "INSERT INTO t VALUES (1)");
        assert_eq!(stmts[1], "INSERT INTO t VALUES (2)");
    }

    #[test]
    fn split_sql_statements_ignores_semicolon_in_string_literal() {
        let stmts = split_sql_statements("SELECT ';'; SELECT 1");
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "SELECT ';'");
        assert_eq!(stmts[1], "SELECT 1");
    }

    #[test]
    fn split_sql_statements_ignores_semicolon_in_double_quotes() {
        let stmts = split_sql_statements("SELECT \";\"; SELECT 1");
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "SELECT \";\"");
    }

    #[test]
    fn split_sql_statements_ignores_semicolon_in_backtick() {
        let stmts = split_sql_statements("SELECT `col;name` FROM t; SELECT 1");
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "SELECT `col;name` FROM t");
    }

    #[test]
    fn split_sql_statements_ignores_semicolon_in_line_comment() {
        let stmts = split_sql_statements("SELECT 1; -- comment;\nSELECT 2");
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "SELECT 1");
        assert_eq!(stmts[1], "SELECT 2");
    }

    #[test]
    fn split_sql_statements_ignores_semicolon_in_block_comment() {
        let stmts = split_sql_statements("SELECT 1 /* ; */ ; SELECT 2");
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "SELECT 1 /* ; */");
        assert_eq!(stmts[1], "SELECT 2");
    }

    #[test]
    fn split_sql_statements_ignores_semicolon_in_parens() {
        let stmts = split_sql_statements("SELECT (1;2); SELECT 1");
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "SELECT (1;2)");
    }

    #[test]
    fn split_sql_statements_skips_leading_whitespace_and_comments() {
        let stmts = split_sql_statements("  -- comment\n  SELECT 1;  SELECT 2");
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "SELECT 1");
        assert_eq!(stmts[1], "SELECT 2");
    }

    #[test]
    fn split_sql_statements_empty_input() {
        let stmts = split_sql_statements("");
        assert!(stmts.is_empty());
    }

    #[test]
    fn split_sql_statements_only_whitespace_and_comments() {
        let stmts = split_sql_statements("  -- just a comment\n  ");
        assert!(stmts.is_empty());
    }

    #[test]
    fn split_sql_statements_trailing_semicolon() {
        let stmts = split_sql_statements("SELECT 1;");
        assert_eq!(stmts, vec!["SELECT 1"]);
    }

    #[test]
    fn split_sql_statements_mysql_insert_values() {
        let sql =
            "INSERT INTO t (id, name) VALUES (1, 'a'); INSERT INTO t (id, name) VALUES (2, 'b')";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 2);
        assert_eq!(stmts[0], "INSERT INTO t (id, name) VALUES (1, 'a')");
        assert_eq!(stmts[1], "INSERT INTO t (id, name) VALUES (2, 'b')");
    }

    #[test]
    fn first_sql_keyword_returns_uppercase() {
        assert_eq!(first_sql_keyword("select 1"), Some("SELECT".to_string()));
        assert_eq!(
            first_sql_keyword("INSERT INTO t"),
            Some("INSERT".to_string())
        );
    }

    #[test]
    fn first_sql_keyword_skips_whitespace() {
        assert_eq!(first_sql_keyword("  SELECT 1"), Some("SELECT".to_string()));
    }

    #[test]
    fn first_sql_keyword_skips_line_comment() {
        assert_eq!(
            first_sql_keyword("-- comment\nSELECT 1"),
            Some("SELECT".to_string())
        );
    }

    #[test]
    fn first_sql_keyword_skips_block_comment() {
        assert_eq!(
            first_sql_keyword("/* comment */ SELECT 1"),
            Some("SELECT".to_string())
        );
    }

    #[test]
    fn first_sql_keyword_empty_input() {
        assert_eq!(first_sql_keyword(""), None);
    }

    #[test]
    fn first_sql_keyword_only_comments() {
        assert_eq!(first_sql_keyword("-- just a comment\n"), None);
    }

    #[test]
    fn split_sql_statements_preserves_begin_end_block() {
        let sql = "CREATE PROCEDURE `sp_test`(IN p_id INT)\nBEGIN\n  SELECT p_id AS given_id;\nEND";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 1, "BEGIN...END block should be kept as one statement");
        assert!(stmts[0].contains("BEGIN"));
        assert!(stmts[0].contains("END"));
    }

    #[test]
    fn split_sql_statements_begin_end_with_multiple_semicolons() {
        let sql = "CREATE PROCEDURE `sp_test`() BEGIN\n  SELECT 1;\n  SELECT 2;\n  SELECT 3;\nEND";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 1);
    }

    #[test]
    fn split_sql_statements_begin_end_case_insensitive() {
        let sql = "create procedure `sp_test`() begin\n  select 1;\nend";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 1);
    }

    #[test]
    fn split_sql_statements_nested_begin_end() {
        let sql = "CREATE PROCEDURE `sp_test`() BEGIN\n  IF TRUE THEN\n    BEGIN\n      SELECT 1;\n    END;\n  END IF;\nEND";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 1);
    }

    #[test]
    fn split_sql_statements_begin_end_followed_by_another_statement() {
        let sql = "CREATE PROCEDURE `sp_test`() BEGIN\n  SELECT 1;\nEND;\nSELECT 2;";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 2);
        assert!(stmts[0].contains("BEGIN"));
        assert_eq!(stmts[1], "SELECT 2");
    }

    #[test]
    fn split_sql_statements_transaction_begin_not_tracked() {
        // Bare BEGIN; (transaction control) should NOT block semicolons
        let sql = "BEGIN;\nSELECT 1;\nCOMMIT;";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 3);
    }

    #[test]
    fn split_sql_statements_create_function_with_begin_end() {
        let sql = "CREATE FUNCTION `fn_test`() RETURNS INT BEGIN\n  RETURN 42;\nEND";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 1);
    }

    #[test]
    fn split_sql_statements_begin_end_with_parens() {
        let sql = "CREATE PROCEDURE `sp_test`(IN p_id INT)\nBEGIN\n  INSERT INTO t (id) VALUES (p_id);\nEND";
        let stmts = split_sql_statements(sql);
        assert_eq!(stmts.len(), 1);
    }
}

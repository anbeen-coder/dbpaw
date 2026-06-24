use crate::error::AppError;

use super::import_dialects::*;
use super::import_types::{ImportExecutionUnit, PreparedImportPlan};

pub(super) fn prepare_import_plan(
    sql: &str,
    normalized_driver: &str,
) -> Result<PreparedImportPlan, AppError> {
    let units = if normalized_driver == "mssql" {
        let batches = parse_mssql_batches(sql)?;
        batches
            .into_iter()
            .enumerate()
            .map(|(idx, batch)| ImportExecutionUnit {
                preview: build_statement_preview(&batch),
                sql: batch,
                batch_index: idx + 1,
            })
            .collect::<Vec<_>>()
    } else {
        parse_sql_statements(sql, normalized_driver)?
            .into_iter()
            .enumerate()
            .map(|(idx, statement)| ImportExecutionUnit {
                preview: build_statement_preview(&statement),
                sql: statement,
                batch_index: idx + 1,
            })
            .collect::<Vec<_>>()
    };

    let script_managed_transaction = units
        .iter()
        .any(|unit| statement_controls_transaction(&unit.sql, normalized_driver));

    Ok(PreparedImportPlan {
        units,
        script_managed_transaction,
    })
}

fn build_statement_preview(statement: &str) -> String {
    let compact = statement.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut preview = String::new();
    for (idx, ch) in compact.chars().enumerate() {
        if idx >= 160 {
            preview.push_str("...");
            break;
        }
        preview.push(ch);
    }
    if preview.is_empty() {
        "<empty>".to_string()
    } else {
        preview
    }
}

pub(super) fn parse_sql_statements(sql: &str, driver: &str) -> Result<Vec<String>, AppError> {
    let mysql_style_hash_comment = matches!(driver, "mysql" | "mariadb" | "tidb");
    let mysql_style_delimiter = mysql_style_hash_comment;
    let sqlite_style_trigger = driver == "sqlite";
    let oracle_style_block = driver == "oracle";
    let chars: Vec<char> = sql.chars().collect();
    let mut out = Vec::new();
    let mut current = String::new();
    let mut state = SqlScanState::Normal;
    let mut delimiter = ";".to_string();
    let mut delimiter_chars: Vec<char> = vec![';'];
    let mut i = 0usize;

    while i < chars.len() {
        match &state {
            SqlScanState::Normal => {
                if mysql_style_delimiter {
                    if let Some((next_delimiter, next_idx)) =
                        parse_mysql_delimiter_command(&chars, i)
                    {
                        delimiter = next_delimiter;
                        delimiter_chars = delimiter.chars().collect();
                        i = next_idx;
                        continue;
                    }
                }
                if oracle_style_block {
                    if let Some(next_idx) = parse_oracle_slash_terminator(&chars, i) {
                        let (is_block, ready_to_terminate) = oracle_plsql_state(current.trim());
                        if is_block && ready_to_terminate {
                            let statement = current.trim();
                            if !statement.is_empty() {
                                out.push(statement.to_string());
                            }
                            current.clear();
                            i = next_idx;
                            continue;
                        }
                    }
                }

                let ch = chars[i];
                let next = chars.get(i + 1).copied();

                if starts_with_chars(&chars, i, &delimiter_chars) {
                    if sqlite_style_trigger && delimiter == ";" {
                        let (is_trigger, ready_to_terminate) = sqlite_trigger_state(current.trim());
                        if is_trigger && !ready_to_terminate {
                            current.push(ch);
                            i += delimiter_chars.len();
                            continue;
                        }
                    }
                    if oracle_style_block && delimiter == ";" {
                        let (is_block, _) = oracle_plsql_state(current.trim());
                        if is_block {
                            current.push(ch);
                            i += delimiter_chars.len();
                            continue;
                        }
                    }
                    let statement = current.trim();
                    if !statement.is_empty() {
                        out.push(statement.to_string());
                    }
                    current.clear();
                    i += delimiter_chars.len();
                    continue;
                }

                if ch == '-' && next == Some('-') {
                    state = SqlScanState::LineComment;
                    i += 2;
                    continue;
                }
                if mysql_style_hash_comment && ch == '#' {
                    state = SqlScanState::LineComment;
                    i += 1;
                    continue;
                }
                if ch == '/' && next == Some('*') {
                    state = SqlScanState::BlockComment;
                    i += 2;
                    continue;
                }
                if ch == '\'' {
                    current.push(ch);
                    state = SqlScanState::SingleQuoted;
                    i += 1;
                    continue;
                }
                if ch == '"' {
                    current.push(ch);
                    state = SqlScanState::DoubleQuoted;
                    i += 1;
                    continue;
                }
                if ch == '`' {
                    current.push(ch);
                    state = SqlScanState::BacktickQuoted;
                    i += 1;
                    continue;
                }
                if ch == '$' {
                    if let Some((tag, end_idx)) = parse_dollar_quote_tag(&chars, i) {
                        current.push_str(&tag);
                        state = SqlScanState::DollarQuoted(tag);
                        i = end_idx + 1;
                        continue;
                    }
                }
                current.push(ch);
                i += 1;
            }
            SqlScanState::SingleQuoted => {
                let ch = chars[i];
                current.push(ch);
                if ch == '\\' {
                    if let Some(next) = chars.get(i + 1) {
                        current.push(*next);
                        i += 2;
                        continue;
                    }
                }
                if ch == '\'' {
                    if chars.get(i + 1) == Some(&'\'') {
                        current.push('\'');
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::DoubleQuoted => {
                let ch = chars[i];
                current.push(ch);
                if ch == '"' {
                    if chars.get(i + 1) == Some(&'"') {
                        current.push('"');
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::BacktickQuoted => {
                let ch = chars[i];
                current.push(ch);
                if ch == '`' {
                    if chars.get(i + 1) == Some(&'`') {
                        current.push('`');
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::DollarQuoted(tag) => {
                if starts_with_tag(&chars, i, tag) {
                    current.push_str(tag);
                    i += tag.chars().count();
                    state = SqlScanState::Normal;
                    continue;
                }
                current.push(chars[i]);
                i += 1;
            }
            SqlScanState::LineComment => {
                if chars[i] == '\n' {
                    current.push('\n');
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::BlockComment => {
                if chars[i] == '*' && chars.get(i + 1) == Some(&'/') {
                    state = SqlScanState::Normal;
                    i += 2;
                } else {
                    i += 1;
                }
            }
        }
    }

    match state {
        SqlScanState::Normal | SqlScanState::LineComment => {}
        SqlScanState::BlockComment => {
            return Err(AppError::internal("Unterminated block comment in SQL file"));
        }
        SqlScanState::SingleQuoted
        | SqlScanState::DoubleQuoted
        | SqlScanState::BacktickQuoted
        | SqlScanState::DollarQuoted(_) => {
            return Err(AppError::internal(
                "Unterminated string literal in SQL file",
            ));
        }
    }

    let tail = current.trim();
    if !tail.is_empty() {
        out.push(tail.to_string());
    }
    Ok(out)
}

fn parse_dollar_quote_tag(chars: &[char], start: usize) -> Option<(String, usize)> {
    if chars.get(start) != Some(&'$') {
        return None;
    }
    let mut idx = start + 1;
    while idx < chars.len() && (chars[idx].is_ascii_alphanumeric() || chars[idx] == '_') {
        idx += 1;
    }
    if idx < chars.len() && chars[idx] == '$' {
        let tag: String = chars[start..=idx].iter().collect();
        return Some((tag, idx));
    }
    None
}

fn starts_with_tag(chars: &[char], idx: usize, tag: &str) -> bool {
    let tag_chars: Vec<char> = tag.chars().collect();
    if idx + tag_chars.len() > chars.len() {
        return false;
    }
    for (offset, ch) in tag_chars.iter().enumerate() {
        if chars[idx + offset] != *ch {
            return false;
        }
    }
    true
}

pub(super) fn truncate_error_message(message: &str) -> String {
    const MAX_CHARS: usize = 500;
    let mut out = String::new();
    for (idx, ch) in message.chars().enumerate() {
        if idx >= MAX_CHARS {
            out.push_str("...");
            break;
        }
        out.push(ch);
    }
    out
}

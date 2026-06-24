mod mssql;
mod mysql;
mod oracle;
mod sqlite;

pub(super) use mssql::parse_mssql_batches;
pub(super) use mysql::parse_mysql_delimiter_command;
pub(super) use oracle::{oracle_plsql_state, parse_oracle_slash_terminator};
pub(super) use sqlite::sqlite_trigger_state;

#[derive(Debug, Clone)]
pub(super) enum SqlScanState {
    Normal,
    SingleQuoted,
    DoubleQuoted,
    BacktickQuoted,
    DollarQuoted(String),
    LineComment,
    BlockComment,
}

fn leading_sql_tokens(sql: &str, max_tokens: usize) -> Vec<String> {
    let chars: Vec<char> = sql.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0usize;

    while i < chars.len() && tokens.len() < max_tokens {
        let ch = chars[i];
        let next = chars.get(i + 1).copied();

        if ch.is_whitespace() || ch == ';' {
            i += 1;
            continue;
        }

        if ch == '-' && next == Some('-') {
            i += 2;
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            continue;
        }

        if ch == '/' && next == Some('*') {
            i += 2;
            while i + 1 < chars.len() && !(chars[i] == '*' && chars[i + 1] == '/') {
                i += 1;
            }
            if i + 1 < chars.len() {
                i += 2;
            }
            continue;
        }

        if ch.is_ascii_alphabetic() {
            let start = i;
            i += 1;
            while i < chars.len() && (chars[i].is_ascii_alphabetic() || chars[i] == '_') {
                i += 1;
            }
            tokens.push(
                chars[start..i]
                    .iter()
                    .collect::<String>()
                    .to_ascii_lowercase(),
            );
            continue;
        }

        i += 1;
    }

    tokens
}

pub(super) fn statement_controls_transaction(statement: &str, normalized_driver: &str) -> bool {
    let tokens = leading_sql_tokens(statement, 2);
    if tokens.is_empty() {
        return false;
    }

    let first = tokens[0].as_str();
    let second = tokens.get(1).map(|s| s.as_str()).unwrap_or("");

    match first {
        "commit" | "rollback" => true,
        "start" => second == "transaction",
        "begin" => {
            if normalized_driver == "mssql" {
                second == "transaction" || second == "tran"
            } else {
                true
            }
        }
        _ => false,
    }
}

pub(super) fn starts_with_chars(chars: &[char], idx: usize, needle: &[char]) -> bool {
    if idx + needle.len() > chars.len() {
        return false;
    }
    for (offset, ch) in needle.iter().enumerate() {
        if chars[idx + offset] != *ch {
            return false;
        }
    }
    true
}

pub(super) fn starts_with_chars_ignore_ascii_case(chars: &[char], idx: usize, needle: &str) -> bool {
    let mut needle_chars = needle.chars();
    let needle_len = needle.len();
    if idx + needle_len > chars.len() {
        return false;
    }
    for offset in 0..needle_len {
        let needle_ch = match needle_chars.next() {
            Some(c) => c,
            None => return false,
        };
        if !chars[idx + offset].eq_ignore_ascii_case(&needle_ch) {
            return false;
        }
    }
    true
}

pub(super) fn line_start_index(chars: &[char], idx: usize) -> usize {
    let mut start = idx;
    while start > 0 && chars[start - 1] != '\n' {
        start -= 1;
    }
    start
}

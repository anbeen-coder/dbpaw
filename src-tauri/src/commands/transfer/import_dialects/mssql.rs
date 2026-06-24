use super::SqlScanState;
use crate::error::AppError;

fn parse_mssql_go_line_count(line: &str) -> Option<usize> {
    let trimmed = line.trim();
    let prefix = trimmed.get(..2)?;
    if !prefix.eq_ignore_ascii_case("go") {
        return None;
    }
    let rest = trimmed[2..].trim();
    if rest.is_empty() {
        return Some(1);
    }
    if rest.chars().all(|ch| ch.is_ascii_digit()) {
        let count = rest.parse::<usize>().ok()?;
        if count > 0 {
            return Some(count);
        }
    }
    None
}

fn update_mssql_line_state(state: &mut SqlScanState, line: &str) {
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0usize;

    while i < chars.len() {
        match state {
            SqlScanState::Normal => {
                let ch = chars[i];
                let next = chars.get(i + 1).copied();
                if ch == '-' && next == Some('-') {
                    *state = SqlScanState::LineComment;
                    break;
                }
                if ch == '/' && next == Some('*') {
                    *state = SqlScanState::BlockComment;
                    i += 2;
                    continue;
                }
                if ch == '\'' {
                    *state = SqlScanState::SingleQuoted;
                    i += 1;
                    continue;
                }
                if ch == '"' {
                    *state = SqlScanState::DoubleQuoted;
                    i += 1;
                    continue;
                }
                i += 1;
            }
            SqlScanState::SingleQuoted => {
                if chars[i] == '\'' {
                    if chars.get(i + 1) == Some(&'\'') {
                        i += 2;
                        continue;
                    }
                    *state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::DoubleQuoted => {
                if chars[i] == '"' {
                    if chars.get(i + 1) == Some(&'"') {
                        i += 2;
                        continue;
                    }
                    *state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::BlockComment => {
                if chars[i] == '*' && chars.get(i + 1) == Some(&'/') {
                    *state = SqlScanState::Normal;
                    i += 2;
                    continue;
                }
                i += 1;
            }
            SqlScanState::LineComment => {
                break;
            }
            SqlScanState::BacktickQuoted | SqlScanState::DollarQuoted(_) => {
                *state = SqlScanState::Normal;
            }
        }
    }

    if matches!(state, SqlScanState::LineComment) {
        *state = SqlScanState::Normal;
    }
}

pub fn parse_mssql_batches(sql: &str) -> Result<Vec<String>, AppError> {
    let mut out = Vec::new();
    let mut current = String::new();
    let mut state = SqlScanState::Normal;

    for line in sql.split_inclusive('\n') {
        if matches!(state, SqlScanState::Normal) {
            let plain_line = line.trim_end_matches(|ch| ch == '\r' || ch == '\n');
            if let Some(go_count) = parse_mssql_go_line_count(plain_line) {
                let statement = current.trim();
                if !statement.is_empty() {
                    for _ in 0..go_count {
                        out.push(statement.to_string());
                    }
                }
                current.clear();
                continue;
            }
        }

        update_mssql_line_state(&mut state, line);
        current.push_str(line);
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

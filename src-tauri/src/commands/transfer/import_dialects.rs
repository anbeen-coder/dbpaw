use crate::error::AppError;

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

pub(super) fn parse_mssql_batches(sql: &str) -> Result<Vec<String>, AppError> {
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

fn starts_with_chars_ignore_ascii_case(chars: &[char], idx: usize, needle: &str) -> bool {
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

fn line_start_index(chars: &[char], idx: usize) -> usize {
    let mut start = idx;
    while start > 0 && chars[start - 1] != '\n' {
        start -= 1;
    }
    start
}

pub(super) fn parse_mysql_delimiter_command(chars: &[char], idx: usize) -> Option<(String, usize)> {
    let line_start = line_start_index(chars, idx);
    let mut cursor = line_start;
    while cursor < chars.len() && matches!(chars[cursor], ' ' | '\t' | '\r') {
        cursor += 1;
    }
    if cursor != idx {
        return None;
    }

    if !starts_with_chars_ignore_ascii_case(chars, cursor, "DELIMITER") {
        return None;
    }

    let mut after_keyword = cursor + "DELIMITER".len();
    if after_keyword < chars.len() && chars[after_keyword] != ' ' && chars[after_keyword] != '\t' {
        return None;
    }
    while after_keyword < chars.len() && matches!(chars[after_keyword], ' ' | '\t') {
        after_keyword += 1;
    }
    if after_keyword >= chars.len() || matches!(chars[after_keyword], '\n' | '\r') {
        return None;
    }

    let mut line_end = after_keyword;
    while line_end < chars.len() && !matches!(chars[line_end], '\n' | '\r') {
        line_end += 1;
    }

    let delimiter: String = chars[after_keyword..line_end]
        .iter()
        .collect::<String>()
        .trim()
        .to_string();
    if delimiter.is_empty() {
        return None;
    }

    let mut next_idx = line_end;
    if next_idx < chars.len() && chars[next_idx] == '\r' {
        next_idx += 1;
    }
    if next_idx < chars.len() && chars[next_idx] == '\n' {
        next_idx += 1;
    }

    Some((delimiter, next_idx))
}

pub(super) fn sqlite_trigger_state(sql: &str) -> (bool, bool) {
    let chars: Vec<char> = sql.chars().collect();
    let mut state = SqlScanState::Normal;
    let mut i = 0usize;
    let mut tokens = Vec::new();
    let mut trigger_begin_seen = false;
    let mut trigger_block_depth = 0i32;
    let mut case_depth = 0i32;
    let mut last_word: Option<String> = None;

    while i < chars.len() {
        match &state {
            SqlScanState::Normal => {
                let ch = chars[i];
                let next = chars.get(i + 1).copied();
                if ch == '-' && next == Some('-') {
                    state = SqlScanState::LineComment;
                    i += 2;
                    continue;
                }
                if ch == '/' && next == Some('*') {
                    state = SqlScanState::BlockComment;
                    i += 2;
                    continue;
                }
                if ch == '\'' {
                    state = SqlScanState::SingleQuoted;
                    i += 1;
                    continue;
                }
                if ch == '"' {
                    state = SqlScanState::DoubleQuoted;
                    i += 1;
                    continue;
                }
                if ch == '`' {
                    state = SqlScanState::BacktickQuoted;
                    i += 1;
                    continue;
                }
                if ch.is_ascii_alphabetic() || ch == '_' {
                    let start = i;
                    i += 1;
                    while i < chars.len() && (chars[i].is_ascii_alphanumeric() || chars[i] == '_') {
                        i += 1;
                    }
                    let token = chars[start..i]
                        .iter()
                        .collect::<String>()
                        .to_ascii_lowercase();
                    tokens.push(token.clone());

                    if trigger_begin_seen {
                        match token.as_str() {
                            "case" => case_depth += 1,
                            "begin" => trigger_block_depth += 1,
                            "end" => {
                                if case_depth > 0 {
                                    case_depth -= 1;
                                } else if trigger_block_depth > 0 {
                                    trigger_block_depth -= 1;
                                }
                            }
                            _ => {}
                        }
                    } else if token == "begin" {
                        let is_create_trigger = matches!(
                            tokens.as_slice(),
                            [first, second, ..] if first == "create"
                                && (second == "trigger"
                                    || ((second == "temp" || second == "temporary")
                                        && tokens.get(2).map(String::as_str) == Some("trigger")))
                        );
                        if is_create_trigger {
                            trigger_begin_seen = true;
                            trigger_block_depth = 1;
                        }
                    }

                    last_word = Some(token);
                    continue;
                }
                i += 1;
            }
            SqlScanState::SingleQuoted => {
                if chars[i] == '\\' && chars.get(i + 1).is_some() {
                    i += 2;
                    continue;
                }
                if chars[i] == '\'' {
                    if chars.get(i + 1) == Some(&'\'') {
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::DoubleQuoted => {
                if chars[i] == '"' {
                    if chars.get(i + 1) == Some(&'"') {
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::BacktickQuoted => {
                if chars[i] == '`' {
                    if chars.get(i + 1) == Some(&'`') {
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::LineComment => {
                if chars[i] == '\n' {
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
            SqlScanState::DollarQuoted(_) => {
                state = SqlScanState::Normal;
            }
        }
    }

    let is_trigger = trigger_begin_seen;
    let ready_to_terminate = is_trigger
        && trigger_block_depth == 0
        && case_depth == 0
        && last_word.as_deref() == Some("end");
    (is_trigger, ready_to_terminate)
}

pub(super) fn oracle_plsql_state(sql: &str) -> (bool, bool) {
    let chars: Vec<char> = sql.chars().collect();
    let mut state = SqlScanState::Normal;
    let mut i = 0usize;
    let mut tokens = Vec::new();
    let mut block_depth = 0i32;
    let mut case_depth = 0i32;
    let mut last_word: Option<String> = None;
    let mut is_oracle_block = false;

    while i < chars.len() {
        match &state {
            SqlScanState::Normal => {
                let ch = chars[i];
                let next = chars.get(i + 1).copied();
                if ch == '-' && next == Some('-') {
                    state = SqlScanState::LineComment;
                    i += 2;
                    continue;
                }
                if ch == '/' && next == Some('*') {
                    state = SqlScanState::BlockComment;
                    i += 2;
                    continue;
                }
                if ch == '\'' {
                    state = SqlScanState::SingleQuoted;
                    i += 1;
                    continue;
                }
                if ch == '"' {
                    state = SqlScanState::DoubleQuoted;
                    i += 1;
                    continue;
                }
                if ch == '`' {
                    state = SqlScanState::BacktickQuoted;
                    i += 1;
                    continue;
                }
                if ch.is_ascii_alphabetic() || ch == '_' {
                    let start = i;
                    i += 1;
                    while i < chars.len() && (chars[i].is_ascii_alphanumeric() || chars[i] == '_') {
                        i += 1;
                    }
                    let token = chars[start..i]
                        .iter()
                        .collect::<String>()
                        .to_ascii_lowercase();
                    tokens.push(token.clone());

                    if !is_oracle_block {
                        let second = tokens.get(1).map(String::as_str);
                        let third = tokens.get(2).map(String::as_str);
                        let fourth = tokens.get(3).map(String::as_str);
                        is_oracle_block = matches!(
                            tokens.first().map(String::as_str),
                            Some("declare") | Some("begin")
                        ) || (tokens.first().map(String::as_str)
                            == Some("create")
                            && second == Some("or")
                            && third == Some("replace")
                            && matches!(
                                fourth,
                                Some("function")
                                    | Some("procedure")
                                    | Some("trigger")
                                    | Some("package")
                                    | Some("type")
                            ));
                    }

                    if is_oracle_block {
                        match token.as_str() {
                            "case" => case_depth += 1,
                            "begin" => block_depth += 1,
                            "end" => {
                                if case_depth > 0 {
                                    case_depth -= 1;
                                } else if block_depth > 0 {
                                    block_depth -= 1;
                                }
                            }
                            _ => {}
                        }
                    }

                    last_word = Some(token);
                    continue;
                }
                i += 1;
            }
            SqlScanState::SingleQuoted => {
                if chars[i] == '\\' && chars.get(i + 1).is_some() {
                    i += 2;
                    continue;
                }
                if chars[i] == '\'' {
                    if chars.get(i + 1) == Some(&'\'') {
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::DoubleQuoted => {
                if chars[i] == '"' {
                    if chars.get(i + 1) == Some(&'"') {
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::BacktickQuoted => {
                if chars[i] == '`' {
                    if chars.get(i + 1) == Some(&'`') {
                        i += 2;
                        continue;
                    }
                    state = SqlScanState::Normal;
                }
                i += 1;
            }
            SqlScanState::LineComment => {
                if chars[i] == '\n' {
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
            SqlScanState::DollarQuoted(_) => {
                state = SqlScanState::Normal;
            }
        }
    }

    let ready_to_terminate = is_oracle_block
        && block_depth == 0
        && case_depth == 0
        && last_word.as_deref() == Some("end");
    (is_oracle_block, ready_to_terminate)
}

pub(super) fn parse_oracle_slash_terminator(chars: &[char], idx: usize) -> Option<usize> {
    let line_start = line_start_index(chars, idx);
    let mut cursor = line_start;
    while cursor < chars.len() && matches!(chars[cursor], ' ' | '\t' | '\r') {
        cursor += 1;
    }
    if cursor != idx || chars.get(idx) != Some(&'/') {
        return None;
    }

    let mut line_end = idx + 1;
    while line_end < chars.len() && !matches!(chars[line_end], '\n' | '\r') {
        if !matches!(chars[line_end], ' ' | '\t') {
            return None;
        }
        line_end += 1;
    }

    let mut next_idx = line_end;
    if next_idx < chars.len() && chars[next_idx] == '\r' {
        next_idx += 1;
    }
    if next_idx < chars.len() && chars[next_idx] == '\n' {
        next_idx += 1;
    }

    Some(next_idx)
}

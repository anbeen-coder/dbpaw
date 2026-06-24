use super::{SqlScanState, line_start_index};

pub fn oracle_plsql_state(sql: &str) -> (bool, bool) {
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

pub fn parse_oracle_slash_terminator(chars: &[char], idx: usize) -> Option<usize> {
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

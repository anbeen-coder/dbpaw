use super::SqlScanState;

pub fn sqlite_trigger_state(sql: &str) -> (bool, bool) {
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

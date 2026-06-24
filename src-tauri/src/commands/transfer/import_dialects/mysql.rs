use super::{line_start_index, starts_with_chars_ignore_ascii_case};

pub fn parse_mysql_delimiter_command(chars: &[char], idx: usize) -> Option<(String, usize)> {
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

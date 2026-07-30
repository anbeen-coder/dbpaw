use serde::{Deserialize, Serialize};

use crate::db::sql::splitter::{first_sql_keyword, split_sql_statements};
use crate::sql::query_guard::{classify_statement, collect_top_level_keywords, StatementKind};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SqlRisk {
    Read,
    Write,
    Ddl,
    Transaction,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SqlRiskReason {
    WriteStatement,
    MissingWhere,
    SchemaChange,
    TransactionControl,
    UnknownStatement,
    MultipleStatements,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlRiskAnalysis {
    pub risk: SqlRisk,
    pub requires_confirmation: bool,
    pub statement_count: usize,
    pub reasons: Vec<SqlRiskReason>,
}

pub fn analyze_sql_risk(sql: &str) -> SqlRiskAnalysis {
    let statements = split_sql_statements(sql);
    if statements.is_empty() {
        return SqlRiskAnalysis {
            risk: SqlRisk::Unknown,
            requires_confirmation: true,
            statement_count: 0,
            reasons: vec![SqlRiskReason::UnknownStatement],
        };
    }

    let mut risk = SqlRisk::Read;
    let mut reasons = Vec::new();

    for statement in &statements {
        let statement_risk = classify_risk(statement, &mut reasons);
        if risk_rank(statement_risk) > risk_rank(risk) {
            risk = statement_risk;
        }
    }

    if statements.len() > 1 {
        push_reason(&mut reasons, SqlRiskReason::MultipleStatements);
    }

    SqlRiskAnalysis {
        risk,
        requires_confirmation: risk != SqlRisk::Read,
        statement_count: statements.len(),
        reasons,
    }
}

fn classify_risk(statement: &str, reasons: &mut Vec<SqlRiskReason>) -> SqlRisk {
    let keywords = collect_top_level_keywords(statement);
    let is_explain_analyze = keywords.first().map(String::as_str) == Some("explain")
        && keywords.iter().any(|keyword| keyword == "analyze");
    let contains_write = keywords.iter().any(|keyword| {
        matches!(
            keyword.as_str(),
            "insert" | "update" | "delete" | "upsert" | "merge" | "replace"
        )
    });
    if is_explain_analyze && contains_write {
        return classify_write(&keywords, reasons);
    }

    let is_select_into = keywords.iter().any(|keyword| keyword == "select")
        && keywords.iter().any(|keyword| keyword == "into");
    if is_select_into {
        push_reason(reasons, SqlRiskReason::WriteStatement);
        return SqlRisk::Write;
    }

    match classify_statement(statement) {
        StatementKind::Select | StatementKind::ReadOnly => SqlRisk::Read,
        StatementKind::Write => classify_write(&keywords, reasons),
        StatementKind::Dangerous => {
            push_reason(reasons, SqlRiskReason::SchemaChange);
            SqlRisk::Ddl
        }
        StatementKind::Other => {
            if is_transaction_statement(statement) {
                push_reason(reasons, SqlRiskReason::TransactionControl);
                SqlRisk::Transaction
            } else {
                push_reason(reasons, SqlRiskReason::UnknownStatement);
                SqlRisk::Unknown
            }
        }
        StatementKind::Unknown => {
            push_reason(reasons, SqlRiskReason::UnknownStatement);
            SqlRisk::Unknown
        }
    }
}

fn classify_write(keywords: &[String], reasons: &mut Vec<SqlRiskReason>) -> SqlRisk {
    push_reason(reasons, SqlRiskReason::WriteStatement);
    let modifies_existing_rows = keywords
        .iter()
        .any(|keyword| keyword == "update" || keyword == "delete");
    if modifies_existing_rows && !keywords.iter().any(|keyword| keyword == "where") {
        push_reason(reasons, SqlRiskReason::MissingWhere);
    }
    SqlRisk::Write
}

fn is_transaction_statement(statement: &str) -> bool {
    matches!(
        first_sql_keyword(statement).as_deref(),
        Some("BEGIN" | "START" | "COMMIT" | "ROLLBACK" | "SAVEPOINT" | "RELEASE")
    )
}

fn risk_rank(risk: SqlRisk) -> u8 {
    match risk {
        SqlRisk::Read => 0,
        SqlRisk::Transaction => 1,
        SqlRisk::Write => 2,
        SqlRisk::Ddl => 3,
        SqlRisk::Unknown => 4,
    }
}

fn push_reason(reasons: &mut Vec<SqlRiskReason>, reason: SqlRiskReason) {
    if !reasons.contains(&reason) {
        reasons.push(reason);
    }
}

#[cfg(test)]
mod tests {
    use super::{analyze_sql_risk, SqlRisk, SqlRiskReason};

    #[test]
    fn read_queries_do_not_require_confirmation() {
        let analysis = analyze_sql_risk("/* comment */ WITH c AS (SELECT 1) SELECT * FROM c");
        assert_eq!(analysis.risk, SqlRisk::Read);
        assert!(!analysis.requires_confirmation);
        assert_eq!(analysis.statement_count, 1);
        assert!(analysis.reasons.is_empty());
    }

    #[test]
    fn writes_require_confirmation_and_detect_missing_where() {
        let unsafe_update = analyze_sql_risk("UPDATE users SET active = false");
        assert_eq!(unsafe_update.risk, SqlRisk::Write);
        assert!(unsafe_update.requires_confirmation);
        assert!(unsafe_update
            .reasons
            .contains(&SqlRiskReason::WriteStatement));
        assert!(unsafe_update.reasons.contains(&SqlRiskReason::MissingWhere));

        let scoped_delete = analyze_sql_risk("DELETE FROM users WHERE id = 7");
        assert_eq!(scoped_delete.risk, SqlRisk::Write);
        assert!(!scoped_delete.reasons.contains(&SqlRiskReason::MissingWhere));
    }

    #[test]
    fn nested_where_does_not_hide_an_unscoped_write() {
        let analysis = analyze_sql_risk(
            "UPDATE users SET active = (SELECT active FROM defaults WHERE id = 1)",
        );
        assert!(analysis.reasons.contains(&SqlRiskReason::MissingWhere));
    }

    #[test]
    fn multi_statement_uses_the_highest_risk() {
        let analysis = analyze_sql_risk("SELECT 1; DROP TABLE users;");
        assert_eq!(analysis.risk, SqlRisk::Ddl);
        assert_eq!(analysis.statement_count, 2);
        assert!(analysis.reasons.contains(&SqlRiskReason::SchemaChange));
        assert!(analysis
            .reasons
            .contains(&SqlRiskReason::MultipleStatements));
    }

    #[test]
    fn transaction_and_unknown_statements_fail_safe() {
        let transaction = analyze_sql_risk("ROLLBACK");
        assert_eq!(transaction.risk, SqlRisk::Transaction);
        assert!(transaction
            .reasons
            .contains(&SqlRiskReason::TransactionControl));

        let unknown = analyze_sql_risk("VACUUM users");
        assert_eq!(unknown.risk, SqlRisk::Unknown);
        assert!(unknown.requires_confirmation);
        assert!(unknown.reasons.contains(&SqlRiskReason::UnknownStatement));

        let empty = analyze_sql_risk(" -- no statement");
        assert_eq!(empty.risk, SqlRisk::Unknown);
        assert_eq!(empty.statement_count, 0);
    }

    #[test]
    fn explain_analyze_writes_and_select_into_require_confirmation() {
        let explain_write = analyze_sql_risk("EXPLAIN ANALYZE UPDATE users SET active = false");
        assert_eq!(explain_write.risk, SqlRisk::Write);
        assert!(explain_write.reasons.contains(&SqlRiskReason::MissingWhere));

        let explain_only = analyze_sql_risk("EXPLAIN UPDATE users SET active = false");
        assert_eq!(explain_only.risk, SqlRisk::Read);

        let select_into = analyze_sql_risk("SELECT * INTO archived_users FROM users");
        assert_eq!(select_into.risk, SqlRisk::Write);
        assert!(select_into.requires_confirmation);
    }

    #[test]
    fn analysis_serializes_to_the_frontend_contract() {
        let json = serde_json::to_value(analyze_sql_risk("DELETE FROM users"))
            .expect("risk analysis serializes");
        assert_eq!(json["risk"], "write");
        assert_eq!(json["requiresConfirmation"], true);
        assert_eq!(json["statementCount"], 1);
        assert_eq!(json["reasons"][0], "write_statement");
        assert_eq!(json["reasons"][1], "missing_where");
    }
}

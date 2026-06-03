use rusqlite::{params, Connection};
use std::path::PathBuf;
use uuid::Uuid;

/// Determina si un texto candidato a memoria es información relevante o ruido
pub fn should_store_memory(content: &str) -> bool {
    let text = content.trim().to_lowercase();
    if text.is_empty() || text.len() < 10 {
        return false;
    }

    // Lista de palabras basura a omitir
    let garbage_keywords = vec![
        "hola",
        "gracias",
        "ok",
        "adiós",
        "puto",
        "mierda",
        "basura",
        "tonto",
        "estúpido",
        "asistente de mierda",
        "no me sirves",
        "de acuerdo",
        "bien",
    ];

    for word in garbage_keywords {
        if text.contains(word) {
            return false;
        }
    }

    true
}

/// Almacena un resumen de conversación extraído
pub fn store_conversation_summary(
    app_data_dir: PathBuf,
    conversation_id: &str,
    user_id: &str,
    summary: &str,
    problems: Option<&str>,
    context: Option<&str>,
) -> std::result::Result<(), String> {
    let conn = Connection::open(app_data_dir.join("invisibleai.db")).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT OR REPLACE INTO conversation_summaries (id, conversation_id, user_id, summary, detected_problems, useful_context, created_at)
         VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))",
        params![id, conversation_id, user_id, summary, problems, context],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Almacena un feedback/error reportado del asistente
pub fn store_ai_feedback(
    app_data_dir: PathBuf,
    conversation_id: &str,
    issue: &str,
    bad_behavior: &str,
    expected_behavior: &str,
    severity: &str,
) -> std::result::Result<(), String> {
    let conn = Connection::open(app_data_dir.join("invisibleai.db")).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO ai_feedback (id, conversation_id, issue_detected, bad_behavior, expected_behavior, severity, resolved, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, strftime('%s', 'now'), strftime('%s', 'now'))",
        params![id, conversation_id, issue, bad_behavior, expected_behavior, severity],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

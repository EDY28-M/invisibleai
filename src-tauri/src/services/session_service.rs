use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LiveSession {
    pub id: String,
    pub user_id: String,
    pub session_type: String,
    pub title: String,
    pub status: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranscriptSegment {
    pub id: String,
    pub session_id: String,
    pub conversation_id: Option<String>,
    pub source_type: String,
    pub speaker_label: String,
    pub content: String,
    pub start_time_ms: i64,
    pub end_time_ms: i64,
    pub sequence_number: i32,
    pub confidence: f64,
    pub is_final: bool,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionContextSummary {
    pub id: String,
    pub session_id: String,
    pub summary_type: String,
    pub summary: String,
    pub covered_until_sequence: i32,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionEvent {
    pub id: String,
    pub session_id: String,
    pub event_type: String,
    pub description: String,
    pub metadata_json: Option<String>,
    pub created_at: i64,
}

fn get_conn(app_data_dir: PathBuf) -> Result<Connection> {
    Connection::open(app_data_dir.join("invisibleai.db"))
}

/// Recupera una sesión activa o crea una nueva si no hay ninguna.
pub fn create_or_get_active_session(
    app_data_dir: PathBuf,
    user_id: &str,
    session_type: &str,
    title: &str,
) -> std::result::Result<LiveSession, String> {
    let conn = get_conn(app_data_dir).map_err(|e| e.to_string())?;

    // Intentar buscar una sesión activa existente
    let active_sess: Option<LiveSession> = conn.query_row(
        "SELECT id, user_id, session_type, title, status, started_at, ended_at FROM live_sessions WHERE status = 'active' LIMIT 1",
        [],
        |row| {
            let ended: Option<i64> = row.get(6)?;
            Ok(LiveSession {
                id: row.get(0)?,
                user_id: row.get(1)?,
                session_type: row.get(2)?,
                title: row.get(3)?,
                status: row.get(4)?,
                started_at: row.get(5)?,
                ended_at: ended,
            })
        },
    ).ok();

    if let Some(sess) = active_sess {
        return Ok(sess);
    }

    // Si no hay activa, crear una nueva
    let id = Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO live_sessions (id, user_id, session_type, title, status, started_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)",
        params![id, user_id, session_type, title, now, now, now],
    ).map_err(|e| e.to_string())?;

    // Registrar evento de inicio de sesión
    let event_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO session_events (id, session_id, event_type, description, created_at) VALUES (?, ?, 'microphone_started', 'Sesión iniciada automáticamente', ?)",
        params![event_id, id, now],
    ).ok();

    Ok(LiveSession {
        id,
        user_id: user_id.to_string(),
        session_type: session_type.to_string(),
        title: title.to_string(),
        status: "active".to_string(),
        started_at: now,
        ended_at: None,
    })
}

/// Inserta un segmento de transcripción calculando su sequence_number de forma segura
pub fn insert_transcript_segment(
    app_data_dir: PathBuf,
    session_id: &str,
    conversation_id: Option<&str>,
    source_type: &str,
    speaker_label: &str,
    content: &str,
    is_final: bool,
) -> std::result::Result<TranscriptSegment, String> {
    let conn = get_conn(app_data_dir).map_err(|e| e.to_string())?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    // Obtener el siguiente sequence_number
    let next_seq: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM transcript_segments WHERE session_id = ?",
        [session_id],
        |row| row.get(0),
    ).unwrap_or(1);

    let id = Uuid::new_v4().to_string();
    let is_final_int = if is_final { 1 } else { 0 };

    conn.execute(
        "INSERT INTO transcript_segments (id, session_id, conversation_id, source_type, speaker_label, content, sequence_number, is_final, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, session_id, conversation_id, source_type, speaker_label, content, next_seq, is_final_int, now],
    ).map_err(|e| e.to_string())?;

    // Registrar evento
    let event_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO session_events (id, session_id, event_type, description, created_at) VALUES (?, ?, 'transcript_received', ?, ?)",
        params![event_id, session_id, format!("Transcripción recibida de {}: {}", speaker_label, content), now],
    ).ok();

    Ok(TranscriptSegment {
        id,
        session_id: session_id.to_string(),
        conversation_id: conversation_id.map(|s| s.to_string()),
        source_type: source_type.to_string(),
        speaker_label: speaker_label.to_string(),
        content: content.to_string(),
        start_time_ms: 0,
        end_time_ms: 0,
        sequence_number: next_seq,
        confidence: 1.0,
        is_final,
        created_at: now,
    })
}

/// Obtiene los últimos segmentos recientes ordenados cronológicamente
pub fn get_combined_session_timeline(
    app_data_dir: PathBuf,
    session_id: &str,
    limit: i32,
) -> std::result::Result<Vec<TranscriptSegment>, String> {
    let conn = get_conn(app_data_dir).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, session_id, conversation_id, source_type, speaker_label, content, sequence_number, is_final, created_at 
         FROM transcript_segments 
         WHERE session_id = ? AND is_final = 1 
         ORDER BY sequence_number DESC, created_at DESC 
         LIMIT ?"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![session_id, limit], |row| {
            let is_final_int: i32 = row.get(7)?;
            Ok(TranscriptSegment {
                id: row.get(0)?,
                session_id: row.get(1)?,
                conversation_id: row.get(2)?,
                source_type: row.get(3)?,
                speaker_label: row.get(4)?,
                content: row.get(5)?,
                start_time_ms: 0,
                end_time_ms: 0,
                sequence_number: row.get(6)?,
                confidence: 1.0,
                is_final: is_final_int != 0,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(seg) = r {
            list.push(seg);
        }
    }

    // Invertir para devolver orden temporal ascendente
    list.reverse();
    Ok(list)
}

/// Finaliza una sesión activa
pub fn end_active_session(
    app_data_dir: PathBuf,
    session_id: &str,
) -> std::result::Result<(), String> {
    let conn = get_conn(app_data_dir).map_err(|e| e.to_string())?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    conn.execute(
        "UPDATE live_sessions SET status = 'ended', ended_at = ?, updated_at = ? WHERE id = ?",
        params![now, now, session_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

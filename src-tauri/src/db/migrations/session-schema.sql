-- Tabla: Sesiones en Vivo
CREATE TABLE IF NOT EXISTS live_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_type TEXT NOT NULL CHECK(session_type IN ('interview', 'meeting', 'video', 'class', 'work_session', 'unknown')),
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'ended')),
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabla: Fuentes de Audio de la Sesión
CREATE TABLE IF NOT EXISTS audio_sources (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN ('microphone', 'system_audio', 'assistant', 'manual_text')),
    source_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE
);

-- Tabla: Segmentos de Transcripción (Append-Only)
CREATE TABLE IF NOT EXISTS transcript_segments (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    conversation_id TEXT,
    source_type TEXT NOT NULL CHECK(source_type IN ('microphone', 'system_audio', 'assistant', 'manual_text')),
    speaker_label TEXT NOT NULL,
    content TEXT NOT NULL,
    start_time_ms INTEGER DEFAULT 0,
    end_time_ms INTEGER DEFAULT 0,
    sequence_number INTEGER NOT NULL,
    confidence REAL DEFAULT 1.0,
    is_final INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- Tabla: Resúmenes de Contexto de Sesión
CREATE TABLE IF NOT EXISTS session_context_summaries (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    summary_type TEXT NOT NULL CHECK(summary_type IN ('rolling_summary', 'user_microphone_summary', 'system_audio_summary', 'combined_context_summary', 'important_points', 'pending_questions')),
    summary TEXT NOT NULL,
    covered_until_sequence INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE
);

-- Tabla: Eventos de la Sesión
CREATE TABLE IF NOT EXISTS session_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('microphone_started', 'microphone_stopped', 'system_audio_started', 'system_audio_stopped', 'transcript_received', 'assistant_response_generated', 'context_reset', 'error_detected')),
    description TEXT NOT NULL,
    metadata_json TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE
);

-- Crear Índices
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_audio_sources_session ON audio_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_session ON transcript_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_source ON transcript_segments(source_type);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_seq ON transcript_segments(sequence_number);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_created ON transcript_segments(created_at);
CREATE INDEX IF NOT EXISTS idx_session_context_summaries_session ON session_context_summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id);

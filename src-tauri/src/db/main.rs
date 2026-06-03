use tauri_plugin_sql::{Migration, MigrationKind};

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_system_prompts_table",
            sql: include_str!("migrations/system-prompts.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_chat_history_tables",
            sql: include_str!("migrations/chat-history.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_global_memory_tables",
            sql: include_str!("migrations/global-memory.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_assistant_context_and_memory_tables",
            sql: include_str!("migrations/memory-schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_live_session_and_transcript_segment_tables",
            sql: include_str!("migrations/session-schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_profile_templates_modifiers_and_config",
            sql: include_str!("migrations/profile-templates.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

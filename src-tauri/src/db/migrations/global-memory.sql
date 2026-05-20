CREATE TABLE IF NOT EXISTS global_memory_facts (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    fact TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_global_memory_facts_updated_at ON global_memory_facts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_global_memory_conversation_id ON global_memory_facts(conversation_id);

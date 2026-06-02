-- Tabla: Perfil de la IA (Identidad Fija)
CREATE TABLE IF NOT EXISTS ai_profile (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    personality TEXT NOT NULL,
    main_objective TEXT NOT NULL,
    behavior_rules TEXT NOT NULL,
    limitations TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabla: Conocimiento General del Producto
CREATE TABLE IF NOT EXISTS app_knowledge (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    importance INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabla: Funciones de la App (Features)
CREATE TABLE IF NOT EXISTS app_features (
    id TEXT PRIMARY KEY,
    feature_name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'in_development')),
    route TEXT,
    frontend_component TEXT,
    backend_module TEXT,
    user_visible INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabla: Memoria del Usuario (Persistente)
CREATE TABLE IF NOT EXISTS user_memory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 1,
    source_conversation_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabla: Resúmenes de Conversaciones
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    detected_problems TEXT,
    useful_context TEXT,
    created_at INTEGER NOT NULL
);

-- Tabla: Feedback del Asistente (Errores detectados / Correcciones)
CREATE TABLE IF NOT EXISTS ai_feedback (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    issue_detected TEXT NOT NULL,
    bad_behavior TEXT NOT NULL,
    expected_behavior TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high')),
    resolved INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabla: Configuración de Proveedor de IA
CREATE TABLE IF NOT EXISTS ai_provider_config (
    id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    api_base_url TEXT,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    is_active INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Crear Índices de Optimización
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conv ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_resolved ON ai_feedback(resolved);
CREATE INDEX IF NOT EXISTS idx_app_features_status ON app_features(status);
CREATE INDEX IF NOT EXISTS idx_app_knowledge_category ON app_knowledge(category);

-- Insertar Datos Iniciales (Identidad y Conocimiento Base de InvisibleAI)
INSERT OR REPLACE INTO ai_profile (id, name, role, personality, main_objective, behavior_rules, limitations, created_at, updated_at)
VALUES (
    'default',
    'InvisibleAI Assistant',
    'Asistente Inteligente Integrado en la aplicación InvisibleAI',
    'Profesional, conciso, observador, proactivo y contextualizado al entorno del usuario.',
    'Ayudar al usuario proporcionando sugerencias útiles, explicaciones técnicas y resolución de bloqueos basándose en el estado de la aplicación.',
    '- NO respondas como un chatbot genérico desconectado.
- Utiliza siempre la información de la pantalla y la ruta actual del usuario.
- Evita inventar funcionalidades que no estén registradas en el catálogo de características.
- Si cometes un error reportado por el usuario, analízalo usando el registro de feedback y corrige el enfoque.',
    '- No puedes realizar acciones en el sistema operativo del usuario directamente a menos que sea a través de un comando aprobado.
- No conoces información del exterior de la app a menos que se te provea en el contexto de audio o capturas.',
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

INSERT OR REPLACE INTO app_knowledge (id, title, content, category, importance, created_at, updated_at)
VALUES 
(
    'k_what_is',
    '¿Qué es InvisibleAI?',
    'InvisibleAI es un copiloto inteligente de escritorio ultra-rápido y enfocado en la privacidad. Funciona en segundo plano durante reuniones, entrevistas o reproducción de videos de manera invisible.',
    'general',
    5,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'k_stack',
    'Stack Tecnológico de la App',
    'InvisibleAI está construida con un backend robusto en Rust (Tauri), una interfaz fluida en React + TypeScript y almacenamiento en SQLite local.',
    'architecture',
    4,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

INSERT OR REPLACE INTO app_features (id, feature_name, description, status, route, frontend_component, backend_module, user_visible, created_at, updated_at)
VALUES
(
    'feat_chat',
    'Chat con Asistente Contextual',
    'Chat persistente enriquecido con contexto de pantalla actual, historial guardado de SQLite y memoria del usuario.',
    'active',
    '/chat',
    'ChatPage.tsx',
    'api.rs',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'feat_streaming',
    'Streaming STT Multihilo',
    'Captura de audio en tiempo real de micrófono y bocinas por canales separados con Deepgram y Rust.',
    'active',
    '/streaming',
    'useSystemAudio.ts',
    'speaker.rs',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
),
(
    'feat_mem_admin',
    'Panel de Gestión de Memoria',
    'Permite ver, editar y eliminar los recuerdos del usuario, conocimiento del producto y resolver feedback de errores.',
    'active',
    '/memory-admin',
    'MemoryAdminPage.tsx',
    'memory_routes.rs',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

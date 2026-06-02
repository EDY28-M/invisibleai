use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct AiProfile {
    pub name: String,
    pub role: String,
    pub personality: String,
    pub main_objective: String,
    pub behavior_rules: String,
    pub limitations: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppKnowledge {
    pub title: String,
    pub content: String,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppFeature {
    pub feature_name: String,
    pub description: String,
    pub status: String,
    pub route: Option<String>,
    pub frontend_component: Option<String>,
    pub backend_module: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserMemory {
    pub memory_type: String,
    pub content: String,
    pub importance: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationSummary {
    pub summary: String,
    pub detected_problems: Option<String>,
    pub useful_context: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiFeedback {
    pub issue_detected: String,
    pub bad_behavior: String,
    pub expected_behavior: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CurrentScreenContext {
    pub current_screen: String,
    pub current_route: String,
    pub app_version: String,
    pub selected_feature: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiContext {
    pub profile: Option<AiProfile>,
    pub knowledge: Vec<AppKnowledge>,
    pub features: Vec<AppFeature>,
    pub user_memory: Vec<UserMemory>,
    pub summaries: Vec<ConversationSummary>,
    pub feedback: Vec<AiFeedback>,
    pub screen: CurrentScreenContext,
    pub user_message: String,
    pub has_license: bool,
    pub license_expires_at: Option<String>,
    pub session_type: Option<String>,
    pub session_timeline: Vec<crate::services::session_service::TranscriptSegment>,
}

// Función helper para obtener conexión a la base de datos local de SQLite
fn get_db_connection(app_data_dir: PathBuf) -> Result<Connection> {
    let db_path = app_data_dir.join("invisibleai.db");
    Connection::open(db_path)
}

/// Consulta SQLite y consolida el contexto del asistente basado en el estado actual del usuario
pub fn build_ai_context(
    app_data_dir: PathBuf,
    user_id: &str,
    conversation_id: &str,
    session_id: Option<&str>,
    screen_ctx: CurrentScreenContext,
    user_message: &str,
    _intent: &str,
) -> std::result::Result<AiContext, String> {
    let conn = get_db_connection(app_data_dir.clone()).map_err(|e| e.to_string())?;

    // Obtener estado de la licencia de secure_storage.json
    let credentials_path = app_data_dir.join("secure_storage.json");
    let (has_license, license_expires_at) = if credentials_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&credentials_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                let has_lk = json.get("license_key")
                    .and_then(|k| k.as_str())
                    .map_or(false, |k| !k.trim().is_empty());
                let expires_at = json.get("license_expires_at")
                    .and_then(|e| e.as_str())
                    .map(|e| e.to_string());
                (has_lk, expires_at)
            } else {
                (false, None)
            }
        } else {
            (false, None)
        }
    } else {
        (false, None)
    };

    // 1. Obtener Perfil de IA
    let profile = conn.query_row(
        "SELECT name, role, personality, main_objective, behavior_rules, limitations FROM ai_profile WHERE id = 'default'",
        [],
        |row| {
            Ok(AiProfile {
                name: row.get(0)?,
                role: row.get(1)?,
                personality: row.get(2)?,
                main_objective: row.get(3)?,
                behavior_rules: row.get(4)?,
                limitations: row.get(5)?,
            })
        },
    ).ok();

    // 2. Obtener Conocimiento relevante
    let mut stmt = conn
        .prepare("SELECT title, content, category FROM app_knowledge WHERE importance >= 3 ORDER BY importance DESC")
        .map_err(|e| e.to_string())?;
    
    let knowledge_iter = stmt.query_map([], |row| {
        Ok(AppKnowledge {
            title: row.get(0)?,
            content: row.get(1)?,
            category: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut knowledge = Vec::new();
    for k in knowledge_iter {
        if let Ok(item) = k {
            knowledge.push(item);
        }
    }

    // 3. Obtener Features Activas
    let mut stmt = conn
        .prepare("SELECT feature_name, description, status, route, frontend_component, backend_module FROM app_features WHERE status = 'active'")
        .map_err(|e| e.to_string())?;
    
    let features_iter = stmt.query_map([], |row| {
        Ok(AppFeature {
            feature_name: row.get(0)?,
            description: row.get(1)?,
            status: row.get(2)?,
            route: row.get(3)?,
            frontend_component: row.get(4)?,
            backend_module: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut features = Vec::new();
    for f in features_iter {
        if let Ok(item) = f {
            features.push(item);
        }
    }

    // 4. Obtener Memorias de Usuario relevantes
    let mut stmt = conn
        .prepare("SELECT memory_type, content, importance FROM user_memory WHERE user_id = ? ORDER BY importance DESC LIMIT 5")
        .map_err(|e| e.to_string())?;
    
    let user_memory_iter = stmt.query_map([user_id], |row| {
        Ok(UserMemory {
            memory_type: row.get(0)?,
            content: row.get(1)?,
            importance: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut user_memory = Vec::new();
    for m in user_memory_iter {
        if let Ok(item) = m {
            user_memory.push(item);
        }
    }

    // 5. Obtener Resúmenes de Conversaciones previas
    let mut stmt = conn
        .prepare("SELECT summary, detected_problems, useful_context FROM conversation_summaries WHERE conversation_id = ? LIMIT 1")
        .map_err(|e| e.to_string())?;
    
    let summaries_iter = stmt.query_map([conversation_id], |row| {
        Ok(ConversationSummary {
            summary: row.get(0)?,
            detected_problems: row.get(1)?,
            useful_context: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();
    for s in summaries_iter {
        if let Ok(item) = s {
            summaries.push(item);
        }
    }

    // 6. Obtener Errores previos no resueltos (Feedback)
    let mut stmt = conn
        .prepare("SELECT issue_detected, bad_behavior, expected_behavior FROM ai_feedback WHERE resolved = 0 LIMIT 3")
        .map_err(|e| e.to_string())?;
    
    let feedback_iter = stmt.query_map([], |row| {
        Ok(AiFeedback {
            issue_detected: row.get(0)?,
            bad_behavior: row.get(1)?,
            expected_behavior: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut feedback = Vec::new();
    for f in feedback_iter {
        if let Ok(item) = f {
            feedback.push(item);
        }
    }

    // 7. Cargar contexto de la sesión en vivo si está provisto
    let (session_type, session_timeline) = if let Some(sid) = session_id {
        let stype: Option<String> = conn.query_row(
            "SELECT session_type FROM live_sessions WHERE id = ?",
            [sid],
            |row| row.get(0)
        ).ok();

        let timeline = crate::services::session_service::get_combined_session_timeline(
            app_data_dir,
            sid,
            30
        ).unwrap_or_default();

        (stype, timeline)
    } else {
        (None, Vec::new())
    };

    Ok(AiContext {
        profile,
        knowledge,
        features,
        user_memory,
        summaries,
        feedback,
        screen: screen_ctx,
        user_message: user_message.to_string(),
        has_license,
        license_expires_at,
        session_type,
        session_timeline,
    })
}

/// Compone el System Prompt final estructurado que se inyectará en la llamada a la API del modelo LLM
pub fn build_system_prompt(context: AiContext, user_message: &str) -> String {
    let mut prompt = String::new();

    // 1. Identidad y Perfil
    if let Some(prof) = context.profile {
        prompt.push_str(&format!(
            "[IDENTIDAD DEL ASISTENTE]\n\
             Nombre: {}\n\
             Rol: {}\n\
             Objetivo: {}\n\
             Personalidad: {}\n\
             Reglas de Comportamiento:\n{}\n\
             Limitaciones:\n{}\n\n",
            prof.name, prof.role, prof.main_objective, prof.personality, prof.behavior_rules, prof.limitations
        ));
    }

    // 1.5 Licencia y Versión de la Aplicación
    prompt.push_str("[LICENCIA Y VERSIÓN DE INVISIBLEAI]\n");
    if context.has_license {
        prompt.push_str("Estado de la Licencia del Usuario: ACTIVA (Versión PRO / Licencia de Paga)\n");
        if let Some(ref expiry) = context.license_expires_at {
            prompt.push_str(&format!("Fecha de Vencimiento de la Licencia: {}\n", expiry));
        }
    } else {
        prompt.push_str("Estado de la Licencia del Usuario: INACTIVA (Versión FREE / Gratuita)\n");
        if let Some(ref expiry) = context.license_expires_at {
            prompt.push_str(&format!("Nota: El usuario tuvo una licencia previamente que venció o fue desactivada en: {}\n", expiry));
        }
    }
    prompt.push_str(
        "Características e información sobre las Versiones de InvisibleAI:\n\
         - Versión FREE (Gratuita):\n\
           * Acceso al chat básico.\n\
           * Límites diarios en el uso de créditos y tokens de streaming.\n\
           * Soporte estándar para transcripciones.\n\
         - Versión PRO (Con Licencia de Paga):\n\
           * Streaming de audio STT multihilo/canal dual ilimitado (captura simultánea de micrófono y audio del sistema por canales separados con Deepgram de forma ultra-rápida).\n\
           * Guardado automático de transcripciones en el historial de SQLite.\n\
           * Supresión inteligente de respuestas redundantes ante la propia voz del usuario (cuando habla por el micrófono en streaming, el sistema guarda su transcripción para mantener el contexto pero NO dispara llamadas a la IA para ahorrar créditos).\n\
           * Panel de administración de memoria contextual para CRUD completo de recuerdos de usuario, conocimiento y retroalimentación de errores.\n\
           * Modo sigilo (Stealth Mode) para proteger visualmente la ventana en grabaciones.\n\
           * Atajos de teclado avanzados y personalización completa.\n\n"
    );

    // 2. Conocimiento General de InvisibleAI
    prompt.push_str("[CONTEXTO GENERAL DE INVISIBLEAI]\n");
    for k in &context.knowledge {
        prompt.push_str(&format!("* {}: {}\n", k.title, k.content));
    }
    prompt.push_str("\n");

    // 3. Catálogo de Características (Evita inventar funciones)
    prompt.push_str("[FUNCIONES DISPONIBLES DE LA APP]\n");
    for f in &context.features {
        prompt.push_str(&format!(
            "* {} (Estado: {}): {}\n  Componente: {:?} | Ruta: {:?}\n",
            f.feature_name, f.status, f.description, f.frontend_component, f.route
        ));
    }
    prompt.push_str("\n");

    // 4. Memoria del Usuario
    if !context.user_memory.is_empty() {
        prompt.push_str("[MEMORIA DEL USUARIO (Datos Útiles)]\n");
        for m in &context.user_memory {
            prompt.push_str(&format!("* [{}]: {}\n", m.memory_type, m.content));
        }
        prompt.push_str("\n");
    }

    // 5. Historial de Conversación / Resúmenes
    if !context.summaries.is_empty() {
        prompt.push_str("[RESUMEN DE CONVERSACIONES ANTERIORES]\n");
        for s in &context.summaries {
            prompt.push_str(&format!(
                "- Resumen: {}\n  Problemas anteriores: {:?}\n  Contexto útil: {:?}\n",
                s.summary, s.detected_problems, s.useful_context
            ));
        }
        prompt.push_str("\n");
    }

    // 6. Errores Previos a Evitar (Feedback activo)
    if !context.feedback.is_empty() {
        prompt.push_str("[ERRORES ANTERIORES A EVITAR (No Repetir)]\n");
        for f in &context.feedback {
            prompt.push_str(&format!(
                "- Problema reportado: {}\n  Comportamiento incorrecto: {}\n  Solución/Comportamiento esperado: {}\n",
                f.issue_detected, f.bad_behavior, f.expected_behavior
            ));
        }
        prompt.push_str("\n");
    }

    // 6.5. Contexto de Sesión en Vivo
    if let Some(stype) = &context.session_type {
        prompt.push_str(&format!(
            "[CONTEXTO DE SESIÓN EN VIVO]\n\
             Tipo de sesión activa: {}\n\n",
            stype
        ));
    }

    if !context.session_timeline.is_empty() {
        prompt.push_str("[SECUENCIA TEMPORAL RECIENTE DE LA SESIÓN]\n");
        for (idx, seg) in context.session_timeline.iter().enumerate() {
            prompt.push_str(&format!(
                "{}. [{}] {}: {}\n",
                idx + 1,
                seg.source_type,
                seg.speaker_label,
                seg.content
            ));
        }
        prompt.push_str("\n");
        
        let mic_segments: Vec<_> = context.session_timeline.iter()
            .filter(|s| s.source_type == "microphone")
            .collect();
        if !mic_segments.is_empty() {
            prompt.push_str("[TRANSCRIPCIÓN RECIENTE DEL MICRÓFONO DEL USUARIO]\n");
            for seg in &mic_segments {
                prompt.push_str(&format!("* {}\n", seg.content));
            }
            prompt.push_str("\n");
        }

        let system_segments: Vec<_> = context.session_timeline.iter()
            .filter(|s| s.source_type == "system_audio")
            .collect();
        if !system_segments.is_empty() {
            prompt.push_str("[TRANSCRIPCIÓN RECIENTE DEL AUDIO DEL SISTEMA]\n");
            for seg in &system_segments {
                prompt.push_str(&format!("* {}\n", seg.content));
            }
            prompt.push_str("\n");
        }
    }

    // 7. Estado e Interfaz Actual (Contexto de Pantalla)
    prompt.push_str(&format!(
        "[CONTEXTO DE PANTALLA ACTUAL]\n\
         Pantalla: {}\n\
         Ruta actual: {}\n\
         Módulo: {:?}\n\
         Versión de la App: {}\n\n",
        context.screen.current_screen,
        context.screen.current_route,
        context.screen.selected_feature,
        context.screen.app_version
    ));

    // 8. Mensaje del Usuario
    prompt.push_str(&format!(
        "[MENSAJE ACTUAL DEL USUARIO]\n\
         {}\n\n",
        user_message
    ));

    // 9. Instrucciones de Respuesta
    prompt.push_str(
        "[INSTRUCCIONES DE RESPUESTA]\n\
         1. Responde de forma específica apoyándote en el contexto e interfaz actual del usuario.\n\
         2. Nunca inventes funciones que no estén listadas en [FUNCIONES DISPONIBLES].\n\
         3. Mantente coherente con la memoria del usuario.\n\
         4. Si cometes un error previamente registrado en [ERRORES ANTERIORES], cambia tu lógica para no repetirlo.\n\
         5. NO ignores lo que dijo el usuario por micrófono ni el audio del sistema; analiza ambas fuentes de manera unificada y cronológica.\n\
         6. Si la sesión parece ser una entrevista de trabajo, ayuda al usuario a responder preguntas técnicas de forma profesional usando su contexto y experiencia.\n\
         7. Si parece una reunión, resume acuerdos, tareas y próximos pasos.\n\
         8. Si parece una clase o video, resume y explica conceptos según las dos fuentes.\n\
         9. Responde con pasos accionables y directos de InvisibleAI."
    );

    prompt
}

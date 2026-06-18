use crate::api::get_api_access_key;
use crate::api::get_app_endpoint;
use crate::api::get_stored_credentials;
use crate::services::session_service;
use crate::LlmOrchestratorState;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum StreamingEventKind {
    #[serde(rename = "user_request")]
    UserRequest,
    #[serde(rename = "external_question")]
    ExternalQuestion,
    #[serde(rename = "external_objection")]
    ExternalObjection,
    #[serde(rename = "external_request")]
    ExternalRequest,
    #[serde(rename = "external_proposal")]
    ExternalProposal,
    #[serde(rename = "external_decision")]
    ExternalDecision,
    #[serde(rename = "external_debate_claim")]
    ExternalDebateClaim,
    #[serde(rename = "external_opinion")]
    ExternalOpinion,
    #[serde(rename = "external_context")]
    ExternalContext,
    #[serde(rename = "external_noise")]
    ExternalNoise,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventClassification {
    pub event_kind: StreamingEventKind,
    pub trigger_score: u32,
    pub confidence: String,
    pub reasons: Vec<String>,
}

const FILLER_EXACT_PHRASES: &[&str] = &[
    "ok",
    "okay",
    "ya",
    "vale",
    "bueno",
    "este",
    "eh",
    "em",
    "um",
    "gracias",
    "perfecto",
    "listo",
    "continuamos",
    "vamos a continuar",
    "siguiente",
];

const SMART_QUESTION_PATTERNS: &[&str] = &[
    "que opinas",
    "como lo harias",
    "como lo resolverias",
    "que propones",
    "cual seria",
    "por que",
    "puedes explicar",
    "puedes aclarar",
    "que estrategia",
    "que alternativa",
    "que solucion",
    "que enfoque",
    "que harian",
    "que recomiendas",
    "que sugieres",
    "what do you think",
    "how would you",
    "what would you suggest",
    "can you explain",
    "why would",
];

const SMART_REQUEST_PATTERNS: &[&str] = &[
    "necesitamos",
    "ayudanos",
    "ayudame",
    "explica",
    "resuelve",
    "resolver",
    "recomienda",
    "recomendar",
    "sugiere",
    "sugerencia",
    "mejorar",
    "mejorarias",
    "how can we",
    "help us",
    "recommend",
    "suggest",
];

const SMART_OPINION_PATTERNS: &[&str] = &[
    "yo creo que",
    "creo que",
    "considero que",
    "me parece que",
    "desde mi punto de vista",
    "en mi opinion",
    "para mi",
    "pienso que",
    "i think",
    "i believe",
    "in my opinion",
    "from my point of view",
];

const SMART_OBJECTION_PATTERNS: &[&str] = &[
    "no estoy de acuerdo",
    "discrepo",
    "no necesariamente",
    "no lo veo viable",
    "no me convence",
    "eso no tiene sentido",
    "eso no escala",
    "eso esta mal",
    "eso es falso",
    "el problema con eso",
    "el problema es",
    "hay un problema",
    "i disagree",
    "that does not scale",
    "that is wrong",
    "that is not viable",
    "the problem is",
];

const SMART_WEAK_CONTRAST_PATTERNS: &[&str] = &["pero", "sin embargo", "aunque", "however", "but"];

const SMART_DEBATE_CLAIM_PATTERNS: &[&str] = &[
    "siempre",
    "nunca",
    "es mejor",
    "es peor",
    "deberia",
    "no deberia",
    "lo correcto seria",
    "la mejor forma",
    "no sirve",
    "no funciona",
    "es obligatorio",
    "es necesario",
    "always",
    "never",
    "is better",
    "is worse",
    "should",
    "should not",
    "does not work",
];

const SMART_RISK_PATTERNS: &[&str] = &[
    "riesgo",
    "riesgoso",
    "caro",
    "costoso",
    "demasiado tiempo",
    "seguridad",
    "compliance",
    "cumplimiento",
    "deuda tecnica",
    "rendimiento",
    "performance",
    "latencia",
    "mantenible",
    "mantenimiento",
    "escala",
    "escalabilidad",
    "risk",
    "expensive",
    "security",
    "technical debt",
    "latency",
    "scalability",
];

const SMART_PROPOSAL_PATTERNS: &[&str] = &[
    "propongo",
    "mi propuesta",
    "propuesta",
    "deberiamos",
    "podriamos",
    "prioricemos",
    "el plan seria",
    "la alternativa es",
    "vamos a elegir",
    "we should",
    "we could",
    "my proposal",
    "the proposal is",
    "the plan is",
];

const SMART_DECISION_PATTERNS: &[&str] = &[
    "decision",
    "decidir",
    "hay que decidir",
    "la decision seria",
    "vamos a decidir",
    "elegir",
    "prioridad",
    "priorizar",
    "we need to decide",
    "the decision",
    "priority",
    "prioritize",
];

const SMART_LIVE_CLASS_PATTERNS: &[&str] = &[
    "en el chat preguntan",
    "alguien pregunta",
    "no entendi",
    "puedes explicar",
    "que significa",
    "eso es falso",
    "eso esta mal",
    "como se hace",
    "sirve para que",
    "someone asks",
    "in chat they ask",
    "what does it mean",
    "i did not understand",
];

fn normalize_text(text: &str) -> String {
    let mut normalized = text.to_lowercase();

    normalized = normalized
        .replace('á', "a")
        .replace('é', "e")
        .replace('í', "i")
        .replace('ó', "o")
        .replace('ú', "u")
        .replace('ü', "u")
        .replace('ñ', "n");

    normalized.retain(|c| !c.is_ascii_punctuation());
    normalized
}

pub fn classify_smart_system_event(text: &str) -> EventClassification {
    let normalized = normalize_text(text);

    let trimmed = text.trim().to_lowercase();
    if FILLER_EXACT_PHRASES.iter().any(|&f| trimmed == f) {
        return EventClassification {
            event_kind: StreamingEventKind::ExternalNoise,
            trigger_score: 0,
            confidence: "low".to_string(),
            reasons: vec!["noise_or_filler".to_string()],
        };
    }

    struct Candidate {
        kind: StreamingEventKind,
        score: u32,
        reason: String,
    }
    let mut candidates: Vec<Candidate> = Vec::new();

    if text.contains('?') || text.contains('¿') {
        candidates.push(Candidate {
            kind: StreamingEventKind::ExternalQuestion,
            score: 7,
            reason: "question_mark".to_string(),
        });
    }

    let check_pattern = |patterns: &[&str],
                         kind: StreamingEventKind,
                         score: u32,
                         reason: &str,
                         candidates: &mut Vec<Candidate>| {
        for &pattern in patterns {
            if normalized.contains(pattern) {
                candidates.push(Candidate {
                    kind,
                    score,
                    reason: format!("{}:{}", reason, pattern),
                });
            }
        }
    };

    check_pattern(
        SMART_QUESTION_PATTERNS,
        StreamingEventKind::ExternalQuestion,
        7,
        "question_pattern",
        &mut candidates,
    );
    check_pattern(
        SMART_REQUEST_PATTERNS,
        StreamingEventKind::ExternalRequest,
        6,
        "request_pattern",
        &mut candidates,
    );
    check_pattern(
        SMART_OBJECTION_PATTERNS,
        StreamingEventKind::ExternalObjection,
        7,
        "objection_pattern",
        &mut candidates,
    );
    check_pattern(
        SMART_WEAK_CONTRAST_PATTERNS,
        StreamingEventKind::ExternalObjection,
        4,
        "weak_contrast_pattern",
        &mut candidates,
    );
    check_pattern(
        SMART_PROPOSAL_PATTERNS,
        StreamingEventKind::ExternalProposal,
        6,
        "proposal_pattern",
        &mut candidates,
    );
    check_pattern(
        SMART_DECISION_PATTERNS,
        StreamingEventKind::ExternalDecision,
        6,
        "decision_pattern",
        &mut candidates,
    );
    check_pattern(
        SMART_LIVE_CLASS_PATTERNS,
        StreamingEventKind::ExternalRequest,
        6,
        "live_or_class_pattern",
        &mut candidates,
    );
    check_pattern(
        SMART_RISK_PATTERNS,
        StreamingEventKind::ExternalObjection,
        5,
        "risk_pattern",
        &mut candidates,
    );

    let mut opinion_matched = false;
    for &pattern in SMART_OPINION_PATTERNS {
        if normalized.contains(pattern) {
            opinion_matched = true;
            break;
        }
    }

    let mut debate_matched = false;
    for &pattern in SMART_DEBATE_CLAIM_PATTERNS {
        if normalized.contains(pattern) {
            debate_matched = true;
            break;
        }
    }

    if opinion_matched {
        candidates.push(Candidate {
            kind: if debate_matched {
                StreamingEventKind::ExternalDebateClaim
            } else {
                StreamingEventKind::ExternalOpinion
            },
            score: if debate_matched { 6 } else { 4 },
            reason: if debate_matched {
                "opinion_with_debate_claim".to_string()
            } else {
                "opinion_pattern".to_string()
            },
        });
    } else if debate_matched {
        candidates.push(Candidate {
            kind: StreamingEventKind::ExternalDebateClaim,
            score: 5,
            reason: "debate_claim_pattern".to_string(),
        });
    }

    if candidates.is_empty() {
        return EventClassification {
            event_kind: StreamingEventKind::ExternalContext,
            trigger_score: 0,
            confidence: "low".to_string(),
            reasons: Vec::new(),
        };
    }

    let get_priority = |kind: StreamingEventKind| -> u32 {
        match kind {
            StreamingEventKind::UserRequest => 0,
            StreamingEventKind::ExternalQuestion => 9,
            StreamingEventKind::ExternalObjection => 8,
            StreamingEventKind::ExternalRequest => 7,
            StreamingEventKind::ExternalProposal => 6,
            StreamingEventKind::ExternalDecision => 6,
            StreamingEventKind::ExternalDebateClaim => 5,
            StreamingEventKind::ExternalOpinion => 4,
            StreamingEventKind::ExternalContext => 1,
            StreamingEventKind::ExternalNoise => 0,
        }
    };

    candidates.sort_by(|a, b| {
        if b.score != a.score {
            b.score.cmp(&a.score)
        } else {
            get_priority(b.kind).cmp(&get_priority(a.kind))
        }
    });

    let best = &candidates[0];
    let mut trigger_score = best.score;

    for candidate in &candidates[1..] {
        trigger_score = std::cmp::max(trigger_score, std::cmp::min(7, candidate.score + 1));
    }

    let confidence = if trigger_score >= 7 {
        "high".to_string()
    } else if trigger_score >= 5 {
        "medium".to_string()
    } else {
        "low".to_string()
    };

    let reasons = candidates.iter().map(|c| c.reason.clone()).collect();

    EventClassification {
        event_kind: if trigger_score >= 5 {
            best.kind
        } else {
            StreamingEventKind::ExternalContext
        },
        trigger_score,
        confidence,
        reasons,
    }
}

pub fn classify_standard_system_event(text: &str) -> EventClassification {
    let classification = classify_smart_system_event(text);
    let is_actionable = classification.event_kind == StreamingEventKind::ExternalQuestion
        || classification.event_kind == StreamingEventKind::ExternalRequest;

    EventClassification {
        event_kind: if is_actionable {
            classification.event_kind
        } else {
            StreamingEventKind::ExternalContext
        },
        trigger_score: if is_actionable {
            classification.trigger_score
        } else {
            0
        },
        confidence: classification.confidence,
        reasons: classification.reasons,
    }
}

pub fn detect_mic_command(text: &str) -> bool {
    let normalized = normalize_text(text);
    let trigger_words = &[
        "invisible",
        "asistente",
        "sugiere",
        "oye",
        "corrige",
        "ayuda",
        "dime",
    ];

    trigger_words.iter().any(|&word| normalized.contains(word))
}

pub async fn cancel_active_llm_task(app: &AppHandle) {
    if let Some(state) = app.try_state::<LlmOrchestratorState>() {
        let mut task_guard = state.active_llm_task.lock().unwrap();
        if let Some(ref handle) = *task_guard {
            handle.abort();
        }
        *task_guard = None;
    }
}

pub async fn handle_incoming_transcript(
    app: AppHandle,
    session_id: String,
    channel: String,
    text: String,
    is_final: bool,
    is_smart_mode: bool,
    response_language: Option<String>,
) -> Result<(), String> {
    if !is_final {
        return Ok(());
    }

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let is_mic = channel == "mic";
    let source_type = if is_mic { "microphone" } else { "system_audio" };
    let speaker_label = if is_mic { "Tú" } else { "Sistema" };

    let _segment = session_service::insert_transcript_segment(
        app_data_dir.clone(),
        &session_id,
        None,
        source_type,
        speaker_label,
        &text,
        is_final,
    )?;

    let _ = app.emit("timeline-updated", &session_id);

    let should_trigger = if is_mic {
        detect_mic_command(&text)
    } else {
        let classification = if is_smart_mode {
            classify_smart_system_event(&text)
        } else {
            classify_standard_system_event(&text)
        };
        classification.event_kind != StreamingEventKind::ExternalContext
            && classification.event_kind != StreamingEventKind::ExternalNoise
    };

    if !should_trigger {
        return Ok(());
    }

    cancel_active_llm_task(&app).await;

    let app_clone = app.clone();
    let session_id_clone = session_id.clone();
    let text_clone = text.clone();
    let response_language_clone = response_language.clone();

    let task_handle = tokio::spawn(async move {
        if !is_mic {
            tokio::time::sleep(std::time::Duration::from_millis(350)).await;
        }

        let _ = app_clone.emit("ai-stream-start", ());

        match run_llm_orchestration(&app_clone, &session_id_clone, &text_clone, is_mic, response_language_clone).await {
            Ok(full_response) => {
                let _ = session_service::insert_transcript_segment(
                    app_data_dir.clone(),
                    &session_id_clone,
                    None,
                    "assistant",
                    "Asistente",
                    &full_response,
                    true,
                );
                let _ = app_clone.emit("ai-stream-end", full_response);
                let _ = app_clone.emit("timeline-updated", &session_id_clone);
            }
            Err(e) => {
                let friendly_err = crate::api::format_friendly_error(&e);
                let _ = app_clone.emit("ai-stream-error", friendly_err);
            }
        }
    });

    if let Some(state) = app.try_state::<LlmOrchestratorState>() {
        let mut task_guard = state.active_llm_task.lock().unwrap();
        *task_guard = Some(task_handle);
    }

    Ok(())
}

async fn run_llm_orchestration(
    app: &AppHandle,
    session_id: &str,
    triggering_text: &str,
    is_mic: bool,
    response_language: Option<String>,
) -> Result<String, String> {
    let app_endpoint = get_app_endpoint()?;
    let api_access_key = get_api_access_key()?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let (license_key, instance_id, selected_model, local_groq_key, local_groq_model) =
        get_stored_credentials(app).await?;

    let model_id = if license_key.is_empty() {
        "llama-3.3-70b-versatile".to_string()
    } else {
        local_groq_model
            .clone()
            .or_else(|| selected_model.as_ref().map(|m| m.model.clone()))
            .unwrap_or_else(|| "meta-llama/llama-4-scout-17b-16e-instruct".to_string())
    };

    let timeline_segments =
        session_service::get_combined_session_timeline(app_data_dir.clone(), session_id, 15)?;

    use crate::services::context_builder::{
        build_ai_context, build_system_prompt, CurrentScreenContext,
    };
    let screen_ctx = CurrentScreenContext {
        current_screen: "System Audio Popover".to_string(),
        current_route: "/app/audio".to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        selected_feature: Some("Speech".to_string()),
    };

    let context = build_ai_context(
        app_data_dir,
        "default_user",
        "default_conversation",
        Some(session_id),
        screen_ctx,
        triggering_text,
        "assistant_request",
    )?;

    let system_prompt = build_system_prompt(context, triggering_text, false, response_language);

    let mut messages: Vec<serde_json::Value> = Vec::new();
    messages.push(serde_json::json!({
        "role": "system",
        "content": system_prompt
    }));

    for segment in timeline_segments {
        let role = if segment.source_type == "assistant" {
            "assistant"
        } else {
            "user"
        };
        let prefix = if segment.source_type == "microphone" {
            "[Tú]"
        } else if segment.source_type == "system_audio" {
            "[Sistema]"
        } else {
            "Asistente"
        };
        messages.push(serde_json::json!({
            "role": role,
            "content": format!("{}: {}", prefix, segment.content)
        }));
    }

    let trigger_prefix = if is_mic { "[Tú]" } else { "[Sistema]" };
    messages.push(serde_json::json!({
        "role": "user",
        "content": format!("{}: {}", trigger_prefix, triggering_text)
    }));

    let client = reqwest::Client::new();

    // El cliente con licencia le pega a Groq DIRECTO solo con modelos Groq. Para
    // xAI (grok-*) hay que rutear por el server, que tiene la key de xAI y despacha.
    let use_groq_direct = local_groq_key.is_some() && !model_id.starts_with("grok-");

    let request_body = if use_groq_direct {
        serde_json::json!({
            "model": model_id,
            "messages": messages,
            "stream": true
        })
    } else {
        serde_json::json!({
            "licenseKey": license_key,
            "instanceId": instance_id,
            "model": model_id,
            "messages": messages,
            "stream": true
        })
    };

    let url = if use_groq_direct {
        "https://api.groq.com/openai/v1/chat/completions".to_string()
    } else {
        format!("{}/api/chat", app_endpoint)
    };

    let mut request_builder = client.post(&url).header("Content-Type", "application/json");

    if use_groq_direct {
        if let Some(ref groq_key) = local_groq_key {
            request_builder = request_builder.header("Authorization", format!("Bearer {}", groq_key));
        }
    } else {
        request_builder =
            request_builder.header("Authorization", format!("Bearer {}", api_access_key));
    }

    let response = request_builder
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send stream request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let err_text = response.text().await.unwrap_or_default();
        return Err(format!("LLM Error ({}): {}", status, err_text));
    }

    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                let chunk_str = String::from_utf8_lossy(&bytes);
                buffer.push_str(&chunk_str);

                let lines: Vec<&str> = buffer.split('\n').collect();
                let incomplete_line = lines.last().unwrap_or(&"").to_string();

                for line in &lines[..lines.len() - 1] {
                    let trimmed_line = line.trim();
                    if trimmed_line.starts_with("data: ") {
                        let json_str = trimmed_line.strip_prefix("data: ").unwrap_or("");
                        if json_str == "[DONE]" {
                            break;
                        }
                        if !json_str.is_empty() {
                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str)
                            {
                                if let Some(choices) =
                                    parsed.get("choices").and_then(|c| c.as_array())
                                {
                                    if let Some(first_choice) = choices.first() {
                                        if let Some(delta) = first_choice.get("delta") {
                                            if let Some(content) =
                                                delta.get("content").and_then(|c| c.as_str())
                                            {
                                                full_response.push_str(content);
                                                let _ = app.emit("ai-stream-chunk", content);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                buffer = incomplete_line;
            }
            Err(e) => {
                return Err(format!("Stream read error: {}", e));
            }
        }
    }

    Ok(full_response)
}

#![allow(dead_code)]
use base64::{engine::general_purpose, Engine as _};
use futures_util::StreamExt;
use reqwest::multipart::{Form, Part};

use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_machine_uid::MachineUidExt;

fn get_app_endpoint() -> Result<String, String> {
    if let Ok(endpoint) = env::var("APP_ENDPOINT") {
        return Ok(endpoint);
    }

    match option_env!("APP_ENDPOINT") {
        Some(endpoint) => Ok(endpoint.to_string()),
        None => Ok("https://invisibleai.onrender.com".to_string())
    }
}

fn get_api_access_key() -> Result<String, String> {
    if let Ok(key) = env::var("API_ACCESS_KEY") {
        return Ok(key);
    }

    match option_env!("API_ACCESS_KEY") {
        Some(key) => Ok(key.to_string()),
        None => Ok("dummy-local-key".to_string())
    }
}

fn get_secure_storage_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_data_dir.join("secure_storage.json"))
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct SecureStorage {
    license_key: Option<String>,
    instance_id: Option<String>,
    selected_invisibleai_model: Option<String>,
    groq_api_key: Option<String>,
    groq_model: Option<String>,
    deepgram_api_key: Option<String>,
    deepgram_model: Option<String>,
    deepgram_language: Option<String>,
}

pub async fn get_stored_credentials(
    app: &AppHandle,
) -> Result<(String, String, Option<Model>, Option<String>, Option<String>), String> {
    let storage_path = get_secure_storage_path(app)?;

    if !storage_path.exists() {
        return Err("No license found. Please activate your license first.".to_string());
    }

    let content = fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read storage file: {}", e))?;

    let storage: SecureStorage = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse storage file: {}", e))?;

    let license_key = storage
        .license_key
        .ok_or("License key not found".to_string())?;
    let instance_id = storage
        .instance_id
        .ok_or("Instance ID not found".to_string())?;

    let selected_model: Option<Model> = storage
        .selected_invisibleai_model
        .and_then(|json_str| serde_json::from_str(&json_str).ok());

    Ok((license_key, instance_id, selected_model, storage.groq_api_key, storage.groq_model))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioResponse {
    success: bool,
    transcription: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ChatRequest {
    user_message: String,
    system_prompt: Option<String>,
    image_base64: Option<serde_json::Value>,
    history: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct ChatResponse {
    success: bool,
    message: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Model {
    provider: String,
    name: String,
    id: String,
    model: String,
    description: String,
    modality: String,
    #[serde(rename = "isAvailable")]
    is_available: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelsResponse {
    models: Vec<Model>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemPromptResponse {
    prompt_name: String,
    system_prompt: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InvisibleAIPrompt {
    title: String,
    prompt: String,
    #[serde(rename = "modelId")]
    model_id: String,
    #[serde(rename = "modelName")]
    model_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvisibleAIPromptsResponse {
    prompts: Vec<InvisibleAIPrompt>,
    total: i32,
    #[serde(rename = "last_updated")]
    last_updated: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponseConfig {
    url: String,
    user_token: String,
    model: String,
    body: String,
    customer_id: Option<i64>,
    customer_email: Option<String>,
    customer_name: Option<String>,
    license_key: String,
    instance_id: String,
    #[serde(rename = "user_audio")]
    user_audio: Option<UserAudioConfig>,
    errors: Option<Vec<ApiConfigError>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiConfigError {
    includes: String,
    error: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserAudioHeader {
    key: String,
    value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserAudioConfig {
    url: String,
    #[serde(rename = "fallback_url")]
    fallback_url: Option<String>,
    model: String,
    #[serde(rename = "fallback_model")]
    fallback_model: Option<String>,
    #[serde(rename = "user_token")]
    user_token: String,
    #[serde(rename = "fallback_user_token")]
    fallback_user_token: Option<String>,
    headers: Option<Vec<UserAudioHeader>>,
}

#[tauri::command]
pub async fn transcribe_audio(
    app: AppHandle,
    audio_base64: String,
) -> Result<AudioResponse, String> {
    let app_endpoint = get_app_endpoint()?;
    let api_access_key = get_api_access_key()?;

    let (license_key, instance_id, _, local_groq_key, local_groq_model) = match get_stored_credentials(&app).await {
        Ok((lk, id, sm, gk, gm)) => (Some(lk), Some(id), sm, gk, gm),
        Err(_) => (None, None, None, None, None),
    };

    let audio_bytes = decode_audio_base64(&audio_base64)?;
    let client = reqwest::Client::new();

    // ── MODO DIRECTO: Groq API key guardada localmente → llamada directa (rápido) ──
    if let Some(groq_key) = local_groq_key {
        let url = "https://api.groq.com/openai/v1/audio/transcriptions";

        let part = reqwest::multipart::Part::bytes(audio_bytes)
            .file_name("audio.wav")
            .mime_str("audio/wav")
            .map_err(|e| format!("Failed to prepare audio payload: {}", e))?;

        let model_name = local_groq_model.unwrap_or_else(|| "whisper-large-v3".to_string());
        // Groq only supports whisper-large-v3, if user saved a chat model as groq_model, fallback to whisper-large-v3
        let stt_model = if model_name.contains("whisper") {
            model_name
        } else {
            "whisper-large-v3".to_string()
        };

        let form = reqwest::multipart::Form::new()
            .part("file", part)
            .text("model", stt_model)
            .text("response_format", "json");

        let response = client
            .post(url)
            .header("Authorization", format!("Bearer {}", groq_key))
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("Groq transcription request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown Groq STT error".to_string());
            return Ok(AudioResponse {
                success: false,
                transcription: None,
                error: Some(format!("Groq error ({}): {}", status, error_text)),
            });
        }

        #[derive(Debug, Deserialize)]
        struct GroqSttResponse {
            text: String,
        }

        let groq_resp: GroqSttResponse = response.json().await.map_err(|e| {
            format!("Failed to parse Groq STT response: {}", e)
        })?;

        return Ok(AudioResponse {
            success: true,
            transcription: Some(groq_resp.text),
            error: None,
        });
    }

    // ── MODO PROXY: sin key local → pasar por el servidor (fallback) ──────────────
    let mut url = format!("{}/api/stt", app_endpoint);
    let mut params = Vec::new();
    if let Some(ref lk) = license_key {
        params.push(format!("licenseKey={}", lk));
    }
    if let Some(ref id) = instance_id {
        params.push(format!("instanceId={}", id));
    }
    if !params.is_empty() {
        url = format!("{}?{}", url, params.join("&"));
    }

    let part = reqwest::multipart::Part::bytes(audio_bytes)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to prepare audio payload: {}", e))?;

    let form = reqwest::multipart::Form::new().part("file", part);

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_access_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Transcription request failed to send: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown server error".to_string());
        return Ok(AudioResponse {
            success: false,
            transcription: None,
            error: Some(format!("Server error ({}): {}", status, error_text)),
        });
    }

    #[derive(Debug, Deserialize)]
    struct ServerSttResponse {
        transcription: String,
    }

    let server_resp: ServerSttResponse = response.json().await.map_err(|e| {
        format!("Failed to parse transcription response: {}", e)
    })?;

    Ok(AudioResponse {
        success: true,
        transcription: Some(server_resp.transcription),
        error: None,
    })
}

fn map_api_error_message(error_rules: &[ApiConfigError], sources: &[String]) -> String {
    for source in sources {
        for rule in error_rules {
            if !rule.includes.is_empty() && source.contains(&rule.includes) {
                return rule.error.clone();
            }
        }
    }

    if let Some(default_rule) = error_rules
        .iter()
        .find(|rule| rule.includes.trim().is_empty())
    {
        return default_rule.error.clone();
    }

    error_rules
        .first()
        .map(|rule| rule.error.clone())
        .unwrap_or_else(|| {
            "Something went wrong. Please try switching to a different model or contact support."
                .to_string()
        })
}

fn decode_audio_base64(audio_base64: &str) -> Result<Vec<u8>, String> {
    let trimmed = audio_base64.trim();
    let base64_str = if let Some(idx) = trimmed.find(',') {
        &trimmed[idx + 1..]
    } else {
        trimmed
    };

    general_purpose::STANDARD
        .decode(base64_str)
        .map_err(|e| format!("Failed to decode audio data: {}", e))
}

async fn perform_user_audio_transcription(
    client: &reqwest::Client,
    url: &str,
    token: &str,
    model: &str,
    headers: Option<&Vec<UserAudioHeader>>,
    audio_bytes: &[u8],
) -> Result<String, String> {
    let audio_part = Part::bytes(audio_bytes.to_vec())
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to prepare audio payload: {}", e))?;

    let mut form = Form::new()
        .part("file", audio_part)
        .text("model", model.to_string());

    if let Some(extra_headers) = headers {
        for header in extra_headers {
            let key = header.key.trim();
            if key.is_empty() {
                continue;
            }

            form = form.text(key.to_string(), header.value.clone());
        }
    }

    let response = client
        .post(url)
        .bearer_auth(token)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Transcription request failed to send: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unable to read transcription error response".to_string());
        return Err(format!(
            "Transcription request returned {} with body: {}",
            status, error_text
        ));
    }

    let body_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read transcription response: {}", e))?;

    if body_text.trim().is_empty() {
        return Err("Transcription response was empty".to_string());
    }

    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&body_text) {
        if let Some(text) = json.get("text").and_then(|value| value.as_str()) {
            return Ok(text.to_string());
        }

        if let Some(text) = json
            .get("transcription")
            .and_then(|value| value.as_str())
            .or_else(|| json.get("result").and_then(|value| value.as_str()))
        {
            return Ok(text.to_string());
        }

        return Ok(json.to_string());
    }

    Ok(body_text)
}

#[tauri::command]
pub async fn chat_stream_response(
    app: AppHandle,
    user_message: String,
    system_prompt: Option<String>,
    image_base64: Option<serde_json::Value>,
    history: Option<String>,
) -> Result<String, String> {
    let app_endpoint = get_app_endpoint()?;
    let api_access_key = get_api_access_key()?;

    let (license_key, instance_id, selected_model, local_groq_key, local_groq_model)
        = get_stored_credentials(&app).await?;

    // Modelo: usar el guardado localmente si existe; si no, el default
    let model_id = local_groq_model
        .clone()
        .or_else(|| selected_model.as_ref().map(|m| m.model.clone()))
        .unwrap_or_else(|| "meta-llama/llama-4-scout-17b-16e-instruct".to_string());


    // Construir mensajes OpenAI-compatible
    let mut messages: Vec<serde_json::Value> = Vec::new();

    if let Some(sys_prompt) = system_prompt {
        messages.push(serde_json::json!({
            "role": "system",
            "content": sys_prompt
        }));
    }

    if let Some(history_str) = history {
        if let Ok(history_messages) = serde_json::from_str::<Vec<serde_json::Value>>(&history_str) {
            messages.extend(history_messages);
        }
    }

    let mut user_content: Vec<serde_json::Value> = Vec::new();
    user_content.push(serde_json::json!({
        "type": "text",
        "text": user_message
    }));

    if let Some(image_data) = image_base64 {
        if image_data.is_string() {
            user_content.push(serde_json::json!({
                "type": "image_url",
                "image_url": {
                    "url": format!("data:image/jpeg;base64,{}", image_data.as_str().unwrap())
                }
            }));
        } else if image_data.is_array() {
            if let Some(images) = image_data.as_array() {
                for image in images {
                    if let Some(img_str) = image.as_str() {
                        user_content.push(serde_json::json!({
                            "type": "image_url",
                            "image_url": {
                                "url": format!("data:image/jpeg;base64,{}", img_str)
                            }
                        }));
                    }
                }
            }
        }
    }

    messages.push(serde_json::json!({
        "role": "user",
        "content": user_content
    }));

    let client = reqwest::Client::new();

    // ── MODO DIRECTO: Groq API key guardada localmente → llamada directa (rápido) ──
    if let Some(groq_key) = local_groq_key {
        let request_body = serde_json::json!({
            "model": model_id,
            "messages": messages,
            "stream": true
        });

        let response = client
            .post("https://api.groq.com/openai/v1/chat/completions")
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", groq_key))
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Groq API error: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&error_text) {
                if let Some(msg) = json.pointer("/error/message").and_then(|v| v.as_str()) {
                    return Err(msg.to_string());
                }
            }
            return Err(format!("Groq error ({}): {}", status, error_text));
        }

        return stream_sse_response(app, response).await;
    }

    // ── MODO PROXY: sin key local → pasar por el servidor (fallback) ──────────────
    let request_body = serde_json::json!({
        "licenseKey": license_key,
        "instanceId": instance_id,
        "model": model_id,
        "messages": messages,
        "stream": true
    });

    let url = format!("{}/api/chat", app_endpoint);
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_access_key))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to send chat request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown server error".to_string());

        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            if let Some(error_msg) = error_json.get("error").and_then(|e| e.as_str()) {
                return Err(error_msg.to_string());
            } else if let Some(message) = error_json.get("message").and_then(|m| m.as_str()) {
                return Err(message.to_string());
            }
        }
        return Err(format!("Server error ({}): {}", status, error_text));
    }

    stream_sse_response(app, response).await
}

/// Consume una respuesta SSE y emite eventos Tauri por chunk
async fn stream_sse_response(
    app: AppHandle,
    response: reqwest::Response,
) -> Result<String, String> {
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
                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
                                if let Some(choices) = parsed.get("choices").and_then(|c| c.as_array()) {
                                    if let Some(first_choice) = choices.first() {
                                        if let Some(delta) = first_choice.get("delta") {
                                            if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                                                full_response.push_str(content);
                                                let _ = app.emit("chat_stream_chunk", content);
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
                return Err(format!("Error reading stream chunk: {}", e));
            }
        }
    }

    let _ = app.emit("chat_stream_complete", &full_response);
    Ok(full_response)
}

#[tauri::command]
pub async fn fetch_models(app: AppHandle) -> Result<Vec<Model>, String> {
    let app_endpoint = get_app_endpoint()?;
    let api_access_key = get_api_access_key()?;

    let (license_key, _) = match get_stored_credentials(&app).await {
        Ok((lk, _, _, _, _)) => (lk, "".to_string()),
        Err(_) => ("".to_string(), "".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/models?licenseKey={}", app_endpoint, license_key);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_access_key))
        .send()
        .await
        .map_err(|e| format!("Failed to make models request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown server error".to_string());

        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            if let Some(error_msg) = error_json.get("error").and_then(|e| e.as_str()) {
                return Err(error_msg.to_string());
            } else if let Some(message) = error_json.get("message").and_then(|m| m.as_str()) {
                return Err(message.to_string());
            }
        }
        return Err(format!("Server error ({}): {}", status, error_text));
    }

    let models: Vec<Model> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse models response: {}", e))?;

    Ok(models)
}

#[tauri::command]
pub async fn fetch_prompts() -> Result<InvisibleAIPromptsResponse, String> {
    let app_endpoint = get_app_endpoint()?;
    let api_access_key = get_api_access_key()?;

    let client = reqwest::Client::new();
    let url = format!("{}/api/prompts", app_endpoint);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_access_key))
        .send()
        .await
        .map_err(|e| format!("Failed to make prompts request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown server error".to_string());

        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            if let Some(error_msg) = error_json.get("error").and_then(|e| e.as_str()) {
                return Err(error_msg.to_string());
            } else if let Some(message) = error_json.get("message").and_then(|m| m.as_str()) {
                return Err(message.to_string());
            }
        }
        return Err(format!("Server error ({}): {}", status, error_text));
    }

    let prompts_response: InvisibleAIPromptsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse prompts response: {}", e))?;

    Ok(prompts_response)
}

#[tauri::command]
pub async fn create_system_prompt(
    app: AppHandle,
    user_prompt: String,
) -> Result<SystemPromptResponse, String> {
    let app_endpoint = get_app_endpoint()?;
    let api_access_key = get_api_access_key()?;
    let (license_key, instance_id, _, _, _) = get_stored_credentials(&app).await?;
    let machine_id: String = app.machine_uid().get_machine_uid().unwrap().id.unwrap();
    let app_version: String = app.package_info().version.to_string();

    let client = reqwest::Client::new();
    let url = format!("{}/api/prompt", app_endpoint);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_access_key))
        .header("license_key", &license_key)
        .header("instance", &instance_id)
        .header("machine_id", &machine_id)
        .header("app_version", &app_version)
        .json(&serde_json::json!({
            "user_prompt": user_prompt
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to make prompt request: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown server error".to_string());

        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            if let Some(error_msg) = error_json.get("error").and_then(|e| e.as_str()) {
                return Err(error_msg.to_string());
            } else if let Some(message) = error_json.get("message").and_then(|m| m.as_str()) {
                return Err(message.to_string());
            }
        }
        return Err(format!("Server error ({}): {}", status, error_text));
    }

    let system_prompt_response: SystemPromptResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse system prompt response: {}", e))?;

    Ok(system_prompt_response)
}

#[tauri::command]
pub async fn check_license_status(app: AppHandle) -> Result<bool, String> {
    match get_stored_credentials(&app).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_activity(app: AppHandle) -> Result<serde_json::Value, String> {
    let app_endpoint = get_app_endpoint()?;
    let api_access_key = get_api_access_key()?;

    let (license_key, instance_id, _, _, _) = get_stored_credentials(&app).await?;

    let client = reqwest::Client::new();
    let activity_url = format!(
        "{}/api/activity?licenseKey={}&instanceId={}",
        app_endpoint.trim_end_matches('/'),
        license_key,
        instance_id
    );

    let response = client
        .get(&activity_url)
        .header("Authorization", format!("Bearer {}", api_access_key))
        .send()
        .await
        .map_err(|e| format!("Failed to request activity: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown server error".to_string());

        if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
            if let Some(message) = error_json
                .get("message")
                .and_then(|m| m.as_str())
                .or_else(|| error_json.get("error").and_then(|m| m.as_str()))
            {
                return Err(message.to_string());
            }
        }
        return Err(format!("Server error ({}): {}", status, error_text));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse activity response: {}", e))
}

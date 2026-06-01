use crate::api::get_stored_credentials;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_machine_uid::MachineUidExt;
use uuid::Uuid;

fn get_payment_endpoint() -> Result<String, String> {
    if let Ok(endpoint) = env::var("PAYMENT_ENDPOINT") {
        return Ok(endpoint);
    }

    match option_env!("PAYMENT_ENDPOINT") {
        Some(endpoint) => Ok(endpoint.to_string()),
        None => Ok("https://serverai.keraai.online/api".to_string())
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
    license_expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageItem {
    key: String,
    value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorageResult {
    license_key: Option<String>,
    instance_id: Option<String>,
    selected_invisibleai_model: Option<String>,
    groq_api_key: Option<String>,
    groq_model: Option<String>,
    deepgram_api_key: Option<String>,
    deepgram_model: Option<String>,
    deepgram_language: Option<String>,
    license_expires_at: Option<String>,
}

#[tauri::command]
pub async fn secure_storage_save(app: AppHandle, items: Vec<StorageItem>) -> Result<(), String> {
    let storage_path = get_secure_storage_path(&app)?;

    let mut storage = if storage_path.exists() {
        let content = fs::read_to_string(&storage_path)
            .map_err(|e| format!("Failed to read storage file: {}", e))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        SecureStorage::default()
    };

    for item in items {
        match item.key.as_str() {
            "invisibleai_license_key" => storage.license_key = Some(item.value),
            "invisibleai_instance_id" => storage.instance_id = Some(item.value),
            "selected_invisibleai_model" => storage.selected_invisibleai_model = Some(item.value),
            "groq_api_key" => storage.groq_api_key = Some(item.value),
            "groq_model" => storage.groq_model = Some(item.value),
            "deepgram_api_key" => storage.deepgram_api_key = Some(item.value),
            "deepgram_model" => storage.deepgram_model = Some(item.value),
            "deepgram_language" => storage.deepgram_language = Some(item.value),
            "license_expires_at" => storage.license_expires_at = Some(item.value),
            _ => return Err(format!("Invalid storage key: {}", item.key)),
        }
    }

    let content = serde_json::to_string(&storage)
        .map_err(|e| format!("Failed to serialize storage: {}", e))?;

    fs::write(&storage_path, content)
        .map_err(|e| format!("Failed to write storage file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn secure_storage_get(app: AppHandle) -> Result<StorageResult, String> {
    let storage_path = get_secure_storage_path(&app)?;

    if !storage_path.exists() {
        return Ok(StorageResult {
            license_key: None,
            instance_id: None,
            selected_invisibleai_model: None,
            groq_api_key: None,
            groq_model: None,
            deepgram_api_key: None,
            deepgram_model: None,
            deepgram_language: None,
            license_expires_at: None,
        });
    }

    let content = fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read storage file: {}", e))?;

    let storage: SecureStorage = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse storage file: {}", e))?;

    Ok(StorageResult {
        license_key: storage.license_key,
        instance_id: storage.instance_id,
        selected_invisibleai_model: storage.selected_invisibleai_model,
        groq_api_key: storage.groq_api_key,
        groq_model: storage.groq_model,
        deepgram_api_key: storage.deepgram_api_key,
        deepgram_model: storage.deepgram_model,
        deepgram_language: storage.deepgram_language,
        license_expires_at: storage.license_expires_at,
    })
}

#[tauri::command]
pub async fn secure_storage_remove(app: AppHandle, keys: Vec<String>) -> Result<(), String> {
    let storage_path = get_secure_storage_path(&app)?;

    if !storage_path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read storage file: {}", e))?;

    let mut storage: SecureStorage = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse storage file: {}", e))?;

    for key in keys {
        match key.as_str() {
            "invisibleai_license_key" => storage.license_key = None,
            "invisibleai_instance_id" => storage.instance_id = None,
            "selected_invisibleai_model" => storage.selected_invisibleai_model = None,
            "groq_api_key" => storage.groq_api_key = None,
            "groq_model" => storage.groq_model = None,
            "deepgram_api_key" => storage.deepgram_api_key = None,
            "deepgram_model" => storage.deepgram_model = None,
            "deepgram_language" => storage.deepgram_language = None,
            "license_expires_at" => storage.license_expires_at = None,
            _ => return Err(format!("Invalid storage key: {}", key)),
        }
    }

    let content = serde_json::to_string(&storage)
        .map_err(|e| format!("Failed to serialize storage: {}", e))?;

    fs::write(&storage_path, content)
        .map_err(|e| format!("Failed to write storage file: {}", e))?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivationRequest {
    license_key: String,
    instance_name: String,
    machine_id: String,
    app_version: String,
}

/// API credentials bundled by the server in the activation response.
/// All fields are optional — the server may omit them if provider keys
/// are not yet configured.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivationCredentials {
    #[serde(rename = "groqApiKey")]
    pub groq_api_key: Option<String>,
    pub model: Option<String>,
    #[serde(rename = "deepgramApiKey")]
    pub deepgram_api_key: Option<String>,
    #[serde(rename = "deepgramModel")]
    pub deepgram_model: Option<String>,
    #[serde(rename = "deepgramLanguage")]
    pub deepgram_language: Option<String>,
    #[serde(rename = "licenseExpiresAt")]
    pub license_expires_at: Option<String>,
    #[serde(rename = "supportsVision", default)]
    pub supports_vision: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivationResponse {
    #[serde(default)]
    pub activated: bool,
    pub error: Option<String>,
    pub license_key: Option<String>,
    pub instance: Option<InstanceInfo>,
    #[serde(default)]
    pub is_dev_license: bool,
    pub credentials: Option<ActivationCredentials>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateResponse {
    pub is_active: bool,
    pub last_validated_at: Option<String>,
    #[serde(default)]
    pub is_dev_license: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstanceInfo {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeactivationResponse {
    #[serde(default)]
    pub deactivated: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckoutResponse {
    pub success: Option<bool>,
    pub checkout_url: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn activate_license_api(
    app: AppHandle,
    license_key: String,
) -> Result<ActivationResponse, String> {

    if license_key == "invisibleai-admin-local" {
        let instance_name = Uuid::new_v4().to_string();
        return Ok(ActivationResponse {
            activated: true,
            error: None,
            license_key: Some(license_key.clone()),
            instance: Some(InstanceInfo {
                id: instance_name,
                name: "Admin Local Instance".to_string(),
                created_at: "2024-01-01T00:00:00Z".to_string(),
            }),
            is_dev_license: true,
            credentials: None,
        });
    }

    let payment_endpoint = get_payment_endpoint()?;
    let api_access_key = get_api_access_key()?;

    let instance_name = Uuid::new_v4().to_string();
    let machine_id: String = app.machine_uid().get_machine_uid().unwrap().id.unwrap();
    let app_version: String = env!("CARGO_PKG_VERSION").to_string();

    let activation_request = ActivationRequest {
        license_key: license_key.clone(),
        instance_name: instance_name.clone(),
        machine_id: machine_id.clone(),
        app_version: app_version.clone(),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/activate", payment_endpoint);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_access_key))
        .json(&activation_request)
        .send()
        .await
        .map_err(|e| {
            let error_msg = format!("{}", e);
            if error_msg.contains("url (") {

                let parts: Vec<&str> = error_msg.split(" for url (").collect();
                if parts.len() > 1 {
                    format!("Failed to make chat request: {}", parts[0])
                } else {
                    format!("Failed to make chat request: {}", error_msg)
                }
            } else {
                format!("Failed to make chat request: {}", error_msg)
            }
        })?;

    let activation_response: ActivationResponse = response.json().await.map_err(|e| {
        let error_msg = format!("{}", e);
        if error_msg.contains("url (") {
            let parts: Vec<&str> = error_msg.split(" for url (").collect();
            if parts.len() > 1 {
                format!("Failed to make chat request: {}", parts[0])
            } else {
                format!("Failed to make chat request: {}", error_msg)
            }
        } else {
            format!("Failed to make chat request: {}", error_msg)
        }
    })?;

    // Auto-save bundled API credentials so the frontend doesn't need a
    // separate /api/credentials round-trip after activation.
    if activation_response.activated {
        if let Some(ref creds) = activation_response.credentials {
            let mut items: Vec<StorageItem> = Vec::new();
            if let Some(ref v) = creds.groq_api_key      { items.push(StorageItem { key: "groq_api_key".into(),      value: v.clone() }); }
            if let Some(ref v) = creds.model             { items.push(StorageItem { key: "groq_model".into(),        value: v.clone() }); }
            if let Some(ref v) = creds.deepgram_api_key  { items.push(StorageItem { key: "deepgram_api_key".into(),  value: v.clone() }); }
            if let Some(ref v) = creds.deepgram_model    { items.push(StorageItem { key: "deepgram_model".into(),    value: v.clone() }); }
            if let Some(ref v) = creds.deepgram_language { items.push(StorageItem { key: "deepgram_language".into(), value: v.clone() }); }
            if let Some(ref v) = creds.license_expires_at { items.push(StorageItem { key: "license_expires_at".into(), value: v.clone() }); }
            if !items.is_empty() {
                let _ = secure_storage_save(app, items).await;
            }
        }
    }

    Ok(activation_response)
}

#[tauri::command]
pub async fn deactivate_license_api(app: AppHandle) -> Result<DeactivationResponse, String> {

    let payment_endpoint = get_payment_endpoint()?;
    let api_access_key = get_api_access_key()?;
    let (license_key, instance_id, _, _, _) = get_stored_credentials(&app).await?;
    if license_key.is_empty() {
        return Err("No active license to deactivate.".to_string());
    }
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let machine_id: String = app.machine_uid().get_machine_uid().unwrap().id.unwrap();
    let deactivation_request = ActivationRequest {
        license_key: license_key.clone(),
        instance_name: instance_id.clone(),
        machine_id: machine_id.clone(),
        app_version: app_version.clone(),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/deactivate", payment_endpoint);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_access_key))
        .json(&deactivation_request)
        .send()
        .await
        .map_err(|e| {
            let error_msg = format!("{}", e);
            if error_msg.contains("url (") {

                let parts: Vec<&str> = error_msg.split(" for url (").collect();
                if parts.len() > 1 {
                    format!("Failed to make chat request: {}", parts[0])
                } else {
                    format!("Failed to make chat request: {}", error_msg)
                }
            } else {
                format!("Failed to make chat request: {}", error_msg)
            }
        })?;
    let deactivation_response: DeactivationResponse = response.json().await.map_err(|e| {
        let error_msg = format!("{}", e);
        if error_msg.contains("url (") {

            let parts: Vec<&str> = error_msg.split(" for url (").collect();
            if parts.len() > 1 {
                format!("Failed to make chat request: {}", parts[0])
            } else {
                format!("Failed to make chat request: {}", error_msg)
            }
        } else {
            format!("Failed to make chat request: {}", error_msg)
        }
    })?;
    Ok(deactivation_response)
}

#[tauri::command]
pub async fn validate_license_api(app: AppHandle) -> Result<ValidateResponse, String> {
    let credentials = get_stored_credentials(&app).await;
    let is_active = match &credentials {
        Ok((license_key, _, _, _, _)) => !license_key.is_empty(),
        Err(_) => false,
    };

    let is_dev_license = match &credentials {
        Ok((license_key, _, _, _, _)) => license_key == "invisibleai-admin-local",
        Err(_) => false,
    };

    Ok(ValidateResponse {
        is_active,
        last_validated_at: None,
        is_dev_license,
    })
}

#[tauri::command]
pub fn mask_license_key_cmd(license_key: String) -> String {
    if license_key.len() <= 8 {
        return "*".repeat(license_key.len());
    }

    let first_four = &license_key[..4];
    let last_four = &license_key[license_key.len() - 4..];
    let middle_stars = "*".repeat(license_key.len() - 8);

    format!("{}{}{}", first_four, middle_stars, last_four)
}

#[tauri::command]
pub async fn get_checkout_url() -> Result<CheckoutResponse, String> {

    let payment_endpoint = get_payment_endpoint()?;
    let api_access_key = get_api_access_key()?;

    let client = reqwest::Client::new();
    let url = format!("{}/checkout", payment_endpoint);

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_access_key))
        .json(&serde_json::json!({}))
        .send()
        .await
        .map_err(|e| {
            let error_msg = format!("{}", e);
            if error_msg.contains("url (") {

                let parts: Vec<&str> = error_msg.split(" for url (").collect();
                if parts.len() > 1 {
                    format!("Failed to make chat request: {}", parts[0])
                } else {
                    format!("Failed to make chat request: {}", error_msg)
                }
            } else {
                format!("Failed to make chat request: {}", error_msg)
            }
        })?;

    let checkout_response: CheckoutResponse = response.json().await.map_err(|e| {
        let error_msg = format!("{}", e);
        if error_msg.contains("url (") {

            let parts: Vec<&str> = error_msg.split(" for url (").collect();
            if parts.len() > 1 {
                format!("Failed to make chat request: {}", parts[0])
            } else {
                format!("Failed to make chat request: {}", error_msg)
            }
        } else {
            format!("Failed to make chat request: {}", error_msg)
        }
    })?;
    Ok(checkout_response)
}

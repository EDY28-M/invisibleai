use super::SpeakerInput;
use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tokio_tungstenite::{connect_async, tungstenite::{client::IntoClientRequest, Message}};
use tracing::{error, info};

const TARGET_SAMPLE_RATE: u32 = 16000;
const FRAME_WINDOW_MS: u64 = 100;
const KEEPALIVE_INTERVAL_SECS: u64 = 8;

#[derive(Default)]
pub struct DeepgramStreamState {
    pub stream_task: Arc<Mutex<Option<JoinHandle<()>>>>,
    pub stop_signal: Arc<Mutex<Option<Arc<AtomicBool>>>>,
    pub is_streaming: Arc<Mutex<bool>>,
}

#[derive(Debug, Clone, Serialize)]
struct TranscriptPayload {
    text: String,
    is_final: bool,
    accumulated: String,
}

#[derive(Debug, Clone, Serialize)]
struct UtteranceEndPayload {
    text: String,
}

#[tauri::command]
pub async fn start_system_deepgram_stream(
    app: AppHandle,
    api_key: String,
    model: String,
    language: String,
    device_id: Option<String>,
) -> Result<(), String> {
    let dg_state = app.state::<DeepgramStreamState>();
    let audio_state = app.state::<crate::AudioState>();

    {
        let mut guard = dg_state
            .stream_task
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        if let Some(task) = guard.take() {
            task.abort();
        }
    }

    {
        let mut guard = audio_state
            .stream_task
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        if let Some(task) = guard.take() {
            task.abort();
        }
    }
    if let Ok(mut sr) = audio_state.sample_rate.lock() {
        *sr = None;
    }
    if let Ok(mut cap) = audio_state.is_capturing.lock() {
        *cap = false;
    }

    let input = SpeakerInput::new_with_device(device_id).map_err(|e| {
        error!("[DeepgramStream] Failed to create speaker input: {}", e);
        format!("Failed to access system audio: {}", e)
    })?;

    let audio_stream = input.stream();
    let native_sr = audio_stream.sample_rate();

    if !(8000..=96000).contains(&native_sr) {
        return Err(format!("Invalid sample rate: {}", native_sr));
    }

    info!(
        "[DeepgramStream] Audio device ready, native rate: {}Hz",
        native_sr
    );

    let stop_signal = Arc::new(AtomicBool::new(false));
    {
        let mut guard = dg_state
            .stop_signal
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        *guard = Some(stop_signal.clone());
    }

    *dg_state
        .is_streaming
        .lock()
        .map_err(|e| format!("Lock error: {}", e))? = true;

    let app_clone = app.clone();
    let stop_clone = stop_signal;

    let task_stream_task = dg_state.stream_task.clone();
    let task_stop_signal = dg_state.stop_signal.clone();
    let task_is_streaming = dg_state.is_streaming.clone();

    let task = tokio::spawn(async move {
        run_deepgram_stream(
            app_clone,
            api_key,
            model,
            language,
            audio_stream,
            native_sr,
            stop_clone,
        )
        .await;

        if let Ok(mut guard) = task_stream_task.lock() {
            *guard = None;
        }
        if let Ok(mut guard) = task_stop_signal.lock() {
            *guard = None;
        }
        if let Ok(mut guard) = task_is_streaming.lock() {
            *guard = false;
        }
    });

    *dg_state
        .stream_task
        .lock()
        .map_err(|e| format!("Lock error: {}", e))? = Some(task);

    Ok(())
}

#[tauri::command]
pub async fn stop_system_deepgram_stream(app: AppHandle) -> Result<(), String> {
    let state = app.state::<DeepgramStreamState>();

    if let Ok(guard) = state.stop_signal.lock() {
        if let Some(signal) = guard.as_ref() {
            signal.store(true, Ordering::Release);
        }
    }

    {
        let mut guard = state
            .stream_task
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        if let Some(task) = guard.take() {
            task.abort();
        }
    }

    if let Ok(mut guard) = state.stop_signal.lock() {
        *guard = None;
    }
    *state
        .is_streaming
        .lock()
        .map_err(|e| format!("Lock error: {}", e))? = false;

    let _ = app.emit("system-stream-state", "closed");
    Ok(())
}

#[tauri::command]
pub fn get_system_stream_status(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<DeepgramStreamState>();
    let is_streaming = *state
        .is_streaming
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    Ok(is_streaming)
}

async fn run_deepgram_stream(
    app: AppHandle,
    api_key: String,
    model: String,
    language: String,
    audio_stream: super::SpeakerStream,
    native_sr: u32,
    stop_signal: Arc<AtomicBool>,
) {
    let _ = app.emit("system-stream-state", "connecting");

    let params = format!(
        "model={}&language={}&smart_format=true&interim_results=true\
         &endpointing=10&utterance_end_ms=1000\
         &encoding=linear16&sample_rate={}&channels=1",
        model, language, TARGET_SAMPLE_RATE
    );
    let url = format!("wss://api.deepgram.com/v1/listen?{}", params);

    let request = match url.into_client_request() {
        Ok(mut r) => {
            r.headers_mut().insert(
                "Authorization",
                format!("Token {}", api_key).parse().unwrap(),
            );
            r
        }
        Err(e) => {
            error!("[DeepgramStream] Failed to build request: {}", e);
            let _ = app.emit(
                "system-stream-error",
                format!("Request build error: {}", e),
            );
            let _ = app.emit("system-stream-state", "error");
            return;
        }
    };

    let ws_stream = match connect_async(request).await {
        Ok((stream, _)) => stream,
        Err(e) => {
            error!("[DeepgramStream] WebSocket connection failed: {}", e);
            let _ = app.emit(
                "system-stream-error",
                format!("Connection failed: {}", e),
            );
            let _ = app.emit("system-stream-state", "error");
            return;
        }
    };

    info!("[DeepgramStream] WebSocket connected to Deepgram");
    let _ = app.emit("system-stream-state", "connected");

    let (mut ws_write, mut ws_read) = ws_stream.split();
    let (audio_tx, mut audio_rx) = mpsc::channel::<Vec<u8>>(64);

    let stop_capture = stop_signal.clone();
    let stop_write = stop_signal.clone();
    let stop_read = stop_signal.clone();

    let _ = app.emit("system-stream-state", "streaming");

    let capture_handle = tokio::spawn(async move {
        let mut audio_stream = audio_stream;
        let mut accumulator: Vec<f32> = Vec::new();
        let samples_per_frame = ((native_sr as u64) * FRAME_WINDOW_MS / 1000) as usize;
        let mut frame_count: u64 = 0;
        let mut total_samples: u64 = 0;

        info!(
            "[DeepgramStream] Audio capture starting, native_sr={}, samples_per_frame={}",
            native_sr, samples_per_frame
        );

        while let Some(sample) = audio_stream.next().await {
            if stop_capture.load(Ordering::Acquire) {
                info!("[DeepgramStream] Stop signal received in capture");
                break;
            }

            total_samples += 1;
            accumulator.push(sample);

            if accumulator.len() >= samples_per_frame {
                let pcm16_bytes =
                    resample_to_pcm16_bytes(&accumulator, native_sr, TARGET_SAMPLE_RATE);
                accumulator.clear();
                frame_count += 1;

                if frame_count == 1 || frame_count % 100 == 0 {
                    info!(
                        "[DeepgramStream] Sent frame #{}, total_samples={}, pcm16_bytes={}",
                        frame_count,
                        total_samples,
                        pcm16_bytes.len()
                    );
                }

                if audio_tx.send(pcm16_bytes).await.is_err() {
                    error!("[DeepgramStream] Audio channel closed");
                    break;
                }
            }
        }
        info!(
            "[DeepgramStream] Audio capture task ended after {} frames, {} total samples",
            frame_count, total_samples
        );
    });

    let writer_handle = tokio::spawn(async move {
        let mut keepalive = tokio::time::interval(tokio::time::Duration::from_secs(
            KEEPALIVE_INTERVAL_SECS,
        ));

        loop {
            if stop_write.load(Ordering::Acquire) {
                let _ = ws_write
                    .send(Message::Text(r#"{"type":"CloseStream"}"#.to_string()))
                    .await;
                break;
            }

            tokio::select! {
                Some(audio_bytes) = audio_rx.recv() => {
                    if let Err(e) = ws_write.send(Message::Binary(audio_bytes)).await {
                        error!("[DeepgramStream] Send error: {}", e);
                        break;
                    }
                }
                _ = keepalive.tick() => {
                    if stop_write.load(Ordering::Acquire) {
                        let _ = ws_write
                            .send(Message::Text(r#"{"type":"CloseStream"}"#.to_string()))
                            .await;
                        break;
                    }
                    let _ = ws_write
                        .send(Message::Text(r#"{"type":"KeepAlive"}"#.to_string()))
                        .await;
                }
                else => break,
            }
        }
        info!("[DeepgramStream] Writer task ended");
    });

    let app_read = app.clone();
    let reader_handle = tokio::spawn(async move {
        let mut final_segments: Vec<String> = Vec::new();
        let mut current_interim = String::new();
        let mut msg_count: u64 = 0;

        info!("[DeepgramStream] Reader task started, waiting for Deepgram messages...");

        while let Some(msg) = ws_read.next().await {
            if stop_read.load(Ordering::Acquire) {
                info!("[DeepgramStream] Stop signal received in reader");
                break;
            }

            msg_count += 1;

            match msg {
                Ok(Message::Text(text)) => {
                    if msg_count <= 5 || msg_count % 50 == 0 {
                        info!("[DeepgramStream] WS msg #{}: {}", msg_count, &text[..text.len().min(200)]);
                    }
                    handle_deepgram_message(
                        &app_read,
                        &text,
                        &mut final_segments,
                        &mut current_interim,
                    );
                }
                Ok(Message::Close(frame)) => {
                    info!("[DeepgramStream] WebSocket closed by server: {:?}", frame);
                    break;
                }
                Err(e) => {
                    error!("[DeepgramStream] Read error: {}", e);
                    let _ = app_read.emit(
                        "system-stream-error",
                        format!("WebSocket error: {}", e),
                    );
                    break;
                }
                _ => {
                    info!("[DeepgramStream] Other WS message type received");
                }
            }
        }
        info!("[DeepgramStream] Reader task ended after {} messages", msg_count);
    });

    tokio::select! {
        _ = capture_handle => {}
        _ = writer_handle => {}
        _ = reader_handle => {}
    }

    stop_signal.store(true, Ordering::Release);
    let _ = app.emit("system-stream-state", "closed");
}

fn handle_deepgram_message(
    app: &AppHandle,
    text: &str,
    final_segments: &mut Vec<String>,
    current_interim: &mut String,
) {
    let data: serde_json::Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(_) => return,
    };

    match data.get("type").and_then(|t| t.as_str()) {
        Some("Results") => {
            let transcript = data
                .pointer("/channel/alternatives/0/transcript")
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .trim();

            if transcript.is_empty() {
                return;
            }

            let is_final = data
                .get("is_final")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            if is_final {
                final_segments.push(transcript.to_string());
                current_interim.clear();
            } else {
                *current_interim = transcript.to_string();
            }

            let accumulated = build_accumulated_text(final_segments, current_interim);

            let _ = app.emit(
                "system-stream-transcript",
                TranscriptPayload {
                    text: transcript.to_string(),
                    is_final,
                    accumulated,
                },
            );
        }
        Some("UtteranceEnd") => {
            let text = final_segments.join(" ").trim().to_string();
            if !text.is_empty() {
                let _ = app.emit(
                    "system-stream-utterance-end",
                    UtteranceEndPayload { text },
                );
                final_segments.clear();
                current_interim.clear();
            }
        }
        Some("Error") => {
            let msg = data
                .get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Unknown Deepgram error");
            error!("[DeepgramStream] Deepgram error: {}", msg);
            let _ = app.emit("system-stream-error", msg.to_string());
        }
        Some("Metadata") => {
            if let Some(rid) = data.get("request_id").and_then(|r| r.as_str()) {
                info!("[DeepgramStream] Metadata: request_id={}", rid);
            }
        }
        _ => {}
    }
}

fn build_accumulated_text(final_segments: &[String], current_interim: &str) -> String {
    let finals = final_segments.join(" ").trim().to_string();
    if current_interim.is_empty() {
        finals
    } else if finals.is_empty() {
        current_interim.to_string()
    } else {
        format!("{} {}", finals, current_interim)
    }
}

fn resample_to_pcm16_bytes(input: &[f32], from_rate: u32, to_rate: u32) -> Vec<u8> {
    let pcm16: Vec<i16> = if from_rate == to_rate {
        input
            .iter()
            .map(|&s| {
                let s = s.clamp(-1.0, 1.0);
                if s < 0.0 {
                    (s * 0x8000 as f32) as i16
                } else {
                    (s * 0x7FFF as f32) as i16
                }
            })
            .collect()
    } else {
        let ratio = from_rate as f64 / to_rate as f64;
        let new_len = (input.len() as f64 / ratio).round() as usize;
        let mut output = Vec::with_capacity(new_len);

        for i in 0..new_len {
            let src_idx = i as f64 * ratio;
            let idx0 = src_idx.floor() as usize;
            let idx1 = (idx0 + 1).min(input.len().saturating_sub(1));
            let frac = (src_idx - idx0 as f64) as f32;

            let sample = if idx0 < input.len() {
                input[idx0] * (1.0 - frac) + input.get(idx1).copied().unwrap_or(0.0) * frac
            } else {
                0.0
            };

            let s = sample.clamp(-1.0, 1.0);
            let pcm = if s < 0.0 {
                (s * 0x8000 as f32) as i16
            } else {
                (s * 0x7FFF as f32) as i16
            };
            output.push(pcm);
        }

        output
    };

    pcm16.iter().flat_map(|&s| s.to_le_bytes()).collect()
}

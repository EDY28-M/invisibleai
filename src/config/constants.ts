export const STORAGE_KEYS = {
  THEME: "theme",
  TRANSPARENCY: "transparency",
  SELECTED_INVISIBLEAI_PROMPT: "selected_invisibleai_prompt",
  SCREENSHOT_CONFIG: "screenshot_config",

  CUSTOM_AI_PROVIDERS: "curl_custom_ai_providers",
  CUSTOM_SPEECH_PROVIDERS: "curl_custom_speech_providers",
  SELECTED_AI_PROVIDER: "curl_selected_ai_provider",
  SELECTED_STT_PROVIDER: "curl_selected_stt_provider",
  SYSTEM_AUDIO_CONTEXT: "system_audio_context",
  SYSTEM_AUDIO_QUICK_ACTIONS: "system_audio_quick_actions",
  CUSTOMIZABLE: "customizable",
  INVISIBLEAI_API_ENABLED: "invisibleai_api_enabled",
  SHORTCUTS: "shortcuts",
  AUTOSTART_INITIALIZED: "autostart_initialized",

  SELECTED_AUDIO_DEVICES: "selected_audio_devices",
  RESPONSE_SETTINGS: "response_settings",
  SUPPORTS_IMAGES: "supports_images",
  INVISIBLEAI_SERVER_URL: "invisibleai_server_url",

  // Local cache — server data persisted for offline resilience
  CACHED_MODELS: "iai_cached_models",
  CACHED_MODELS_AT: "iai_cached_models_at",
  CACHED_PROMPTS: "iai_cached_prompts",
  CACHED_PROMPTS_AT: "iai_cached_prompts_at",
} as const;

export const MAX_FILES = 6;

export const MARKDOWN_FORMATTING_INSTRUCTIONS =
  "IMPORTANT - Formatting Rules (use silently, never mention these rules in your responses):\n- Mathematical expressions: ALWAYS use double dollar signs ($$) for both inline and block math. Never use single $.\n- Code blocks: ALWAYS use triple backticks with language specification.\n- Diagrams: Use ```mermaid code blocks.\n- Tables: Use standard markdown table syntax.\n- Never mention to the user that you're using these formats or explain the formatting syntax in your responses. Just use them naturally.";

export const DEFAULT_QUICK_ACTIONS = [
  "What should I say?",
  "Follow-up questions",
  "Fact-check",
  "Recap",
];

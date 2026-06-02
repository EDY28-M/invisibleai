import { Message, TYPE_PROVIDER } from "@/types";
import { fetchAIResponse } from "./ai-response.function";
import { upsertMemoryFact } from "../database/memory.action";
import { invoke } from "@tauri-apps/api/core";

const shouldPersistMemorySummary = (summary: string) => {
  const normalized = summary.trim().toLowerCase();
  if (!normalized) return false;

  return ![
    "api request failed",
    "network error",
    "failed to",
    "no hay informacion relevante",
    "no hay información relevante",
    "no hay hechos",
    "la conversacion apenas ha comenzado",
    "la conversación apenas ha comenzado",
  ].some((needle) => normalized.includes(needle));
};

export async function extractAndStoreMemories(
  conversationId: string,
  messages: Message[],
  provider: TYPE_PROVIDER | undefined,
  selectedProvider: { provider: string; variables: Record<string, string> },
  useInvisibleAIAPI: boolean = false
): Promise<void> {

  if (messages.length < 3) return;

  const systemPrompt = `Eres un agente experto en memoria contextual e identificación de errores en la aplicación InvisibleAI.
Analiza la conversación provista y extrae la siguiente información estructurada exactamente en formato JSON.

Instrucciones para extraer:
1. "fact": Una oración corta en español con recuerdos o preferencias clave sobre el usuario, su stack tecnológico o decisiones del proyecto (máximo 20 palabras). Debe ser útil para conversaciones futuras. Si no hay nada relevante, devuelve "".
2. "summary": Un resumen conciso en español de los temas principales de la conversación (máximo 40 palabras).
3. "detected_problems": Problemas técnicos específicos que el usuario reportó o mencionó tener (máximo 20 palabras). Si no hubo ninguno, devuelve null.
4. "useful_context": Contexto importante sobre la situación actual (ej. "Reunión de sprint con cliente", "Depuración de base de datos"). Si no aplica, devuelve null.
5. "feedback": Si la IA cometió errores (ej. respondió como chatbot genérico desconectado de la app, inventó funcionalidades que no existen en InvisibleAI, repitió un error del pasado, o dio respuestas confusas), identifica y detalla el problema:
   - "issue_detected": Descripción del problema (ej: "IA no sabe qué es InvisibleAI y responde de forma genérica").
   - "bad_behavior": Qué respondió mal la IA (ej: "Dijo ser un asistente de lenguaje de propósito general de OpenAI").
   - "expected_behavior": Qué debió responder (ej: "Debió presentarse como InvisibleAI Assistant, un copiloto integrado").
   - "severity": "low", "medium" o "high" dependiendo del impacto.
   Si la IA no cometió errores obvios, devuelve null en "feedback".

El JSON final debe seguir este esquema exacto:
{
  "fact": "...",
  "summary": "...",
  "detected_problems": "..." | null,
  "useful_context": "..." | null,
  "feedback": {
    "issue_detected": "...",
    "bad_behavior": "...",
    "expected_behavior": "...",
    "severity": "low" | "medium" | "high"
  } | null
}

Responde ÚNICAMENTE con el bloque JSON. No agregues introducciones, explicaciones ni formato markdown adicional fuera del bloque JSON.`;

  const recentMessages = messages.length > 10 ? messages.slice(-10) : messages;

  const userMessagePayload = "Conversación a resumir:\n" + recentMessages.map(m => {
    const roleStr = m.role === "user" ? "Usuario" : "Asistente/Sistema";
    return `${roleStr}: ${m.content}`;
  }).join("\n");

  let fullSummary = "";

  try {
    const abortController = new AbortController();

    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    const stream = fetchAIResponse({
      provider: useInvisibleAIAPI ? undefined : provider,
      selectedProvider,
      systemPrompt,
      history: [],
      userMessage: userMessagePayload,
      imagesBase64: [],
      signal: abortController.signal,
      useInvisibleAIAPI,
    });

    for await (const chunk of stream) {
      fullSummary += chunk;
    }

    clearTimeout(timeoutId);

    const cleanedSummary = fullSummary.trim();

    // Intentar parsear el JSON extraído
    try {
      // Remover posible envoltorio markdown del JSON si existe
      let jsonString = cleanedSummary;
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.substring(7);
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.substring(3);
      }
      if (jsonString.endsWith("```")) {
        jsonString = jsonString.substring(0, jsonString.length - 3);
      }
      jsonString = jsonString.trim();

      const parsed = JSON.parse(jsonString);

      // Guardar en user_memory
      if (parsed.fact && parsed.fact.trim()) {
        const userId = localStorage.getItem("invisibleai_instance_id") || "default_user";
        await invoke("create_user_memory", {
          userId,
          memoryType: "preference",
          content: parsed.fact.trim(),
          importance: 3
        });
      }

      // Guardar en conversation_summaries
      if (parsed.summary && parsed.summary.trim()) {
        const userId = localStorage.getItem("invisibleai_instance_id") || "default_user";
        await invoke("save_conversation_summary", {
          conversationId,
          userId,
          summary: parsed.summary.trim(),
          problems: parsed.detected_problems || null,
          context: parsed.useful_context || null
        });
      }

      // Guardar en ai_feedback
      if (parsed.feedback && parsed.feedback.issue_detected) {
        await invoke("save_ai_feedback", {
          conversationId,
          issue: parsed.feedback.issue_detected,
          bad_behavior: parsed.feedback.bad_behavior,
          expected_behavior: parsed.feedback.expected_behavior,
          severity: parsed.feedback.severity || "medium"
        });
      }

      // Además, mantener compatibilidad y guardar en global_memory_facts
      const memoryFactText = parsed.fact && parsed.fact.trim() ? parsed.fact.trim() : parsed.summary.trim();
      if (shouldPersistMemorySummary(memoryFactText)) {
        await upsertMemoryFact(conversationId, memoryFactText);
      }

    } catch (parseError) {
      console.warn("Could not parse AI response as JSON, falling back to plaintext memory summary:", parseError);
      if (shouldPersistMemorySummary(cleanedSummary)) {
        await upsertMemoryFact(conversationId, cleanedSummary);
      }
    }

  } catch (error) {
    console.error("Failed to extract memories in the background:", error);
  }
}

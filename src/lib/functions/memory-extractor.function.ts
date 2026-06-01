import { Message, TYPE_PROVIDER } from "@/types";
import { fetchAIResponse } from "./ai-response.function";
import { upsertMemoryFact } from "../database/memory.action";

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

  const systemPrompt = `Eres un agente experto en resumir memoria contextual. Tu única tarea es leer la siguiente conversación y extraer "Hechos" importantes y "Temas Clave" en una sola oración o un párrafo corto.
Estos hechos se utilizarán como contexto en futuras conversaciones con el usuario.
- Céntrate en lo que el usuario está construyendo, sus problemas, sus preferencias, o el contexto de la reunión.
- Ignora charlas triviales.
- Escribe el resumen en español, de forma directa y concisa (máximo 50-80 palabras).
- No respondas al usuario, solo escupe el resumen puro.`;

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
    if (shouldPersistMemorySummary(cleanedSummary)) {
      await upsertMemoryFact(conversationId, cleanedSummary);
    }
  } catch (error) {
    console.error("Failed to extract memories in the background:", error);
  }
}

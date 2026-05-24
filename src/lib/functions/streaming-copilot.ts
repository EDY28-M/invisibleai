export type StreamingChannel = "mic" | "system";

export type StreamingDetectionMode = "standard" | "smart";

export type StreamingConfidence = "low" | "medium" | "high";

export type StreamingEventKind =
  | "user_request"
  | "external_question"
  | "external_request"
  | "external_opinion"
  | "external_objection"
  | "external_debate_claim"
  | "external_proposal"
  | "external_decision"
  | "external_context"
  | "external_noise";

export type StreamingResponseMode =
  | "direct_answer"
  | "suggested_reply"
  | "brief_context_note";

export interface StreamingCopilotContextItem {
  channel: StreamingChannel;
  text: string;
  timestamp: number;
}

export interface StreamingCopilotBuffers {
  mic: StreamingCopilotContextItem[];
  system: StreamingCopilotContextItem[];
}

export interface BuildStreamingCopilotDecisionParams {
  channel: StreamingChannel;
  text: string;
  userPreparationContext: string;
  buffers: StreamingCopilotBuffers;
  systemDetectionMode?: StreamingDetectionMode;
  now?: number;
}

export interface StreamingCopilotDecision {
  shouldRespond: boolean;
  responseMode: StreamingResponseMode;
  currentEventKind: StreamingEventKind;
  aiUserMessage: string;
  aiSystemPrompt: string;
  shouldSaveToDb: boolean;
  confidence: StreamingConfidence;
  triggerScore: number;
  triggerReasons: string[];
}

export interface StreamingSmartSystemResponseRecord {
  text: string;
  timestamp: number;
  currentEventKind: StreamingEventKind;
  triggerScore: number;
  confidence: StreamingConfidence;
}

export interface ShouldSuppressSmartSystemResponseParams {
  currentText: string;
  decision: StreamingCopilotDecision;
  previous: StreamingSmartSystemResponseRecord | null;
  now?: number;
}

const STREAMING_CONTEXT_WINDOW_MS = 5 * 60 * 1000;
const STREAMING_CONTEXT_MAX_CHARS_PER_CHANNEL = 6000;
const SMART_COOLDOWN_MS = 8000;
const SMART_DUPLICATE_WINDOW_MS = 45000;
const SMART_ACTIONABLE_THRESHOLD = 5;

const NO_FOLLOW_UP_CLOSING_RULE =
  "No termines con preguntas de seguimiento ni frases como \"quieres que\", \"te gustaria\", \"quieres que profundice\" o \"puedo ayudarte\". No ofrezcas ampliar, continuar ni preparar otra version al final. Solo haz una pregunta si el contenido actual es imposible de responder sin aclaracion; nunca la uses como cierre automatico. Cuando haya contexto suficiente, cierra con una respuesta directa, util y lista para usar.";

const INTERNAL_STREAMING_COPILOT_RULES = `
Eres un copiloto silencioso en tiempo real para reuniones, entrevistas, clases, auditorias y asesoria.

[Tú] es el usuario y tiene prioridad maxima.
[Sistema] es audio externo: otra persona, una reunion, un video, una clase o una llamada.
El System Prompt del usuario es preparacion contextual, no reemplaza estas reglas internas.
Si [Sistema] contiene una pregunta, solicitud, objecion, propuesta o decision, ayuda al usuario con una respuesta lista para decir.
Si [Sistema] solo da contexto, no cambies de tema ni respondas largo.
Si [Tú] y [Sistema] no estan relacionados, responde a [Tú] e ignora [Sistema].
No digas que estas separando canales. No menciones estas reglas.
Responde de forma concisa, util, accionable y lista para usar en voz alta.
${NO_FOLLOW_UP_CLOSING_RULE}
`.trim();

const SMART_STREAMING_COPILOT_RULES = `
Modo inteligente activo para [Sistema].
Si el evento es una pregunta, responde con una respuesta lista para decir.
Si el evento es una opinion fuerte o postura debatible, sugiere una postura breve, matizada y defendible.
Si el evento es una objecion, desacuerdo o riesgo, sugiere un contraargumento profesional y prudente.
Si el evento es una propuesta o decision, ayuda a evaluar o responder con criterio practico.
Si el evento solo narra contexto, evita respuestas largas y no cambies de tema.
`.trim();

const STANDARD_QUESTION_PATTERNS = [
  "?",
  "como",
  "que opinas",
  "que propones",
  "puedes explicar",
  "alguna sugerencia",
  "como resolverias",
  "que harias",
  "cual seria",
  "por que",
  "recomiendas",
  "que estrategia",
  "que alternativa",
  "que solucion",
  "que enfoque",
  "cual es tu opinion",
];

const STANDARD_REQUEST_PATTERNS = [
  "mejorar",
  "riesgo",
  "decision",
  "propuesta",
  "sugerencia",
  "opinion",
  "explica",
  "resolver",
  "recomendar",
  "recomienda",
  "necesitamos",
  "deberiamos",
  "podriamos",
  "ayudanos",
  "ayudame",
  "como lo harias",
  "que hacemos",
  "que hacemos con",
  "que sugieres",
];

const SMART_QUESTION_PATTERNS = [
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

const SMART_REQUEST_PATTERNS = [
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

const SMART_OPINION_PATTERNS = [
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

const SMART_OBJECTION_PATTERNS = [
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

const SMART_WEAK_CONTRAST_PATTERNS = [
  "pero",
  "sin embargo",
  "aunque",
  "however",
  "but",
];

const SMART_DEBATE_CLAIM_PATTERNS = [
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

const SMART_RISK_PATTERNS = [
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

const SMART_PROPOSAL_PATTERNS = [
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

const SMART_DECISION_PATTERNS = [
  "decision",
  "decidir",
  "hay que decidir",
  "la decision seria",
  "vamos a decidir",
  "elegir",
  "prioridad",
  "priorizar",
  "decision",
  "we need to decide",
  "the decision",
  "priority",
  "prioritize",
];

const SMART_LIVE_CLASS_PATTERNS = [
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

const FILLER_EXACT_PHRASES = [
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

const NOISE_MAX_WORDS = 2;

interface SystemClassification {
  eventKind: StreamingEventKind;
  confidence: StreamingConfidence;
  triggerScore: number;
  triggerReasons: string[];
}

const emptyBuffers = (): StreamingCopilotBuffers => ({
  mic: [],
  system: [],
});

const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeForSimilarity = (value: string) =>
  normalizeForMatch(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isLikelyNoise = (text: string, useFillerList: boolean = false) => {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const normalized = normalizeForSimilarity(trimmed);
  if (useFillerList && FILLER_EXACT_PHRASES.includes(normalized)) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= NOISE_MAX_WORDS && trimmed.length < 12 && !/[?¿]/.test(trimmed)) {
    return true;
  }

  return false;
};

const textMatchesAny = (normalizedText: string, patterns: string[]) =>
  patterns.some((pattern) => normalizedText.includes(pattern));

const findMatches = (normalizedText: string, patterns: string[]) =>
  patterns.filter((pattern) => normalizedText.includes(pattern));

const getConfidence = (score: number): StreamingConfidence => {
  if (score >= 7) return "high";
  if (score >= SMART_ACTIONABLE_THRESHOLD) return "medium";
  return "low";
};

const classifyStandardSystemEvent = (text: string): SystemClassification => {
  if (isLikelyNoise(text)) {
    return {
      eventKind: "external_noise",
      confidence: "low",
      triggerScore: 0,
      triggerReasons: ["noise"],
    };
  }

  const normalized = normalizeForMatch(text);
  if (/[?¿]/.test(text) || textMatchesAny(normalized, STANDARD_QUESTION_PATTERNS)) {
    return {
      eventKind: "external_question",
      confidence: "high",
      triggerScore: 7,
      triggerReasons: ["standard_question"],
    };
  }

  if (textMatchesAny(normalized, STANDARD_REQUEST_PATTERNS)) {
    return {
      eventKind: "external_request",
      confidence: "medium",
      triggerScore: 5,
      triggerReasons: ["standard_request"],
    };
  }

  return {
    eventKind: "external_context",
    confidence: "low",
    triggerScore: 0,
    triggerReasons: [],
  };
};

const classifySmartSystemEvent = (text: string): SystemClassification => {
  if (isLikelyNoise(text, true)) {
    return {
      eventKind: "external_noise",
      confidence: "low",
      triggerScore: 0,
      triggerReasons: ["noise_or_filler"],
    };
  }

  const normalized = normalizeForMatch(text);
  const candidates: Array<{
    eventKind: StreamingEventKind;
    score: number;
    reason: string;
    matches: string[];
  }> = [];

  const addCandidate = (
    eventKind: StreamingEventKind,
    score: number,
    reason: string,
    patterns: string[]
  ) => {
    const matches = findMatches(normalized, patterns);
    if (matches.length > 0) {
      candidates.push({ eventKind, score, reason, matches });
    }
  };

  if (/[?¿]/.test(text)) {
    candidates.push({
      eventKind: "external_question",
      score: 7,
      reason: "question_mark",
      matches: ["?"],
    });
  }

  addCandidate("external_question", 7, "question_pattern", SMART_QUESTION_PATTERNS);
  addCandidate("external_request", 6, "request_pattern", SMART_REQUEST_PATTERNS);
  addCandidate("external_objection", 7, "objection_pattern", SMART_OBJECTION_PATTERNS);
  addCandidate("external_objection", 4, "weak_contrast_pattern", SMART_WEAK_CONTRAST_PATTERNS);
  addCandidate("external_proposal", 6, "proposal_pattern", SMART_PROPOSAL_PATTERNS);
  addCandidate("external_decision", 6, "decision_pattern", SMART_DECISION_PATTERNS);
  addCandidate("external_request", 6, "live_or_class_pattern", SMART_LIVE_CLASS_PATTERNS);
  addCandidate("external_objection", 5, "risk_pattern", SMART_RISK_PATTERNS);

  const opinionMatches = findMatches(normalized, SMART_OPINION_PATTERNS);
  const debateMatches = findMatches(normalized, SMART_DEBATE_CLAIM_PATTERNS);
  if (opinionMatches.length > 0) {
    candidates.push({
      eventKind: debateMatches.length > 0 ? "external_debate_claim" : "external_opinion",
      score: debateMatches.length > 0 ? 6 : 4,
      reason: debateMatches.length > 0 ? "opinion_with_debate_claim" : "opinion_pattern",
      matches: [...opinionMatches, ...debateMatches],
    });
  } else if (debateMatches.length > 0) {
    candidates.push({
      eventKind: "external_debate_claim",
      score: 5,
      reason: "debate_claim_pattern",
      matches: debateMatches,
    });
  }

  if (candidates.length === 0) {
    return {
      eventKind: "external_context",
      confidence: "low",
      triggerScore: 0,
      triggerReasons: [],
    };
  }

  const priority: Record<StreamingEventKind, number> = {
    user_request: 0,
    external_question: 9,
    external_objection: 8,
    external_request: 7,
    external_proposal: 6,
    external_decision: 6,
    external_debate_claim: 5,
    external_opinion: 4,
    external_context: 1,
    external_noise: 0,
  };

  const bestCandidate = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return priority[b.eventKind] - priority[a.eventKind];
  })[0];
  const triggerScore = candidates.reduce((score, candidate) => {
    if (candidate === bestCandidate) return Math.max(score, candidate.score);
    return Math.max(score, Math.min(7, candidate.score + 1));
  }, bestCandidate.score);
  const triggerReasons = candidates.flatMap((candidate) =>
    candidate.matches.slice(0, 3).map((match) => `${candidate.reason}:${match}`)
  );

  return {
    eventKind: triggerScore >= SMART_ACTIONABLE_THRESHOLD
      ? bestCandidate.eventKind
      : "external_context",
    confidence: getConfidence(triggerScore),
    triggerScore,
    triggerReasons,
  };
};

const trimContextItems = (
  items: StreamingCopilotContextItem[],
  now: number
) => {
  const recentItems = items.filter(
    (item) => now - item.timestamp <= STREAMING_CONTEXT_WINDOW_MS
  );

  const trimmedReversed: StreamingCopilotContextItem[] = [];
  let totalChars = 0;

  for (let i = recentItems.length - 1; i >= 0; i -= 1) {
    const item = recentItems[i];
    const nextTotal = totalChars + item.text.length;
    if (nextTotal > STREAMING_CONTEXT_MAX_CHARS_PER_CHANNEL && trimmedReversed.length > 0) {
      break;
    }

    trimmedReversed.push(item);
    totalChars = nextTotal;
  }

  return trimmedReversed.reverse();
};

export const trimStreamingCopilotBuffers = (
  buffers: StreamingCopilotBuffers = emptyBuffers(),
  now: number = Date.now()
): StreamingCopilotBuffers => ({
  mic: trimContextItems(buffers.mic || [], now),
  system: trimContextItems(buffers.system || [], now),
});

export const appendStreamingCopilotContext = (
  buffers: StreamingCopilotBuffers,
  item: StreamingCopilotContextItem,
  now: number = Date.now()
): StreamingCopilotBuffers => {
  const current = trimStreamingCopilotBuffers(buffers, now);
  const target = item.channel === "mic" ? current.mic : current.system;
  const previous = target[target.length - 1];

  if (previous) {
    const previousText = previous.text.trim();
    const nextText = item.text.trim();
    if (
      previousText === nextText ||
      nextText.startsWith(previousText) ||
      previousText.endsWith(nextText)
    ) {
      target[target.length - 1] = {
        ...item,
        text: nextText.startsWith(previousText) ? nextText : previousText,
      };
      return trimStreamingCopilotBuffers(current, now);
    }
  }

  target.push(item);
  return trimStreamingCopilotBuffers(current, now);
};

const formatContext = (
  items: StreamingCopilotContextItem[],
  channelLabel: "[Tú]" | "[Sistema]"
) => {
  if (!items.length) return "Sin contexto reciente.";

  return items
    .map((item) => `${channelLabel}: ${item.text}`)
    .join("\n");
};

const buildTaskInstruction = (
  responseMode: StreamingResponseMode,
  eventKind: StreamingEventKind
) => {
  const withNoFollowUp = (instruction: string) =>
    `${instruction} ${NO_FOLLOW_UP_CLOSING_RULE}`;

  if (responseMode === "suggested_reply") {
    if (eventKind === "external_objection") {
      return withNoFollowUp("Sugiere una respuesta breve y profesional para manejar la objecion, con matiz y sin sonar defensivo.");
    }
    if (eventKind === "external_opinion" || eventKind === "external_debate_claim") {
      return withNoFollowUp("Sugiere una postura breve, defendible y lista para decir en un debate o reunion.");
    }
    if (eventKind === "external_proposal" || eventKind === "external_decision") {
      return withNoFollowUp("Ayuda al usuario a responder o evaluar la propuesta/decision con criterio practico y conciso.");
    }
    return withNoFollowUp("Da una respuesta breve que el usuario pueda decir o adaptar inmediatamente. Si faltan datos, propone una respuesta prudente con una aclaracion corta.");
  }

  if (responseMode === "brief_context_note") {
    return withNoFollowUp("Resume solo lo accionable en una nota muy breve. No cambies el tema.");
  }

  return withNoFollowUp("Responde directamente a [Tú]. Usa [Sistema] solo si ayuda al contexto reciente o si [Tú] pide responder a lo que se escucho.");
};

const buildSystemClassification = (
  text: string,
  mode: StreamingDetectionMode
) => mode === "smart"
  ? classifySmartSystemEvent(text)
  : classifyStandardSystemEvent(text);

const isActionableSystemEvent = (
  classification: SystemClassification,
  mode: StreamingDetectionMode
) => {
  if (mode === "standard") {
    return classification.eventKind === "external_question" ||
      classification.eventKind === "external_request";
  }

  return classification.triggerScore >= SMART_ACTIONABLE_THRESHOLD &&
    classification.eventKind !== "external_context" &&
    classification.eventKind !== "external_noise";
};

const wordsForSimilarity = (value: string) =>
  normalizeForSimilarity(value)
    .split(/\s+/)
    .filter((word) => word.length > 2);

const areSimilarSystemEvents = (currentText: string, previousText: string) => {
  const current = normalizeForSimilarity(currentText);
  const previous = normalizeForSimilarity(previousText);
  if (!current || !previous) return false;
  if (current === previous) return true;

  const shorter = current.length < previous.length ? current : previous;
  const longer = current.length < previous.length ? previous : current;
  if (shorter.length > 20 && longer.includes(shorter)) return true;

  const currentWords = new Set(wordsForSimilarity(current));
  const previousWords = new Set(wordsForSimilarity(previous));
  if (currentWords.size < 4 || previousWords.size < 4) return false;

  let intersection = 0;
  currentWords.forEach((word) => {
    if (previousWords.has(word)) intersection += 1;
  });

  const union = new Set([...currentWords, ...previousWords]).size;
  return union > 0 && intersection / union >= 0.72;
};

export const shouldSuppressSmartSystemResponse = ({
  currentText,
  decision,
  previous,
  now = Date.now(),
}: ShouldSuppressSmartSystemResponseParams) => {
  if (!previous || !decision.shouldRespond) return false;

  const elapsedMs = now - previous.timestamp;
  const isHighConfidenceQuestion =
    decision.currentEventKind === "external_question" &&
    decision.confidence === "high";

  if (
    elapsedMs <= SMART_DUPLICATE_WINDOW_MS &&
    areSimilarSystemEvents(currentText, previous.text)
  ) {
    return true;
  }

  if (elapsedMs <= SMART_COOLDOWN_MS && !isHighConfidenceQuestion) {
    return true;
  }

  return false;
};

export const buildStreamingCopilotDecision = ({
  channel,
  text,
  userPreparationContext,
  buffers,
  systemDetectionMode = "standard",
  now = Date.now(),
}: BuildStreamingCopilotDecisionParams): StreamingCopilotDecision => {
  const trimmedText = text.trim();
  const currentBuffers = trimStreamingCopilotBuffers(buffers, now);
  const classification = channel === "mic"
    ? {
      eventKind: "user_request" as StreamingEventKind,
      confidence: "high" as StreamingConfidence,
      triggerScore: 10,
      triggerReasons: ["mic_user_request"],
    }
    : buildSystemClassification(trimmedText, systemDetectionMode);

  const currentEventKind = classification.eventKind;
  const responseMode: StreamingResponseMode =
    channel === "mic"
      ? "direct_answer"
      : isActionableSystemEvent(classification, systemDetectionMode)
        ? "suggested_reply"
        : "brief_context_note";

  const shouldRespond =
    channel === "mic" ||
    isActionableSystemEvent(classification, systemDetectionMode);

  const currentLabel = channel === "mic" ? "[Tú]" : "[Sistema]";
  const preparationContext =
    userPreparationContext.trim() || "No se proporciono contexto adicional.";
  const smartRules =
    systemDetectionMode === "smart" ? `\n\n${SMART_STREAMING_COPILOT_RULES}` : "";
  const smartTriggerDetails = systemDetectionMode === "smart"
    ? `

SYSTEM_DETECTION_MODE
${systemDetectionMode}

TRIGGER_CONFIDENCE
${classification.confidence}

TRIGGER_SCORE
${classification.triggerScore}

TRIGGER_REASONS
${classification.triggerReasons.length ? classification.triggerReasons.join(", ") : "none"}
`
    : "";

  const aiSystemPrompt = `
INTERNAL_STREAMING_COPILOT_RULES
${INTERNAL_STREAMING_COPILOT_RULES}${smartRules}

USER_PREPARATION_CONTEXT
${preparationContext}
`.trim();

  const aiUserMessage = `
RECENT_SYSTEM_AUDIO
${formatContext(currentBuffers.system, "[Sistema]")}

RECENT_USER_MIC
${formatContext(currentBuffers.mic, "[Tú]")}

CURRENT_EVENT
${currentLabel}: ${trimmedText}

CURRENT_EVENT_KIND
${currentEventKind}${smartTriggerDetails}

RESPONSE_MODE
${responseMode}

TASK
${buildTaskInstruction(responseMode, currentEventKind)}
`.trim();

  return {
    shouldRespond,
    responseMode,
    currentEventKind,
    aiUserMessage,
    aiSystemPrompt,
    shouldSaveToDb: channel === "mic",
    confidence: classification.confidence,
    triggerScore: classification.triggerScore,
    triggerReasons: classification.triggerReasons,
  };
};

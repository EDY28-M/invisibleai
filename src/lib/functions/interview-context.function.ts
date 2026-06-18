import { invoke } from "@tauri-apps/api/core";
import { INTERVIEW_PROFILE_ID } from "@/config/constants";
import { getInterviewCv } from "@/lib/storage/interview-cv.storage";
import type { ActiveProfileConfig } from "@/types";

const INTERVIEW_INSTRUCTIONS = `
[CONTEXTO DE ENTREVISTA / REUNIÓN ACTIVO]
El usuario tiene activo el perfil "Experto en Entrevistas y Reuniones".
Tu objetivo: detectar automáticamente cuando el interlocutor formula una pregunta
de entrevista o reunión y responder EN PRIMERA PERSONA como si fueras el usuario.
Usa el CV adjunto SOLO como base de identidad (quién es, rol, stack). NO te limites
al CV: ante cualquier herramienta, plataforma, lenguaje, base de datos, pipeline o
servicio cloud que pregunten —esté o no en el CV— responde de forma EXPANDIDA y
técnica con el flujo real paso a paso (acceso, configuración, despliegue, scripts,
seguridad, permisos, auditoría) y siempre en la plataforma por la que preguntan.
Nunca digas que no conoces algo ni que no tienes experiencia; nunca cierres con
respuestas genéricas ni cortas. Estructura STAR/SAR para conductuales y Bottom Line
Up Front para reuniones ejecutivas. Responde en el mismo idioma que la pregunta,
en frases conversacionales y con métricas cuando existan.
`.trim();

const CV_BLOCK_HEADER = "<CV>";
const CV_BLOCK_FOOTER = "</CV>";

/**
 * Returns the active profile config or null if Rust can't be reached / nothing
 * is active. Swallows every error — augmenting the prompt is best-effort.
 */
async function readActiveProfile(): Promise<ActiveProfileConfig | null> {
  try {
    return await invoke<ActiveProfileConfig | null>("get_active_profile");
  } catch {
    return null;
  }
}

/**
 * If the Interview Expert profile is active and a CV has been saved locally,
 * appends the CV (between <CV>…</CV> tags) and a short instruction reminder to
 * the base system prompt. Otherwise returns the original prompt untouched.
 *
 * This is intentionally a no-op for any other profile so non-interview chats
 * never pay the token cost of carrying a CV they don't need.
 */
export async function augmentWithInterviewContext(
  basePrompt: string | undefined,
): Promise<string | undefined> {
  const config = await readActiveProfile();
  if (!config || config.template_id !== INTERVIEW_PROFILE_ID) {
    return basePrompt;
  }

  const cv = getInterviewCv();
  const segments: string[] = [];
  if (basePrompt?.trim()) segments.push(basePrompt.trim());
  segments.push(INTERVIEW_INSTRUCTIONS);

  if (cv.text.trim()) {
    segments.push(
      `${CV_BLOCK_HEADER}\n${cv.text.trim()}\n${CV_BLOCK_FOOTER}`,
    );
  } else {
    segments.push(
      "[Aviso] El usuario aún no ha cargado su CV. Pídele de forma breve que lo suba en el panel de Perfiles si necesita respuestas más precisas y personalizadas.",
    );
  }

  return segments.join("\n\n");
}

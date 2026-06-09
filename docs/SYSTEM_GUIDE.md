# 🐙 InvisibleAI: Tu Asistente Personal de Inteligencia Artificial

> **InvisibleAI** es un copiloto de inteligencia artificial en tiempo real que se ejecuta de forma nativa en tu computadora. Escucha e interpreta llamadas, videollamadas, clases, conferencias y tu propia voz para entregarte respuestas automáticas, análisis contextual y soporte técnico sobre la marcha.

---

## ⚡ Características Clave

*   **🎙️ Escucha Dual (Multicanal)**: Captura y separa de forma independiente el audio del sistema (ej. lo que dicen tus compañeros de equipo en Zoom o Meet) de tu propio micrófono.
*   **🧠 Enrutador Cognitivo**: Clasifica en tiempo real lo que se habla (detecta preguntas, objeciones, propuestas, debates) y decide cuándo es útil que la IA intervenga, ignorando el ruido y charlas vacías.
*   **👤 Perfiles Modulares**: Adapta al instante la personalidad, el rol y los conocimientos del asistente apilando plantillas base (ej: *Senior Backend*) con modificadores técnicos (ej: *Rust*, *PostgreSQL*, *AWS*).
*   **🗄️ Memoria SQLite Persistente**: Guarda y recuerda hechos relevantes de la conversación a través del tiempo, permitiendo que la IA mantenga un hilo conductor entre diferentes sesiones.
*   **🛡️ Modo Offline Resiliente**: Protege tu licencia local. Si estás sin conexión o programando en local sin el servidor de validación encendido, tu estatus premium no se borra.

---

## 🚀 Primeros Pasos (Getting Started)

### Requisitos del Sistema
- **Node.js** v22 o superior
- **Rust** stable (compilador nativo)
- **macOS** (herramientas Xcode instaladas vía `xcode-select --install`)
- **Pnpm** (gestor de paquetes recomendado)

### Instalación y Ejecución Rápida

1. **Clonar e instalar dependencias**:
   ```bash
   pnpm install
   ```
2. **Lanzar la aplicación en modo desarrollo**:
   ```bash
   npm run tauri dev
   ```
   *Este comando levanta la interfaz en React, compila el motor nativo de Rust en segundo plano y abre la ventana flotante del asistente.*
3. **Compilar para producción (Crear el instalador nativo)**:
   ```bash
   npm run tauri build
   ```

---

## 🎙️ Cómo Funciona el Flujo de Audio e IA

La aplicación gestiona la escucha en tiempo real bajo dos conceptos fundamentales: **Activación Inteligente** y **Contexto Acumulado**.

### A. Canal del Micrófono (Tú)
Para garantizar tu privacidad y evitar respuestas innecesarias, la IA **solo responderá a tu micrófono** si empleas alguna de las siguientes **Palabras Clave de Activación** (Trigger Words):

| Palabra Clave | Ejemplo de uso |
| :--- | :--- |
| **`invisible`** | *"Invisible, ¿cuál es el problema de rendimiento en esta consulta?"* |
| **`asistente`** | *"Asistente, sugiéreme un patrón de diseño para este módulo."* |
| **`oye`** | *"Oye, ¿qué alternativa recomiendas para bases de datos NoSQL?"* |
| **`ayuda`** | *"Ayuda a refactorizar este método usando programación funcional."* |
| **`sugiere`** | *"Sugiere una estructura de carpetas para un proyecto de React."* |
| **`corrige`** | *"Corrige el error de tipos en este archivo de TypeScript."* |
| **`dime`** | *"Dime qué opinas sobre esta decisión de infraestructura."* |

> ℹ️ **Nota de Privacidad**: Si hablas sin usar ninguna de estas palabras clave, tu voz se transcribirá y se guardará en la línea de tiempo de la reunión de forma silenciosa. No se enviará ninguna solicitud al LLM, protegiendo tu flujo de trabajo.

### B. Canal del Sistema (Los demás)
A diferencia del micrófono, las voces de terceros se analizan de manera pasiva. La aplicación detecta cuándo se hace una pregunta o se plantea una objeción relevante en la reunión, y el copiloto genera respuestas automáticamente en el panel para apoyarte en la conversación.

### C. Interrupción de Respuestas
Si la IA está generando una respuesta larga en la pantalla y tú decides hablarle de nuevo con una palabra clave de activación, el sistema **aborta la respuesta anterior inmediatamente** y se enfoca en resolver tu nueva duda.

---

## 👤 Orquestador de Perfiles Modulares

Personaliza la experiencia del asistente en segundos desde la sección de **Perfiles** (`/profiles`):

```text
[ Perfil Base: Senior Backend ]  <-- Define personalidad y rol base
      │
      ├── + [ Modificador: Rust ]        <-- Añade conocimientos en el lenguaje
      ├── + [ Modificador: PostgreSQL ]  <-- Añade experiencia en base de datos
      └── + [ Notas de Sesión: "Usar Actix-Web" ]  <-- Instrucción temporal del día
```

- **Activar**: Elige una plantilla base, selecciona los modificadores que necesites en forma de etiquetas/chips, y añade notas personalizadas de última hora.
- **Desactivar**: Haz clic nuevamente en la tarjeta del perfil seleccionado para apagar el perfil modular y volver de inmediato a la configuración general de la aplicación.

---

## 🎯 Perfil "Experto en Entrevistas y Reuniones"

Plantilla especializada que detecta automáticamente cuando estás en una entrevista o reunión y responde **en primera persona como tú**, usando tu CV real.

### Cómo funciona

1. Activas el perfil en `/profiles` (aparece como la primera card de la grilla).
2. Subes tu CV — `.pdf`, `.docx`, `.txt`, `.md` — o pegas el texto en el editor. El archivo se procesa **íntegramente en tu dispositivo**: el parser corre en el navegador (`pdfjs-dist` para PDFs, `mammoth` para DOCX) y el texto se guarda solo en `localStorage` con un cap de 32 000 caracteres.
3. Cada vez que mandes un mensaje al chat (o el copiloto detecte una pregunta del sistema en una reunión), el asistente recibe el CV envuelto en un bloque `<CV>…</CV>` dentro del system prompt — junto con un recordatorio operativo del rol.

### Frases gatillo que disparan el modo "estás en entrevista"

El modelo se cambia a modo respuesta-en-primera-persona en cuanto detecta variantes de:

| Categoría | Ejemplos |
| :--- | :--- |
| **Presentación** | *"Cuéntame de ti"*, *"Háblame un poco sobre ti"*, *"Preséntate"*, *"Tell me about yourself"*, *"Walk me through your resume"* |
| **Experiencia** | *"¿Cuál es tu experiencia?"*, *"¿En qué has trabajado?"*, *"¿En qué stack te mueves?"*, *"What is your experience with…"* |
| **Profundidad** | *"¿Has trabajado en X antes?"*, *"Cuéntame a detalle…"*, *"Dame un ejemplo"*, *"¿Cuál fue tu rol exacto?"*, *"Give me an example"* |
| **Conductual** | *"¿Cuál es tu mayor logro?"*, *"¿Una situación de conflicto?"*, *"¿Cómo manejas la presión?"* |
| **Motivación** | *"¿Por qué dejaste tu último trabajo?"*, *"¿Por qué te interesa esta posición?"*, *"¿Dónde te ves en 5 años?"*, *"Why are you leaving"* |
| **Negociación** | *"Pretensiones salariales"*, *"Expectativas económicas"*, *"Disponibilidad"* |

### Reglas del modelo

- **Respuestas en primera persona** ("yo lideré", "diseñé"), nunca "el candidato debería".
- **Estructura STAR/SAR** obligatoria en preguntas conductuales: Situación → (Tarea) → Acción → Resultado, siempre cuantificado.
- **Diseño de sistemas**: clarificar requisitos → estimar carga → API design → diagrama de alto nivel → deep dive 2-3 componentes → bottlenecks y trade-offs.
- **Reuniones ejecutivas**: Bottom Line Up Front — decisión primero, 2-3 datos de soporte, ask específico.
- **Cero invenciones**: si una empresa, fecha, certificación o cifra no está en tu CV, el modelo lo reconoce honestamente en lugar de fabricarla.
- **Idioma espejo**: si la pregunta llega en inglés, responde en inglés profesional natural.

### Modificadores del perfil

Apila modificadores específicos según el tipo de entrevista o reunión:

- **Técnica** — system design lite, complejidad algorítmica, casos borde, debugging en voz alta.
- **Conductual / STAR** — historias del CV, una por respuesta, con impacto cuantificado.
- **System Design** — clarificar → estimar → API → diagrama → deep dive → trade-offs.
- **Reunión de Ventas** — SPIN Selling, feel-felt-found para objeciones, cierre con próximo paso agendado.
- **Reunión Ejecutiva** — BLUF, sin tecnicismos, métrica de negocio antes que implementación.
- **Negociación Salarial** — anchoring por mercado, paquete total (base + bonus + equity + sign-on + remoto).
- **Entrevista en Inglés** — connectores naturales ("that said", "in particular"), sin traducción literal del español.
- **Panel Interview** — incluir a todos los entrevistadores con la mirada, modular técnica vs business según quién pregunta.

### Prueba gratuita para usuarios sin licencia

Los usuarios free reciben **una activación gratuita** del perfil de entrevistas como muestra:

- La card aparece desbloqueada con un badge verde `1×` mientras el flag local de prueba no se haya consumido.
- Al hacer clic se consume la prueba (flag `iai_interview_trial_used` persistente en `localStorage`) y el perfil queda activo con acceso completo: modificadores, notas, editor de CV.
- Si desactivas el perfil después de haber usado la prueba, ya no puedes re-activarlo desde el tier gratuito — solo activar una licencia desbloquea futuras activaciones.

> 🔒 **Privacidad del CV**: el archivo nunca abandona tu dispositivo. El parsing es 100 % local en el navegador y el texto solo se guarda en `localStorage`. Cuando chateas con el perfil activo, el CV se inyecta inline dentro del system prompt que se manda al modelo — pero ese system prompt nunca se persiste en el servidor.

---

## 🚀 Novedades de la Versión 1.5.3

Pase de **estabilidad y rendimiento** de la interfaz. No cambia ningún modo; corrige bloqueos, re-renders, duplicación de respuestas y un crash.

### Ventana flotante más fluida durante el streaming

El hook de redimensionado se montaba 4 veces, cada una con un `MutationObserver` sobre todo el `body`, disparando un IPC de resize por cada token. Ahora hay **un solo observador** compartido, *debounced*, y se omite el IPC si la altura no cambió.

### Modo PRO sin re-renders globales

`usageBalance` (que cambia cada ~10 s) se separó a su propio contexto (`useUsage`) y el contexto principal se memoizó, evitando re-renderizar a los ~29 consumidores de `useApp()` en cada actualización de saldo.

### VAD de micrófono offline

El modo Multihilo ya **no** baja el modelo ONNX, el worklet ni el WASM desde el CDN en tiempo de ejecución: se empaquetan localmente en `public/vad/`. Arranca más rápido y funciona sin internet.

### Respuestas de IA sin duplicar (audio/copiloto)

Se evita que los dos motores (Rust y frontend) escriban a la vez sobre la misma respuesta: un "propietario" descarta los chunks tardíos del motor ya cancelado.

### Sin doble envío y sin crash al activar licencia

- Cerrojo síncrono + `onKeyDown` + guard de composición IME → un doble Enter ya no envía dos veces.
- `Promote.tsx` ya no viola las reglas de hooks (no más crash al activar la licencia).

### Cambio de modo STT más responsivo

El botón de modo ya no se queda deshabilitado durante la reconfiguración: el cambio se refleja de inmediato y un `ref` evita el doble disparo.

### Sincronización en tiempo real de API Keys

- **Sincronización automática periódica:** El cliente de la app realiza un chequeo en segundo plano cada **2 minutos** en [app.context.tsx](file:///Volumes/Mac/juniorbardales/Documents/invisibleai/InvisibleAI/src/contexts/app.context.tsx) mediante `syncServerCredentials()` para obtener cualquier cambio administrativo de API Keys (Groq, Deepgram) en el VPS `greencloud-matias`.
- **Sincronización en consultas de balance:** Cada consulta o actualización de saldo (`getUsageBalance` y reporte de uso) en [server-api.ts](file:///Volumes/Mac/juniorbardales/Documents/invisibleai/InvisibleAI/src/lib/server-api.ts) sincroniza y guarda de inmediato las credenciales vigentes en `secure_storage` local. Si las credenciales del servidor han sido desactivadas o eliminadas por el administrador, las claves locales se borran en caliente para evitar errores de autorización en cascada.

### Restablecimiento e invalidación de saldo por Downgrade

- **Reset de saldo en VPS:** El backend del servidor (`/src/services/usage.ts`) ahora limpia de forma explícita el saldo de consumo (tokens de chat diarios y llamadas de Whisper) y créditos de streaming acumulados durante el downgrade de `licensed` a `free`, garantizando que la cuenta comience desde cero con las cuotas limpias y correctas correspondientes al plan gratuito.
- **Caché de Deepgram invalidada:** En el cliente ([useSystemAudio.ts](file:///Volumes/Mac/juniorbardales/Documents/invisibleai/InvisibleAI/src/hooks/useSystemAudio.ts)), cuando el flag `hasActiveLicense` cambia a `false` (debido a vencimiento o desactivación voluntaria), se borra inmediatamente el token de Deepgram en caché (`deepgramTokenCacheRef.current = null`) para desactivar el flujo de streaming premium de inmediato.

### Formateo amigable de límites y Rate Limits de Groq (Error 429)

- **Identificación de Rate Limits:** Se mejoró la lógica de parseo de errores en [ai-response.function.ts](file:///Volumes/Mac/juniorbardales/Documents/invisibleai/InvisibleAI/src/lib/functions/ai-response.function.ts) para discernir entre cuando un usuario ha agotado sus cuotas diarias de la aplicación y cuando el backend de Groq devuelve un error de saturación de red (HTTP 429 / Rate Limit / Too Many Requests).
- **Mensaje claro:** Si el error se debe a la saturación de Groq, la app muestra ahora un mensaje adaptado: *"El proveedor de IA (Groq) está experimentando una alta demanda temporal (Límite de tasa / Rate Limit 429). Por favor, espera unos segundos e intenta nuevamente."*

---

## 🚀 Novedades de la Versión 1.5.2

### Llama 4 Scout para el tier free (visión incluida)

Los usuarios sin licencia ahora usan **`meta-llama/llama-4-scout-17b-16e-instruct`** en lugar de Llama 3.3 70B. Scout incluye visión nativa, lo que desbloquea el chat con imágenes para el tier gratuito. La cadena de fallback del servidor es `scout → 70b → 8b`; cuando el mensaje contiene imágenes, el fallback se limita a modelos de visión.

### Imágenes y capturas disponibles para usuarios free

- El botón de cámara y el adjuntar imagen son **visibles y funcionales** sin licencia.
- `supportsImages` se activa automáticamente para cualquier usuario que use el servidor de InvisibleAI (sin clave API local), ya que el servidor siempre usa Scout con visión.

### Capturas 7× más rápidas (JPEG en Rust)

Las capturas se codifican como **JPEG calidad 82** (máx 1600 px ancho) en lugar de PNG sin comprimir. Reduce el tamaño de ~3 MB a ~150–300 KB y el tiempo de subida de ~5 s a **~0,7 s**. Aplica al botón de cámara (`capture_to_base64`) y al modo recorte (`capture_selected_area`).

### Límite diario free: 50 000 → 150 000 tokens

El tope de tokens por día para usuarios gratuitos se triplicó. El ciclo de reset sigue siendo cada 24 h.

### STT Deepgram: despacho a los ~500 ms de silencio

`endpointing` cambió de `10` → **`500`** ms. Con el valor anterior, `speech_final` se disparaba de forma poco fiable y la app siempre caía al fallback `UtteranceEnd` de 1 000 ms. Con 500 ms el fin de habla se detecta de forma confiable y el chat se despacha en **~500 ms**. Solo afecta al streaming Deepgram de usuarios con licencia.

### Endpoint de administración: reset de uso

`POST /api/admin/usage/reset` — sin body reinicia todos los contadores; con `{ instanceId }` reinicia solo ese dispositivo. Script en `scripts/reset-free-limits.mjs` para ejecutar desde el VPS.

### Nginx: soporte de imágenes hasta 25 MB

`client_max_body_size 25M` en el VPS, necesario para subir capturas en base64 sin recibir error 413.

---

## 🚀 Novedades de la Versión 1.5.1

### Límites del servidor ampliados

| Concepto | Antes (v1.5.0) | Ahora (v1.5.1) |
| :--- | :--- | :--- |
| Chat tokens licensed / período | 300 000 | **700 000** |
| Período de reset del chat | 24 h | **12 h** (AM + PM UTC) |
| Créditos streaming / día | 1 800 | **20 000** |
| Máximo acumulable | 14 400 (~4 h) | **40 000 (~11 h)** |
| Bono bienvenida licensed | 3 600 | 3 600 + 20 000 = **23 600** (día 1) |

### Corrección: créditos de streaming no se drenan en reposo

Los créditos de Deepgram se descontaban continuamente aunque el usuario no estuviese hablando. La lógica del reportero periódico ahora verifica si llegó audio real antes de facturar:

- Solo se factura el tiempo hasta `min(ahora, últimoAudio + 5 s)`.
- Los ticks de 10 segundos sin actividad resultan en **0 créditos descontados**.
- Aplica tanto al micrófono (`AutoSpeechVad.tsx`) como al audio del sistema (`useSystemAudio.ts`).

### Corrección: idioma de respuesta ignorado

Al seleccionar un idioma de respuesta desde los ajustes, la IA seguía respondiendo en otro idioma. La selección de idioma ahora se aplica correctamente al system prompt en todas las rutas de procesamiento — chat completion y flujo de audio — garantizando que el modelo responda en el idioma configurado.

### Reset de chat cada 12 horas (licensed)

El saldo de tokens del chat licensed se reinicia dos veces al día: a las **00:00 UTC** y a las **12:00 UTC**. El balance de la app muestra `resetsAt` con la hora exacta del próximo reset. Los usuarios free mantienen su ciclo de 24 horas sin cambios.

---

## 🌟 Novedades de la Versión 1.5.0

*   **Robustez de Licencia en Desarrollo**: Corregido el error que causaba la eliminación de la licencia al reiniciar la aplicación en local cuando el servidor de validación (`localhost:3000`) estaba offline.
*   **Toggle de Desactivación**: Ahora es posible desactivar perfiles y prompts del sistema seleccionados simplemente haciendo clic sobre ellos nuevamente.
*   **Código Limpio**: Eliminación completa de comentarios internos innecesarios y notas temporales obsoletas en el código para mejorar el rendimiento de la aplicación en producción.
*   **Validaciones y Errores Amigables**: Los mensajes de error técnicos y crípticos (como fallos de red 502/503/504 o límites de tokens de base de datos) ahora se traducen y presentan al usuario de forma clara y en español (ej. informando sencillamente si no tiene licencia activa, si llegó al límite diario de mensajes o si el servidor está temporalmente fuera de línea).
*   **Conexión Directa al Servidor para Usuarios Free**: El chat y la transcripción ahora se conectan directamente al servidor de InvisibleAI sin pasar por la indirección de Rust. Antes, cuando algo fallaba silenciosamente en el backend, el popover del chat se cerraba sin feedback al usuario; ahora los errores se muestran claramente. Las validaciones bloqueantes de licencia que rechazaban a usuarios free se removieron — los créditos y límites se aplican únicamente del lado del servidor.
*   **Chat Free Usa Groq + Llama 3** *(actualizado a Llama 4 Scout en v1.5.2)*: En esta versión el modelo era `llama-3.3-70b-versatile`. STT free usa Groq + Whisper `large-v3` (no-turbo). Licensed sigue usando los modelos premium del servidor o las claves locales del usuario.
*   **Bloqueo de Perfiles para Usuarios Free**: La pantalla `/profiles` ahora deja **ver** todas las plantillas con su información completa pero no permite seleccionarlas sin licencia activa. Banner explicativo arriba, badge "Requiere licencia" en el header y `cursor-not-allowed` con `opacity-60` en cada card.
*   **Perfil "Experto en Entrevistas y Reuniones"**: Nueva plantilla (migración SQL v7) que detecta automáticamente cuándo estás en una entrevista por las frases del interlocutor y responde en primera persona usando tu CV real. Prioridad #1 en la grilla (migración v8). Incluye 8 modificadores específicos: Técnica, Conductual/STAR, System Design, Ventas, Ejecutiva, Negociación Salarial, Inglés y Panel.
*   **Carga Local de CV (PDF / DOCX / TXT / MD)**: Editor dedicado en la pantalla de perfiles que parsea el archivo **íntegramente en el dispositivo** vía `pdfjs-dist` (build legacy para compatibilidad con Tauri WebKit) y `mammoth`. El texto se guarda en `localStorage` con cap de 32 000 caracteres y se inyecta como bloque `<CV>…</CV>` dentro del system prompt cuando el perfil de entrevistas está activo. Tanto el archivo como el texto extraído nunca abandonan el dispositivo.
*   **Prueba Gratuita Única del Perfil de Entrevistas**: Los usuarios sin licencia pueden activar el perfil de entrevistas **una sola vez** como muestra. Después de consumir la prueba, la card queda bloqueada hasta que se active una licencia. El flag es persistente entre reinicios de la app.

---

## 📬 Soporte y Sugerencias
¿Tienes ideas para añadir nuevos perfiles base, sugerencias de palabras clave o propuestas para el sistema de audio? ¡El canal de comunicación está abierto! Siéntete libre de proponer cambios para seguir mejorando InvisibleAI.

---

## 🛠️ Gestión Profesional de Errores y Licencias (v1.5.4)

Se ha implementado un sistema mejorado y profesional para la gestión de errores, validación de licencias y control de límites en toda la aplicación (chat principal, chat de overlay y streaming de audio STT):

1. **Licencia Revocada o Eliminada**:
   - Cuando una licencia es revocada o desactivada por el administrador, el sistema detecta el cambio e informa al usuario con el mensaje:
     > `"Su licencia ha sido revocada."`

2. **Licencia Vencida**:
   - Si la licencia del usuario ha expirado, el sistema muestra de forma clara:
     > `"Tu licencia ha vencido. Por favor, renueva tu suscripción."`

3. **Límite de Créditos Alcanzado (Chat y STT Streaming)**:
   - Aplica tanto a usuarios con licencia activa como en el modo gratuito (free). Si se alcanzan las cuotas de tokens de chat o el límite diario de transcripción (Whisper o streaming con Deepgram), la interfaz presentará el mensaje:
     > `"Usaste todos los créditos de tu plan."`

4. **Indisponibilidad del Proveedor de IA (Groq)**:
   - Si la API Key de Groq falla, expira, no responde o alcanza sus límites de tasa de forma persistente, en lugar de no responder o devolver `null`, la aplicación:
     - Guarda de forma persistente en la conversación local el mensaje del asistente: `"El modelo no está disponible actualmente."`
     - Muestra un banner de error con la descripción detallada del problema formateada amigablemente para el usuario.

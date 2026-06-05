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

## 🌟 Novedades de la Versión 1.5.0

*   **Robustez de Licencia en Desarrollo**: Corregido el error que causaba la eliminación de la licencia al reiniciar la aplicación en local cuando el servidor de validación (`localhost:3000`) estaba offline.
*   **Toggle de Desactivación**: Ahora es posible desactivar perfiles y prompts del sistema seleccionados simplemente haciendo clic sobre ellos nuevamente.
*   **Código Limpio**: Eliminación completa de comentarios internos innecesarios y notas temporales obsoletas en el código para mejorar el rendimiento de la aplicación en producción.
*   **Validaciones y Errores Amigables**: Los mensajes de error técnicos y crípticos (como fallos de red 502/503/504 o límites de tokens de base de datos) ahora se traducen y presentan al usuario de forma clara y en español (ej. informando sencillamente si no tiene licencia activa, si llegó al límite diario de mensajes o si el servidor está temporalmente fuera de línea).
*   **Conexión Directa al Servidor para Usuarios Free**: El chat y la transcripción ahora se conectan directamente al servidor de InvisibleAI sin pasar por la indirección de Rust. Antes, cuando algo fallaba silenciosamente en el backend, el popover del chat se cerraba sin feedback al usuario; ahora los errores se muestran claramente. Las validaciones bloqueantes de licencia que rechazaban a usuarios free se removieron — los créditos y límites se aplican únicamente del lado del servidor.
*   **Chat Free Usa Groq + Llama 3**: Modelo `llama-3.3-70b-versatile`. STT free usa Groq + Whisper `large-v3` (no-turbo). Licensed sigue usando los modelos premium del servidor o las claves locales del usuario.
*   **Bloqueo de Perfiles para Usuarios Free**: La pantalla `/profiles` ahora deja **ver** todas las plantillas con su información completa pero no permite seleccionarlas sin licencia activa. Banner explicativo arriba, badge "Requiere licencia" en el header y `cursor-not-allowed` con `opacity-60` en cada card.
*   **Perfil "Experto en Entrevistas y Reuniones"**: Nueva plantilla (migración SQL v7) que detecta automáticamente cuándo estás en una entrevista por las frases del interlocutor y responde en primera persona usando tu CV real. Prioridad #1 en la grilla (migración v8). Incluye 8 modificadores específicos: Técnica, Conductual/STAR, System Design, Ventas, Ejecutiva, Negociación Salarial, Inglés y Panel.
*   **Carga Local de CV (PDF / DOCX / TXT / MD)**: Editor dedicado en la pantalla de perfiles que parsea el archivo **íntegramente en el dispositivo** vía `pdfjs-dist` (build legacy para compatibilidad con Tauri WebKit) y `mammoth`. El texto se guarda en `localStorage` con cap de 32 000 caracteres y se inyecta como bloque `<CV>…</CV>` dentro del system prompt cuando el perfil de entrevistas está activo. Tanto el archivo como el texto extraído nunca abandonan el dispositivo.
*   **Prueba Gratuita Única del Perfil de Entrevistas**: Los usuarios sin licencia pueden activar el perfil de entrevistas **una sola vez** como muestra. Después de consumir la prueba, la card queda bloqueada hasta que se active una licencia. El flag es persistente entre reinicios de la app.

---

## 📬 Soporte y Sugerencias
¿Tienes ideas para añadir nuevos perfiles base, sugerencias de palabras clave o propuestas para el sistema de audio? ¡El canal de comunicación está abierto! Siéntete libre de proponer cambios para seguir mejorando InvisibleAI.

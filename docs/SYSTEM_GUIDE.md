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

## 🌟 Novedades de la Versión 1.5.0

*   **Robustez de Licencia en Desarrollo**: Corregido el error que causaba la eliminación de la licencia al reiniciar la aplicación en local cuando el servidor de validación (`localhost:3000`) estaba offline.
*   **Toggle de Desactivación**: Ahora es posible desactivar perfiles y prompts del sistema seleccionados simplemente haciendo clic sobre ellos nuevamente.
*   **Código Limpio**: Eliminación completa de comentarios internos innecesarios y notas temporales obsoletas en el código para mejorar el rendimiento de la aplicación en producción.

---

## 📬 Soporte y Sugerencias
¿Tienes ideas para añadir nuevos perfiles base, sugerencias de palabras clave o propuestas para el sistema de audio? ¡El canal de comunicación está abierto! Siéntete libre de proponer cambios para seguir mejorando InvisibleAI.

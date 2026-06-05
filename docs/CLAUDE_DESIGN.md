# InvisibleAI — Landing Page Design Spec (for Claude)

> Spec de construcción para la landing page de marketing de **InvisibleAI**.
> Diseño: dark-first premium, estilo Cluely — limpio, minimalista, AI-product feel.
> Fuente: Plus Jakarta Sans (la misma del app nativo). Sin serif. Sin dark-mode toggle.
> Este documento reemplaza el spec anterior de "Horizon".

---

## 0. Cómo usar este documento

1. Pega el **§1 master prompt** en una nueva conversación de Claude.
2. Pega los **§2 design tokens** y pide que los conecte a `tailwind.config.ts` + `globals.css`.
3. Construye sección por sección usando los bloques de **§4 build prompts** en orden.
4. Usa **§6 iteration prompts** para ajustes quirúrgicos.
5. Corre el **§7 quality checklist** antes de merge.

---

## 1. Master prompt (pega esto primero)

```
You are building a single-page marketing site for "InvisibleAI", a real-time
AI copilot that runs invisibly on your computer — listening to calls, meetings,
interviews, and your own voice to deliver instant AI answers without anyone
knowing you're using it.

Visual language: dark-first, premium, stealth-tech feel. Deep near-black hero
that bleeds into bright white sections. Tight, generous whitespace. No gradients
on text. No emojis. Clean and serious.

Tech stack:
- Vite + React 19 + TypeScript (strict)
- Tailwind CSS v4 (official Vite plugin — no PostCSS)
- shadcn/ui-inspired primitives: Button, Card, Pill, Badge under src/components/ui/,
  sections under src/sections/, assembled in src/App.tsx.
- No CSS-in-JS. Tailwind utility classes + CSS vars for tokens.
- No runtime animation library — CSS transitions + IntersectionObserver.
- lucide-react for icons.
- Font: "Plus Jakarta Sans" (weights 400/500/600/700/800), loaded via Google Fonts.
  No serif. No mono. One font family only.

Output expectations:
- Dark hero (#09090B) fading into pure white (#FFFFFF) body.
- Max-width container 1200px, centered. Section padding clamp(80px,10vw,140px).
- Cards: border-radius scale 12 / 16 / 20 / 24 / pill (9999px). Never square corners.
- Elevation: e1 resting (shadow: 0 1px 2px rgba(0,0,0,.04), 0 0 0 1px rgba(0,0,0,.06)),
  e2 floating (0 8px 24px rgba(0,0,0,.08)).
- Hero text: white. All other sections: black on white.
- Accent color: violet #7C3AED (primary CTA), sky #0EA5E9 (secondary/free badge),
  emerald #10B981 (success/check icons).
- Headlines: Plus Jakarta Sans 700-800, tracking -0.04em, line-height 1.1.
- Body: Plus Jakarta Sans 400, 16px, line-height 1.6.
- Accessibility: WCAG AA, visible focus rings, prefers-reduced-motion.

Build ONLY the section I ask for. Output:
1. The section component file.
2. Any new primitive files it needs.
3. The line to add to App.tsx.
No preamble, no explanations.
```

---

## 2. Design tokens

### 2.1 `tailwind.config.ts` extension

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        hero: {
          bg: "#09090B",
          surface: "#111113",
          border: "rgba(255,255,255,0.08)",
        },
        ink: {
          DEFAULT: "#09090B",
          muted: "#52525B",
          faint: "#A1A1AA",
        },
        surface: {
          page: "#FFFFFF",
          soft: "#F4F4F5",
          card: "#FFFFFF",
        },
        hairline: "#E4E4E7",
        accent: {
          violet: "#7C3AED",
          "violet-light": "#8B5CF6",
          sky: "#0EA5E9",
          emerald: "#10B981",
          red: "#EF4444",
        },
        plan: {
          free: "#EDE9FE",        // lavender soft background
          "free-text": "#5B21B6",
          pro: "#09090B",         // dark card for PRO
          "pro-text": "#FFFFFF",
        },
      },
      borderRadius: {
        pill: "9999px",
        card: "1.25rem",
        cardLg: "1.5rem",
      },
      maxWidth: {
        content: "1200px",
      },
      boxShadow: {
        e1: "0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06)",
        e2: "0 8px 24px rgba(0,0,0,0.08)",
        "e2-violet": "0 8px 32px rgba(124,58,237,0.25)",
        "hero-glow": "0 0 120px rgba(124,58,237,0.15), 0 0 60px rgba(14,165,233,0.08)",
      },
      backgroundImage: {
        "grad-hero":
          "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, rgba(14,165,233,0.06) 40%, transparent 70%), linear-gradient(180deg, #09090B 0%, #09090B 100%)",
        "grad-cta":
          "linear-gradient(135deg, #6D28D9 0%, #7C3AED 40%, #0EA5E9 100%)",
        "grad-pro":
          "linear-gradient(145deg, #18181B 0%, #09090B 100%)",
        "grad-free":
          "linear-gradient(145deg, #EDE9FE 0%, #F5F3FF 100%)",
        "grad-feature":
          "linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)",
        "grad-shimmer":
          "linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.06) 50%, transparent 100%)",
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.02em",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 2.2 `globals.css` — type scale + tokens + motion

```css
@import "tailwindcss";

:root {
  --type-hero-xl: clamp(44px, 6vw, 80px);
  --type-hero-lg: clamp(36px, 5vw, 64px);
  --type-section:  clamp(28px, 3.5vw, 44px);
  --type-card-title: 20px;
  --type-body: 16px;
  --type-small: 14px;
  --type-eyebrow: 11px;
}

html {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body {
  background: #FFFFFF;
  color: #09090B;
  font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  font-size: var(--type-body);
  line-height: 1.6;
}

h1, h2, h3, h4 {
  font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

*:focus-visible {
  outline: 2px solid #7C3AED;
  outline-offset: 2px;
  border-radius: 6px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@keyframes reveal {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.reveal {
  animation: reveal 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}

.float-slow {
  animation: float 4s ease-in-out infinite;
}
```

### 2.3 Token cheat-sheet

| Shorthand | Valor / Uso |
|---|---|
| `hero-bg` | `#09090B` — fondo oscuro del hero |
| `ink` / `ink-muted` / `ink-faint` | `#09090B` / `#52525B` / `#A1A1AA` |
| `accent-violet` | `#7C3AED` — CTA principal, pro badge |
| `accent-sky` | `#0EA5E9` — badge free, links |
| `accent-emerald` | `#10B981` — checks, success |
| `e1` / `e2` / `e2-violet` | sombras resting / floating / violet glow |
| `grad-hero` | fondo radial del hero con glow violeta |
| `grad-cta` | gradiente violeta→sky para CTA block |
| `grad-pro` / `grad-free` | backgrounds de tarjetas de precio |
| `radius-pill` / `radius-card` / `radius-cardLg` | 9999 / 1.25rem / 1.5rem |
| `type-hero-xl` / `type-section` | tamaños de fuente escalables |

---

## 3. Estructura de archivos

```
src/
├── App.tsx
├── main.tsx
├── globals.css
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Pill.tsx
│       ├── Badge.tsx
│       └── Section.tsx
└── sections/
    ├── Nav.tsx
    ├── Hero.tsx
    ├── SocialProof.tsx
    ├── HowItWorks.tsx
    ├── Features.tsx
    ├── Pricing.tsx
    ├── FAQ.tsx
    ├── FinalCTA.tsx
    └── Footer.tsx
```

---

## 4. Section build prompts (pegar en orden)

### 4.1 — Primitivos + Nav

```
Build the primitive components and the sticky pill nav.

PRIMITIVES — src/components/ui/

Button.tsx
- Variants: solid-violet (default), solid-dark, solid-sky, ghost-dark (for hero), ghost, outline.
- Sizes: sm (h-8 px-4 text-sm), md (h-10 px-5), lg (h-12 px-7 text-base).
- All radius-pill.
- solid-violet: bg-accent-violet text-white hover:bg-[#6D28D9] shadow-e2-violet.
- solid-dark: bg-ink text-white hover:bg-[#18181B].
- solid-sky: bg-accent-sky text-white hover:opacity-90.
- ghost-dark: bg-white/10 text-white border border-white/20 hover:bg-white/15 (for dark sections).
- ghost: transparent text-ink hover:bg-surface-soft.
- outline: border border-hairline text-ink hover:bg-surface-soft.
- Transition: 150ms ease. Scale(0.98) on active.

Card.tsx
- Variants: outlined (default: bg-white border hairline shadow-e1), flat (no border no shadow),
  pro (bg-grad-pro border border-white/10 shadow-e2-violet), free (bg-grad-free border border-[#C4B5FD]/40),
  feature (bg-grad-feature border hairline).
- Radius prop: card (1.25rem) | cardLg (1.5rem). Default card.
- Padding: 32px desktop, 24px mobile.

Badge.tsx
- small rounded-pill px-2.5 h-6 text-[11px] font-semibold uppercase tracking-[0.06em].
- Variants: violet (bg-violet-100 text-violet-700), sky (bg-sky-100 text-sky-700),
  emerald (bg-emerald-100 text-emerald-700), dark (bg-ink/90 text-white).

Pill.tsx — badge variant-light, height 7, rounded-pill, px-3 text-xs font-medium.

Section.tsx — <section> con mx-auto max-w-content px-6 md:px-12 py-[clamp(80px,10vw,140px)].
SectionLight.tsx — igual pero bg-surface-soft y padding vertical más compacto (60px desktop).

NAV — src/sections/Nav.tsx

Sticky top-0 z-50. Transición de transparente a blurred-white al hacer scroll (threshold 40px).
Initial state (hero): bg-transparent. Scrolled: bg-white/80 backdrop-blur-xl border-b border-hairline.

Inner container max-w-content mx-auto px-6 h-16 flex items-center justify-between:
- Left: Logo — texto "InvisibleAI" en font-semibold text-base. En hero (top) text-white,
  al scroll text-ink.
- Center: links Product · Características · Precios — hidden on mobile.
  Text: en hero text-white/80 hover:text-white. Al scroll text-ink-muted hover:text-ink.
  Transition text-color 200ms.
- Right: [Descargar gratis — ghost o ghost-dark según estado] + [Activar licencia — solid-violet tamaño sm]
  Mobile: solo botones, sin links.

Scroll detection: useEffect + window.addEventListener("scroll").
```

### 4.2 — Hero (dark)

```
Build src/sections/Hero.tsx.

Full viewport section. Background: bg-grad-hero (near-black con glow violeta sutil).
Overflow hidden. Padding top 160px desktop, 120px mobile.

Content: centered column max-w-[840px] mx-auto text-center, gap-8.

1. Eyebrow badge — Badge variant="sky" inline-flex items-center gap-2:
   "● EN BETA · Acceso limitado activo"
   El dot es span 6px rounded-full bg-accent-sky animate-pulse.

2. <h1 class="text-white font-extrabold tracking-tightest" style="font-size:var(--type-hero-xl)">
     Tu copiloto de IA,
     <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#38BDF8]">
       completamente invisible.
     </span>
   </h1>

3. <p class="text-white/60 text-lg max-w-[580px] mx-auto font-normal leading-relaxed">
     Escucha tus llamadas, reuniones y entrevistas en tiempo real.
     Respuestas de IA instantáneas en tu pantalla. Nadie sabe que lo estás usando.
   </p>

4. CTA row: flex items-center justify-center gap-4 flex-wrap.
   - <Button variant="solid-violet" size="lg">Descargar gratis — macOS</Button>
   - <Button variant="ghost-dark" size="lg">Ver cómo funciona ↓</Button>

5. Social proof mini-strip: mt-4, text-white/40 text-sm text-center.
   "Más de 2 000 usuarios lo usan en entrevistas, reuniones y llamadas de ventas."

6. Hero visual mock — mt-16, max-w-[680px] mx-auto float-slow:
   Una Card variant="flat" rounded-cardLg bg-hero-surface border border-hero-border
   shadow-e2-violet px-6 py-5 text-left:
   - Top row: dot verde animate-pulse text-xs text-white/50 "● Escuchando en tiempo real..."
   - Divider: border-b border-white/8 my-3.
   - "Pregunta detectada" eyebrow text-[11px] text-white/40 uppercase tracking-widest mb-2.
   - Fake AI response: 3 líneas de texto blanco/70 text-sm. Primera línea más larga, las otras más cortas.
     Simular respuesta de IA con skeleton-like blocks si hay tiempo.
   - Bottom row: flex justify-between text-[11px] text-white/30 mt-3:
     "InvisibleAI · Llama 3.3 · 0.8s" | "Invisible para todos"
```

### 4.3 — Social proof / logos strip

```
Build src/sections/SocialProof.tsx.

SectionLight (bg-surface-soft), padding compact (py-12 mx-auto max-w-content px-6).
Text center:

- Eyebrow text-xs text-ink-faint uppercase tracking-[0.08em] mb-6:
  "Usado por profesionales en"

- Flex row justify-center items-center gap-10 flex-wrap:
  5 text-based "logos" (empresas ficticias genéricas) en text-ink-faint/50 font-semibold
  text-sm tracking-tight. No SVGs reales. Usar: "Startup · Agency · Consulting · Remote · Enterprise"
  — cada uno en un <span> con font-size 15px semibold.

- Testimonial strip mt-8: grid grid-cols-1 md:grid-cols-3 gap-5.
  3 Card variant="outlined" radius="card" px-5 py-4:
    Each: quote text-sm text-ink leading-relaxed, then author row:
      - small avatar circle (w-8 h-8 rounded-full bg-accent-violet/10 text-accent-violet
        font-semibold text-xs grid place-items-center) with initials.
      - Name text-sm font-semibold + role text-xs text-ink-muted.

  Copy:
  1. "Me ayudó a cerrar una entrevista técnica en Google. Tuve las respuestas de system design
     en 2 segundos. Nadie lo notó." — Andrés M., Ingeniero de Software
  2. "En ventas lo uso para manejar objeciones en tiempo real. Subí mi tasa de cierre un 30%
     en el primer mes." — Camila R., Account Executive
  3. "Lo activé en mi primera reunión ejecutiva en inglés. El feedback instantáneo me salvó."
     — Diego P., Product Manager
```

### 4.4 — Cómo funciona (3 steps)

```
Build src/sections/HowItWorks.tsx.

<Section> bg-white.

Header center max-w-[600px] mx-auto mb-16:
- Eyebrow Badge variant="violet": "CÓMO FUNCIONA"
- <h2 style="font-size:var(--type-section)">Actívalo. Habla. Recibe ayuda.</h2>
- <p text-ink-muted max-w-[480px] mx-auto>
    Tres pasos. Sin configuración compleja. Funciona desde el primer segundo.
  </p>

Grid md:grid-cols-3 gap-8 mt-16:

Step 1 — Card variant="feature" radius="card":
- Badge "01" dark mini pill top-left.
- Icon: Mic (lucide) w-8 h-8 text-accent-violet.
- <h3 class="font-bold text-ink mt-4 mb-2" style="font-size:var(--type-card-title)">
    Escucha dual activa
  </h3>
- <p text-ink-muted text-sm>
    Captura tu micrófono y el audio del sistema por separado.
    Zoom, Meet, Teams — funciona con cualquier app.
  </p>

Step 2 — Card variant="feature" radius="card":
- Badge "02".
- Icon: Zap (lucide) text-accent-emerald.
- H3: "Detección inteligente"
- P: Clasifica en tiempo real: preguntas, objeciones, momentos clave.
     La IA solo interviene cuando importa. El ruido se ignora.

Step 3 — Card variant="feature" radius="card":
- Badge "03".
- Icon: Eye (lucide) text-accent-sky.
- H3: "Respuesta invisible"
- P: La respuesta aparece en tu pantalla. Nadie más la ve.
     Invisible para cámaras, capturas de pantalla y grabaciones.
```

### 4.5 — Features (2 split cards)

```
Build src/sections/Features.tsx.

<Section> bg-white. Header como HowItWorks.

Eyebrow: "CARACTERÍSTICAS"
H2: "Todo lo que necesitas para rendir al máximo."

Stack vertical gap-8 mt-16:

CARD A — Card variant="outlined" radius="cardLg" shadow-e1.
Grid md:grid-cols-2 gap-12 p-10 (p-6 mobile).

Left:
- Eyebrow mono text-xs text-ink-faint "01 / 03"
- H3 font-bold text-[20px]: "Perfiles modulares — sé experto en lo que necesitas"
- P text-ink-muted text-sm: Apila plantillas (Senior Backend, Ventas, Ejecutivo) con
  modificadores técnicos (Rust, PostgreSQL, AWS). Actívalo en segundos y la IA adopta
  ese rol y conocimiento.
- Badge row gap-2 flex flex-wrap mt-4:
  Chips pill pequeños bg-surface-soft text-ink text-xs:
  "Senior Backend" · "System Design" · "Ventas SPIN" · "Entrevistas STAR" · "+4 más"

Right:
- Fake "Perfiles" preview card bg-surface-soft rounded-xl p-5:
  Title row "Perfiles disponibles" text-sm font-semibold.
  3 mini profile cards stacked (h-12 each) bg-white rounded-lg border border-hairline
  px-3 flex items-center gap-3:
    - Colored circle avatar (violet/sky/emerald).
    - Name + description skeleton bars (bg-ink/5 rounded-md).
    - Lock icon or check icon on the right.
  Labels: "Experto en Entrevistas" (unlocked check emerald) · "Senior Backend" (locked violet) · "Ejecutivo" (locked violet)

CARD B — Card variant="outlined" radius="cardLg" shadow-e1.
Grid md:grid-cols-2 gap-12 p-10 reversed (image left, text right).

Left:
- Fake "AI en tiempo real" panel bg-hero-bg rounded-xl p-5 text-white:
  Top: "● Analizando conversación..." text-[11px] text-white/40.
  3 response preview items each row: circle check + text-white/70 text-sm.
  Items: "Pregunta técnica detectada" · "Respuesta generada · 0.9s" · "Respuesta lista"
  Last item has pulsing dot (in progress).
  Bottom text-white/30 text-xs: "Modelo: Llama 3.3 70B · Groq"

Right:
- Eyebrow "02 / 03"
- H3: "Memoria persistente entre sesiones"
- P: Recuerda nombres, contexto y decisiones de reuniones anteriores.
     La IA mantiene continuidad: sabe quién dijo qué en la última llamada.
- Button variant="outline" size="sm" mt-4: "Ver cómo funciona →"
```

### 4.6 — Pricing (SECCIÓN PRINCIPAL — inspirada en Cluely)

```
Build src/sections/Pricing.tsx.

<Section> bg-white.

Header center max-w-[600px] mx-auto mb-4:
- Eyebrow Badge variant="violet": "PRECIOS"
- <h2 style="font-size:var(--type-section)">Simple. Transparente. Sin sorpresas.</h2>
- <p text-ink-muted max-w-[480px] mx-auto>
    Empieza gratis hoy mismo. Actualiza cuando estés listo.
  </p>

TOGGLE BILLING — (opcional, mostrar solo mensual por ahora):
  text-sm text-ink-muted text-center mt-4 mb-10:
  "Facturación mensual · Sin contratos · Cancela cuando quieras"

CARDS GRID — grid md:grid-cols-2 gap-6 max-w-[820px] mx-auto mt-12:

────────────────────────────────────────
CARD IZQUIERDA — Plan Gratuito
────────────────────────────────────────
Card variant="free" radius="cardLg" p-8 relative:

Header:
- <p class="text-sm font-semibold text-[#5B21B6]">Gratuito</p>
- Price row mt-2:
  <span class="font-extrabold text-ink tracking-tightest" style="font-size:56px">$0</span>
  <span class="text-ink-muted text-sm ml-2">/ mes — para siempre</span>
- <p class="text-ink-muted text-sm mt-3">
    Empieza sin tarjeta de crédito. Límites generosos para explorar.
  </p>

Divider: border-t border-[#C4B5FD]/30 my-6.

Features list — <ul class="space-y-3">:
Cada item: <li class="flex items-start gap-3">
  CheckCircle2 size-5 text-accent-emerald flex-shrink-0 mt-0.5
  <span class="text-sm text-ink">{{FEATURE}}</span>
</li>

Items:
  ✓ 50,000 tokens de IA por día (chat, respuestas, análisis)
  ✓ 15 transcripciones de voz por día vía Whisper
  ✓ Chat con Llama 3.3 70B a través de Groq
  ✓ Insights de reunión en tiempo real (modo básico)
  ✓ 1 activación gratuita del Perfil de Entrevistas
  ✓ Compatible con macOS (Apple Silicon + Intel)
  ✗ Sin streaming de audio en tiempo real (Deepgram)  — texto en text-ink-faint, X en color ink-faint

CTA button mt-8 w-full:
<Button variant="solid-sky" size="md" class="w-full">Descargar gratis</Button>

────────────────────────────────────────
CARD DERECHA — Plan Pro (POPULAR)
────────────────────────────────────────
Card variant="pro" radius="cardLg" p-8 relative overflow-hidden:

(Optional subtle shimmer layer: absolute inset-0 bg-grad-shimmer pointer-events-none.)

Badge POPULAR — absolute top-5 right-5:
<Badge variant="violet" class="bg-[#7C3AED] text-white">POPULAR</Badge>

Header:
- <p class="text-sm font-semibold text-[#A78BFA]">Pro</p>
- Price row mt-2 flex items-end gap-3:
  <div>
    <span class="text-ink-faint/60 text-base line-through">$10</span>
    <span class="text-white font-extrabold tracking-tightest" style="font-size:56px">$5</span>
  </div>
  <div class="pb-3">
    <span class="text-white/50 text-sm">/ mes</span>
    <br/>
    <span class="text-[11px] bg-[#7C3AED]/30 text-[#A78BFA] rounded-pill px-2 py-0.5 font-semibold">
      OFERTA BETA 50% OFF
    </span>
  </div>
- <p class="text-white/50 text-sm mt-3">
    Acceso completo durante el beta. Precio bloqueado para early adopters.
  </p>

Divider: border-t border-white/10 my-6.

Features list — <ul class="space-y-3">:
Cada item igual pero check color text-[#A78BFA] y texto text-white/80.

Items:
  ✓ 300,000 tokens de IA por día (6× más que el plan gratuito)
  ✓ Transcripciones de voz ilimitadas con Whisper
  ✓ Streaming de audio en tiempo real con Deepgram (hasta 4 horas acumulables)
  ✓ Todos los perfiles desbloqueados (Entrevistas, Ventas, Ejecutivo, System Design, +8)
  ✓ Modelos de IA premium (Claude, GPT-4o, Gemini) — usa tus propias API keys
  ✓ Activación en hasta 2 dispositivos simultáneos
  ✓ Soporte prioritario + acceso anticipado a nuevas funciones

CTA button mt-8 w-full:
<Button variant="solid-violet" size="md" class="w-full shadow-e2-violet">
  Activar licencia Pro →
</Button>
<p class="text-center text-[11px] text-white/30 mt-3">Pago único mensual · Sin suscripción automática</p>

────────────────────────────────────────
ENTERPRISE STRIP — debajo del grid
────────────────────────────────────────
Card variant="flat" class="bg-surface-soft border border-hairline rounded-cardLg p-6 mt-6
max-w-[820px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4":
- Left: <p class="font-semibold text-ink">¿Equipo o empresa?</p>
        <p class="text-ink-muted text-sm">Licencias por volumen, SLA dedicado y onboarding personalizado.</p>
- Right: <a class="flex items-center gap-2 text-sm font-semibold text-accent-violet hover:underline">
           Contactar ventas <ArrowRight size={16} />
         </a>
```

### 4.7 — FAQ

```
Build src/sections/FAQ.tsx.

<Section> bg-white.

Grid md:grid-cols-12 gap-12:

Left col-span-4:
- Badge variant="violet" mb-4: "FAQ"
- <h2 style="font-size:var(--type-section)">
    Preguntas
    <br />frecuentes.
  </h2>
- <p text-ink-muted mt-4>
    ¿No ves tu pregunta? Escríbenos y respondemos en menos de 24 horas.
  </p>
- <a href="mailto:soporte@invisibleai.app" class="text-accent-violet font-semibold
    text-sm mt-4 inline-flex items-center gap-1 hover:underline">
    soporte@invisibleai.app <ExternalLink size={14} />
  </a>

Right col-span-8:
Accordion component (src/components/ui/Accordion.tsx):
- Cada item: button full-width flex justify-between items-center py-5 border-b border-hairline.
- Question: text-base font-semibold text-ink.
- Icon: Plus/Minus (lucide) text-ink-muted size-5, rotate con transition.
- Respuesta: texto text-ink-muted text-sm leading-relaxed py-4.
- Un item abierto a la vez (useState).

Items:

Q1: ¿InvisibleAI realmente es invisible para otros?
A1: Sí. La ventana flotante del asistente no aparece en capturas de pantalla, grabaciones de
    pantalla, ni en cámaras. Fue diseñado específicamente para entornos donde necesitas ayuda
    discreta sin que nadie lo note.

Q2: ¿Qué incluye el plan gratuito exactamente?
A2: El plan gratuito te da 50,000 tokens de IA por día (equivale a decenas de preguntas
    completas), 15 transcripciones de voz con Whisper, chat con Llama 3.3 70B, y una activación
    gratuita del Perfil de Entrevistas. No requiere tarjeta de crédito.

Q3: ¿En qué se diferencia la licencia Pro del plan gratuito?
A3: La licencia Pro desbloquea 300,000 tokens diarios (6× más), transcripciones ilimitadas,
    streaming de audio en tiempo real con Deepgram (hasta 4 horas acumulables), todos los
    perfiles modulares, modelos premium (Claude, GPT-4o) con tus propias API keys, y uso en
    2 dispositivos. El precio de $5/mes es una oferta beta con precio bloqueado para early adopters.

Q4: ¿En qué plataformas funciona?
A4: Actualmente disponible para macOS (Apple Silicon y Intel). La versión para Windows está
    en desarrollo y llegará próximamente.

Q5: ¿Mis datos y mi voz son privados?
A5: Tu audio se procesa localmente o a través de los proveedores que elijas (Groq, Deepgram).
    El CV que subas al Perfil de Entrevistas nunca sale de tu dispositivo — se procesa
    100% en el navegador. No guardamos transcripciones ni grabaciones en nuestros servidores.

Q6: ¿Puedo cancelar cuando quiera?
A6: Sí. No hay suscripciones automáticas. Pagas mes a mes y cancelas sin penalización.
    El acceso Pro se mantiene hasta el final del período pagado.
```

### 4.8 — Final CTA + Footer

```
Build los últimos dos archivos.

FinalCTA.tsx (src/sections/FinalCTA.tsx):
Full-width section bg-grad-cta (violeta → sky). Padding py-28.
Inner: max-w-content mx-auto px-6 text-center.

- <h2 class="text-white font-extrabold tracking-tightest" style="font-size:var(--type-hero-lg)">
    ¿Listo para ser
    <br />invisible?
  </h2>
- <p class="text-white/70 text-lg mt-6 max-w-[480px] mx-auto">
    Descarga gratis y actívalo en tu primera reunión hoy mismo.
    Sin tarjeta de crédito.
  </p>
- <div class="flex items-center justify-center gap-4 mt-10 flex-wrap">
    <Button variant="ghost-dark" size="lg">Descargar gratis</Button>
    <Button class="bg-white text-ink hover:bg-white/90" size="lg">Activar licencia $5/mes</Button>
  </div>
- <p class="text-white/40 text-sm mt-6">macOS · Apple Silicon + Intel · v1.5.0</p>

Footer.tsx (src/sections/Footer.tsx):
<footer class="border-t border-hairline">
Inner container max-w-content mx-auto px-6 py-8:
Flex justify-between items-center flex-wrap gap-4:
- Left: <span class="text-sm font-semibold text-ink">InvisibleAI</span>
        <span class="text-ink-faint text-sm ml-2">© 2025</span>
- Center (hidden mobile): text-xs text-ink-faint "Hecho con ❤️ para founders, vendedores y devs"
- Right: <nav class="flex gap-6 text-sm text-ink-faint">
           <a href="#">Privacidad</a>
           <a href="#">Términos</a>
           <a href="mailto:soporte@invisibleai.app">Soporte</a>
         </nav>
```

---

## 5. Montaje en App.tsx

```
Compose src/App.tsx como stack vertical en este orden:
Nav, Hero, SocialProof, HowItWorks, Features, Pricing, FAQ, FinalCTA, Footer.

Envolver todo en <main class="min-h-screen bg-white text-ink overflow-x-hidden">.

IntersectionObserver reveal hook (src/hooks/useReveal.ts):
- Toma un ref<HTMLElement>.
- Cuando el elemento es 12% visible, añade la clase "reveal" al elemento.
- El hook retorna { ref, isRevealed }.
- Respetar prefers-reduced-motion: si está activo, marcar isRevealed = true inmediatamente
  sin observer.
- Aplicar el hook al root element de cada section.

Nav debe tener su propio estado de scroll independiente (no usa reveal).
```

---

## 6. Iteration prompts

- **Hero demasiado oscuro**: *"El hero necesita más contraste. Aumenta la opacidad del glow violeta al 25% y añade un muy sutil ring radial de 1px rgba(124,58,237,0.3) alrededor del mock card."*
- **Badge de oferta poco visible**: *"El badge OFERTA BETA en la tarjeta Pro está demasiado sutil. Cambia a bg-yellow-400 text-yellow-900 font-bold para que destaque contra el fondo oscuro."*
- **Pricing cards asimétricas**: *"Las dos tarjetas de pricing tienen alturas distintas. Añade h-full en ambas y align-items: stretch al grid padre."*
- **CTA final plano**: *"El botón 'Descargar gratis' en FinalCTA no tiene suficiente contraste sobre el gradiente. Cámbialo a bg-white/15 backdrop-blur border border-white/25 en lugar de ghost-dark."*
- **Mobile cramped**: *"En <640px reduce section padding a 48px, card padding a 20px, h1 del hero a 40px."*

---

## 7. Quality checklist

- [ ] Todos los `h1/h2/h3` usan Plus Jakarta Sans 700/800 con tracking -0.04em.
- [ ] Solo un `<h1>` en toda la página (en Hero).
- [ ] Sin gradientes aplicados al texto — solo `bg-clip-text` en la frase del hero.
- [ ] Sin sombras fuera de `e1` / `e2` / `e2-violet`.
- [ ] Sin `rounded-none` en ninguna card.
- [ ] Colores de acento: solo violet, sky, emerald, ink. Sin verdes/azules inventados.
- [ ] Nav cambia de estado transparente a blurred-white correctamente al scroll.
- [ ] Pricing cards: Free (lavender bg, sky CTA) y Pro (dark bg, violet CTA, tachado $10).
- [ ] Badge "OFERTA BETA 50% OFF" visible en card Pro.
- [ ] FAQ accordion: un item abierto a la vez, transición suave.
- [ ] prefers-reduced-motion: sin animations reveal, sin float-slow.
- [ ] Mobile: nav colapsa, cards de pricing apiladas, hero h1 ≤ 44px.
- [ ] Focus ring visible (#7C3AED) en todos los interactivos.
- [ ] Tab order: nav → hero CTAs → sections → pricing CTAs → FAQ → footer.

---

## 8. Copy final (sin placeholders)

```
HERO
H1: Tu copiloto de IA, completamente invisible.
Sub: Escucha tus llamadas, reuniones y entrevistas en tiempo real.
     Respuestas de IA instantáneas en tu pantalla. Nadie sabe que lo estás usando.
Badge: ● EN BETA · Acceso limitado activo
CTA1: Descargar gratis — macOS
CTA2: Ver cómo funciona ↓
Social proof: Más de 2 000 usuarios lo usan en entrevistas, reuniones y llamadas de ventas.

HOW IT WORKS
H2: Actívalo. Habla. Recibe ayuda.
Sub: Tres pasos. Sin configuración compleja. Funciona desde el primer segundo.
Step 1: Escucha dual activa — micrófono + sistema por separado.
Step 2: Detección inteligente — clasifica preguntas, objeciones, momentos clave.
Step 3: Respuesta invisible — en tu pantalla. Nadie más la ve.

FEATURES
Feature 1: Perfiles modulares — sé experto en lo que necesitas.
Feature 2: Memoria persistente entre sesiones.

PRICING
H2: Simple. Transparente. Sin sorpresas.
Sub: Empieza gratis hoy mismo. Actualiza cuando estés listo.

  Plan Gratuito ($0/mes):
    50,000 tokens de IA por día
    15 transcripciones de voz por día vía Whisper
    Chat con Llama 3.3 70B a través de Groq
    Insights de reunión en tiempo real (modo básico)
    1 activación gratuita del Perfil de Entrevistas
    Compatible con macOS (Apple Silicon + Intel)
    ✗ Sin streaming de audio en tiempo real (Deepgram)
    CTA: Descargar gratis

  Plan Pro ($5/mes — oferta beta, normal $10/mes):
    300,000 tokens de IA por día (6× más que el gratuito)
    Transcripciones de voz ilimitadas con Whisper
    Streaming de audio en tiempo real con Deepgram (hasta 4 horas acumulables)
    Todos los perfiles desbloqueados (+8 plantillas especializadas)
    Modelos de IA premium — usa tus propias API keys (Claude, GPT-4o, Gemini)
    Activación en hasta 2 dispositivos simultáneos
    Soporte prioritario + acceso anticipado a nuevas funciones
    CTA: Activar licencia Pro →
    Subtext: Pago único mensual · Sin suscripción automática

  Enterprise: ¿Equipo o empresa? Contactar ventas.

FINAL CTA
H2: ¿Listo para ser invisible?
Sub: Descarga gratis y actívalo en tu primera reunión hoy mismo. Sin tarjeta de crédito.
CTA1: Descargar gratis
CTA2: Activar licencia $5/mes

FOOTER
© 2025 InvisibleAI · Privacidad · Términos · soporte@invisibleai.app
```

---

## 9. Anti-pattern list

Si Claude genera output genérico o se desvía, pegar esto:

```
Corrección de rumbo. Aplica estas restricciones retroactivamente:

1. NO serif. Solo Plus Jakarta Sans.
2. NO sombras fuera de e1 / e2 / e2-violet.
3. NO gradientes en texto, excepto el único span del hero H1.
4. NO colores de acento fuera de: violet #7C3AED, sky #0EA5E9, emerald #10B981, ink #09090B.
5. NO emojis en el código.
6. NO cards con esquinas rectas.
7. El hero ES OSCURO (#09090B). Las demás secciones son blancas.
8. La tarjeta Pro del pricing ES OSCURA con texto blanco.
9. El precio $10 debe aparecer tachado junto al $5 en la tarjeta Pro.
10. El badge "OFERTA BETA 50% OFF" es obligatorio en la tarjeta Pro.

Re-emite los componentes corregidos.
```

# Horizon — Landing Page Design Spec (for Stitch)

> A complete design specification for a single-page marketing site in the
> "Horizon" style shown in the reference mockup. Tone, palette and rhythm are
> aligned with cluely.com: minimal, premium, AI-product feel, generous
> whitespace, warm pastel gradients localized to hero / feature / CTA blocks
> and a refined serif-display headline pairing.
>
> This document is structured so it can be pasted directly into Stitch as a
> brief, section by section.

---

## 0. Global brief (one-paragraph prompt for Stitch)

> Design a single-page marketing site for "Horizon", an AI application
> builder. Light theme on pure white background, premium and quiet. Headlines
> use a large display serif (weight 500, tight leading). Body uses a clean
> neutral sans-serif. Layout is centered, max 1120 px wide, with very generous
> vertical spacing between sections (120 px top/bottom desktop). Use rounded
> shapes everywhere (radius 20–32 px). Color is mostly white and soft neutral
> gray; warm pastel gradients (peach, coral, lavender, mint, cream) appear
> only inside hero, feature cards, the CTA block and the pricing highlight
> card. No drop shadows except very soft elevation on cards (`0 1px 2px
> rgba(0,0,0,.04)`). No dark theme.

---

## 1. Visual language

### 1.1 Color tokens

| Role | Token | Hex |
| --- | --- | --- |
| Surface — page | `--surface-page` | `#FFFFFF` |
| Surface — card | `--surface-card` | `#FFFFFF` |
| Surface — soft | `--surface-soft` | `#FAFAF7` |
| Border — hairline | `--border-hairline` | `#EDEAE5` |
| Border — focus | `--border-focus` | `#1A1A1A` |
| Text — primary | `--text-primary` | `#141414` |
| Text — secondary | `--text-secondary` | `#6B6B6B` |
| Text — muted | `--text-muted` | `#9A9A9A` |
| Accent — primary CTA | `--accent-cta` | `#1A1A1A` |
| Accent — blue (Get Started) | `--accent-blue` | `#2E6FE6` |
| Accent — coral (Upgrade) | `--accent-coral` | linear `#FF7A6B → #FF9F8C` |
| Badge — success dot | `--success-dot` | `#28C36C` |

Gradient tokens (used as section backgrounds and card fills, never as text):

| Token | Stops |
| --- | --- |
| `--grad-hero` | `radial-gradient(at 50% 0%, #FFE9D6 0%, #FFF4EC 35%, #FFFFFF 70%)` |
| `--grad-peach` | `linear-gradient(135deg, #FFD7B5, #FFF1E5)` |
| `--grad-coral` | `linear-gradient(135deg, #FF7A6B, #FFC9C0)` |
| `--grad-lavender` | `linear-gradient(135deg, #E6DBFF, #F4EFFF)` |
| `--grad-mint` | `linear-gradient(135deg, #D7F5E3, #EFFBF3)` |
| `--grad-cream` | `linear-gradient(135deg, #FFF1D6, #FFF8E7)` |
| `--grad-cta` | `linear-gradient(135deg, #C8B6FF 0%, #FFB5C5 50%, #FFD9A8 100%)` |

### 1.2 Typography

- **Display / headlines**: serif, weight 500, tracking `-0.02em`, leading `1.05`. Suggested family: *Instrument Serif*, *GT Sectra*, *Tiempos Text*, or fallback to `ui-serif, "New York", Georgia`.
- **UI / body**: sans-serif, weight 400 for body, 500 for buttons/labels. Suggested: *Inter*, *Söhne*, fallback to `ui-sans-serif, system-ui`.
- **Mono** (only in code-style chips like `Plan ✓`): *JetBrains Mono*, weight 500.

Type scale (desktop → mobile):

| Token | Desktop | Mobile |
| --- | --- | --- |
| `display-xl` (hero h1) | 72 / 1.05 | 44 / 1.1 |
| `display-lg` (section h2) | 48 / 1.1 | 32 / 1.15 |
| `display-md` (CTA h2) | 56 / 1.1 | 36 / 1.15 |
| `title-lg` (card h3) | 22 / 1.3 | 20 / 1.3 |
| `body` | 16 / 1.6 | 15 / 1.55 |
| `small` | 13 / 1.5 | 13 / 1.5 |
| `eyebrow` | 12 / 1.2, uppercase, tracking `0.08em` | same |

### 1.3 Spacing, radii, elevation

- **Grid**: 12-column desktop, gutter `24px`, max-width `1120px`, page padding `24px` mobile / `48px` desktop.
- **Section padding**: `clamp(80px, 10vw, 140px)` top and bottom.
- **Radius scale**: `12` (input), `20` (small card), `28` (large card), `32` (CTA block), `9999` (pill nav, badges, buttons).
- **Elevation**:
  - `e0` flat: no shadow.
  - `e1` resting card: `0 1px 2px rgba(20,20,20,.04), 0 0 0 1px rgba(20,20,20,.04)`.
  - `e2` floating (pricing popular): `0 10px 30px rgba(20,20,20,.06)`.

### 1.4 Motion

- Section reveal: `opacity 0 → 1` + `translateY 12px → 0`, `400ms cubic-bezier(.2,.7,.2,1)`, triggered by IntersectionObserver at 15 % threshold.
- Button hover: background lerp `120ms`, `transform: scale(0.98)` on active.
- No parallax, no marquee, no auto-playing video. Keep it quiet.

---

## 2. Page structure

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Sticky pill nav                                          │
├──────────────────────────────────────────────────────────────┤
│ 2. Hero — badge + serif H1 + sub + prompt + chip row        │
├──────────────────────────────────────────────────────────────┤
│ 3. Section heading: "Imagine lorem ipsum without limits"    │
├──────────────────────────────────────────────────────────────┤
│ 4. Feature card 01 — split layout, "Horizon Tasks" preview  │
├──────────────────────────────────────────────────────────────┤
│ 5. Feature card 02 — split, coral preview "AI Build Log"    │
├──────────────────────────────────────────────────────────────┤
│ 6. Section heading: "Seamless integration..."               │
│    4-tile gallery row                                        │
├──────────────────────────────────────────────────────────────┤
│ 7. Pricing — description + Free tier + Paid tier            │
├──────────────────────────────────────────────────────────────┤
│ 8. Enterprise strip — inline contact-sales                  │
├──────────────────────────────────────────────────────────────┤
│ 9. FAQ — left-aligned title + accordion                     │
├──────────────────────────────────────────────────────────────┤
│ 10. Final CTA — gradient block "So, what are we building?"  │
├──────────────────────────────────────────────────────────────┤
│ 11. Footer — minimal hairline row                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Section-by-section spec

### 3.1 Sticky pill nav

- Container: full-bleed, sticky `top: 16px`, centered horizontally.
- Pill: `max-width 720px`, `height 56px`, `border-radius 9999px`, `background rgba(255,255,255,.7)`, `backdrop-filter blur(16px)`, `border 1px solid var(--border-hairline)`.
- Layout (left → right):
  1. Logo mark — circular `32×32` with monogram `H` in serif.
  2. Nav links: **Product · Use Cases · Resources · Pricing · Enterprise** — sans 14px weight 500, color `--text-secondary`, hover `--text-primary`.
  3. Search icon — minimal, 18px lucide-style stroke.
  4. CTA button: **Start Building** — dark pill `background #1A1A1A`, white text, height `36px`, padding `0 18px`, radius `9999`.
- Active link uses a soft coral underline `2px` 8px below baseline.
- Mobile: collapses into hamburger icon + the CTA only.

### 3.2 Hero

- Background: `--grad-hero` radial behind, fading to white by 70 %.
- Container: centered text column, max-width `780px`.
- Content stack:
  1. **Eyebrow badge** — pill, height `28px`, `background rgba(20,20,20,.04)`, padding `0 12px`, contains a green dot (`8px`, `--success-dot`) + caps mini-label `NEW` + dim separator + `Lorem ipsum dolor`.
  2. **Headline H1**: `display-xl`, serif, color `--text-primary`. Content: `Build with Horizon`.
  3. **Sub-paragraph**: `body`, `--text-secondary`, max-width `520px`. Content: two short lines describing what Horizon does.
  4. **Prompt input** (the hero's interactive element):
     - Card `width 100% (max 720px)`, `radius 24px`, `background #FFFFFF`, `border 1px var(--border-hairline)`, `elevation e1`, `padding 16px 18px`.
     - Top row: placeholder text `Describe the application you want to build…` `text-secondary`, sans 16px.
     - Bottom row: left side — pill chip `Plan ✓` `font-mono 12px`, `background var(--surface-soft)`, `radius 9999`, `padding 4px 10px`. Right side — circular send button `36×36`, `background var(--text-primary)`, white arrow up icon.
  5. **Suggestion chips row** (below input, `margin-top 18px`):
     - Four ghost chips inline, `font-size 13px`, `--text-muted`, separated by 24 px gap. Labels: `Reporting Dashboard`, `Gaming Platform`, `CRM System`, `Inventory Tracker`. No background, hover underlines.

### 3.3 Section heading 1 — "Imagine"

- Section padding: `140px / 140px`.
- Single centered H2: `display-lg`, serif, `--text-primary`. Content: `Imagine lorem ipsum without limits`.
- No subtitle, no buttons. Whitespace is the design.

### 3.4 Feature card 01 — Split layout

- Card: full-width inside container, `radius 28px`, `background #FFFFFF`, `border 1px var(--border-hairline)`, `elevation e1`, `padding 48px`.
- Grid: two columns, `1fr 1fr`, gap `48px`.
- **Left column**:
  - Step indicator `01 / 04` — mono 12 px, `--text-muted`.
  - H3 `title-lg` serif: `Tell Horizon your lorem ipsum idea.`
  - Paragraph `body` `--text-secondary` (3 lines max).
  - Button: pill `Start Building`, `background var(--text-primary)`, white, height `40px`.
- **Right column**:
  - Sub-card that mimics a "Horizon Tasks" preview.
  - Inner card: `background var(--surface-soft)`, `radius 20px`, `padding 24px`.
  - Top row: title `Horizon Tasks` sans 14 px weight 500, with a small `×` icon on the far right.
  - Then 4–5 skeleton rows: each row is a rounded rect `height 10px`, `radius 6px`, `background rgba(20,20,20,.06)`, varying widths (`80 %`, `55 %`, `70 %`, `40 %`).

### 3.5 Feature card 02 — Split layout (coral preview)

- Same outer card spec as 3.4.
- **Left column**: step `02 / 04`, H3 `A backend for lorem ipsum`, paragraph, no button.
- **Right column**:
  - Sub-card: `background var(--grad-coral)`, `radius 20px`, `padding 24px`, slight inner glow.
  - Inside, a list titled `AI Build Log` (sans 14 px weight 500, white at 90 %), followed by 4 line items each with a tiny circular check (`#FFFFFF` on coral) and white label:
    - `Initialized secure environment`
    - `Wired login/signup flow`
    - `Provisioned database schema`
    - `Configuring API routes` (last item has a small pulsing dot to suggest in-progress)
  - Bottom row: small inline progress indicator and time `Took 1m 12s`.

### 3.6 Section heading 2 + 4-tile gallery

- H2 centered: `Seamless integration from idea to execution`.
- Below, a single row of **4 tiles**, each `aspect-ratio 4 / 3`, `radius 24px`, no border, soft inner shadow `e1`. Tile backgrounds use, in order:
  1. `--grad-lavender` with two skeleton bars and a small lavender pill at the top-left.
  2. `--grad-cream` with a coral pill bar centered, simulating a button.
  3. `--surface-card` with a soft gray skeleton.
  4. `--grad-peach` empty, just the texture.
- Gap between tiles: `20px`. On mobile, becomes a horizontal scrollable row with snap.

### 3.7 Pricing

- Section padding `120 / 120`.
- Three-column row (mobile: stacked).
- **Left column** (`width 320px`):
  - H2 `display-lg`: `Simple, transparent pricing.`
  - Paragraph `body` `--text-secondary`.
- **Middle column — Free tier**:
  - Card: `radius 24px`, `background var(--grad-lavender)`, `padding 32px`.
  - Title `Start with lorem` sans 16 px weight 500.
  - Price line: `$0` serif `display-md`, suffix `/mo` sans 14 px `--text-secondary`.
  - Bullet list (3 items): `3 Projects`, `Community Support`, `Basics of Components`. Bullet = small check inside a circle.
  - Button: `Get Started` filled, `background var(--accent-blue)`, white, full-width pill.
- **Right column — Paid tier** (POPULAR):
  - Card: `radius 24px`, `background var(--grad-coral)` at 25 % overlay on white, `padding 32px`, `elevation e2`.
  - Badge top-right: `POPULAR` mono 11 px uppercase, dark pill on white.
  - Title `Paid lorem`, price `$20/mo`.
  - Bullets (4): `Unlimited Projects`, `Priority Support`, `Custom Domains`, `Advanced Integrations`.
  - Button: `Upgrade to Pro` filled `--accent-coral` gradient, white text.

### 3.8 Enterprise strip

- Single full-width row, `radius 20px`, `background var(--surface-soft)`, `border 1px var(--border-hairline)`, `padding 24px 32px`.
- Layout: text left (`Enterprise needs?` sans 16 px weight 500 followed on a second line by a short description in `--text-secondary`), link right (`Contact Sales` sans 14 px weight 500 with right arrow).

### 3.9 FAQ

- Two-column layout (mobile stacked).
- **Left column**: H2 `display-lg` split across two lines: `Frequently / asked questions` (serif).
- **Right column**: accordion list, 4 items separated by `border-bottom 1px var(--border-hairline)`. Each item:
  - Closed state: question on left sans 16 px weight 500, `+` icon on right, padding `20 0`.
  - Open state: short paragraph below `body` `--text-secondary`.
  - Initial state: all closed.
- Items:
  1. `What is Horizon?`
  2. `How does Horizon work?`
  3. `Can I export my code?`
  4. `Is there a free trial?`

### 3.10 Final CTA block

- Full-width section, `background var(--grad-cta)`, no border, `padding 96 0`, contains centered card OR fills section.
- Centered content stack:
  - H2 `display-md` serif on near-black text (use `--text-primary` over the gradient — the gradient is light enough): `So, what lorem are we building?`
  - Below, pill button `Get started →`, `background rgba(255,255,255,.9)`, `--text-primary`, `radius 9999`, `padding 14 28`, `elevation e2`. Subtle hover: `background #FFFFFF`.

### 3.11 Footer

- Hairline row, `padding 32 0`, `border-top 1px var(--border-hairline)`.
- Single line on desktop: logo + copyright on left (`© 2025 Horizon`), tiny nav on right (`Privacy · Terms · Status`).
- All text `small` `--text-muted`.

---

## 4. Reusable components (for Stitch's component library)

| Component | Variants | Notes |
| --- | --- | --- |
| `Button` | `solid-dark`, `solid-blue`, `solid-coral`, `ghost`, `pill-white` | Heights 36 / 40. Radius 9999. |
| `Card` | `flat`, `outlined`, `gradient-peach`, `gradient-coral`, `gradient-lavender` | Default radius 28. |
| `Pill` | `chip`, `badge-new`, `badge-popular` | Height 24 / 28. |
| `Input.Prompt` | single-line + send button | Used only in hero. |
| `Skeleton.Bar` | widths 40 / 55 / 70 / 80 / 100 % | Used in feature card previews. |
| `Accordion.Item` | open / closed | Used in FAQ. |
| `Nav.Pill` | sticky, blurred | Used at top. |
| `Section` | `default`, `cta-gradient` | Wraps section padding. |

---

## 5. Responsive rules

- ≥ 1200 px: full grid, all sections as designed.
- 1024 – 1199 px: same layout, max-width `960px`.
- 768 – 1023 px: feature cards stack vertically (image preview below text), pricing becomes single column, nav links collapse to icon menu.
- < 768 px: 16 px container padding; type scale drops to mobile column from §1.2; CTA button becomes full-width pill; 4-tile gallery scrolls horizontally with snap.

---

## 6. Accessibility

- All interactive elements ≥ 40 px touch target on mobile.
- Color contrast: body text on white ≥ 4.5:1. Muted text reserved for non-essential copy.
- Focus ring: `outline 2px solid var(--border-focus)`, `outline-offset 2px`, on tab.
- Honor `prefers-reduced-motion: reduce` — disable section reveal animation.
- All images / preview tiles get `alt` text describing the mock content.

---

## 7. Copy bank (for filling Stitch placeholders)

```
HERO
H1: Build with Horizon
Sub: Horizon lets you build lorem ipsum applications in minutes. An airy, minimal workspace designed for seamless AI integration.
Badge: NEW · Lorem ipsum dolor
Prompt placeholder: Describe the application you want to build…
Chip row: Reporting Dashboard · Gaming Platform · CRM System · Inventory Tracker

SECTION 1
H2: Imagine lorem ipsum without limits.

FEATURE 01
Step: 01 / 04
H3: Tell Horizon your lorem ipsum idea.
P: Transform your idea into functional applications seamlessly. Our intuitive builder lets you craft complex interfaces and logics without traditional coding constraints.
CTA: Start Building

FEATURE 02
Step: 02 / 04
H3: A backend for lorem ipsum.
P: Robust infrastructure generated instantly. From authentication to database schemas, Horizon wires the backend so you can focus on the user experience.
Preview list: AI Build Log → Initialized secure environment / Wired login/signup flow / Provisioned database schema / Configuring API routes…

SECTION 2
H2: Seamless integration from idea to execution.

PRICING
Title: Simple, transparent pricing.
P: Choose the plan that fits your ambition. No hidden fees.

  Free tier:
    Name: Start with lorem
    Price: $0 /mo
    Bullets: 3 Projects · Community Support · Basics of Components
    CTA: Get Started

  Paid tier (POPULAR):
    Name: Paid lorem
    Price: $20 /mo
    Bullets: Unlimited Projects · Priority Support · Custom Domains · Advanced Integrations
    CTA: Upgrade to Pro

ENTERPRISE STRIP
Label: Enterprise needs?
P: Custom SLAs, dedicated account management, and more.
Link: Contact Sales

FAQ
Title: Frequently asked questions
Items:
  - What is Horizon?
  - How does Horizon work?
  - Can I export my code?
  - Is there a free trial?

FINAL CTA
H2: So, what lorem are we building?
Button: Get started →

FOOTER
© 2025 Horizon · Privacy · Terms · Status
```

---

## 8. Do / Don't checklist

✅ Do
- Use serif only for headlines and price numbers.
- Keep gradients confined to specific surfaces; never gradient text.
- Treat whitespace as a first-class element — never fill it with secondary content.
- Round everything. Sharp corners read as "old SaaS".
- Use the prompt input as the single most visually weighted element in the hero.

❌ Don't
- Don't introduce drop shadows beyond `e1` / `e2`.
- Don't tilt the chat input or any card. The mockup is flat.
- Don't reintroduce dark mode; this layout depends on light surface tension.
- Don't use more than two button color families per page (dark + coral, or dark + blue).
- Don't animate the gradient. Keep it static for premium feel.

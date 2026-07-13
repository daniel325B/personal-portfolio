# 자산 현황 Design System

## 0. Research Log
- Embedded refs: shortlisted Kraken, Revolut, Sentry; picked Kraken dashboard grammar for data density.
- Lazyweb: skipped because the local shell lacks the required parsing utilities for its safe token workflow.
- Imagen drafts: skipped because an operational finance workspace needs legible data over decorative imagery.
## 1. Atmosphere & Identity
Private asset command center following the raoni.xyz dark-teal market grammar: soft teal glow, translucent deep-green data panels, and compact source-aware controls. The signature is a quote-led hierarchy: original market currency is always visible first, while KRW valuation is explicitly a conversion.
## 2. Color
--canvas #061e20; --panel rgba(15,53,55,.62); --raised #0f3537; --ink #e8fffa; --muted #7fa8a4; --line rgba(151,252,228,.16); --accent #97fce4; --positive #4ade80; --warning #ffd479; --negative #f87171.
## 3. Typography
System Korean sans at 12/14/16/24/40px; ui-monospace for market figures.
## 4. Spacing & Layout
4px base, 1180px max width, 640/768/820/1024 breakpoints.
## 5. Components
Quote card, action button, asset form, and holding row each expose default, empty, loading, and stale states with semantic labels. Market currency and KRW-converted valuation must never share the same label or value field.
## 6. Motion & Interaction
150ms color and transform only; reduced-motion disables nonessential transitions.
## 7. Depth & Surface
Tonal panels with a single subtle border.
## 8. Accessibility Constraints & Accepted Debt
WCAG AA contrast target, visible focus, semantic controls, and color-independent status. No accepted debt.

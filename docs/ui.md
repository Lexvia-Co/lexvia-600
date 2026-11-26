# VBER UI guidelines

## App name and language

Use **VBER** wherever the app name appears. Write user-facing text in **Mandarin Chinese**, including navigation, buttons, form labels, help text, and error messages. Keep legal terms and other specialized terminology in their original language, and write any surrounding explanation in Mandarin.

## UI component decisions

**Use the [repository shadcn/ui skill](../.agents/skills/shadcn/SKILL.md) whenever a task involves a UI component decision.** This applies during planning, design, implementation, and review, including when selecting a form control, composing a page, or changing how a component looks or behaves.

shadcn/ui is the project's only UI design framework. Reuse existing project components first. If a component is missing, check the shadcn/ui registry and compose its primitives using the project's variants and theme tokens.

Before implementing a UI change, also consult [Modern Web Guidance](../.agents/skills/modern-web-guidance/SKILL.md) for the relevant browser behavior and accessibility requirements.

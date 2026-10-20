---
name: accessibility
description: Web accessibility (a11y) for Next.js + React. Use when building UI components, forms, navigation, or auditing pages against WCAG 2.2 AA. Covers semantic HTML, ARIA, keyboard, focus, contrast, and automated testing.
license: Apache-2.0
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "app/**"
  - "components/**"
---

# Accessibility (WCAG 2.2 AA)

## Quick Reference

| Concern | Rule |
|---------|------|
| **Semantics** | Use native elements first (`<button>`, `<a>`, `<nav>`, `<main>`). ARIA only when no native element fits. |
| **Keyboard** | Every interactive element reachable + operable by keyboard. Visible focus ring (never `outline: none` without replacement). Logical tab order. |
| **Forms** | Every input has a `<label htmlFor>`. Errors via `aria-describedby` + `aria-invalid`. Group with `<fieldset>`/`<legend>`. |
| **Images** | Meaningful `alt`; decorative → `alt=""`. Next.js `<Image>` requires `alt`. |
| **Contrast** | Text ≥ 4.5:1 (3:1 for large/UI). Don't encode meaning in color alone. |
| **Dynamic** | Announce async changes with `aria-live` (`polite`/`assertive`). Move focus to new content/dialogs; trap focus in modals; restore on close. |
| **Landmarks** | One `<main>`, skip-to-content link, headings in order (no skipped levels). |
| **Motion** | Respect `prefers-reduced-motion`. |

## React/Next.js patterns

```tsx
// Accessible icon button — name comes from aria-label, icon hidden from AT
<button aria-label="Close dialog" onClick={onClose}>
  <XIcon aria-hidden="true" />
</button>

// Field with error wired to the input
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-invalid={!!error}
       aria-describedby={error ? "email-err" : undefined} />
{error && <p id="email-err" role="alert">{error}</p>}
```

- Modals: render in a portal, set `role="dialog"` + `aria-modal="true"`, trap focus, `Esc` closes, restore focus to trigger.
- Prefer Radix UI / React Aria primitives over hand-rolled widgets — they ship correct ARIA + keyboard behavior.
- Server Components: a11y is markup-level, unaffected by RSC/Client split — same rules apply.

## Automated gate

```bash
# Component/integration level — fails CI on violations
npm i -D jest-axe @axe-core/playwright
```

```ts
import { axe } from 'jest-axe'
expect(await axe(container)).toHaveNoViolations()
```

```bash
# Page level — Lighthouse a11y category, budget >= 95
npx lighthouse <url> --only-categories=accessibility --quiet
```

Automated tools catch ~30-40% of issues. Always add a manual keyboard-only pass + one screen-reader smoke test (VoiceOver/NVDA) for primary flows.

## When to load references

| Task | Load |
|------|------|
| Full WCAG 2.2 criteria checklist | `references/wcag-checklist.md` (create as needed) |
| Complex widget ARIA patterns (combobox, tabs, tree) | WAI-ARIA Authoring Practices Guide |

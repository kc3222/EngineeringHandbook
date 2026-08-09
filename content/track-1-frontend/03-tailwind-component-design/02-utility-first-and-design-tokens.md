---
title: "Utility-First & Design Tokens"
description: "The @theme layer, what belongs in it, and when to stop using utilities."
track: 1
chapter: 3
page: 2
readMinutes: 5
---

:::info[Prerequisites]
The chapter overview — especially the framing of Tailwind as a token system.
:::

## Tokens are the configuration

In Tailwind v4, the theme is declared in CSS. `@theme` defines custom properties
that are simultaneously **CSS variables** and **utility class generators**:

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 259);
  --color-surface:   oklch(0.98 0.005 260);
  --radius-card:     0.75rem;
  --breakpoint-3xl:  120rem;
}
```

That produces `bg-brand-500`, `text-brand-500`, `border-brand-500`, `rounded-card`
and a `3xl:` variant — and emits `--color-brand-500` into `:root`, so the same value
is reachable from hand-written CSS, an inline style, or a chart library that needs a
hex.

The namespace prefix determines which utilities appear: `--color-*` for colours,
`--spacing-*` for spacing, `--text-*` for font sizes, `--breakpoint-*` for
responsive variants. That mapping is the whole configuration API.

Defaults can be extended, replaced per namespace, or cleared entirely:

```css
@theme {
  --color-*: initial;          /* drop Tailwind's default palette */
  --color-brand-500: oklch(0.62 0.19 259);
  --color-ink: oklch(0.22 0.01 260);
}
```

Clearing a namespace is worth considering for a design system with its own palette.
Leaving 22 default colour ramps in place means `bg-emerald-400` is always available,
and it *will* appear in the codebase.

## What belongs in the token layer

The test is whether a value is a **decision** or a **measurement**.

| In `@theme` | Left in the markup |
| --- | --- |
| Brand and semantic colours | A one-off `top-[3px]` alignment nudge |
| The spacing scale | `w-[247px]` for a specific illustration |
| Type scale and font families | A single unusual `z-[60]` |
| Border radii, shadows, easing curves | Anything used once, ever |

Two failure modes sit either side of that line.

**Too few tokens** and arbitrary values spread: `text-[#3b82f6]` in fourteen files,
each one a place the rebrand won't reach. If a value appears three times, it's a
token.

**Too many tokens** and the theme becomes a second component library:
`--spacing-card-header-gap` is not a design token, it's a component's internal
detail that has been given global scope.

Semantic naming is where this pays off. `--color-brand-500` is a value;
`--color-danger` is a role. Roles survive redesigns, which is exactly what you want
from the layer that's hardest to change.

## Arbitrary values are an escape hatch, and that's fine

Square-bracket syntax lets any utility take a raw value: `grid-cols-[1fr_320px]`,
`bg-[url('/hero.avif')]`, `mt-[3px]`. These aren't a failure of discipline — the
alternative for a genuine one-off is a token nobody else should use.

Treat them as a signal rather than a smell: one is fine, the same one in three
places is a token waiting to be named.

The related v4 feature is `@utility`, for a custom utility that needs real CSS
rather than a value:

```css
@utility scrollbar-none {
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
}
```

Custom utilities participate in variants the way built-in ones do, so
`md:scrollbar-none` works. A hand-written class in `@layer components` does not.

## When to stop using utilities

Utilities are wrong for some things, and pretending otherwise produces the worst
Tailwind code.

**Complex keyframes and multi-step animations.** Write the `@keyframes` in CSS,
expose it as an `--animate-*` token, and use the generated utility.

**Content you don't control.** Markdown from a CMS has no class attributes to put
utilities on. Either style it in `@layer base` within a scoping class, or use the
typography plugin — the one place a `prose` mega-class is the right answer.

**Genuinely global rules.** Base typography, focus-visible defaults, `::selection`
colours. These belong in `@layer base`.

The one thing to avoid is `@apply` used to rebuild semantic CSS:

```css
/* Reintroduces every problem utilities solved */
.btn-primary {
  @apply inline-flex items-center rounded-card bg-brand-500 px-4 py-2 …;
}
```

This is a class you must name, can't safely delete, and can't vary per instance —
and it's now indirection on top of utilities rather than instead of them. In React,
the encapsulation you wanted is a **component**, not a class. `@apply` earns its
place only where a component isn't available: third-party markup, an email
template, a `@layer base` rule.

## Reading long class strings

The readability objection is real, and the mitigations are mundane:

- **Sort consistently.** [`prettier-plugin-tailwindcss`](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) enforces the canonical order automatically, which is what makes diffs legible.
- **Extract the component early.** If the class string is unreadable, the element usually wanted to be a component two edits ago.
- **Install the IntelliSense extension.** Class name completion, hover previews of the resolved value, and warnings about conflicting utilities.
- **Accept that markup carries more.** The tradeoff was always "more in the HTML, less in the CSS". A file where every element's styling is visible in place is easier to change than one where it's three files away.

## What to take away

- `@theme` variables are simultaneously design tokens, CSS variables and utility generators — that dual role is the point.
- Tokens are decisions; one-off measurements stay in the markup as arbitrary values.
- Name roles (`--color-danger`), not just values (`--color-red-500`), in the layer you can least afford to churn.
- `@utility` for reusable custom utilities; `@layer base` for global rules.
- `@apply` to rebuild `.btn-primary` recreates the problems utilities exist to avoid — extract a component instead.

## References

- [Tailwind CSS — Theme variables](https://tailwindcss.com/docs/theme)
- [Tailwind CSS — Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles) (`@utility`, `@custom-variant`, `@layer`)
- [Tailwind CSS — Colors](https://tailwindcss.com/docs/colors) — the default palette and the OKLCH move.
- [Tailwind CSS — Editor setup](https://tailwindcss.com/docs/editor-setup)

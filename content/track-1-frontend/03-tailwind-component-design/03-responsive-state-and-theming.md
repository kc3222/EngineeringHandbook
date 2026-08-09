---
title: "Responsive, State & Theming"
description: "Variants, container queries, and a dark mode that survives a server render."
track: 1
chapter: 3
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**Utility-First & Design Tokens** — variants are prefixes on those utilities.
:::

## Variants are conditions on a utility

A variant prefix applies a utility only under a condition — a media query, a
pseudo-class, a parent's state. They compose, and they stack:

```html
<button class="bg-brand-500 hover:bg-brand-600 focus-visible:ring-2
               disabled:opacity-50 md:px-6 dark:bg-brand-400">
```

The whole system is that one idea applied to different condition types:

| Kind | Examples |
| --- | --- |
| Breakpoint | `sm:` `md:` `lg:` — min-width, so mobile-first |
| Container | `@sm:` `@md:` — relative to the nearest `@container` ancestor |
| State | `hover:` `focus-visible:` `active:` `disabled:` `aria-expanded:` |
| Position in a group | `first:` `last:` `odd:` `even:` |
| Relational | `group-hover:` `peer-checked:` `has-[:checked]:` |
| Theme / preference | `dark:` `motion-reduce:` `print:` |

Two worth knowing specifically.

**`focus-visible:` rather than `focus:`** for focus rings. `focus:` fires on mouse
clicks too, which is why so many buttons have visible rings after being clicked and
why so many developers then remove the ring entirely — taking keyboard users' only
navigation cue with it. `focus-visible` shows it exactly when the browser judges it
useful.

**`group-*` and `peer-*`** style an element based on *another* element's state.
`group` on a parent lets children react to hovering the parent; `peer` on a sibling
lets a following sibling react to it. A custom checkbox indicator that responds to
the real (visually hidden) input is `peer-checked:`, and it's the standard way to
build one without JavaScript.

## Breakpoints describe the viewport; containers describe the space

Tailwind's `sm:`/`md:`/`lg:` variants are min-width media queries, which is why
utilities read mobile-first: `p-4 md:p-8` means "4 always, 8 from `md` up". Writing
`p-8 md:p-4` isn't wrong, but it fights the grain.

The limitation is that a media query knows the viewport, not the component. A card
in a 320px sidebar and the same card in a 900px main column get the same `lg:`
treatment, because the window is the same width in both cases.

Container queries fix this and are built in as of v4:

```html
<div class="@container">
  <article class="flex flex-col @md:flex-row @md:gap-6">
```

The card now responds to *its own* width. For a design system, this is a
significant shift: a component becomes genuinely portable, because its layout rules
travel with it instead of assuming where on the page it will be used.

Use breakpoints for page-level layout — the shell, the sidebar, the grid. Use
container queries for components that appear in more than one context.

## Dark mode

By default, `dark:` is a `prefers-color-scheme` media query — no configuration, no
JavaScript, and no way for the user to override the OS setting. That's the right
default and often enough.

For a manual toggle, override the variant to key off a class or attribute:

```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

Then set `data-theme` on `<html>` and `dark:` follows it.

The scaling problem is that `dark:` on every utility doubles the class strings and
puts the theme decision in hundreds of files. The alternative is to theme the
**tokens**, not the utilities:

```css
@theme {
  --color-surface: oklch(0.99 0 0);
  --color-ink:     oklch(0.22 0.01 260);
}

[data-theme='dark'] {
  --color-surface: oklch(0.21 0.01 260);
  --color-ink:     oklch(0.96 0 0);
}
```

Now `bg-surface text-ink` is correct in both themes and no component mentions dark
mode at all. Reserve `dark:` for the exceptions — a shadow that needs different
opacity, an image that needs swapping.

### The flash, and why it's a rendering problem

A server-rendered page has no idea what the user picked. It sends light markup, the
browser paints it, then JavaScript reads `localStorage` and switches — a white flash
on every load, most visible on the slowest connections.

There is no CSS-only fix. The standard solution is a small **blocking** inline
script in `<head>` that sets the attribute before first paint:

```html
<script>
  try {
    const t = localStorage.theme ??
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
  } catch {}
</script>
```

It has to be inline (an external script is a round trip), it has to be in `<head>`
before any content, and it must not be deferred. In Next.js this belongs in the root
layout; libraries like `next-themes` package the same trick. Storing the preference
in a cookie instead of `localStorage` is the fully server-side alternative — the
server can then render the correct theme in the first response.

## Accessibility isn't a variant you add later

Three things the utility layer makes easy to get wrong:

- **Don't delete focus rings.** If `focus:outline-none` appears without a replacement `focus-visible:` style, keyboard navigation is broken.
- **Check contrast on both themes.** A palette that passes [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 4.5:1 in light mode routinely fails inverted; the dark surface usually needs a *lighter* text token than the naive inversion.
- **Respect `prefers-reduced-motion`.** `motion-reduce:` and `motion-safe:` exist; an animation applied unconditionally is one a vestibular-disorder user can't escape.

## What to take away

- Variants are conditions on a single utility, and they compose. `focus-visible:` is the correct default for focus rings.
- Breakpoints are viewport-relative; container queries make a component respond to its own space, which is what makes it portable.
- Theme the tokens, not the utilities — `dark:` on everything spreads the theme across the codebase.
- The dark-mode flash is a rendering-order problem, fixed with a blocking inline script or a cookie the server can read.
- Contrast has to be verified per theme; inverting a palette does not preserve it.

## References

- [Tailwind CSS — Hover, focus and other states](https://tailwindcss.com/docs/hover-focus-and-other-states)
- [Tailwind CSS — Responsive design](https://tailwindcss.com/docs/responsive-design) and [Dark mode](https://tailwindcss.com/docs/dark-mode)
- [MDN — CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — contrast (1.4.3), focus appearance (2.4.11), motion (2.3.3)

---
title: "Building the Component Layer"
description: "Variant APIs, class merging, and the headless/styled split that makes a design spec buildable."
track: 1
chapter: 3
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Responsive, State & Theming**, and the composition section of **Components & Props** in Chapter 1.
:::

## Where the abstraction goes

Utilities have no abstraction of their own — that's the design. The encapsulation
has to live in a component, which puts a familiar question in front of you: what is
this component's API?

The naive version breaks quickly:

```tsx
function Button({ primary, secondary, danger, small, large, className }) {
  const classes = [
    'inline-flex items-center rounded-card font-medium',
    primary && 'bg-brand-500 text-white hover:bg-brand-600',
    danger && 'bg-danger text-white hover:bg-danger-600',
    small && 'px-2 py-1 text-sm',
    large && 'px-6 py-3 text-lg',
  ].filter(Boolean).join(' ');
  …
}
```

Three problems arrive at once: `primary` and `danger` are mutually exclusive but the
types don't say so, adding a variant means touching the conditional chain, and
`className` from the caller can't reliably override anything because CSS resolves by
source order, not by which class came last in the string.

## Variants as data

The standard fix is a lookup table keyed by a *variant* prop, which makes the API a
union type:

```tsx
const base = 'inline-flex items-center rounded-card font-medium transition-colors ' +
             'focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';

const variants = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600',
  ghost:   'bg-transparent text-ink hover:bg-surface-200',
  danger:  'bg-danger text-white hover:bg-danger-600',
} as const;

const sizes = { sm: 'px-2 py-1 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' } as const;

type ButtonProps = React.ComponentProps<'button'> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};
```

`variant="primary"` and `variant="danger"` are now impossible to combine, the type
error tells you when a variant name is wrong, and adding one is a single object
entry. Libraries such as [CVA](https://cva.style/docs) and
[tailwind-variants](https://www.tailwind-variants.org/) formalise this pattern with
compound variants and defaults; the pattern matters more than the library.

## Merging classes, not concatenating them

The `className` override problem is worth understanding rather than working around.
Given `class="px-4 px-8"`, CSS doesn't pick the last one in the attribute — it picks
whichever rule comes later in the stylesheet. Since Tailwind emits utilities in a
fixed order, the *caller's* override loses about half the time, unpredictably.

[`tailwind-merge`](https://github.com/dcastil/tailwind-merge) resolves conflicts by
understanding the utilities:

```tsx
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

<button className={cn(base, variants[variant], sizes[size], className)} />
```

The pairing is conventional and the division of labour is worth knowing: `clsx`
handles conditionals and arrays; `twMerge` drops earlier utilities in the same
conflict group. `cn()` in a `lib/utils.ts` is close to universal in Tailwind
codebases for this reason.

Accepting `className` at all is a deliberate choice, and the right one for a
component library: a component that can't be nudged gets copy-pasted instead.

## Headless behaviour, styled by you

The hardest parts of a component library aren't visual. A dropdown needs focus
trapping, roving `tabindex`, `aria-expanded`, escape handling, outside-click
dismissal, scroll locking, and collision-aware positioning. Getting that right is
weeks of work and the reason so many hand-built modals are unusable with a keyboard.

Headless libraries — [Radix Primitives](https://www.radix-ui.com/primitives),
[React Aria](https://react-spectrum.adobe.com/react-aria/),
[Headless UI](https://headlessui.com/) — implement the behaviour and the ARIA
semantics and ship no styling. You supply the utilities.

```tsx
<Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                           rounded-card bg-surface p-6 shadow-lg
                           data-[state=open]:animate-in">
```

Note `data-[state=open]:` — headless libraries expose their internal state as data
attributes precisely so that arbitrary variants can hook into them.

This is also the model [shadcn/ui](https://ui.shadcn.com/) popularised: rather than
installing a component library, you copy Radix-plus-Tailwind components into your
repository and own them. The tradeoff is explicit — no upgrade path, full control —
and it suits a product with its own design language better than it suits a shared
internal library.

| Approach | Good for | Cost |
| --- | --- | --- |
| Fully styled library (MUI, Mantine) | Getting to a working product fast | Fighting it when the design diverges |
| Headless + your utilities | A specific design language | You own the styling layer |
| Copy-in components (shadcn/ui) | Full control with a running start | No upstream fixes; you maintain them |

## Building from a design spec

A few habits that make a handoff go smoothly:

- **Map the design system's tokens to `@theme` first**, before building any component. If the spec has a spacing scale, it should be *the* spacing scale — not something you approximate with Tailwind's defaults.
- **Build the primitives before the screens.** Button, Input, Card, Dialog. Screens assembled from primitives stay consistent; screens built directly from utilities drift by the third page.
- **Ask which differences are variants and which are one-offs.** Three buttons that differ by 2px of padding are one variant and two mistakes — worth resolving with the designer rather than encoding.
- **Name variants for their role, not their look.** `variant="danger"`, not `variant="red"`. The colour changes; the meaning doesn't.

## What to take away

- Utilities have no abstraction layer, so the component *is* the abstraction. Design its props like an API.
- Variants as a lookup table give you exclusivity, type safety and a one-line path to adding another.
- `clsx` + `tailwind-merge` exists because class order in the attribute doesn't decide the winner — stylesheet order does.
- Headless primitives supply the accessibility work that's easy to underestimate and hard to retrofit.
- Map design tokens into `@theme` before building components, and name variants after their role.

## References

- [Radix Primitives](https://www.radix-ui.com/primitives) and [React Aria](https://react-spectrum.adobe.com/react-aria/)
- [CVA](https://cva.style/docs) and [tailwind-variants](https://www.tailwind-variants.org/)
- [tailwind-merge](https://github.com/dcastil/tailwind-merge) — including [what it does and doesn't handle](https://github.com/dcastil/tailwind-merge/blob/main/docs/limitations.md)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) — the behaviour headless libraries are implementing.

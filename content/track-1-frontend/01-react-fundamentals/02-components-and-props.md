---
title: "Components & Props"
description: "Composition, one-way data flow, and why children beats another boolean prop."
track: 1
chapter: 1
page: 2
readMinutes: 4
---

:::info[Prerequisites]
None beyond the chapter overview.
:::

## A component is a function of its props

A component takes props and returns a description of UI. Not DOM nodes — a plain
object tree that React will reconcile against the last one.

```tsx
type BadgeProps = { label: string; tone?: 'neutral' | 'warning' };

function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
```

`<Badge label="Draft" />` compiles to a `createElement`-style call, which returns
`{ type: Badge, props: { label: 'Draft' } }`. Nothing has rendered yet. React
decides when to call `Badge`, and it may call it more than once for a single visible
update.

That has a hard consequence: **rendering must be pure.** Given the same props and
state, a component must return the same thing and must not touch anything outside
itself while doing so.

```tsx
let renderCount = 0;

function Broken({ items }: { items: Item[] }) {
  renderCount++;                 // mutating module state during render
  items.sort((a, b) => …);       // mutating a prop the parent still owns
  return <List items={items} />;
}
```

Both lines are bugs even though both "work" in development. React's StrictMode
double-invokes component functions in development specifically to make impurity
show up as a visibly wrong count or a doubly-sorted list, rather than as a
mystery in production.

## Props flow down, and only down

A child cannot change a prop. If a child needs to affect the parent, the parent
passes a function — the data still flows down, and the *event* flows up.

```tsx
function Parent() {
  const [query, setQuery] = useState('');
  return <SearchBox value={query} onChange={setQuery} />;
}
```

This is the controlled-component pattern, and it's worth naming the alternative it
replaces. An **uncontrolled** input keeps its value in the DOM and you read it when
you need it (via a ref, or the form's `FormData`). Controlled inputs re-render on
every keystroke and give you the value at all times; uncontrolled inputs don't
re-render and give you the value on demand.

| | Controlled | Uncontrolled |
| --- | --- | --- |
| Value lives in | React state | The DOM node |
| Re-renders per keystroke | Yes | No |
| Validation as you type | Straightforward | Awkward |
| Large forms | Can get expensive | Cheap |
| Reading on submit | Already in state | `new FormData(e.currentTarget)` |

Neither is the right default for everything. Controlled is right when something
else on screen depends on the value mid-typing; uncontrolled is right for a plain
form that only matters at submit.

## Composition beats configuration

The most common design mistake in a component library is growing a component by
adding props to it. Each new case adds a flag, and after a year the signature has
`showIcon`, `iconPosition`, `dense`, `hideFooter`, `variant`, `subVariant` — and
every combination is a state nobody tested.

The alternative is to let the caller pass UI instead of instructions:

```tsx
// Configuration: every new layout is a new prop
<Card title="Usage" footerText="Updated 2m ago" showBadge badgeTone="warning" />

// Composition: the caller supplies the pieces
<Card>
  <Card.Header>
    Usage <Badge tone="warning" label="Over limit" />
  </Card.Header>
  <Card.Footer>Updated 2m ago</Card.Footer>
</Card>
```

`children` is the simplest version of this, and JSX slots — passing elements as
named props (`header={<…>}`, `actions={<…>}`) — are the version that works when
order matters or a slot is optional.

Composition also has a performance side effect worth knowing: an element passed as
`children` is created by the *parent*, so it doesn't re-render when the component
that receives it re-renders. Passing children through a component that owns rapidly
changing state is a way to keep that subtree out of the churn.

A rough rule: **a boolean prop that changes structure should probably be a slot; a
boolean prop that changes appearance is fine.** `dense` is fine. `hideFooter` is a
slot you didn't make.

## Keys identify, they don't order

When rendering a list, `key` tells React which element in the new tree corresponds
to which in the old one. It's identity, not position.

```tsx
{rows.map((row, i) => <Row key={row.id} {...row} />)}   // stable identity
{rows.map((row, i) => <Row key={i} {...row} />)}        // identity = position
```

With an index key, deleting the first row makes React think every row's data
changed rather than that one row disappeared. Any state held *inside* those rows —
an open dropdown, a half-typed input, a CSS transition — follows the index, so it
lands on the wrong row. Index keys are safe only for lists that are never reordered,
filtered or spliced.

The inverse trick is useful: changing a key deliberately **resets** a subtree.
`<ProfileForm key={userId} />` throws away the form's internal state when the user
changes, which is usually what you wanted and is far less code than syncing it in
an effect.

## What to take away

- Rendering must be pure; StrictMode's double-invoke in development exists to catch when it isn't.
- Data flows down and events flow up — a child changes nothing it didn't create.
- Controlled vs uncontrolled is a question about whether anything needs the value mid-typing.
- Reach for `children` and slots before adding another boolean; structural flags are slots in disguise.
- `key` is identity. Index keys corrupt per-row state; a deliberate key change is the cheapest state reset there is.

## References

- [react.dev — Passing props to a component](https://react.dev/learn/passing-props-to-a-component)
- [react.dev — Keeping components pure](https://react.dev/learn/keeping-components-pure) and [StrictMode](https://react.dev/reference/react/StrictMode)
- [react.dev — Rendering lists](https://react.dev/learn/rendering-lists#why-does-react-need-keys)
- [react.dev — Preserving and resetting state](https://react.dev/learn/preserving-and-resetting-state)

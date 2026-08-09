---
title: "Rendering Performance"
description: "What actually makes React slow, the memoisation toolkit, and what React Compiler changes about it."
track: 1
chapter: 1
page: 6
readMinutes: 5
---

:::info[Prerequisites]
**State & the Render Cycle** and **Sharing State & Custom Hooks** — the two places most performance problems originate.
:::

## Measure before you memoise

A re-render is React calling your function and comparing the result. That is cheap.
What's expensive is almost always one of four things:

| Real cause | Signature |
| --- | --- |
| A large tree re-rendering on every keystroke | Typing lags, everything else is fine |
| Expensive work inside render | One interaction is slow, consistently |
| Rendering thousands of DOM nodes | Slow initial paint, memory grows with the list |
| A network waterfall | The screen is empty, then arrives all at once |

Only the first two are memoisation problems, and only after you've confirmed which
component is responsible. React DevTools' **Profiler** records a commit and shows
what rendered and why; React 19.2 also emits
[Performance Tracks](https://react.dev/reference/dev-tools/react-performance-tracks)
into the browser's own performance panel, which puts React's work on the same
timeline as layout and paint.

Guessing is unusually costly here, because every memoisation you add is code that
must stay correct forever and gives back nothing if the component wasn't the
problem.

## The toolkit

Three APIs, three different jobs, routinely confused:

| API | Memoises | Use when |
| --- | --- | --- |
| `memo` | A component's rendered output | A component re-renders with identical props inside a frequently-rendering parent |
| `useMemo` | A computed value | The computation is genuinely expensive, or the result is a dependency of something memoised |
| `useCallback` | A function reference | The function is a dependency of an effect or a prop to a `memo`'d child |

The trap is that they only work together. `memo` compares props with `Object.is`, so
a single inline object, array or arrow function prop defeats it entirely:

```tsx
const Row = memo(function Row({ item, onSelect }) { … });

// memo does nothing here — a new function every parent render
<Row item={item} onSelect={() => select(item.id)} />
```

This is why memoisation tends to spread: memoising a component forces you to
memoise everything you pass it, and each of those has its own dependencies. A
partially memoised path is not partially fast — it's the same speed as none, plus
the comparison cost.

## Structural fixes usually beat memoisation

Two techniques that remove the problem rather than caching around it.

**Move state down.** If only a subtree uses a piece of state, push the state into a
component that wraps just that subtree. The rest of the page stops re-rendering
with no memoisation at all.

**Pass expensive subtrees as `children`.** An element created by the parent doesn't
re-render when the component holding it re-renders, because it's the *same element
object*:

```tsx
function ExpensiveDashboard() {           // no memo needed
  return <ThousandsOfCharts />;
}

function Page() {
  return (
    <Sidebar>                              {/* owns fast-changing open/closed state */}
      <ExpensiveDashboard />               {/* created here, so unaffected */}
    </Sidebar>
  );
}
```

For the "thousands of DOM nodes" case, neither helps — the answer is
**virtualisation** (rendering only the visible window), via a library like TanStack
Virtual. No amount of memoisation makes 10,000 real DOM rows fast.

## React Compiler changes the default

React Compiler reached [1.0 in October 2025](https://react.dev/blog/2025/10/07/react-compiler-1).
It's a build-time plugin that analyses components and inserts memoisation
automatically — roughly, it does what a disciplined engineer would do with `memo`,
`useMemo` and `useCallback`, everywhere, without the code.

What this means in practice:

- **New code**: stop writing manual memoisation by default. Write the straightforward version and let the compiler handle it.
- **Existing code**: manual memoisation still works; the compiler is designed to coexist with it. Removing it is optional cleanup, not a migration.
- **The prerequisite is purity.** The compiler can only memoise code that follows the rules of React. It bails out of components it can't prove safe — silently, and with no benefit. `eslint-plugin-react-hooks` v6 surfaces the reasons.

The compiler doesn't fix the other three rows of the table at the top. It removes a
class of boilerplate; it doesn't remove expensive work, oversized lists or network
waterfalls.

## Concurrent features for the work you can't remove

When the work is genuinely necessary, React 18+ lets you control its *priority*
instead of its cost.

`useDeferredValue` renders an expensive subtree with a stale value while an urgent
update (the keystroke) goes through immediately:

```tsx
const [query, setQuery] = useState('');
const deferred = useDeferredValue(query);
// input stays responsive; the list catches up
return <><SearchInput value={query} onChange={setQuery} /><Results query={deferred} /></>;
```

`useTransition` does the same for an explicit action, and gives you an `isPending`
flag to show that something is happening. Both are about *perceived* performance:
the total work is unchanged, but the interaction that the user is actively
performing stops waiting behind it.

## What to take away

- Profile first. Most "React is slow" reports are expensive work, list size or a waterfall — none of which memoisation touches.
- `memo` is defeated by one inline object or arrow prop; partial memoisation buys nothing.
- Moving state down and passing subtrees as `children` fix the problem structurally, with no cache to maintain.
- With React Compiler, manual memoisation is no longer the default advice for new code — but it only helps components that follow the rules of React.
- `useDeferredValue` and `useTransition` reprioritise work rather than reducing it.

## References

- [react.dev — `memo`](https://react.dev/reference/react/memo), [`useMemo`](https://react.dev/reference/react/useMemo), [`useCallback`](https://react.dev/reference/react/useCallback)
- [React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1) and the [React Compiler docs](https://react.dev/learn/react-compiler)
- [react.dev — `useDeferredValue`](https://react.dev/reference/react/useDeferredValue) and [`useTransition`](https://react.dev/reference/react/useTransition)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools) and [Performance Tracks](https://react.dev/reference/dev-tools/react-performance-tracks)

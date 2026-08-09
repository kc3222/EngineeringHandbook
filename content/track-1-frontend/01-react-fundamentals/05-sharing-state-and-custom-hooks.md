---
title: "Sharing State & Custom Hooks"
description: "Lifting state, what context actually costs, and extracting behaviour without extracting markup."
track: 1
chapter: 1
page: 5
readMinutes: 4
---

:::info[Prerequisites]
**State & the Render Cycle** and **Effects & Synchronisation** — this page is about reusing both.
:::

## Lift first, and only as far as needed

Two components need the same value: move it to their closest common parent and pass
it down. That's the whole technique, and for most applications it's enough.

Its cost is **prop drilling** — the value passes through components that don't use
it. Prop drilling has a bad reputation it only partly deserves. Three levels of an
explicit prop is readable, greppable, and typed; it tells you exactly who depends on
what. It becomes a real problem at around five or six levels, or when adding a field
means touching a dozen files.

## Context is dependency injection, not state management

`useContext` lets a subtree read a value without it being threaded through props.
What it does *not* do is manage state, batch updates, or make anything faster.

```tsx
const ThemeContext = createContext<Theme>('light');

function App() {
  return (
    <ThemeContext value={theme}>   {/* React 19: no .Provider needed */}
      <Layout />
    </ThemeContext>
  );
}

function Button() {
  const theme = use(ThemeContext);   // or useContext(ThemeContext)
  …
}
```

React 19 allows `<Context>` directly as the provider, and adds `use(Context)`, which
unlike `useContext` may be called conditionally.

Two costs to know before reaching for it:

**Every consumer re-renders when the value changes** — all of them, regardless of
which part of the value they read. A context holding `{ user, theme, sidebarOpen }`
re-renders every consumer whenever the sidebar toggles.

**A new object literal is a new value every render.** `value={{ user, setUser }}`
creates a fresh object on each parent render, so every consumer re-renders even when
nothing changed. Memoise it, or split it.

The standard mitigation is to split contexts by change frequency — one for values
that rarely change (the current user, the theme) and one for values that change
often. Splitting rarely-changing state *from the setters that mutate it* is
especially effective, since the setter context can be stable forever.

Context suits values that are genuinely ambient and low-frequency: theme, locale,
the authenticated user, a routing object. For high-frequency shared state, an
external store — Zustand, Redux Toolkit, Jotai — exists precisely because it can
notify only the components that read the changed slice. That's the real distinction,
not "big app vs small app".

## Custom hooks share behaviour, not markup

A custom hook is a function whose name starts with `use` and which calls other
hooks. That's the entire specification. It exists because the two older ways of
sharing stateful logic — higher-order components and render props — shared *markup*
along with the logic, and nested badly.

```tsx
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return isOnline;
}
```

The critical property: **each call gets its own state.** Two components calling
`useOnlineStatus()` have two independent pieces of state that happen to follow the
same rules. Hooks share *logic*, never *values* — if you want a shared value, you
need context or a store.

What makes a good custom hook:

- **Named for what it does, not what it wraps.** `useChatRoom(roomId)` over `useEffectWrapper`.
- **A concrete concern, not a generic one.** A hook that takes a callback and an array of deps has re-implemented `useEffect` with an extra layer.
- **Effects hidden behind a real interface.** Wrapping a subscription in `useOnlineStatus` is a genuine abstraction; wrapping one `useState` in `useCounter` mostly isn't.

### The rules of hooks, and why they exist

Hooks must be called unconditionally, at the top level of a component or another
hook. React identifies each hook by **call order**, not by name — there's no map
from `useState('count')` to a slot. Skip a call in one render and every subsequent
hook reads the previous hook's state.

`eslint-plugin-react-hooks` enforces this, and it's one of the rare lint rules
where a violation is always a bug rather than a style disagreement.

## Choosing between the three

| Situation | Reach for |
| --- | --- |
| Two or three components, nearby | Lift state, pass props |
| Ambient value, rarely changes, read deep | Context |
| Same *behaviour* needed in several places | Custom hook |
| Frequently-changing state read across the app | External store with selectors |
| Server data | A query library or the framework's loader — not any of the above |

That last row does the most work in practice. A large fraction of what teams put in
a global store is a cache of server responses, which a query library already handles
better — with deduplication, revalidation and cache invalidation that a hand-rolled
store won't have.

## What to take away

- Lift state first. Prop drilling is a problem at five levels, not at two.
- Context is injection, not state management: every consumer re-renders, and an inline object value guarantees it.
- Split contexts by how often their contents change; separate setters from values.
- Custom hooks share logic, and every call gets independent state. Order-based identification is why the rules of hooks aren't negotiable.
- Server data usually doesn't belong in whatever you chose above.

## References

- [react.dev — Reusing logic with custom hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [react.dev — Passing data deeply with context](https://react.dev/learn/passing-data-deeply-with-context) and [Scaling up with reducer and context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [react.dev — Rules of hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React 19 — `use` and context as a provider](https://react.dev/blog/2024/12/05/react-19#context-as-a-provider)

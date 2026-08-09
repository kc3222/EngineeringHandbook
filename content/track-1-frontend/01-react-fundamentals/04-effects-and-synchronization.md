---
title: "Effects & Synchronisation"
description: "What effects are actually for, why cleanup is mandatory, and the effects that shouldn't exist."
track: 1
chapter: 1
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**State & the Render Cycle** — effects run at a specific point in that cycle.
:::

## An effect synchronises with something outside React

`useEffect` is not a lifecycle hook and it is not "code that runs after render". It
exists for one job: **keeping an external system in sync with React state.** A
WebSocket connection, a browser API, a third-party map widget, an analytics SDK —
things React doesn't own and can't re-render.

That framing answers most questions about effects, because the alternative is
usually obvious once you ask "what external system is this synchronising with?" and
find there isn't one.

| Task | Effect? |
| --- | --- |
| Subscribe to a WebSocket / event emitter | Yes |
| Set up a non-React library on a DOM node | Yes |
| Sync state to `localStorage` or `document.title` | Yes |
| Transform props into a value for rendering | No — compute during render |
| Reset state when a prop changes | No — use a `key`, or adjust during render |
| Respond to a button click | No — that's the event handler |
| Fetch data for the page | Usually not — see below |

The React docs make this point under the deliberately blunt title
["You Might Not Need an Effect"](https://react.dev/learn/you-might-not-need-an-effect),
and it is the single highest-yield page in the React documentation.

## Cleanup is the point, not the afterthought

An effect that sets something up must be able to tear it down, because React will
run it again — on dependency change, on remount, and (in development) immediately
after mounting, on purpose.

```tsx
useEffect(() => {
  const socket = connect(roomId);
  socket.on('message', onMessage);
  return () => socket.close();     // ← not optional
}, [roomId, onMessage]);
```

Without the `return`, changing rooms leaves the old socket open. Ten room changes,
ten sockets, ten sets of handlers firing into a component that has moved on.

**StrictMode double-invokes effects in development** — mount, cleanup, mount — and
this is a feature. If your effect is correct, running it twice is invisible. If it
isn't, you get the bug on your machine instead of in production after a
`<Suspense>` boundary or an Activity-driven remount does the same thing for real.
The fix is never to suppress the double run; it's to write the cleanup.

## The dependency array is a claim about correctness

The array isn't an optimisation. It's your assertion that the effect only depends
on these values, and React uses it to decide when to re-synchronise.

Omitting a dependency to "stop it looping" makes the effect read stale values — the
loop is gone and a subtler bug replaces it. The `eslint-plugin-react-hooks`
`exhaustive-deps` rule catches this, and disabling the rule line by line is how
codebases accumulate effects nobody can reason about.

When a dependency genuinely re-triggers too often, fix the *dependency*, not the
array:

- **A function recreated every render** — move it inside the effect, or wrap it in `useCallback`.
- **An object or array literal** — build it inside the effect, or destructure the primitives you actually use.
- **A value the effect reads but shouldn't react to** — see below.

That last case is common enough that React 19.2 added an API for it.
`useEffectEvent` extracts the non-reactive part of an effect: the extracted function
always sees fresh values, but doesn't appear in the dependency array.

```tsx
const onConnected = useEffectEvent(() => {
  logAnalytics('joined', { roomId, theme });   // reads latest theme
});

useEffect(() => {
  const socket = connect(roomId);
  socket.on('open', onConnected);
  return () => socket.close();
}, [roomId]);        // theme changing must not reconnect the socket
```

## Data fetching in an effect

Fetching in an effect is legal and often wrong, and it's worth being precise about
why. Four problems, in increasing order of severity:

1. **It doesn't run on the server**, so the data isn't in the initial HTML.
2. **Waterfalls.** A child that fetches only after its parent rendered serialises two round trips that could have been one.
3. **Race conditions.** Two rapid changes to `query` produce two in-flight requests, and the slower one can resolve last.
4. **No caching, retry, or deduplication** — every mount refetches, and two components asking for the same thing ask twice.

Race conditions have a standard fix and it belongs in every hand-rolled fetch
effect:

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/search?q=${query}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setResults)
    .catch(err => { if (err.name !== 'AbortError') setError(err); });
  return () => controller.abort();
}, [query]);
```

In practice most applications should hand this to something built for it — a
framework's own loader (the next chapter), or a query library such as
[TanStack Query](https://tanstack.com/query/latest) or SWR, which give you caching,
deduplication and retry for free. The effect version is for the case where a
dependency genuinely isn't worth it.

## Effects that shouldn't exist

Three patterns worth recognising on sight:

**Deriving state.** An effect whose only job is `setX` from other state. Compute it
during render instead; the effect version renders twice and can be observed in its
inconsistent intermediate state.

**Resetting on prop change.** An effect that clears a form when `userId` changes.
`<Form key={userId} />` does it in one place, synchronously, with no intermediate
render.

**Handling an event.** An effect watching `isSubmitted` to fire a toast. The submit
handler already knows it submitted — put the toast there. Effects run because
*state changed*, and state can change for reasons other than the event you had in
mind.

## What to take away

- An effect synchronises with an external system. If you can't name the system, you probably don't need the effect.
- Every subscription needs cleanup; StrictMode's double-invoke in development is what makes a missing one visible.
- Dependencies are a correctness claim, not a tuning knob. Fix the dependency rather than the array — `useEffectEvent` is the escape hatch for values you read but shouldn't react to.
- Hand-rolled fetching in an effect needs abort handling at minimum; a framework loader or query library is usually the better answer.

## References

- [react.dev — Synchronising with effects](https://react.dev/learn/synchronizing-with-effects) and [You might not need an effect](https://react.dev/learn/you-might-not-need-an-effect)
- [react.dev — Removing effect dependencies](https://react.dev/learn/removing-effect-dependencies)
- [react.dev — `useEffectEvent`](https://react.dev/reference/react/useEffectEvent) (React 19.2)
- [MDN — `AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

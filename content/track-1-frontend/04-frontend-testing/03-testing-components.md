---
title: "Testing Components"
description: "Testing Library queries, user events, and asserting on things that haven't happened yet."
track: 1
chapter: 4
page: 3
readMinutes: 5
---

:::info[Prerequisites]
**What's Worth Testing** — this page is the mechanics for the tests that survived that filter.
:::

## The shape of a component test

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

test('shows a validation error for a malformed email', async () => {
  const user = userEvent.setup();
  render(<LoginForm onSubmit={jest.fn()} />);

  await user.type(screen.getByLabelText(/email/i), 'not-an-email');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByText(/enter a valid email/i)).toBeVisible();
});
```

Everything the test touches is something a user could touch: a field found by its
label, a button found by its accessible name, a message found by its text. Nothing
references a class, a component name, or internal state. That's the target shape.

The setup is Jest with `testEnvironment: 'jsdom'` (via `jest-environment-jsdom`),
`@testing-library/react`, `@testing-library/user-event`, and
`@testing-library/jest-dom` for matchers like `toBeVisible` and
`toHaveAccessibleName`. In a Next.js project, `next/jest` handles the transform
configuration.

## Queries, in priority order

Testing Library offers many queries and explicitly ranks them. The ranking is the
useful part — it's an accessibility argument disguised as an API:

| Priority | Query | Finds |
| --- | --- | --- |
| 1 | `getByRole` | Elements by ARIA role, usually with `{ name }` |
| 2 | `getByLabelText` | Form fields via their label |
| 3 | `getByPlaceholderText`, `getByText` | Visible text |
| 4 | `getByDisplayValue`, `getByAltText`, `getByTitle` | Remaining semantic attributes |
| 5 | `getByTestId` | An explicit escape hatch |

**Prefer `getByRole` with a name.** `getByRole('button', { name: /save/i })` fails if
the button loses its accessible name — which is also when a screen-reader user loses
it. The query and the accessibility requirement are the same assertion.

`getByTestId` is last, not forbidden. It's the right tool for an element with no
role and no stable text — a chart container, a layout wrapper. Reaching for it
because a role query failed is usually a signal the markup needs a fix, and
`screen.logTestingPlaygroundURL()` (or the failure message's DOM dump) will tell you
what roles are actually available.

The three prefixes matter and are routinely mixed up:

| Prefix | Missing element | Async | Use for |
| --- | --- | --- | --- |
| `getBy…` | Throws | No | It should be there now |
| `queryBy…` | Returns `null` | No | Asserting absence |
| `findBy…` | Rejects | Yes | It will be there shortly |

`expect(screen.queryByText(…)).not.toBeInTheDocument()` is the only correct way to
assert absence — `getBy` throws before the assertion runs.

## `user-event`, not `fireEvent`

`fireEvent.click(el)` dispatches one synthetic event. A real click is a sequence:
pointer events, mouse events, focus change, then `click`. `user-event` simulates the
full sequence, which is why it catches things `fireEvent` misses — a handler bound
to `mousedown`, a field that validates on blur, a disabled button that shouldn't
receive events at all.

Two rules, both the source of common failures:

```tsx
const user = userEvent.setup();     // once per test, before render
await user.click(button);           // every interaction is awaited
```

Since v14 every `user-event` method is async. A missing `await` produces a test that
passes locally and fails in CI, or vice versa — the worst possible failure mode.

Reach for `fireEvent` only for events users don't produce: `scroll`, `resize`, a
synthetic `error` on an image.

## Asynchrony without arbitrary waits

Almost every real component test has an await in it: data arrives, a transition
completes, an error boundary catches. Three tools, one of which is a trap.

**`findBy*`** — the default. Retries until the element appears or times out.

```tsx
expect(await screen.findByRole('row', { name: /invoice #4/i })).toBeInTheDocument();
```

**`waitFor`** — for assertions that aren't "an element appeared":

```tsx
await waitFor(() => expect(onSave).toHaveBeenCalledWith({ id: 4 }));
```

Keep the callback to a single assertion. `waitFor` retries the whole callback, so a
block containing four assertions retries all four and reports the wrong one as the
failure.

**`waitForElementToBeRemoved`** — for loading spinners disappearing, which `findBy`
can't express.

The trap is `await new Promise(r => setTimeout(r, 500))`. It makes a flaky test
slower rather than more reliable: it passes on a fast machine and fails on a loaded
CI runner, and every one you add is permanent wall-clock time in the suite.

The related warning — "An update to X was not wrapped in act(...)" — nearly always
means state updated after the test finished asserting. The fix is to await the thing
you were waiting for, not to wrap something in `act`. Manual `act` calls in a
component test are almost always a symptom.

## Testing hooks and Server Components

For a hook with real logic that isn't tied to one component, `renderHook` avoids
inventing a host component:

```tsx
const { result } = renderHook(() => useCart());
act(() => result.current.add({ id: 'a', qty: 1 }));
expect(result.current.total).toBe(1);
```

Use it sparingly. A hook that only makes sense inside a component is better tested
through that component, where the assertions are about behaviour rather than a
returned object.

**Async Server Components can't be rendered by Testing Library.** They aren't
supported by the React DOM test renderer, and the current guidance from both React
and Next.js is to cover them with end-to-end tests instead. In practice: extract the
data-fetching function and unit test it, keep the component itself thin, and let
Playwright cover the rendered page. Client Components test normally.

## What to take away

- Query the way a user finds things: role and accessible name first, `getByTestId` as a deliberate escape hatch.
- `getBy` for now, `queryBy` for absence, `findBy` for soon.
- Use `user-event` with `setup()` and `await` every interaction; `fireEvent` only for events users don't generate.
- `findBy` and `waitFor` over fixed timeouts, and one assertion per `waitFor` callback.
- Async Server Components need end-to-end coverage — extract their data fetching and test that directly.

## References

- [Testing Library — About queries](https://testing-library.com/docs/queries/about/#priority) and [`user-event`](https://testing-library.com/docs/user-event/intro)
- [Testing Library — Async methods](https://testing-library.com/docs/dom-testing-library/api-async) and [Common mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [`jest-dom` matchers](https://github.com/testing-library/jest-dom)
- [Next.js — Testing with Jest](https://nextjs.org/docs/app/guides/testing/jest) — including the async Server Component limitation.

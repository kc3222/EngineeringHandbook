---
title: "Test Doubles & Network"
description: "What to fake, where to draw the boundary, and how flaky tests get that way."
track: 1
chapter: 4
page: 4
readMinutes: 5
---

:::info[Prerequisites]
**Testing Components** — this page is about everything those tests talk to.
:::

## Mock at the boundary, not inside it

The single decision that determines whether a suite stays useful: **how far in does
the fake go?**

```tsx
// Mocks the module the component imports
jest.mock('@/lib/api', () => ({ getUser: jest.fn().mockResolvedValue({ name: 'Ada' }) }));

// Mocks the network — everything above it is real code
server.use(http.get('/api/user', () => HttpResponse.json({ name: 'Ada' })));
```

Both make the test pass. Only the second exercises your request builder, your
response parsing, your error mapping and your retry logic. The first replaces all of
it with an assumption, and the assumption is exactly what breaks when the endpoint
changes shape.

The rule that follows: **fake things you don't own, at the outermost edge you can.**
The network, the clock, `localStorage`, the geolocation API. Your own modules are
the code under test.

## MSW for the network

[Mock Service Worker](https://mswjs.io/) intercepts requests at the network layer —
in Node for Jest, via a service worker in the browser. Your code calls `fetch`
normally and doesn't know anything is different.

```ts
// test/server.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('/api/invoices', () => HttpResponse.json([{ id: 4, total: 1200 }])),
);
```

```ts
// jest.setup.ts
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Three details that matter more than they look:

- **`onUnhandledRequest: 'error'`.** Without it, an unmocked request silently escapes to the real network, and the test either hangs or passes for the wrong reason.
- **`resetHandlers()` after each test.** Per-test overrides via `server.use(…)` must not leak into the next test.
- **Handlers are shared with development.** The same definitions can drive a browser mock, so the fixtures the tests use are the ones you clicked through.

Error paths are where this pays off, because they're the ones nobody exercises
manually:

```tsx
test('shows a retry prompt when the server fails', async () => {
  server.use(http.get('/api/invoices', () => new HttpResponse(null, { status: 500 })));
  render(<Invoices />);
  expect(await screen.findByRole('button', { name: /try again/i })).toBeVisible();
});
```

## The rest of the boundary

**Time.** Anything involving `Date.now()`, `setTimeout` or a countdown needs a fixed
clock or the test is a coin flip:

```ts
jest.useFakeTimers().setSystemTime(new Date('2026-01-15T10:00:00Z'));
```

With `user-event`, pass `advanceTimers: jest.advanceTimersByTime` to `setup()` —
otherwise the library's internal delays wait on a clock that is no longer moving,
and the test hangs. It's the most common fake-timer failure in React tests.

**`localStorage` and `matchMedia`.** jsdom implements storage but not `matchMedia`,
so any component reading a media query needs a stub in the setup file. Jest 30 ships
jsdom 26, which is stricter than the jsdom 21 in Jest 29 — most notably, assigning
to `window.location` no longer works, which breaks a common redirect-testing
pattern.

**Modules with side effects at import.** Analytics SDKs, error reporters, anything
opening a connection when the file loads. `jest.mock` at module scope is the right
tool here, and one of the few places it clearly is.

**Next.js navigation.** `useRouter`, `usePathname` and `useSearchParams` come from
the framework and have to be provided in a unit test. Mock the module, and assert on
`push` having been called with the URL you expect.

Two Jest details worth internalising: `jest.mock` calls are **hoisted above
imports**, which is why a factory referencing an outer variable fails with a
confusing error, and mocks are per-file — `clearMocks: true` in the config saves a
lot of `beforeEach` boilerplate.

## Flake, and where it comes from

A test that fails one run in fifty is worse than no test: it trains people to
re-run CI until it goes green, which means real failures get re-run too.

| Cause | Fix |
| --- | --- |
| Fixed `setTimeout` waits | `findBy*` / `waitFor` |
| Shared state between tests | Reset handlers, mocks and stores in `afterEach` |
| Real `Date.now()` in assertions | Fake timers with a fixed system time |
| Order dependence between tests | Each test sets up its own data; Jest parallelises files |
| Unmocked network | `onUnhandledRequest: 'error'` |
| Animations and transitions | Assert on state or attributes, not on mid-transition styles |

Order dependence deserves emphasis because Jest hides it: test *files* run in
parallel workers and their order isn't stable, so a suite that depends on file order
fails differently on every machine. Run a suspect file alone, then with
`--runInBand`, and the difference tells you which kind of leak you have.

When a flake resists diagnosis, quarantining it is legitimate — but as a tracked
item with an owner, not a `.skip` that survives two years.

## In CI

- **Run tests on every pull request**, and make the check required. A suite that isn't enforced decays.
- **`--ci --maxWorkers=…`.** CI runners advertise more cores than they'll give you; unbounded workers cause timeouts that look like flake.
- **Fail on new snapshots.** `--ci` won't write missing snapshots, so an accidental one fails instead of silently passing.
- **Keep the suite under a couple of minutes.** Past that, people stop running it locally and the feedback loop is gone. If it's slow, look at what's rendering an entire application per test before you look at the runner.

## What to take away

- Mock what you don't own, as far out as you can. Module mocks replace the integration you meant to test.
- MSW puts the fake at the network boundary; `onUnhandledRequest: 'error'` and `resetHandlers()` are what make it trustworthy.
- Fake the clock for anything time-dependent, and wire `user-event` to the fake timers or it will hang.
- Flake is almost always a fixed timeout, shared state, or an unmocked request — treat it as a bug, not as weather.
- A suite people don't run has no value: keep it fast and make it required.

## References

- [Mock Service Worker](https://mswjs.io/docs/) — [Node integration](https://mswjs.io/docs/integrations/node)
- [Jest — Timer mocks](https://jestjs.io/docs/timer-mocks) and [`jest.mock` hoisting](https://jestjs.io/docs/jest-object#jestmockmodulename-factory-options)
- [Jest 30 upgrade guide](https://jestjs.io/docs/upgrading-to-jest30) — the jsdom 26 changes, including `window.location`.
- [`user-event` — Advanced options](https://testing-library.com/docs/user-event/options#advancetimers)

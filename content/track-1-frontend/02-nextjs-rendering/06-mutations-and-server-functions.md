---
title: "Mutations & Server Functions"
description: "Writes without an API route — and the security model that people skip."
track: 1
chapter: 2
page: 6
readMinutes: 5
---

:::info[Prerequisites]
**Server & Client Components** and **Data Fetching & Caching** — a mutation crosses the first and invalidates the second.
:::

## A function you can call across the network

A **Server Function** is an async function marked `'use server'`. It runs on the
server, and the client can call it directly — React and the bundler arrange the
network call. Used to handle a form submission or a mutation, it's conventionally
called a **Server Action**.

```ts
// app/lib/actions.ts
'use server';

import { auth } from '@/lib/auth';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const title = String(formData.get('title'));
  await db.post.create({ data: { title, authorId: session.user.id } });

  revalidateTag('posts');
  redirect('/posts');
}
```

```tsx
// app/posts/new/page.tsx — a Server Component, no client JS at all
import { createPost } from '@/app/lib/actions';

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  );
}
```

What that buys you over an API route: no endpoint to define, no `fetch` call to
write, no request/response types to keep in sync, and — because it's a real `<form>`
with an `action` — **it works before JavaScript loads.** That progressive
enhancement is not a side benefit; it's most of the reason the design looks like
this.

Under the hood the call is always a `POST`, and the response carries both the
result and the re-rendered UI in a single round trip.

## Every Server Function is a public endpoint

This is the part that gets skipped, and it's the one that matters.

`'use server'` creates a network-reachable endpoint. Anyone can `POST` to it
directly — with a browser closed, with arbitrary arguments, in any order. The
function being defined next to the form it belongs to creates a strong and false
impression that reaching it requires going through that form.

So:

- **Authenticate inside every Server Function.** Not in the page that renders the form; in the function.
- **Authorise inside every Server Function.** "Is this user allowed to delete *this* post" is a separate check from "is this user logged in".
- **Validate arguments.** They arrive from the network. A schema validator (Zod, Valibot, Standard Schema) at the top of the function is the norm.
- **Don't trust ids from the client.** `formData.get('userId')` is an assertion by the caller. Read the id from the session.

A useful mental model: a Server Function is a `POST` route handler with better
ergonomics and worse visibility. Everything you'd do to secure the route handler,
you must still do here — the ergonomics are what make it easy to forget.

## Pending state, errors and optimistic UI

A bare `<form action={…}>` works without JavaScript but gives no feedback. Three
React hooks fill that in, all of which require a Client Component:

**`useActionState`** wires an action to state, and gives you a pending flag. It's
the standard way to return validation errors from the server to the form:

```tsx
'use client';
import { useActionState } from 'react';
import { createPost } from '@/app/lib/actions';

export function PostForm() {
  const [state, formAction, pending] = useActionState(createPost, { error: null });
  return (
    <form action={formAction}>
      <input name="title" aria-describedby="err" />
      {state.error && <p id="err">{state.error}</p>}
      <button disabled={pending}>{pending ? 'Saving…' : 'Create'}</button>
    </form>
  );
}
```

The action's signature changes to `(prevState, formData)` when used this way.

**`useFormStatus`** reads the pending state of the nearest parent form, which lets a
generic `<SubmitButton />` know it's submitting without the form passing it a prop.

**`useOptimistic`** shows the expected result before the server confirms it, and
rolls back automatically if the action throws. It's the right tool for a like
button or an inline rename — anything where waiting for a round trip feels wrong and
failure is rare.

Errors deserve a distinction: **expected failures should be return values, not
throws.** "That title is already taken" is data the form should render; an
unhandled throw becomes a generic error boundary. Reserve throwing for the genuinely
unexpected.

## Invalidating what you just changed

A mutation that succeeds but leaves stale data on screen is the most common bug in
this area. Three tools, for three different scopes:

| Call | Affects | Use for |
| --- | --- | --- |
| `revalidateTag('posts')` | Every cached entry with that tag, for everyone | Shared data others should see updated |
| `revalidatePath('/posts')` | Everything cached for that route | Blunt but obvious; easy to overuse |
| `refresh()` | The current user's router, no shared cache | A change only this user should see immediately |

`redirect()` throws a framework-handled control-flow exception, so nothing after it
runs — call your revalidation *before* it.

## When not to use one

Server Functions are for mutations. They are not a general RPC layer, and two
properties make that concrete: the client dispatches and awaits them **one at a
time**, and they're always `POST`, so they're not cacheable.

Reach for a Route Handler instead when you need a real HTTP endpoint: a webhook
receiver, an API consumed by something that isn't this app, a file download, a
response with specific headers or status codes, or anything a mobile client will
call. Reach for parallel data fetching in Server Components when you need
concurrency.

## What to take away

- A Server Function is an async `'use server'` function callable from the client; used with `<form action>` it works before JavaScript loads.
- It is a public `POST` endpoint. Authenticate, authorise and validate inside the function, every time, and never trust an id from the request body.
- `useActionState`, `useFormStatus` and `useOptimistic` supply pending state, submit-button state and optimistic UI.
- Return expected failures as state; throw only for the unexpected.
- Revalidate before you redirect, and pick the narrowest invalidation that does the job.

## References

- [Next.js — Mutating data](https://nextjs.org/docs/app/getting-started/mutating-data) and [Server Actions and mutations](https://nextjs.org/docs/app/guides/server-actions)
- [Next.js — Data security](https://nextjs.org/docs/app/guides/data-security#authentication-and-authorization)
- [react.dev — `useActionState`](https://react.dev/reference/react/useActionState), [`useOptimistic`](https://react.dev/reference/react/useOptimistic), [`useFormStatus`](https://react.dev/reference/react-dom/hooks/useFormStatus)
- [react.dev — `'use server'`](https://react.dev/reference/rsc/use-server)

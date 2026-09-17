# Engineering Handbook

Short reference pages (1–5 min read each) across frontend, backend, data,
AI engineering, ML/DL, cloud/DevOps, and data structures & algorithms.

Live at <https://kc3222.github.io/EngineeringHandbook/>.

## Running it

With Docker — no local Node install needed:

```bash
docker compose up
```

Then open <http://localhost:4321/EngineeringHandbook/>. Edits on the host hot
reload in the container. Host port 4321 is the default because Docusaurus's
usual 3000 is often taken; override it with `HANDBOOK_PORT=8080 docker compose up`.

To check the production build the way GitHub Pages will serve it (base path
included), on <http://localhost:4322/EngineeringHandbook/>:

```bash
docker compose --profile prod up serve
```

Or with Node 22 directly:

```bash
npm install
npm start        # dev server on http://localhost:3000/EngineeringHandbook/
npm run build    # production build into build/
npm run serve    # serve the production build
npm run typecheck
```

## How it's put together

- **Docusaurus 3 + TypeScript.** `docusaurus.config.ts` is the site config.
- **`src/data/handbook.ts` is the index of record** for tracks, chapters, and
  page counts — it mirrors `handbook-structure.md`. Every number the UI shows
  (chapter counts, page counts, read-time estimates) is derived from it, so
  update that file when the outline changes.
- **`/` is an about page** (`src/pages/index.tsx`) covering what the handbook
  is, how it's organised, and where each track lives.
- **One page per track** under `src/pages/` (`frontend.tsx`, `backend.tsx`, …),
  each rendering the shared `TrackLanding` component.
- **`src/theme/Navbar/Content`** is a swizzled (ejected) copy of the Docusaurus
  navbar so the track links can sit centred between the wordmark and the
  search/theme controls.
- **Content pages live in `content/`**, one markdown file per page, served by
  the docs plugin under `/read/…`. Each track gets its own sidebar, so switching
  track switches the whole chapter tree. On desktop those pages drop the navbar
  — the sidebar header carries home, track switching, search and theme.
- **Search** (`⌘K` / `Ctrl+K`, or the navbar and sidebar buttons) indexes the
  outline — tracks and chapters, not page text. Chapter hits open that
  chapter's first page.
- **`Dockerfile` + `compose.yaml`** cover local runs. The image is a dev
  convenience only — deploys build on the Actions runner, not from it. Only
  `node_modules` is masked by a volume; host and container share the
  `.docusaurus` cache, so run `npm run clear` if you switch between them and
  hit stale paths.

Every page under `content/` is written out — seven tracks, drafted to the page
counts in `handbook-structure.md`. Each chapter opens on an `01-overview.md`
page. See `CLAUDE.md` for the content structure and page frontmatter schema.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and
publishes it with `actions/upload-pages-artifact` + `actions/deploy-pages`.
Repository **Settings → Pages → Source** needs to be set to **GitHub Actions**.

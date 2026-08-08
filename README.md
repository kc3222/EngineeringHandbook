# Engineering Handbook

Short reference pages (1–5 min read each) across frontend, backend, data,
AI engineering, ML/DL, and cloud/DevOps.

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
- **`src/data/handbook.ts` is the index of record** for areas, chapters, and
  page counts — it mirrors `handbook-structure.md`. Every number the UI shows
  (chapter counts, page counts, read-time estimates) is derived from it, so
  update that file when the outline changes.
- **One page per area** under `src/pages/` (`index.tsx` is Area I, Frontend).
  Each renders the shared `AreaLanding` component.
- **`src/theme/Navbar/Content`** is a swizzled (ejected) copy of the Docusaurus
  navbar so the area links can sit centred between the wordmark and the
  search/theme controls.
- **Search** (`⌘K` / `Ctrl+K`) currently indexes the outline — areas and
  chapters. It gets pointed at real page content once `content/` is populated.
- **`Dockerfile` + `compose.yaml`** cover local runs. The image is a dev
  convenience only — deploys build on the Actions runner, not from it.

Content pages don't exist yet, so the docs and blog plugins are switched off in
`docusaurus.config.ts`. See `CLAUDE.md` for the content structure and page
frontmatter schema they'll use.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and
publishes it with `actions/upload-pages-artifact` + `actions/deploy-pages`.
Repository **Settings → Pages → Source** needs to be set to **GitHub Actions**.

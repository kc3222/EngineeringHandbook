# syntax=docker/dockerfile:1

# Shared dependency layer — rebuilt only when the lockfile changes.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Dev server with hot reload.
# Carries no application source: compose bind-mounts the working tree over
# /app, so this stage is meant to be run through `docker compose`, not
# `docker run` on its own.
FROM deps AS dev
EXPOSE 3000
CMD ["npm", "start", "--", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
RUN npm run build

# Serves the production build the way GitHub Pages will, base path included.
# `docusaurus serve` reads docusaurus.config.ts at startup, so the source has
# to come along rather than just the build/ directory.
FROM build AS serve
EXPOSE 3000
CMD ["npm", "run", "serve", "--", "--host", "0.0.0.0", "--port", "3000"]

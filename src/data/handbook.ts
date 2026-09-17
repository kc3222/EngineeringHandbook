/**
 * The handbook index — the single source of truth for tracks, chapters and
 * page counts in the UI. Mirrors `handbook-structure.md` at the repo root.
 *
 * "Track" is the only name for the top level, here and in that file
 * ("Track I–VII"). Keep the two in sync: if a chapter is added, renamed or
 * re-counted there, update it here too.
 *
 * Chapter `slug` values are also the chapter folder names under `content/`
 * (prefixed with the zero-padded chapter number, e.g. `01-react-fundamentals`).
 */

export type Chapter = {
  /** Chapter number, 1-based within its track. */
  number: number;
  slug: string;
  title: string;
  blurb: string;
  pages: number;
};

/**
 * The frontmatter every page file under `content/` carries. Mirrors the schema
 * documented in CLAUDE.md — a future migration script reads these fields, so
 * add to both places or neither.
 */
export type PageFrontMatter = {
  title: string;
  description?: string;
  track: number;
  chapter: number;
  page: number;
  readMinutes: number;
};

export type Track = {
  /** Track number, 1–7. Matches the `track` field in page frontmatter. */
  number: number;
  slug: string;
  /** Short label used in the navbar. */
  navLabel: string;
  /** Full title used in the track hero. */
  title: string;
  /** Small line above the title. */
  eyebrow: string;
  /** One-sentence description under the title. */
  summary: string;
  /** Where this track lives in the site. */
  permalink: string;
  chapters: Chapter[];
};

export const tracks: Track[] = [
  {
    number: 1,
    slug: 'frontend',
    navLabel: 'Frontend',
    title: 'Frontend Engineering',
    eyebrow: 'Where the interface takes shape',
    summary:
      'Components, rendering strategy, styling systems, and the tests that keep them honest.',
    permalink: '/frontend',
    chapters: [
      {
        number: 1,
        slug: 'react-fundamentals',
        title: 'React Fundamentals',
        blurb:
          'Components, state, and the render cycle — the mental model everything else in the frontend chapters assumes you already have.',
        pages: 6,
      },
      {
        number: 2,
        slug: 'nextjs-rendering',
        title: 'Next.js & Rendering Strategies',
        blurb:
          'SSR, SSG, ISR, and the App Router — same framework, four very different tradeoffs.',
        pages: 6,
      },
      {
        number: 3,
        slug: 'tailwind-component-design',
        title: 'TailwindCSS & Component Design',
        blurb:
          'Utility-first styling and building interfaces from design specs without fighting the framework.',
        pages: 4,
      },
      {
        number: 4,
        slug: 'frontend-testing',
        title: 'Frontend Testing (Jest)',
        blurb:
          "Unit and integration tests for UI — what's actually worth testing versus what's theater.",
        pages: 4,
      },
    ],
  },
  {
    number: 2,
    slug: 'backend',
    navLabel: 'Backend',
    title: 'Backend Engineering',
    eyebrow: 'Where the contracts get enforced',
    summary:
      'API design, JVM and Python services, and the auth flows that decide who gets through.',
    permalink: '/backend',
    chapters: [
      {
        number: 1,
        slug: 'rest-api-design',
        title: 'REST API Design',
        blurb:
          'Resources, versioning, error contracts — the decisions that outlive the framework you build them in.',
        pages: 5,
      },
      {
        number: 2,
        slug: 'spring-boot-kotlin',
        title: 'Spring Boot & Kotlin',
        blurb:
          "JVM backend patterns — dependency injection, layered architecture, and where Spring's magic helps or hurts.",
        pages: 6,
      },
      {
        number: 3,
        slug: 'fastapi-python-services',
        title: 'FastAPI & Python Services',
        blurb:
          'Fast, typed, async — building inference and CRUD endpoints in Python without the ceremony.',
        pages: 5,
      },
      {
        number: 4,
        slug: 'authentication-authorization',
        title: 'Authentication & Authorization',
        blurb:
          "OAuth 2.0 flows and role-based access — who's allowed to do what, and how you prove it.",
        pages: 5,
      },
    ],
  },
  {
    number: 3,
    slug: 'data',
    navLabel: 'Data',
    title: 'Data & Storage',
    eyebrow: 'Where the state actually lives',
    summary:
      'Schema design, access control at the database layer, and storage that outlives the service in front of it.',
    permalink: '/data',
    chapters: [
      {
        number: 1,
        slug: 'relational-schema-design',
        title: 'Relational Schema Design',
        blurb:
          'PostgreSQL modeling, normalization, and the migrations that come back to bite you later.',
        pages: 5,
      },
      {
        number: 2,
        slug: 'row-level-security',
        title: 'Row-Level Security & Access Control',
        blurb:
          'Enforcing "who sees what" at the database layer instead of hoping the app layer remembers to.',
        pages: 3,
      },
      {
        number: 3,
        slug: 'object-storage-microservices',
        title: 'Object Storage & Microservices',
        blurb:
          'Cloud storage integration patterns — object storage, upload pipelines, and decoupling storage from your core service.',
        pages: 4,
      },
    ],
  },
  {
    number: 4,
    slug: 'ai',
    navLabel: 'AI',
    title: 'AI Engineering',
    eyebrow: 'Where language becomes infrastructure',
    summary:
      'Models, embeddings, retrieval pipelines, coding agents, and the protocol that connects them to tools — treated as engineering rather than novelty.',
    permalink: '/ai',
    chapters: [
      {
        number: 1,
        slug: 'llm-fundamentals',
        title: 'LLM Fundamentals',
        blurb:
          "What the model actually is, what it costs, and what it can't do.",
        pages: 8,
      },
      {
        number: 2,
        slug: 'embeddings-vector-search',
        title: 'Embeddings & Vector Search',
        blurb:
          'Turning meaning into geometry, then searching that geometry fast enough to matter.',
        pages: 6,
      },
      {
        number: 3,
        slug: 'rag-pipelines',
        title: 'RAG Pipelines',
        blurb:
          'Retrieval-augmented generation end to end — the system most people build and most people undersell.',
        pages: 9,
      },
      {
        number: 4,
        slug: 'prompting-ai-coding-agents',
        title: 'Prompting & AI Coding Agents',
        blurb:
          'Working with AI coding agents as engineering tools, not novelties.',
        pages: 5,
      },
      {
        number: 5,
        slug: 'model-context-protocol',
        title: 'Model Context Protocol (MCP)',
        blurb:
          "The open standard for connecting models to tools and data — and what you're trusting when you expose a server to one.",
        pages: 5,
      },
    ],
  },
  {
    number: 5,
    slug: 'ml',
    navLabel: 'ML/DL',
    title: 'ML / DL & Applied Research',
    eyebrow: 'Where the models get built',
    summary:
      'Tensors, training loops, vision, and pretraining — the fundamentals under applied research.',
    permalink: '/ml',
    chapters: [
      {
        number: 1,
        slug: 'pytorch-training-basics',
        title: 'PyTorch & Model Training Basics',
        blurb:
          'Tensors, autograd, training loops — the fundamentals under every deep learning project.',
        pages: 6,
      },
      {
        number: 2,
        slug: 'computer-vision-fundamentals',
        title: 'Computer Vision Fundamentals',
        blurb:
          'Classification and detection basics — architectures, transfer learning, and where CV models tend to fail.',
        pages: 6,
      },
      {
        number: 3,
        slug: 'self-supervised-learning',
        title: 'Self-Supervised Learning',
        blurb:
          'Pretraining without labels — foundation model concepts and why they matter.',
        pages: 5,
      },
      {
        number: 4,
        slug: 'competitive-ml',
        title: 'Competitive ML (Kaggle Playbook)',
        blurb:
          'What actually moves you into the top ranks: validation discipline, ensembling, and avoiding leaderboard traps.',
        pages: 4,
      },
    ],
  },
  {
    number: 6,
    slug: 'cloud',
    navLabel: 'Cloud',
    title: 'Cloud, DevOps & Observability',
    eyebrow: 'Where it all has to keep running',
    summary:
      'Containers, event-driven workflows, and the observability you wish you had before the page fired.',
    permalink: '/cloud',
    chapters: [
      {
        number: 1,
        slug: 'containers-deployment',
        title: 'Containers & Deployment',
        blurb:
          'Docker, cloud compute, and getting from "works on my machine" to a repeatable environment.',
        pages: 5,
      },
      {
        number: 2,
        slug: 'event-driven-systems',
        title: 'Event-Driven Systems (Kafka)',
        blurb:
          'Producers, consumers, and triggering async workflows like notifications and background jobs.',
        pages: 4,
      },
      {
        number: 3,
        slug: 'monitoring-incident-response',
        title: 'Monitoring & Incident Response',
        blurb:
          'Observability tooling, alerting, and what actually happens during on-call.',
        pages: 4,
      },
    ],
  },
  {
    number: 7,
    slug: 'dsa',
    navLabel: 'DSA',
    title: 'Data Structures & Algorithms',
    eyebrow: 'Where the costs are decided',
    summary:
      'Complexity, the structures worth knowing, and the handful of patterns that cover most problems.',
    permalink: '/dsa',
    chapters: [
      {
        number: 1,
        slug: 'complexity-analysis',
        title: 'Complexity & Performance Analysis',
        blurb:
          'Big-O as a decision tool rather than a grading rubric — how to read a constraint and know what will fit.',
        pages: 5,
      },
      /*TMP*/{
        number: 2,
        slug: 'core-data-structures',
        title: 'Core Data Structures',
        blurb:
          'Arrays, hash maps, stacks, queues, heaps and union-find — what each one is actually good at and what it quietly costs you.',
        pages: 8,
      },
      {
        number: 3,
        slug: 'bit-manipulation',
        title: 'Bit Manipulation',
        blurb:
          'What an integer actually is in memory, the handful of operators that act on it directly, and the cases where that view is the simplest one available.',
        pages: 6,
      },
      {
        number: 4,
        slug: 'trees-and-graphs',
        title: 'Trees & Graph Traversal',
        blurb:
          'BFS, DFS, and the recursive shapes that show up once you stop seeing trees and graphs as different things.',
        pages: 7,
      },
      {
        number: 5,
        slug: 'algorithmic-patterns',
        title: 'Algorithmic Patterns',
        blurb:
          'Two pointers, sliding windows, binary search on the answer, monotonic stacks and prefix sums — the handful of moves that cover most problems.',
        pages: 7,
      },
      {
        number: 6,
        slug: 'dynamic-programming',
        title: 'Dynamic Programming',
        blurb:
          'Recognizing overlapping subproblems, and the mechanical path from a recursive definition to a tabulated solution.',
        pages: 6,
      },
      {
        number: 7,
        slug: 'interview-patterns-amazon',
        title: 'Interview Patterns: Amazon',
        blurb:
          'Reported interview problems reframed as instances of patterns taught earlier in the track — the mapping, not the list.',
        pages: 6,
      },
    ],
  },
];

/** Minutes per page, per `handbook-structure.md` ("each page = 1–5 min read"). */
const MIN_MINUTES_PER_PAGE = 1;
const MAX_MINUTES_PER_PAGE = 5;

/**
 * Where the docs plugin mounts `content/`. Doc URLs are
 * `/{docsRouteBasePath}/{trackDir}/{chapter-slug}/{page-slug}` — Docusaurus
 * strips the `NN-` number prefixes from directory and file names when it builds
 * the route, so only the slugs survive.
 *
 * It is not `/` because the about page owns that route.
 */
export const docsRouteBasePath = 'read';

/** The `content/` sub-directory holding a track, e.g. `track-4-ai`. */
export function trackDir(track: Track): string {
  return `track-${track.number}-${track.slug}`;
}

/** The chapter sub-directory, e.g. `01-llm-fundamentals`. */
export function chapterDir(chapter: Chapter): string {
  return `${String(chapter.number).padStart(2, '0')}-${chapter.slug}`;
}

/**
 * Every chapter's first page is `01-overview.md`, so a chapter's entry point is
 * derivable from the outline alone — nothing has to be registered by hand.
 */
export function chapterHref(track: Track, chapter: Chapter): string {
  return `/${docsRouteBasePath}/${trackDir(track)}/${chapter.slug}/overview`;
}

/** Where "start reading this track" goes: its first chapter. */
export function trackStartHref(track: Track): string {
  return chapterHref(track, track.chapters[0]!);
}

/**
 * A uniformly random chapter's entry point, weighted evenly across chapters
 * rather than across tracks — a 7-chapter track is 7 draws, not one.
 *
 * Must only be called from an event handler or effect: calling it during
 * render would make the server and client disagree and trip hydration.
 */
export function randomChapterHref(): string {
  const pairs = tracks.flatMap((track) =>
    track.chapters.map((chapter) => ({track, chapter})),
  );
  const {track, chapter} = pairs[Math.floor(Math.random() * pairs.length)]!;
  return chapterHref(track, chapter);
}

export function getTrack(slug: string): Track {
  const track = tracks.find((a) => a.slug === slug);
  if (!track) {
    throw new Error(`Unknown handbook track: ${slug}`);
  }
  return track;
}

/** The track a doc route belongs to, or undefined off the doc routes. */
export function trackForPath(pathname: string): Track | undefined {
  return tracks.find((track) =>
    pathname.includes(`/${docsRouteBasePath}/${trackDir(track)}`),
  );
}

/**
 * Resolves a doc's `sourceDirName` (`track-4-ai/01-llm-fundamentals`) back to
 * the outline, so a page can label itself with its track and chapter without
 * repeating either in frontmatter.
 */
export function locate(sourceDirName: string): {
  track?: Track;
  chapter?: Chapter;
} {
  const [trackSegment, chapterSegment] = sourceDirName.split('/');
  const track = tracks.find((t) => trackDir(t) === trackSegment);
  const chapter = track?.chapters.find(
    (c) => chapterDir(c) === chapterSegment,
  );
  return {track, chapter};
}

export function pageCount(track: Track): number {
  return track.chapters.reduce((total, chapter) => total + chapter.pages, 0);
}

/** Estimated read time for a whole track, e.g. "20–100". */
export function readMinutesRange(track: Track): string {
  const pages = pageCount(track);
  return `${pages * MIN_MINUTES_PER_PAGE}–${pages * MAX_MINUTES_PER_PAGE}`;
}

/** Chapters across the whole handbook. */
export function totalChapters(): number {
  return tracks.reduce((total, track) => total + track.chapters.length, 0);
}

/** Pages across the whole handbook. */
export function totalPages(): number {
  return tracks.reduce((total, track) => total + pageCount(track), 0);
}

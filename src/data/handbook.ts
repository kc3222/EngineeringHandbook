/**
 * The handbook index — the single source of truth for areas, chapters and
 * page counts in the UI. Mirrors `handbook-structure.md` at the repo root.
 *
 * `handbook-structure.md` labels the top level "Part I–VI"; per CLAUDE.md the
 * code calls the same level an Area. Keep the two in sync: if a chapter is
 * added, renamed or re-counted there, update it here too.
 *
 * Chapter `slug` values are also the chapter folder names under `content/`
 * (prefixed with the zero-padded chapter number, e.g. `01-react-fundamentals`).
 */

export type Chapter = {
  /** Chapter number, unique across the whole handbook (01–22). */
  number: number;
  slug: string;
  title: string;
  blurb: string;
  pages: number;
};

export type Area = {
  /** Area number, 1–6. Matches the `area` field in page frontmatter. */
  number: number;
  slug: string;
  /** Short label used in the navbar. */
  navLabel: string;
  /** Full title used in the area hero. */
  title: string;
  /** Small line above the title. */
  eyebrow: string;
  /** One-sentence description under the title. */
  summary: string;
  /** Where this area lives in the site. */
  permalink: string;
  status: 'Draft' | 'In progress' | 'Published';
  chapters: Chapter[];
};

export const areas: Area[] = [
  {
    number: 1,
    slug: 'frontend',
    navLabel: 'Frontend',
    title: 'Frontend Engineering',
    eyebrow: 'Where the interface takes shape',
    summary:
      'Components, rendering strategy, styling systems, and the tests that keep them honest.',
    permalink: '/',
    status: 'Draft',
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
    status: 'Draft',
    chapters: [
      {
        number: 5,
        slug: 'rest-api-design',
        title: 'REST API Design',
        blurb:
          'Resources, versioning, error contracts — the decisions that outlive the framework you build them in.',
        pages: 5,
      },
      {
        number: 6,
        slug: 'spring-boot-kotlin',
        title: 'Spring Boot & Kotlin',
        blurb:
          "JVM backend patterns — dependency injection, layered architecture, and where Spring's magic helps or hurts.",
        pages: 6,
      },
      {
        number: 7,
        slug: 'fastapi-python-services',
        title: 'FastAPI & Python Services',
        blurb:
          'Fast, typed, async — building inference and CRUD endpoints in Python without the ceremony.',
        pages: 5,
      },
      {
        number: 8,
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
    status: 'Draft',
    chapters: [
      {
        number: 9,
        slug: 'relational-schema-design',
        title: 'Relational Schema Design',
        blurb:
          'PostgreSQL modeling, normalization, and the migrations that come back to bite you later.',
        pages: 5,
      },
      {
        number: 10,
        slug: 'row-level-security',
        title: 'Row-Level Security & Access Control',
        blurb:
          'Enforcing "who sees what" at the database layer instead of hoping the app layer remembers to.',
        pages: 3,
      },
      {
        number: 11,
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
      'Models, embeddings, retrieval pipelines, and coding agents — treated as engineering rather than novelty.',
    permalink: '/ai',
    status: 'Draft',
    chapters: [
      {
        number: 12,
        slug: 'llm-fundamentals',
        title: 'LLM Fundamentals',
        blurb:
          "What the model actually is, what it costs, and what it can't do.",
        pages: 7,
      },
      {
        number: 13,
        slug: 'embeddings-vector-search',
        title: 'Embeddings & Vector Search',
        blurb:
          'Turning meaning into geometry, then searching that geometry fast enough to matter.',
        pages: 6,
      },
      {
        number: 14,
        slug: 'rag-pipelines',
        title: 'RAG Pipelines',
        blurb:
          'Retrieval-augmented generation end to end — the system most people build and most people undersell.',
        pages: 7,
      },
      {
        number: 15,
        slug: 'prompting-ai-coding-agents',
        title: 'Prompting & AI Coding Agents',
        blurb:
          'Working with AI coding agents as engineering tools, not novelties.',
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
    status: 'Draft',
    chapters: [
      {
        number: 16,
        slug: 'pytorch-training-basics',
        title: 'PyTorch & Model Training Basics',
        blurb:
          'Tensors, autograd, training loops — the fundamentals under every deep learning project.',
        pages: 6,
      },
      {
        number: 17,
        slug: 'computer-vision-fundamentals',
        title: 'Computer Vision Fundamentals',
        blurb:
          'Classification and detection basics — architectures, transfer learning, and where CV models tend to fail.',
        pages: 6,
      },
      {
        number: 18,
        slug: 'self-supervised-learning',
        title: 'Self-Supervised Learning',
        blurb:
          'Pretraining without labels — foundation model concepts and why they matter.',
        pages: 5,
      },
      {
        number: 19,
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
    status: 'Draft',
    chapters: [
      {
        number: 20,
        slug: 'containers-deployment',
        title: 'Containers & Deployment',
        blurb:
          'Docker, cloud compute, and getting from "works on my machine" to a repeatable environment.',
        pages: 4,
      },
      {
        number: 21,
        slug: 'event-driven-systems',
        title: 'Event-Driven Systems (Kafka)',
        blurb:
          'Producers, consumers, and triggering async workflows like notifications and background jobs.',
        pages: 4,
      },
      {
        number: 22,
        slug: 'monitoring-incident-response',
        title: 'Monitoring & Incident Response',
        blurb:
          'Observability tooling, alerting, and what actually happens during on-call.',
        pages: 4,
      },
    ],
  },
];

/** Minutes per page, per `handbook-structure.md` ("each page = 1–5 min read"). */
const MIN_MINUTES_PER_PAGE = 1;
const MAX_MINUTES_PER_PAGE = 5;

export function getArea(slug: string): Area {
  const area = areas.find((a) => a.slug === slug);
  if (!area) {
    throw new Error(`Unknown handbook area: ${slug}`);
  }
  return area;
}

export function pageCount(area: Area): number {
  return area.chapters.reduce((total, chapter) => total + chapter.pages, 0);
}

/** Estimated read time for a whole area, e.g. "20–100". */
export function readMinutesRange(area: Area): string {
  const pages = pageCount(area);
  return `${pages * MIN_MINUTES_PER_PAGE}–${pages * MAX_MINUTES_PER_PAGE}`;
}

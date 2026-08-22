import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {themes as prismThemes} from 'prism-react-renderer';

import {tracks, docsRouteBasePath} from './src/data/handbook';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const baseUrl = '/EngineeringHandbook/';

const config: Config = {
  title: 'Engineering Handbook',
  tagline: 'Short reference pages across the engineering stack',
  favicon: 'img/favicon.svg',

  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // GitHub Pages project site: https://kc3222.github.io/EngineeringHandbook/
  url: 'https://kc3222.github.io',
  baseUrl,
  organizationName: 'kc3222',
  projectName: 'EngineeringHandbook',

  onBrokenLinks: 'throw',

  /*
   * `content/` is served twice on purpose: the docs plugin renders it, and the
   * static handler exposes the raw `.md` files so the "Copy markdown" action on
   * a page can fetch its own source. The two never collide — doc routes live
   * under `/read/…` with the `NN-` prefixes stripped, the raw files keep theirs.
   */
  staticDirectories: ['static', 'content'],

  /*
   * Diagrams are authored as ```mermaid fences inside the page markdown, so the
   * source a reader copies from the page header stays readable text rather than
   * a reference to an image they can't see. Requires the `@docusaurus/theme-mermaid`
   * theme registered below.
   */
  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {
      tagName: 'link',
      attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'},
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&family=JetBrains+Mono:wght@700&display=swap',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'content',
          routeBasePath: docsRouteBasePath,
          sidebarPath: './sidebars.ts',
          /*
           * `:::problem` sets a worked-example problem statement apart from the
           * prose around it. Registering the keyword here is only half of it —
           * the type is rendered by the wrapper swizzle in
           * `src/theme/Admonition/Types.tsx`. Without both, the block renders
           * as a literal `:::problem` line.
           */
          admonitions: {
            keywords: ['problem'],
            extendDefaults: true,
          },
          // Our own header renders the track/chapter line, so the stock
          // breadcrumbs would just repeat it.
          breadcrumbs: false,
          editUrl:
            'https://github.com/kc3222/EngineeringHandbook/tree/main/',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    docs: {
      sidebar: {
        // One chapter open at a time keeps the tree short enough to scan.
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    /*
     * Syntax highlighting has to be set per colour mode. Without an explicit
     * `theme`, Docusaurus uses palenight for BOTH modes — and palenight is a
     * dark theme, so its light-grey token colours landed on the light code
     * surface that "Reading surface" paints in `custom.css`, leaving every
     * snippet on the site close to unreadable in light mode.
     *
     * `darkTheme` stays palenight, which is what dark mode was already getting.
     */
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.palenight,
    },
    // Diagrams follow the site's colour mode. `neutral`/`dark` are the two
    // mermaid built-ins that don't fight the reading surface; per-diagram
    // colour overrides belong in the page, not here.
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
    navbar: {
      title: 'Engineering Handbook',
      // Rendered by src/theme/Navbar/Content — tracks sit centred, with the
      // search button and theme toggle pinned right.
      items: tracks.map((track) => ({
        to: track.permalink,
        label: track.navLabel,
        position: 'left' as const,
        activeBasePath: track.permalink,
      })),
    },
    footer: {
      copyright: `Engineering Handbook · ${new Date().getFullYear()}`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

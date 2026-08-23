import React from 'react';
import clsx from 'clsx';
import {useHistory} from '@docusaurus/router';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

import {
  tracks,
  pageCount,
  randomChapterHref,
  totalChapters,
  totalPages,
} from '@site/src/data/handbook';

import styles from './index.module.css';

const principles = [
  {
    title: 'Reference, not tutorial',
    body: 'Pages assume you can already write code. They cover the decisions that surround a technology — what it buys you, what it costs, where it breaks — rather than walking through a first install.',
  },
  {
    title: 'Short by design',
    body: 'Every page targets a one-to-five minute read and stands on its own. When a topic outgrows that, it becomes two pages instead of one long one.',
  },
  {
    title: 'Tradeoffs over prescriptions',
    body: 'Where there is a real choice — a rendering strategy, an API shape, which layer enforces access control — the aim is to explain what each option costs, not to crown a winner.',
  },
];

function Stat({
  value,
  label,
  mono,
}: {
  value: string;
  label: string;
  mono?: boolean;
}) {
  return (
    <div className={styles.stat}>
      <div className={clsx(styles.statValue, mono && styles.statValueMono)}>
        {value}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function About(): React.ReactNode {
  const chapters = totalChapters();
  const pages = totalPages();
  const history = useHistory();
  const baseUrl = useBaseUrl('/');

  // Picked on click, not during render: a random href chosen while rendering
  // would differ between the prerendered HTML and hydration.
  const goToRandomChapter = () => {
    history.push(`${baseUrl}${randomChapterHref().replace(/^\//, '')}`);
  };

  return (
    <Layout
      title="About"
      description="Short reference pages across frontend, backend, data, AI engineering, applied ML, and cloud infrastructure.">
      <main className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            <span className={styles.dot} aria-hidden="true" />
            About this site
          </p>

          <h1 className={styles.title}>Engineering Handbook</h1>
          <p className={styles.summary}>
            Short reference pages across frontend, backend, data, AI
            engineering, applied ML, and the infrastructure underneath. Read one
            in a few minutes, or work through a track end to end.
          </p>

          <div className={styles.actions}>
            <a className={styles.primaryAction} href="#tracks">
              Browse the tracks <span aria-hidden="true">→</span>
            </a>
            <Link className={styles.secondaryAction} to="/frontend">
              Start with Frontend
            </Link>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={goToRandomChapter}>
              Random chapter <span aria-hidden="true">↗</span>
            </button>
          </div>

          <hr className={styles.rule} />

          <div className={styles.stats}>
            <Stat value={String(tracks.length)} label="tracks" />
            <Stat value={String(chapters)} label="chapters" />
            <Stat value={String(pages)} label="pages" />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>What this is</h2>
          <div className={styles.principles}>
            {principles.map((principle) => (
              <div key={principle.title} className={styles.principle}>
                <h3 className={styles.principleTitle}>{principle.title}</h3>
                <p className={styles.principleBody}>{principle.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} id="tracks">
          <h2 className={styles.sectionHeading}>Tracks</h2>
          <p className={styles.sectionIntro}>
            {tracks.length} tracks, each split into chapters, each chapter into
            pages.
          </p>

          <ul className={styles.trackGrid}>
            {tracks.map((track) => (
              <li key={track.slug}>
                <Link className={styles.trackCard} to={track.permalink}>
                  <span className={styles.trackNumber}>
                    {String(track.number).padStart(2, '0')}
                  </span>
                  <span className={styles.trackTitle}>{track.title}</span>
                  <span className={styles.trackSummary}>{track.summary}</span>
                  <span className={styles.trackMeta}>
                    {track.chapters.length} chapters · {pageCount(track)} pages
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Status</h2>
          <p className={styles.statusBody}>
            Every page is written — all {pages} of them, across {chapters}{' '}
            chapters. The counts above describe what is readable today, not a
            plan. Ongoing work is revision: tightening pages that run long and
            keeping citations pointed at the current edition of each spec.
          </p>
        </section>
      </main>
    </Layout>
  );
}

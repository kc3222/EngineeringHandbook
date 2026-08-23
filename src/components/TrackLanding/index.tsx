import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

import {
  chapterHref,
  pageCount,
  readMinutesRange,
  trackStartHref,
  type Track,
} from '@site/src/data/handbook';

import styles from './styles.module.css';

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

/**
 * Hero + chapter index for one of the six handbook tracks. Every number on the
 * page is derived from `src/data/handbook.ts` rather than hardcoded, so the
 * counts can't drift from the outline.
 */
export default function TrackLanding({track}: {track: Track}): React.ReactNode {
  const pages = pageCount(track);
  const chapters = track.chapters.length;

  return (
    <Layout title={track.title} description={track.summary}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            <span className={styles.dot} aria-hidden="true" />
            {track.eyebrow}
          </p>

          <h1 className={styles.title}>{track.title}</h1>
          <p className={styles.summary}>{track.summary}</p>

          <div className={styles.actions}>
            <Link
              className={styles.primaryAction}
              to={trackStartHref(track)}>
              Start reading <span aria-hidden="true">→</span>
            </Link>
            <p className={styles.count}>
              {chapters} chapters · {pages} pages
            </p>
          </div>

          <hr className={styles.rule} />

          <div className={styles.stats}>
            <Stat value={String(chapters)} label="chapters" />
            <Stat value={String(pages)} label="pages" />
            <Stat value={readMinutesRange(track)} label="min read, est." mono />
          </div>
        </section>

        <section className={styles.chapters} id="chapters">
          <h2 className={styles.chaptersHeading}>Chapters</h2>

          <ol className={styles.chapterList}>
            {track.chapters.map((chapter) => {
              const number = String(chapter.number).padStart(2, '0');
              return (
                <li
                  key={chapter.slug}
                  id={`chapter-${number}`}
                  className={styles.chapter}>
                  <Link
                    className={styles.chapterLink}
                    to={chapterHref(track, chapter)}>
                    <span className={styles.chapterNumber}>{number}</span>
                    <div className={styles.chapterBody}>
                      <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                      <p className={styles.chapterBlurb}>{chapter.blurb}</p>
                    </div>
                    <span className={styles.chapterPages}>
                      {chapter.pages} pages
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          <p className={styles.note}>
            Each chapter opens on its overview page. Most pages are still
            placeholders while the handbook is being drafted.
          </p>
        </section>
      </main>
    </Layout>
  );
}

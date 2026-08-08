import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';

import {
  pageCount,
  readMinutesRange,
  type Area,
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
 * Hero + chapter index for one of the six handbook areas. Every number on the
 * page is derived from `src/data/handbook.ts` rather than hardcoded, so the
 * counts can't drift from the outline.
 */
export default function AreaLanding({area}: {area: Area}): React.ReactNode {
  const pages = pageCount(area);
  const chapters = area.chapters.length;

  return (
    <Layout title={area.title} description={area.summary}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            <span className={styles.dot} aria-hidden="true" />
            {area.eyebrow}
          </p>

          <h1 className={styles.title}>{area.title}</h1>
          <p className={styles.summary}>{area.summary}</p>

          <div className={styles.actions}>
            <a className={styles.primaryAction} href="#chapters">
              Browse chapters <span aria-hidden="true">→</span>
            </a>
            <p className={styles.count}>
              {chapters} chapters · {pages} pages
            </p>
          </div>

          <hr className={styles.rule} />

          <div className={styles.stats}>
            <Stat value={String(chapters)} label="chapters" />
            <Stat value={String(pages)} label="pages" />
            <Stat value={readMinutesRange(area)} label="min read, est." mono />
            <Stat value={area.status} label="status" />
          </div>
        </section>

        <section className={styles.chapters} id="chapters">
          <h2 className={styles.chaptersHeading}>Chapters</h2>

          <ol className={styles.chapterList}>
            {area.chapters.map((chapter) => {
              const number = String(chapter.number).padStart(2, '0');
              return (
                <li
                  key={chapter.slug}
                  id={`chapter-${number}`}
                  className={styles.chapter}>
                  <span className={styles.chapterNumber}>{number}</span>
                  <div className={styles.chapterBody}>
                    <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                    <p className={styles.chapterBlurb}>{chapter.blurb}</p>
                  </div>
                  <span className={styles.chapterPages}>
                    {chapter.pages} pages
                  </span>
                </li>
              );
            })}
          </ol>

          <p className={styles.note}>
            Pages for this area are still being written.
          </p>
        </section>
      </main>
    </Layout>
  );
}

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import {useHistory} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useIsBrowser from '@docusaurus/useIsBrowser';

import {chapterHref, tracks} from '@site/src/data/handbook';

import styles from './styles.module.css';

type Entry = {
  id: string;
  kind: 'Track' | 'Chapter';
  title: string;
  description: string;
  meta: string;
  to: string;
  /** Lowercased title, matched with more weight than `body`. */
  titleText: string;
  /** Lowercased description and track name. */
  body: string;
};

/**
 * Ranks a whole-word or prefix hit above a mid-word one, and a title hit above
 * a description hit — so "rag" finds "RAG Pipelines" before "Object Storage".
 * Returns 0 when any term is missing, which excludes the entry.
 */
function score(entry: Entry, terms: string[]): number {
  let total = 0;

  for (const term of terms) {
    const boundary = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    let best = 0;

    if (boundary.test(entry.titleText)) {
      best = 8;
    } else if (entry.titleText.includes(term)) {
      best = 4;
    } else if (boundary.test(entry.body)) {
      best = 2;
    } else if (entry.body.includes(term)) {
      best = 1;
    }

    if (best === 0) {
      return 0;
    }
    total += best;
  }

  return total;
}

/**
 * Search runs over the handbook index — tracks and chapters, not page bodies.
 * Chapter hits open that chapter's first page. Swapping this for a real
 * page-level index is still outstanding; the palette UI can stay as-is.
 */
function buildIndex(): Entry[] {
  const entries: Entry[] = [];

  tracks.forEach((track) => {
    const pages = track.chapters.reduce((n, c) => n + c.pages, 0);
    entries.push({
      id: `track-${track.slug}`,
      kind: 'Track',
      title: track.title,
      description: track.summary,
      meta: `${track.chapters.length} chapters · ${pages} pages`,
      to: track.permalink,
      titleText: `${track.title} ${track.navLabel}`.toLowerCase(),
      body: track.summary.toLowerCase(),
    });

    track.chapters.forEach((chapter) => {
      entries.push({
        id: `chapter-${chapter.number}`,
        kind: 'Chapter',
        title: chapter.title,
        description: chapter.blurb,
        meta: `${track.title} · ${chapter.pages} pages`,
        to: chapterHref(track, chapter),
        titleText: chapter.title.toLowerCase(),
        body: `${chapter.blurb} ${track.title}`.toLowerCase(),
      });
    });
  });

  return entries;
}

function SearchPalette({onClose}: {onClose: () => void}): React.ReactNode {
  const history = useHistory();
  const baseUrl = useBaseUrl('/');
  const index = useMemo(buildIndex, []);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return index.filter((entry) => entry.kind === 'Track');
    }
    return index
      .map((entry) => ({entry, rank: score(entry, terms)}))
      .filter(({rank}) => rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 12)
      .map(({entry}) => entry);
  }, [index, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
    const {overflow} = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({block: 'nearest'});
  }, [cursor, results]);

  const go = useCallback(
    (entry: Entry | undefined) => {
      if (!entry) {
        return;
      }
      // Docusaurus's router scrolls to the #chapter-NN anchor itself; the
      // chapters carry a scroll-margin-top so the sticky navbar clears them.
      history.push(`${baseUrl}${entry.to.replace(/^\//, '')}`);
      onClose();
    },
    [baseUrl, history, onClose],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) =>
        results.length ? (c - 1 + results.length) % results.length : 0,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[cursor]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}>
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Search the handbook"
        onKeyDown={onKeyDown}>
        <div className={styles.field}>
          <SearchIcon />
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search tracks and chapters…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search tracks and chapters"
          />
          <kbd className={styles.esc}>Esc</kbd>
        </div>

        {results.length === 0 ? (
          <p className={styles.empty}>No matches for “{query}”.</p>
        ) : (
          <ul className={styles.results} ref={listRef}>
            {results.map((entry, i) => (
              <li key={entry.id}>
                <button
                  type="button"
                  data-active={i === cursor}
                  className={clsx(styles.result, i === cursor && styles.hit)}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(entry)}>
                  <span className={styles.kind}>{entry.kind}</span>
                  <span className={styles.resultBody}>
                    <span className={styles.resultTitle}>{entry.title}</span>
                    <span className={styles.resultDesc}>
                      {entry.description}
                    </span>
                  </span>
                  <span className={styles.resultMeta}>{entry.meta}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.hint}>
          Search covers the outline — tracks and chapters, not page text yet.
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 4 4" />
      </g>
    </svg>
  );
}

export default function SearchButton({
  className,
}: {
  className?: string;
} = {}): React.ReactNode {
  const isBrowser = useIsBrowser();
  const [open, setOpen] = useState(false);

  const isMac =
    isBrowser && /mac|iphone|ipad/i.test(navigator.userAgent ?? '');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        className={clsx(styles.trigger, className)}
        onClick={() => setOpen(true)}
        aria-label="Search the handbook">
        <span className={styles.triggerIcon} aria-hidden="true">
          <SearchIcon />
        </span>
        <span className={styles.triggerLabel}>Search</span>
        <span className={styles.keys} aria-hidden="true">
          <kbd className={styles.key}>{isMac ? '⌘' : 'Ctrl'}</kbd>
          <kbd className={styles.key}>K</kbd>
        </span>
      </button>
      {open && <SearchPalette onClose={() => setOpen(false)} />}
    </>
  );
}

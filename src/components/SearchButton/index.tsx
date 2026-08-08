import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import {useHistory} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useIsBrowser from '@docusaurus/useIsBrowser';

import {areas} from '@site/src/data/handbook';

import styles from './styles.module.css';

type Entry = {
  id: string;
  kind: 'Area' | 'Chapter';
  title: string;
  description: string;
  meta: string;
  to: string;
  /** Lowercased title, matched with more weight than `body`. */
  titleText: string;
  /** Lowercased description and area name. */
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
 * Search runs over the handbook index (areas and chapters) — the only content
 * that exists today. Once `content/` holds real pages, swap this for a
 * page-level index; the palette UI can stay as-is.
 */
function buildIndex(): Entry[] {
  const entries: Entry[] = [];

  areas.forEach((area) => {
    const pages = area.chapters.reduce((n, c) => n + c.pages, 0);
    entries.push({
      id: `area-${area.slug}`,
      kind: 'Area',
      title: area.title,
      description: area.summary,
      meta: `${area.chapters.length} chapters · ${pages} pages`,
      to: area.permalink,
      titleText: `${area.title} ${area.navLabel}`.toLowerCase(),
      body: area.summary.toLowerCase(),
    });

    area.chapters.forEach((chapter) => {
      entries.push({
        id: `chapter-${chapter.number}`,
        kind: 'Chapter',
        title: chapter.title,
        description: chapter.blurb,
        meta: `${area.title} · ${chapter.pages} pages`,
        to: `${area.permalink}#chapter-${String(chapter.number).padStart(2, '0')}`,
        titleText: chapter.title.toLowerCase(),
        body: `${chapter.blurb} ${area.title}`.toLowerCase(),
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
      return index.filter((entry) => entry.kind === 'Area');
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
            placeholder="Search areas and chapters…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search areas and chapters"
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
          Content pages are still being written — search covers the outline.
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

export default function SearchButton(): React.ReactNode {
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
        className={styles.trigger}
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

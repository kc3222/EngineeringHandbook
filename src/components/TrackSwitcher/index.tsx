import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useHistory} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useDocsSidebar} from '@docusaurus/plugin-content-docs/client';

import {
  pageCount,
  tracks,
  trackStartHref,
  type Track,
} from '@site/src/data/handbook';
import SearchButton from '@site/src/components/SearchButton';

import styles from './styles.module.css';

/**
 * The header above the doc sidebar: which track you're reading, a switcher for
 * the other five, and search.
 *
 * The current track comes from the sidebar id — `sidebars.ts` names each
 * sidebar after its track slug, and Docusaurus picks the sidebar containing the
 * current page. Switching tracks navigates to that track's first chapter, which
 * swaps the sidebar underneath.
 */
export default function TrackSwitcher(): React.ReactNode {
  const sidebar = useDocsSidebar();
  const history = useHistory();
  const baseUrl = useBaseUrl('/');
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  const current = tracks.find((track) => track.slug === sidebar?.name);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!current) {
    return null;
  }

  const go = (track: Track) => {
    setOpen(false);
    if (track.slug === current.slug) {
      return;
    }
    history.push(`${baseUrl}${trackStartHref(track).replace(/^\//, '')}`);
  };

  return (
    <div className={styles.header}>
      <div className={styles.switcher} ref={wrapper}>
        <button
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((wasOpen) => !wasOpen)}>
          <span className={styles.triggerText}>
            <span className={styles.triggerEyebrow}>
              Track {current.number} of {tracks.length}
            </span>
            <span className={styles.triggerTitle}>{current.title}</span>
          </span>
          <ChevronIcon />
        </button>

        {open && (
          <div className={styles.menu} role="menu">
            {tracks.map((track) => (
              <button
                key={track.slug}
                type="button"
                role="menuitem"
                className={clsx(
                  styles.menuItem,
                  track.slug === current.slug && styles.menuItemActive,
                )}
                onClick={() => go(track)}>
                <span className={styles.menuTitle}>{track.title}</span>
                <span className={styles.menuMeta}>
                  {track.chapters.length} chapters · {pageCount(track)} pages
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <SearchButton />

      <Link className={styles.overview} to={current.permalink}>
        Track overview <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true">
      <path
        d="m8 9 4-4 4 4M8 15l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

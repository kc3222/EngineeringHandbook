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
 * The header above the chapter tree. Content pages hide the navbar on desktop
 * (see "Reading surface" in `src/css/custom.css`), so this and the sidebar
 * footer are the whole app shell for them. Here: home, the track you're
 * reading — which doubles as the switcher for the other five — collapse and
 * search. The theme control sits in the footer, pinned below the chapter tree
 * (`src/theme/DocSidebar/Desktop`).
 *
 * The current track comes from the sidebar id — `sidebars.ts` names each
 * sidebar after its track slug, and Docusaurus picks the sidebar containing the
 * current page. Switching tracks navigates to that track's first chapter, which
 * swaps the sidebar underneath.
 */
export default function TrackSwitcher({
  onCollapse,
}: {
  /** Omitted when `themeConfig.docs.sidebar.hideable` is off. */
  onCollapse?: () => void;
} = {}): React.ReactNode {
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
      <div className={styles.titleRow}>
        <Link
          className={styles.home}
          to="/"
          title="Engineering Handbook — home"
          aria-label="Engineering Handbook — home">
          <HomeIcon />
        </Link>

        <div className={styles.switcher} ref={wrapper}>
          <button
            type="button"
            className={styles.title}
            aria-expanded={open}
            aria-haspopup="menu"
            title="Switch track"
            onClick={() => setOpen((wasOpen) => !wasOpen)}>
            <span className={styles.titleText}>{current.title}</span>
            <ChevronIcon />
          </button>

          {open && (
            <div className={styles.menu} role="menu">
              <p className={styles.menuLabel}>Tracks</p>
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

        {onCollapse && (
          <button
            type="button"
            className={styles.collapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            onClick={onCollapse}>
            <PanelIcon />
          </button>
        )}
      </div>

      <SearchButton variant="field" />

      <Link className={styles.overview} to={current.permalink}>
        Track overview
      </Link>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        d="M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1h-4v-5.5H9V20H5a1 1 0 0 1-1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true">
      <path
        d="m8 10 4-4 4 4M8 14l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PanelIcon(): React.ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <path d="M9.5 4.5v15" />
      </g>
    </svg>
  );
}

import React, {useEffect, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useDoc} from '@docusaurus/plugin-content-docs/client';

import {chapterHref, locate, type PageFrontMatter} from '@site/src/data/handbook';

import styles from './styles.module.css';

/** `@site/content/track-4-ai/01-llm-fundamentals/01-overview.md` → the tail. */
function rawSourcePath(source: string): string {
  return source.replace(/^@site\/content\//, '');
}

function CopyMarkdownButton({source}: {source: string}) {
  // `staticDirectories` serves `content/` verbatim, so a page can fetch its own
  // markdown rather than reconstructing it from the rendered DOM.
  const rawUrl = useBaseUrl(rawSourcePath(source));
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') {
      return undefined;
    }
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      const response = await fetch(rawUrl);
      if (!response.ok) {
        throw new Error(`${response.status}`);
      }
      await navigator.clipboard.writeText(await response.text());
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <button type="button" className={styles.action} onClick={copy}>
      <CopyIcon />
      {state === 'idle' && 'Copy markdown'}
      {state === 'copied' && 'Copied'}
      {state === 'failed' && "Couldn't copy"}
    </button>
  );
}

function OpenMenu({source, editUrl}: {source: string; editUrl?: string | null}) {
  const rawUrl = useBaseUrl(rawSourcePath(source));
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

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

  return (
    <div className={styles.menuWrap} ref={wrapper}>
      <button
        type="button"
        className={styles.action}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((wasOpen) => !wasOpen)}>
        Open
        <ChevronIcon />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <a
            className={styles.menuItem}
            role="menuitem"
            href={rawUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}>
            <span>Raw markdown</span>
            <span className={styles.menuHint}>.md</span>
          </a>
          {editUrl && (
            <a
              className={styles.menuItem}
              role="menuitem"
              href={editUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}>
              <span>Source on GitHub</span>
              <span className={styles.menuHint}>↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The top of a content page: where it sits in the handbook, its title and
 * standfirst, and the actions that hand the page to something else. Replaces the
 * stock synthetic `<h1>` — `src/theme/DocItem/Content` no longer renders one.
 */
export default function DocHeader(): React.ReactNode {
  const {metadata, frontMatter} = useDoc();
  const fm = frontMatter as Partial<PageFrontMatter>;
  const {track, chapter} = locate(metadata.sourceDirName);

  const readMinutes = fm.readMinutes;
  const pageNumber = fm.page;

  return (
    <header className={styles.header}>
      <nav className={styles.trail} aria-label="Page location">
        {track && (
          <>
            <Link className={styles.trailLink} to={track.permalink}>
              {track.title}
            </Link>
            <span className={styles.trailSep} aria-hidden="true">
              /
            </span>
          </>
        )}
        {track && chapter ? (
          <Link className={styles.trailLink} to={chapterHref(track, chapter)}>
            {chapter.title}
          </Link>
        ) : (
          <span className={styles.trailLink}>{metadata.title}</span>
        )}
      </nav>

      <h1 className={styles.title}>{metadata.title}</h1>

      {metadata.description && (
        <p className={styles.standfirst}>{metadata.description}</p>
      )}

      <div className={styles.bar}>
        <CopyMarkdownButton source={metadata.source} />
        <OpenMenu source={metadata.source} editUrl={metadata.editUrl} />

        <p className={styles.meta}>
          {chapter && pageNumber ? (
            <>
              Page {pageNumber} of {chapter.pages}
              <span className={styles.metaSep} aria-hidden="true">
                ·
              </span>
            </>
          ) : null}
          {readMinutes ? `${readMinutes} min read` : null}
        </p>
      </div>
    </header>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="9" y="9" width="11" height="11" rx="2.5" />
        <path d="M15 5.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 5.5 15" />
      </g>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="m7 10 5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

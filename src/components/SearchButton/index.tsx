import React from 'react';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';

import {SearchIcon, useSearch} from '@site/src/components/Search';

import styles from './styles.module.css';

/**
 * Opens the search palette. Two looks: `compact` for the navbar (label plus the
 * keyboard hint, collapsing to an icon on narrow viewports) and `field` for the
 * doc sidebar, which reads as a full-width input.
 *
 * The palette itself is mounted once by `SearchProvider` — see
 * `src/components/Search`.
 */
export default function SearchButton({
  variant = 'compact',
  className,
}: {
  variant?: 'compact' | 'field';
  className?: string;
} = {}): React.ReactNode {
  const isBrowser = useIsBrowser();
  const {open} = useSearch();

  const isMac =
    isBrowser && /mac|iphone|ipad/i.test(navigator.userAgent ?? '');

  return (
    <button
      type="button"
      className={clsx(
        styles.trigger,
        variant === 'field' && styles.field,
        className,
      )}
      onClick={open}
      aria-label="Search the handbook">
      <span className={styles.icon} aria-hidden="true">
        <SearchIcon />
      </span>
      <span className={styles.label}>Search</span>
      <span className={styles.keys} aria-hidden="true">
        <kbd className={styles.key}>{isMac ? '⌘' : 'Ctrl'}</kbd>
        <kbd className={styles.key}>K</kbd>
      </span>
    </button>
  );
}

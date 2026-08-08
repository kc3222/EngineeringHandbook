import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

import {areas} from '@site/src/data/handbook';

import styles from './styles.module.css';

const stripTrailingSlash = (path: string): string =>
  path.length > 1 ? path.replace(/\/$/, '') : path;

/**
 * The centred area switcher in the navbar. Every area has its own path, so the
 * root ("about this site") page correctly leaves all six links inactive.
 */
export default function AreaNav({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}): React.ReactNode {
  const current = stripTrailingSlash(useLocation().pathname);
  // Always ends in a slash, e.g. "/EngineeringHandbook/".
  const base = useBaseUrl('/');

  return (
    <nav className={clsx(styles.areaNav, className)} aria-label="Handbook areas">
      {areas.map((area) => {
        const href = stripTrailingSlash(
          `${base}${area.permalink.replace(/^\//, '')}`,
        );
        // Prefix match on a path segment, so /ml never lights up for /mlops.
        const isActive = current === href || current.startsWith(`${href}/`);

        return (
          <Link
            key={area.slug}
            to={area.permalink}
            className={clsx(styles.link, isActive && styles.active)}
            aria-current={isActive ? 'page' : undefined}
            onClick={onNavigate}>
            {area.navLabel}
          </Link>
        );
      })}
    </nav>
  );
}

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
 * The centred area switcher in the navbar. Active state is computed here
 * rather than via `activeBasePath` because the first area lives at the site
 * root, which would otherwise match every route.
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
  const root = stripTrailingSlash(base);

  return (
    <nav className={clsx(styles.areaNav, className)} aria-label="Handbook areas">
      {areas.map((area) => {
        const href = stripTrailingSlash(
          `${base}${area.permalink.replace(/^\//, '')}`,
        );
        const isActive =
          href === root ? current === root : current.startsWith(href);

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

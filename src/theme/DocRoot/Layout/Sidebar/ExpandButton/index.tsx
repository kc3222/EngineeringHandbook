import React, {type ReactNode} from 'react';
import type {Props} from '@theme/DocRoot/Layout/Sidebar/ExpandButton';

import {useSearch} from '@site/src/components/Search';
import {PanelIcon} from '@site/src/components/TrackSwitcher';
import {SearchIcon} from '@site/src/components/Search';

import styles from './styles.module.css';

/**
 * What's left of the sidebar once it's collapsed: a floating pill holding the
 * two controls worth keeping at hand — expand, and search.
 *
 * Swizzled (ejected) because the stock version is a full-height hit target that
 * fills the rail with a hover colour. The rail is widened for the pill via
 * `--doc-sidebar-hidden-width` in `src/css/custom.css`; the sidebar container
 * clips its overflow, so the pill has to fit inside that width rather than
 * float over the article.
 */
export default function ExpandButton({toggleSidebar}: Props): ReactNode {
  const {open} = useSearch();

  return (
    <div className={styles.rail}>
      <div className={styles.pill}>
        <button
          type="button"
          className={styles.button}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          onClick={toggleSidebar}>
          <PanelIcon />
        </button>
        <button
          type="button"
          className={styles.button}
          title="Search the handbook"
          aria-label="Search the handbook"
          onClick={open}>
          <SearchIcon />
        </button>
      </div>
    </div>
  );
}

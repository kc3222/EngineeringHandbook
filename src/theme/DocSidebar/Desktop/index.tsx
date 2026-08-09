import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {useThemeConfig} from '@docusaurus/theme-common';
import Content from '@theme/DocSidebar/Desktop/Content';
import type {Props} from '@theme/DocSidebar/Desktop';

import TrackSwitcher from '@site/src/components/TrackSwitcher';

import styles from './styles.module.css';

/**
 * Swizzled (ejected) to put the track switcher above the chapter tree. The
 * header is outside `<Content>` on purpose: `<Content>` is the scrolling
 * region, so the switcher stays pinned while the chapter list scrolls.
 *
 * Dropped from the stock component: the `hideOnScroll` logo branch (the navbar
 * doesn't hide on this site) and `<CollapseButton>`, whose bar sat pinned to
 * the bottom of the sidebar — `<TrackSwitcher>` renders that control in the
 * header instead. Expanding again still uses the theme's own expand button,
 * which `DocRoot/Layout/Sidebar` renders once the sidebar is hidden.
 */
function DocSidebarDesktop({path, sidebar, onCollapse, isHidden}: Props) {
  const {
    docs: {
      sidebar: {hideable},
    },
  } = useThemeConfig();

  return (
    <div className={clsx(styles.sidebar, isHidden && styles.sidebarHidden)}>
      <TrackSwitcher onCollapse={hideable ? onCollapse : undefined} />
      <Content path={path} sidebar={sidebar} />
    </div>
  );
}

export default React.memo(DocSidebarDesktop) as (props: Props) => ReactNode;

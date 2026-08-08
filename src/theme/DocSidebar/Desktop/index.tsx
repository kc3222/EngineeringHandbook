import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {useThemeConfig} from '@docusaurus/theme-common';
import CollapseButton from '@theme/DocSidebar/Desktop/CollapseButton';
import Content from '@theme/DocSidebar/Desktop/Content';
import type {Props} from '@theme/DocSidebar/Desktop';

import TrackSwitcher from '@site/src/components/TrackSwitcher';

import styles from './styles.module.css';

/**
 * Swizzled (ejected) to put the track switcher and search above the chapter
 * tree. The header is outside `<Content>` on purpose: `<Content>` is the
 * scrolling region, so the switcher stays pinned while the chapter list scrolls.
 *
 * The stock `hideOnScroll` logo branch is dropped — the navbar doesn't hide on
 * this site.
 */
function DocSidebarDesktop({path, sidebar, onCollapse, isHidden}: Props) {
  const {
    docs: {
      sidebar: {hideable},
    },
  } = useThemeConfig();

  return (
    <div className={clsx(styles.sidebar, isHidden && styles.sidebarHidden)}>
      <TrackSwitcher />
      <Content path={path} sidebar={sidebar} />
      {hideable && <CollapseButton onClick={onCollapse} />}
    </div>
  );
}

export default React.memo(DocSidebarDesktop) as (props: Props) => ReactNode;

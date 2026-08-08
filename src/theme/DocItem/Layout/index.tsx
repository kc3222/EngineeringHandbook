import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {useWindowSize} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import DocItemPaginator from '@theme/DocItem/Paginator';
import DocItemTOCMobile from '@theme/DocItem/TOC/Mobile';
import DocItemTOCDesktop from '@theme/DocItem/TOC/Desktop';
import DocItemContent from '@theme/DocItem/Content';
import ContentVisibility from '@theme/ContentVisibility';
import type {Props} from '@theme/DocItem/Layout';

import DocHeader from '@site/src/components/DocHeader';

import styles from './styles.module.css';

/**
 * Swizzled (ejected) for the reading layout: a page header of our own above the
 * markdown, and a plain two-column grid instead of Infima's `row`/`col` classes,
 * so the article column and the "On this page" rail can be sized here.
 *
 * Dropped from the stock layout: breadcrumbs (turned off in the docs plugin —
 * `<DocHeader>` renders the track/chapter trail), the version banner and badge
 * (the handbook is unversioned), and `DocItemFooter` (its edit link lives in
 * the header's "Open" menu instead).
 */
function useDocTOC() {
  const {frontMatter, toc} = useDoc();
  const windowSize = useWindowSize();
  const hidden = frontMatter.hide_table_of_contents;
  const canRender = !hidden && toc.length > 0;

  return {
    hidden,
    mobile: canRender ? <DocItemTOCMobile /> : undefined,
    desktop:
      canRender && (windowSize === 'desktop' || windowSize === 'ssr') ? (
        <DocItemTOCDesktop />
      ) : undefined,
  };
}

export default function DocItemLayout({children}: Props): ReactNode {
  const docTOC = useDocTOC();
  const {metadata} = useDoc();

  return (
    <div className={clsx(styles.layout, docTOC.desktop && styles.withToc)}>
      <div className={styles.main}>
        <ContentVisibility metadata={metadata} />

        <article className={styles.article}>
          <DocHeader />
          {docTOC.mobile}
          <DocItemContent>{children}</DocItemContent>
        </article>

        <DocItemPaginator />
      </div>

      {docTOC.desktop && (
        <aside className={styles.toc}>
          <p className={styles.tocLabel}>On this page</p>
          {docTOC.desktop}
        </aside>
      )}
    </div>
  );
}

import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import MDXContent from '@theme/MDXContent';
import type {Props} from '@theme/DocItem/Content';

/**
 * Swizzled (ejected) to drop the stock "synthetic title" — the `<h1>` the theme
 * inserts when a page's title comes from frontmatter. `src/components/DocHeader`
 * renders the title now, together with the standfirst and page actions, so
 * leaving this in place would put two `<h1>`s on every page.
 *
 * Page files therefore should NOT open with a `# Heading`; the title lives in
 * frontmatter and `##` is the top level in the body.
 */
export default function DocItemContent({children}: Props): ReactNode {
  return (
    <div className={clsx(ThemeClassNames.docs.docMarkdown, 'markdown')}>
      <MDXContent>{children}</MDXContent>
    </div>
  );
}

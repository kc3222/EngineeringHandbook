import React, {type ReactNode} from 'react';

import {SearchProvider} from '@site/src/components/Search';

/**
 * `Root` wraps the whole app and survives navigation, which makes it the one
 * place to mount the search palette and its ⌘K listener. Everything else just
 * calls `useSearch()`.
 */
export default function Root({children}: {children: ReactNode}): ReactNode {
  return <SearchProvider>{children}</SearchProvider>;
}

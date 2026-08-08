import React, {type ReactNode} from 'react';
import {useThemeConfig, ErrorCauseBoundary} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import NavbarItem, {type Props as NavbarItemConfig} from '@theme/NavbarItem';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';

import AreaNav from '@site/src/components/AreaNav';
import SearchButton from '@site/src/components/SearchButton';
import ThemeToggle from '@site/src/components/ThemeToggle';

import styles from './styles.module.css';

/**
 * Swizzled (ejected) so the navbar can use three slots — brand, centred area
 * links, and the search + theme controls — instead of the stock left/right
 * split. Area links come from `src/data/handbook.ts` via <AreaNav>; anything
 * added to `themeConfig.navbar.items` with `position: 'right'` still renders.
 */
function useNavbarItems() {
  return useThemeConfig().navbar.items as NavbarItemConfig[];
}

function NavbarItems({items}: {items: NavbarItemConfig[]}): ReactNode {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              {cause: error},
            )
          }>
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}

export default function NavbarContent(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  const items = useNavbarItems();
  const [, rightItems] = splitNavbarItems(items);

  return (
    <div className="navbar__inner">
      <div className={styles.brand}>
        {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
        <NavbarLogo />
      </div>

      <AreaNav className={styles.areas} />

      <div className={styles.tools}>
        <NavbarItems items={rightItems} />
        <SearchButton />
        <ThemeToggle />
      </div>
    </div>
  );
}

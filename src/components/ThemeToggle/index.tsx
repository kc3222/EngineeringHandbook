import React from 'react';
import clsx from 'clsx';
import {useColorMode} from '@docusaurus/theme-common';
import useIsBrowser from '@docusaurus/useIsBrowser';

import styles from './styles.module.css';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none">
        <path d="M12 2.4v2.3M12 19.3v2.3M2.4 12h2.3M19.3 12h2.3" />
        <path d="M5.2 5.2 6.8 6.8M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Two-state segmented control replacing the stock single-icon toggle.
 * Rendered inert until hydration so SSR output can't disagree with the
 * colour mode restored from storage.
 */
export default function ThemeToggle(): React.ReactNode {
  const isBrowser = useIsBrowser();
  const {colorMode, setColorMode} = useColorMode();

  const modes = [
    {value: 'light', label: 'Light theme', icon: <SunIcon />},
    {value: 'dark', label: 'Dark theme', icon: <MoonIcon />},
  ] as const;

  return (
    <div className={styles.toggle} role="group" aria-label="Colour theme">
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          className={clsx(
            styles.option,
            isBrowser && colorMode === mode.value && styles.selected,
          )}
          aria-pressed={isBrowser ? colorMode === mode.value : undefined}
          aria-label={mode.label}
          title={mode.label}
          disabled={!isBrowser}
          onClick={() => setColorMode(mode.value)}>
          {mode.icon}
        </button>
      ))}
    </div>
  );
}

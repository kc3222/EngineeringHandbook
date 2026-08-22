import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import DefaultAdmonitionTypes from '@theme-original/Admonition/Types';
import AdmonitionLayout from '@theme/Admonition/Layout';
import type {Props} from '@theme/Admonition';

/**
 * Wrapper swizzle that adds one admonition type the theme doesn't ship:
 * `:::problem`, used on the worked-example pages to set a problem statement
 * apart from the prose around it.
 *
 * This is the documented extension point for custom admonitions — the type must
 * ALSO be registered as a keyword in `docusaurus.config.ts` (`docs.admonitions`),
 * or remark never produces the node and the block renders as a literal `:::`.
 *
 * `AdmonitionLayout` stamps `theme-admonition-problem` on the container from
 * `props.type`, which is the hook the "Reading surface" section of
 * `src/css/custom.css` styles against.
 */
function IconProblem(props: React.ComponentProps<'svg'>): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} {...props}>
      <path
        fillRule="evenodd"
        d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm5.3-2.2a2.7 2.7 0 0 1 5.3.7c0 1.1-.7 1.7-1.3 2.1-.5.4-.8.6-.8 1.1v.3H7v-.4c0-1.2.7-1.8 1.3-2.2.5-.4.8-.6.8-1a1.2 1.2 0 0 0-2.4-.2l-1.4-.4zM8 12.3a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
      />
    </svg>
  );
}

function AdmonitionTypeProblem(props: Props): ReactNode {
  return (
    <AdmonitionLayout
      icon={<IconProblem />}
      title="Problem"
      {...props}
      className={clsx('alert', 'alert--secondary', props.className)}>
      {props.children}
    </AdmonitionLayout>
  );
}

export default {
  ...DefaultAdmonitionTypes,
  problem: AdmonitionTypeProblem,
};

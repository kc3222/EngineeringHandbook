import React from 'react';

import AreaLanding from '@site/src/components/AreaLanding';
import {getArea} from '@site/src/data/handbook';

// Area I is the site's front page until a dedicated handbook home exists.
export default function Home(): React.ReactNode {
  return <AreaLanding area={getArea('frontend')} />;
}

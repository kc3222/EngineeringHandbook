import React from 'react';

import AreaLanding from '@site/src/components/AreaLanding';
import {getArea} from '@site/src/data/handbook';

export default function AiArea(): React.ReactNode {
  return <AreaLanding area={getArea('ai')} />;
}

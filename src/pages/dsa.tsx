import React from 'react';

import TrackLanding from '@site/src/components/TrackLanding';
import {getTrack} from '@site/src/data/handbook';

export default function DsaTrack(): React.ReactNode {
  return <TrackLanding track={getTrack('dsa')} />;
}

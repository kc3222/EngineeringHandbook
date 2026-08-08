import React from 'react';

import TrackLanding from '@site/src/components/TrackLanding';
import {getTrack} from '@site/src/data/handbook';

export default function BackendTrack(): React.ReactNode {
  return <TrackLanding track={getTrack('backend')} />;
}

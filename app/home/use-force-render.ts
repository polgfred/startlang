import { useState } from 'react';

export function useForceRender() {
  const [, setTick] = useState(0);
  return () => setTick((tick) => tick + 1);
}

'use client';

import HomeDesktop from './desktop/home.jsx';
import HomeWeb from './web/home.jsx';

export default function Home() {
  if (typeof window !== 'undefined' && window.startlangDesktop?.isDesktop) {
    return <HomeDesktop />;
  }
  return <HomeWeb />;
}

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function ScrollRestorer() {
  const pathname = usePathname();
  const { scrollPositions, setScrollPositions } = useApp();
  const containerRef = useRef(null);

  // Find scroll container (.content-scroll) in DOM on mount
  useEffect(() => {
    const container = document.querySelector('.content-scroll');
    if (!container) return;
    containerRef.current = container;

    // Restore scroll position for current pathname
    const savedScrollPos = scrollPositions[pathname] || 0;
    container.scrollTop = savedScrollPos;

    // Listen to scroll events to save scroll position
    const handleScroll = () => {
      setScrollPositions(prev => ({
        ...prev,
        [pathname]: container.scrollTop
      }));
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [pathname, setScrollPositions, scrollPositions]);

  return null;
}

import { useState, useEffect, useCallback, useRef } from 'react';

export const useScrollHeader = () => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateVisibility = useCallback(() => {
    const currentScrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const isAtBottom = currentScrollY + windowHeight >= documentHeight - 10;
    
    // Show header if scrolling up or at bottom
    if (currentScrollY < lastScrollY.current || isAtBottom) {
      setIsVisible(true);
    } 
    // Hide header if scrolling down
    else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
      setIsVisible(false);
    }
    
    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, []);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(updateVisibility);
      ticking.current = true;
    }
  }, [updateVisibility]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return isVisible;
};

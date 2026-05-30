import { useEffect, useRef } from 'react';

export function useIntersectionObserver(
  onIntersect: () => void,
  options?: IntersectionObserverInit,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        onIntersect();
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [onIntersect, options]);

  return ref;
}

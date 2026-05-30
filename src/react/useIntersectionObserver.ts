import { useEffect, useRef } from 'react';

export function useIntersectionObserver(
  onIntersect: () => void,
  options?: IntersectionObserverInit,
) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onIntersect);

  const root = options?.root;
  const rootMargin = options?.rootMargin;
  const threshold = options?.threshold;

  useEffect(() => {
    callbackRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const initOptions: IntersectionObserverInit = {};
    if (root !== undefined) initOptions.root = root;
    if (rootMargin !== undefined) initOptions.rootMargin = rootMargin;
    if (threshold !== undefined) initOptions.threshold = threshold;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        callbackRef.current();
      }
    }, initOptions);

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [root, rootMargin, threshold]);

  return ref;
}

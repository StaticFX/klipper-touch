import { useEffect, useRef, useCallback } from "react";

export function useIntersectionObserver(
  onIntersect: () => void,
  options?: { rootMargin?: string },
) {
  const ref = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting) {
        onIntersect();
      }
    },
    [onIntersect]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: options?.rootMargin ?? "200px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect, options?.rootMargin]);

  return ref;
}

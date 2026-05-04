import { useEffect, useRef, useState } from 'react';

/**
 * useInView — IntersectionObserver-backed visibility hook.
 *
 * Usage:
 *   const { ref, inView } = useInView({ rootMargin: '200px' });
 *   <section ref={ref}>
 *     {inView && <HeavyComponent />}
 *   </section>
 *
 * Once `inView` flips true it stays true — matches the "defer work until
 * scrolled near" pattern the audit's Sprint 2 prescribes. Wrap the return
 * value into a data hook to skip its fetch:
 *
 *   function useInjuriesLazy(ref) {
 *     const { inView } = useInView(ref, { rootMargin: '400px' });
 *     return useInjuries({ enabled: inView });
 *   }
 *
 * Options:
 *   rootMargin  — how far before entering the viewport to trigger.
 *                 Default '200px' so the fetch fires just before a
 *                 section scrolls in, hiding most of the latency.
 *   threshold   — fraction of the element that must be visible.
 *                 Default 0 (any pixel).
 *   once        — keep true after first trigger (default true). Set
 *                 false to toggle off when scrolled away (rarely useful).
 *
 * SSR-safe: returns `{ ref, inView: false }` during prerender;
 * re-evaluates on client hydrate via the effect.
 */
export function useInView({ rootMargin = '200px', threshold = 0, once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Guard for very old browsers / JSDOM test envs.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}

export default useInView;

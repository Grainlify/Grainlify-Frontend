import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { SupportContext } from './supportContext';

export { useSupport, SUPPORT_TRIGGER_LABEL } from './supportContext';

const loadSupportDialog = () => import('./SupportDialog');
const SupportDialog = lazy(loadSupportDialog);

export function SupportProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetched once the page has settled rather than on click, so opening the
  // dialog is instant; never on the path to first paint. See SupportDialog.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const start = () => { void loadSupportDialog(); };
    if (w.requestIdleCallback) w.requestIdleCallback(start);
    else setTimeout(start, 2000);
  }, []);

  return (
    <SupportContext.Provider value={{ open: () => setIsOpen(true) }}>
      {children}

      {isOpen && (
        <Suspense fallback={null}>
          <SupportDialog onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </SupportContext.Provider>
  );
}

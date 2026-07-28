import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AdminPageMeta {
  /** The active page's one-line summary, e.g. "32 avis · 2 brouillons". */
  kicker?: string;
  setKicker: (kicker?: string) => void;
}

const AdminPageMetaContext = createContext<AdminPageMeta>({
  kicker: undefined,
  setKicker: () => {},
});

/**
 * Lets an admin page hand its subtitle to the shell. On mobile the top bar is
 * the page header (design 8b): it shows the section name over the page's own
 * summary, so the page itself drops its title block rather than repeating it.
 * The section name itself is never overridden — an editor keeps its own
 * breadcrumb instead, so the two form pages read the same way.
 */
export function AdminPageMetaProvider({ children }: { children: ReactNode }) {
  const [kicker, setKicker] = useState<string>();
  const value = useMemo(() => ({ kicker, setKicker }), [kicker]);
  return (
    <AdminPageMetaContext.Provider value={value}>{children}</AdminPageMetaContext.Provider>
  );
}

/** Publish this page's subtitle to the shell; cleared when the page unmounts. */
export function useAdminPageKicker(kicker: string) {
  const { setKicker } = useContext(AdminPageMetaContext);
  // useCallback keeps the effect keyed on the text alone, not on the setter.
  const publish = useCallback(setKicker, [setKicker]);
  useEffect(() => {
    publish(kicker);
    return () => publish(undefined);
  }, [publish, kicker]);
}

/** The active page's subtitle, if it published one. */
export function useAdminKicker(): string | undefined {
  return useContext(AdminPageMetaContext).kicker;
}

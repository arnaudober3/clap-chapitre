/**
 * Which medium the rail should look selected on, when the URL alone cannot say.
 *
 * On `/article/:id` no feed route matches, so the rail would lose its selection.
 * The header used to work it out by resolving the avis itself — fine while the
 * data was a synchronous import, unthinkable now: the header is mounted on every
 * page of the site, and giving it a fetch would put a request behind every
 * navigation just to underline a word.
 *
 * So the page that already has the avis says what it is, and the header listens.
 * The selection lights up when the data lands, which is also when the article
 * itself appears — there is nothing to highlight before that.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Medium } from '../../../shared/content';

interface ActiveMediumValue {
  medium?: Medium;
  setMedium(medium: Medium | undefined): void;
}

const ActiveMediumContext = createContext<ActiveMediumValue>({
  medium: undefined,
  setMedium: () => {},
});

export function ActiveMediumProvider({ children }: { children: ReactNode }) {
  const [medium, setMedium] = useState<Medium>();
  const value = useMemo(() => ({ medium, setMedium }), [medium]);
  return <ActiveMediumContext.Provider value={value}>{children}</ActiveMediumContext.Provider>;
}

/** Read by the header alone. */
export function useActiveMedium(): Medium | undefined {
  return useContext(ActiveMediumContext).medium;
}

/**
 * Publish the medium of whatever the page is showing, and clear it on the way
 * out — otherwise leaving an avis for a standalone page would leave the rail
 * pointing at the medium of the avis before it.
 */
export function useSetActiveMedium(medium: Medium | undefined): void {
  const { setMedium } = useContext(ActiveMediumContext);
  useEffect(() => {
    setMedium(medium);
    return () => setMedium(undefined);
  }, [medium, setMedium]);
}

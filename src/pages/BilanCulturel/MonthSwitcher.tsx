import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { MonthlyBilan } from "../../../shared/content";
import styles from "./BilanCulturel.module.css";

/** Below this width the switcher is a single non-scrolling line; at/above it, pills wrap. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Bilan culturel header: eyebrow, active month as an H1 (▾ caret), then a
 * pill row of the other months plus an always-visible "Tous les bilans →"
 * link ("Tous →" on mobile). The active month never gets a pill.
 */
export default function MonthSwitcher({
  active,
  months,
}: {
  active: MonthlyBilan;
  months: MonthlyBilan[];
}) {
  const others = months.filter((bilan) => bilan.id !== active.id);
  const pillsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = pillsRef.current;
    if (!container) return;

    const fit = () => {
      const nodes = Array.from(container.children) as HTMLElement[];
      if (nodes.length === 0) return;
      // The last child is the always-visible "Tous" link; the rest are months.
      const tous = nodes[nodes.length - 1];
      const pills = nodes.slice(0, -1);

      // Reset so every pill is measurable in this pass.
      tous.style.display = "";
      for (const pill of pills) pill.style.display = "";

      // Desktop wraps to multiple rows — keep all pills shown.
      if (
        typeof window.matchMedia === "function" &&
        window.matchMedia(DESKTOP_QUERY).matches
      ) {
        return;
      }

      const available = container.clientWidth;
      // No reliable measurement (jsdom, hidden container) — leave all shown.
      if (available === 0) return;

      const style = window.getComputedStyle(container);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      // Reserve room for the trailing "Tous" link (and the gap before it).
      const budget = available - tous.offsetWidth - gap;

      let used = 0;
      let overflowing = false;
      pills.forEach((pill, index) => {
        if (overflowing) {
          pill.style.display = "none";
          return;
        }
        const next = used + (index === 0 ? 0 : gap) + pill.offsetWidth;
        if (next <= budget) {
          used = next;
        } else {
          overflowing = true;
          pill.style.display = "none";
        }
      });
    };

    fit();

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(fit);
      observer.observe(container);
    }
    window.addEventListener("resize", fit);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [active.id, months]);

  return (
    <header className={styles.header}>
      <p className={styles.eyebrow}>Bilan culturel</p>
      <h1 className={styles.headerTitle}>
        {active.monthLabel} {active.year}
      </h1>
      <div className={styles.switcher}>
        <span className={styles.switcherLabel}>Mois précédents</span>
        <div className={styles.pills} ref={pillsRef}>
          {others.map((bilan) => (
            <Link
              key={bilan.id}
              to={`/bilan-culturel?mois=${bilan.id}`}
              className={styles.pill}
            >
              {bilan.monthLabel} {bilan.year}
            </Link>
          ))}
          <Link to="/bilan-culturel/archives" className={styles.allBilans}>
            <span className={styles.allBilansFull}>Tous les bilans</span>
            <span className={styles.allBilansShort}>Tous</span> →
          </Link>
        </div>
      </div>
    </header>
  );
}

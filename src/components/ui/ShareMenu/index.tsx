import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiSend } from '../../../api/client';
import {
  COPY_LINK_ICON,
  SHARE_CHANNELS,
  absoluteUrl,
  type ShareChannel,
  type ShareTarget,
} from '../../../share';
import styles from './ShareMenu.module.css';

/**
 * Records a click on a share destination. Fire-and-forget: the actual share
 * (a navigation, a clipboard write) never waits on this, and a failure here
 * — offline, a misconfigured deployment — must not stop the reader from
 * sharing the page.
 */
function recordShare(targetType: 'article' | 'bilan', targetId: string, channel: ShareChannel | 'copy'): void {
  void apiSend('/api/shares', 'POST', { targetType, targetId, channel }).catch(() => {});
}

/** How long "Lien copié" stays up before the menu closes itself. */
const COPIED_MS = 1200;

/** One 0 0 24 24 mark, in currentColor. Decorative — the label names the entry. */
function Icon({ path }: { path: string }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

export interface ShareMenuProps {
  /** What the shared link is called — an avis title, a bilan's month. */
  title: string;
  /** Optional teaser used as the email body. */
  excerpt?: string;
  /** What is being shared, for the share tracking endpoint. */
  targetType: 'article' | 'bilan';
  targetId: string;
  /**
   * In-app path to share, when the current location is not the canonical one —
   * `/bilan-culturel` shares as `/bilan-culturel?mois=<id>` so the link keeps
   * pointing at that month once a newer bilan is out. Defaults to the current
   * location.
   */
  path?: string;
  /** Class for the trigger — each page keeps its own pill styling. */
  triggerClassName?: string;
  /**
   * Which way the panel opens. 'top' for a trigger sitting at the end of a
   * block (the avis social bar), 'bottom' when there is room below.
   */
  placement?: 'top' | 'bottom';
  'data-testid'?: string;
}

/**
 * The "Partager" dropdown: a trigger that opens a small menu of share
 * destinations, closing on outside click, on Escape and on pick. Each channel
 * is a real <a> to an intent URL from `src/share.ts` — nothing is fetched, no
 * window is opened by script, so pop-up blockers have nothing to block.
 *
 * "Copier le lien" leads, and is the one entry that always shows: content
 * blockers hide share links by their href (facebook.com/sharer, wa.me are
 * common targets), so a reader running one still has a way to share.
 *
 * The shared URL comes from the router's own location, not from
 * `window.location`, so it stays right under any router.
 */
export default function ShareMenu({
  title,
  excerpt,
  targetType,
  targetId,
  path,
  triggerClassName,
  placement = 'bottom',
  'data-testid': testId,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { pathname, search } = useLocation();

  const target: ShareTarget = {
    url: absoluteUrl(path ?? `${pathname}${search}`),
    title,
    excerpt,
  };

  // Close on outside click or Escape, returning focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Let the confirmation be read, then close. Cleared on unmount so a menu
  // dismissed early never calls setState on a gone component.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  /** Copy the URL. Only a resolved write flips the label — no false "Copié". */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(target.url);
      setCopied(true);
      recordShare(targetType, targetId, 'copy');
    } catch {
      // Clipboard denied or unavailable: the menu stays open on its other
      // entries rather than claiming a copy that did not happen.
    }
  }

  return (
    <div className={styles.share} ref={menuRef} data-testid={testId}>
      <button
        type="button"
        ref={triggerRef}
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Partager
      </button>
      {open && (
        <ul
          className={
            placement === 'top' ? `${styles.menu} ${styles.menuTop}` : styles.menu
          }
          role="menu"
          aria-label="Partager"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className={styles.entry}
              onClick={copyLink}
            >
              <Icon path={COPY_LINK_ICON} />
              {copied ? 'Lien copié' : 'Copier le lien'}
            </button>
          </li>
          {SHARE_CHANNELS.map((entry) => (
            <li key={entry.channel} role="none">
              <a
                role="menuitem"
                className={styles.entry}
                href={entry.href(target)}
                {...(entry.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                onClick={() => {
                  recordShare(targetType, targetId, entry.channel);
                  setOpen(false);
                }}
              >
                <Icon path={entry.icon} />
                {entry.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import {
  EDITOR_EMAIL,
  HIGHLIGHTS_IN_EMAIL,
  defaultNewsletterSource,
  isPlausibleEmail,
  proposedSlotFor,
  slotLabel,
  editionFor,
  editionLabel,
  newsletterSourceById,
  newsletterSources,
  recentSends,
  sourceLabel,
  subscriberStats,
} from '../mock/newsletter';
import { newsletter } from '../mock/dashboard';
import { ofMonth, signedNumber } from '../format';
import { MEDIUM_CHIP_LABEL } from '../media';

describe('AN-1 newsletter mock', () => {
  it('elides "de" before a vowel month', () => {
    expect(ofMonth('Juin')).toBe('de juin');
    expect(ofMonth('Août')).toBe('d’août');
    expect(ofMonth('Avril')).toBe('d’avril');
    expect(ofMonth('Octobre')).toBe('d’octobre');
  });

  it('only offers bilans that carry their coups de cœur, newest first', () => {
    const sources = newsletterSources();
    expect(sources.length).toBeGreaterThan(0);
    for (const bilan of sources) {
      expect(bilan.avis.length).toBeGreaterThan(0);
      expect(bilan.status).toBe('published');
    }
    const dates = sources.map((bilan) => bilan.publishedAt);
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
  });

  it('opens on the most recent mailable month', () => {
    expect(defaultNewsletterSource()).toBe(newsletterSources()[0]);
  });

  it('falls back to the default month for an unknown or archive-only id', () => {
    // 2026-03 exists in the admin catalogue but carries no avis.
    expect(newsletterSourceById('2026-03')).toBe(defaultNewsletterSource());
    expect(newsletterSourceById('nope')).toBe(defaultNewsletterSource());
    const other = newsletterSources()[1];
    expect(newsletterSourceById(other.id)).toBe(other);
  });

  it('builds the edition from the bilan', () => {
    const bilan = defaultNewsletterSource();
    const edition = editionFor(bilan);

    expect(edition.id).toBe(bilan.id);
    expect(edition.title).toBe(bilan.title);
    expect(edition.mood).toBe(bilan.mood ?? '');
    expect(edition.eyebrow).toBe(
      `Le courrier du mois · ${bilan.monthLabel} ${bilan.year}`,
    );
    expect(edition.subject).toBe(`Clap et chapitre — ${bilan.title}`);
    expect(edition.highlights.length).toBeLessThanOrEqual(HIGHLIGHTS_IN_EMAIL);
  });

  it('teases the first coups de cœur, each labelled by its medium', () => {
    const bilan = defaultNewsletterSource();
    const edition = editionFor(bilan);

    edition.highlights.forEach((highlight, index) => {
      const avis = bilan.avis[index];
      expect(highlight.id).toBe(avis.id);
      expect(highlight.title).toBe(avis.title);
      expect(highlight.cover).toBe(avis.cover);
      expect(highlight.hook).toBe(avis.hook ?? avis.excerpt);
      expect(highlight.label).toBe(`${MEDIUM_CHIP_LABEL[avis.medium]} · coup de cœur`);
    });
  });

  it('names the source and the edition the way the design reads them', () => {
    const bilan = defaultNewsletterSource();
    expect(sourceLabel(bilan)).toBe(`Bilan — ${bilan.monthLabel} ${bilan.year}`);
    expect(editionLabel(bilan)).toBe(`${ofMonth(bilan.monthLabel)} ${bilan.year}`);
  });

  it('takes the past sends titles from the bilan catalogue', () => {
    const sends = recentSends();
    expect(sends.length).toBeGreaterThan(0);
    for (const send of sends) {
      expect(send.title).toMatch(/^Bilan d[e’]/);
      expect(send.openRatePct).toBeGreaterThan(0);
    }
  });

  it('exposes the audience figures of the design', () => {
    const stats = subscriberStats();
    expect(stats.total).toBe(1284);
    expect(stats.monthDelta).toBe(38);
    expect(stats.openRatePct).toBe(61);
  });

  it('keeps the dashboard CTA telling the same story as the page', () => {
    const status = newsletter();
    expect(status.subscribers).toBe(subscriberStats().total);
    expect(status.edition).toBe(
      `Newsletter ${ofMonth(defaultNewsletterSource().monthLabel)}`,
    );
  });

  it('proposes the morning after the bilan went online', () => {
    for (const bilan of newsletterSources()) {
      const slot = proposedSlotFor(bilan);
      expect(slot.time).toBe('09:00');
      expect(slot.date > bilan.publishedAt).toBe(true);
      // The very next day, month rollovers included.
      const [y, m, d] = slot.date.split('-').map(Number);
      const eve = new Date(y, m - 1, d - 1);
      expect(
        [
          eve.getFullYear(),
          String(eve.getMonth() + 1).padStart(2, '0'),
          String(eve.getDate()).padStart(2, '0'),
        ].join('-'),
      ).toBe(bilan.publishedAt);
    }
  });

  it('spells a slot out in French', () => {
    expect(slotLabel({ date: '2026-07-03', time: '09:00' })).toBe('3 juil. 2026 à 09:00');
  });

  it('catches the obvious address typo without policing RFC 5322', () => {
    expect(isPlausibleEmail(EDITOR_EMAIL)).toBe(true);
    expect(isPlausibleEmail('  relecture@exemple.fr  ')).toBe(true);
    expect(isPlausibleEmail('marie-zoe')).toBe(false);
    expect(isPlausibleEmail('marie-zoe@localhost')).toBe(false);
    expect(isPlausibleEmail('')).toBe(false);
    expect(isPlausibleEmail('a b@exemple.fr')).toBe(false);
  });

  it('signs a monthly delta in both directions', () => {
    expect(signedNumber(38)).toBe('+38');
    expect(signedNumber(0)).toBe('0');
    expect(signedNumber(-12)).toBe('-12');
    expect(signedNumber(-1284)).toBe('-1 284');
  });
});

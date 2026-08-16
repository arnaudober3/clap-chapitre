import { describe, it, expect } from 'vitest';
import {
  EDITOR_EMAIL,
  HIGHLIGHTS_IN_EMAIL,
  editionFor,
  editionLabel,
  instantLabel,
  proposedSlotFor,
  slotLabel,
  sourceLabel,
} from '../newsletter';
import { isPlausibleEmail } from '../validation';
import { ofMonth } from '../format';
import { MEDIUM_CHIP_LABEL } from '../media';
import { aBilan, anArticle } from './fixtures';

describe('AN-1 newsletter helpers', () => {
  it('builds the edition from the bilan', () => {
    const bilan = aBilan();
    const edition = editionFor(bilan);

    expect(edition.id).toBe(bilan.id);
    expect(edition.title).toBe(bilan.title);
    expect(edition.mood).toBe(bilan.mood ?? '');
    expect(edition.eyebrow).toBe(`Le courrier du mois · ${bilan.monthLabel} ${bilan.year}`);
    expect(edition.subject).toBe(`Clap et chapitre — ${bilan.title}`);
    expect(edition.highlights.length).toBeLessThanOrEqual(HIGHLIGHTS_IN_EMAIL);
  });

  it('reads an empty mood as an empty string, not undefined text', () => {
    const edition = editionFor(aBilan({ mood: undefined }));
    expect(edition.mood).toBe('');
  });

  it('teases the first coups de cœur, each labelled by its medium', () => {
    const bilan = aBilan({
      avis: [anArticle(), anArticle({ id: 'l-annee-de-la-pluie', medium: 'livre', title: 'L’année de la pluie' })],
    });
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

  it('caps the teaser at HIGHLIGHTS_IN_EMAIL even with a longer selection', () => {
    const bilan = aBilan({
      avis: [
        anArticle({ id: 'un' }),
        anArticle({ id: 'deux' }),
        anArticle({ id: 'trois' }),
      ],
    });
    expect(editionFor(bilan).highlights).toHaveLength(HIGHLIGHTS_IN_EMAIL);
  });

  it('falls back to the excerpt when an avis carries no hook', () => {
    const bilan = aBilan({ avis: [anArticle({ hook: undefined })] });
    expect(editionFor(bilan).highlights[0].hook).toBe(bilan.avis[0].excerpt);
  });

  it('names the source and the edition the way the design reads them', () => {
    const bilan = aBilan();
    expect(sourceLabel(bilan)).toBe(`Bilan — ${bilan.monthLabel} ${bilan.year}`);
    expect(editionLabel(bilan)).toBe(`${ofMonth(bilan.monthLabel)} ${bilan.year}`);
  });

  it('proposes the morning after a published bilan went online', () => {
    const bilan = aBilan({ publishedAt: '2026-08-02' });
    const slot = proposedSlotFor(bilan);
    expect(slot).toEqual({ date: '2026-08-03', time: '09:00' });
  });

  it('rolls over the month and the year at their boundaries', () => {
    expect(proposedSlotFor(aBilan({ publishedAt: '2026-01-31' })).date).toBe('2026-02-01');
    expect(proposedSlotFor(aBilan({ publishedAt: '2026-12-31' })).date).toBe('2027-01-01');
  });

  it('spells a slot out in French', () => {
    expect(slotLabel({ date: '2026-07-03', time: '09:00' })).toBe('3 juil. 2026 à 09:00');
  });

  it('reads a stored UTC instant back as its Paris-local French wording', () => {
    // July: Paris sits at UTC+2, so 07:00 UTC is 09:00 locally.
    expect(instantLabel('2026-07-03 07:00:00')).toBe('3 juil. 2026 à 09:00');
    // January: UTC+1, so 08:00 UTC is 09:00 locally.
    expect(instantLabel('2026-01-15 08:00:00')).toBe('15 janv. 2026 à 09:00');
  });

  it('catches the obvious address typo without policing RFC 5322', () => {
    expect(isPlausibleEmail(EDITOR_EMAIL)).toBe(true);
    expect(isPlausibleEmail('  relecture@exemple.fr  ')).toBe(true);
    expect(isPlausibleEmail('marie-zoe')).toBe(false);
    expect(isPlausibleEmail('marie-zoe@localhost')).toBe(false);
    expect(isPlausibleEmail('')).toBe(false);
    expect(isPlausibleEmail('a b@exemple.fr')).toBe(false);
  });
});

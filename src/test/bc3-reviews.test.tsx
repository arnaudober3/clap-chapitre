import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BilanReview from '../pages/BilanCulturel/BilanReview';
import MediumSections from '../pages/BilanCulturel/MediumSections';
import type { PublishedArticle } from '../mock/types';
import type { MonthlyBilan } from '../mock/bilans';

const full: PublishedArticle = {
  id: 'r-full',
  title: 'La lumière du Nord',
  medium: 'film',
  excerpt: 'Un drame glacé.',
  cover: 'linear-gradient(150deg,#d18a5a,#9a4d2c)',
  date: '27 juin 2026',
  author: 'Marie-Zoé',
  likes: 88,
  comments: 15,
  status: 'published',
  publishedAt: '2026-06-12',
  views: 420,
  hook: 'Peut-on se réchauffer à une lumière qui vient du froid ?',
  forThoseWho: 'Pour ceux qui aiment les drames lumineux.',
  body: 'Premier paragraphe du corps.\n\nDeuxième paragraphe du corps.',
  relatedTo: { title: 'Un dernier été', note: 'Même goût pour les silences.' },
};

const minimal: PublishedArticle = {
  id: 'r-min',
  title: 'Marges',
  medium: 'livre',
  excerpt: 'Un recueil.',
  cover: 'linear-gradient(150deg,#7a8c5a,#4f6138)',
  date: '17 mai 2026',
  author: 'Marie-Zoé',
  likes: 49,
  comments: 6,
  status: 'published',
  publishedAt: '2026-06-12',
  views: 420,
};

describe('BC-3 BilanReview', () => {
  it('renders title, hook, each body paragraph, the relatedTo note, and forThoseWho', () => {
    render(<BilanReview item={full} />);
    // Title appears (cover overlay + H2); at least one is the heading.
    expect(
      screen.getByRole('heading', { name: 'La lumière du Nord' }),
    ).toBeInTheDocument();
    expect(screen.getByText(full.hook!)).toBeInTheDocument();
    expect(screen.getByText('Premier paragraphe du corps.')).toBeInTheDocument();
    expect(screen.getByText('Deuxième paragraphe du corps.')).toBeInTheDocument();
    expect(screen.getByText('À rapprocher de')).toBeInTheDocument();
    expect(screen.getByText('Un dernier été')).toBeInTheDocument();
    expect(screen.getByText(full.relatedTo!.note)).toBeInTheDocument();
    expect(screen.getByText(full.forThoseWho!)).toBeInTheDocument();
  });

  it('with only required fields renders the title + medium label and omits optionals without throwing', () => {
    expect(() => render(<BilanReview item={minimal} />)).not.toThrow();
    expect(
      screen.getByRole('heading', { name: 'Marges' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Livre')).toBeInTheDocument();
    expect(screen.queryByText('À rapprocher de')).not.toBeInTheDocument();
    expect(screen.queryByText(/Pour ceux qui/)).not.toBeInTheDocument();
  });
});

describe('BC-3 MediumSections', () => {
  it('renders only the media that have avis, in Films -> Séries -> Livres -> Docs order', () => {
    const bilan: MonthlyBilan = {
      id: '2026-06',
      year: 2026,
      month: 6,
      monthLabel: 'Juin',
      avis: [minimal, full], // livre + film -> should render Films then Livres
    };
    render(<MediumSections bilan={bilan} />);
    const headers = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    const sectionHeaders = headers.filter((t) =>
      ['Films', 'Séries', 'Livres', 'Docs'].includes(t ?? ''),
    );
    expect(sectionHeaders).toEqual(['Films', 'Livres']);
    expect(screen.queryByRole('heading', { name: 'Séries' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Docs' })).not.toBeInTheDocument();
  });

  it('renders the humeur block when a mood is present and omits it otherwise', () => {
    const withMood: MonthlyBilan = {
      id: '2026-06',
      year: 2026,
      month: 6,
      monthLabel: 'Juin',
      mood: 'Un mois de lumière rasante.',
      avis: [full],
    };
    const { unmount } = render(<MediumSections bilan={withMood} />);
    expect(screen.getByText('L’humeur du mois')).toBeInTheDocument();
    expect(screen.getByText('Un mois de lumière rasante.')).toBeInTheDocument();
    unmount();

    const noMood: MonthlyBilan = {
      id: '2026-05',
      year: 2026,
      month: 5,
      monthLabel: 'Mai',
      avis: [full],
    };
    render(<MediumSections bilan={noMood} />);
    expect(screen.queryByText('L’humeur du mois')).not.toBeInTheDocument();
  });
});

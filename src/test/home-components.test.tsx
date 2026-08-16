import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PublishedArticle } from '../../shared/content';
import Hero from '../pages/Home/Hero';
import RecentAvisGrid from '../pages/Home/RecentAvisGrid.tsx';
import Newsletter from '../pages/Home/Newsletter';

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const base: PublishedArticle = {
  id: 'un-dernier-ete',
  title: 'Un dernier été',
  medium: 'film',
  excerpt: 'Un huis clos solaire où chaque silence pèse.',
  cover: 'linear-gradient(150deg,#c56a3f,#8f3f24)',
  date: '18 juillet 2026',
  author: 'Marie-Zoé',
  likes: 128,
  comments: 24,
  status: 'published',
  publishedAt: '2026-06-12',
  views: 420,
};

describe('HM-2 Hero', () => {
  it('renders title, hook, the callout and the Lire l’avis link when hook+forThoseWho are present', () => {
    const item: PublishedArticle = {
      ...base,
      hook: 'Et si l’été n’était pas le dernier ?',
      forThoseWho: 'Pour ceux qui aiment les fins ouvertes.',
    };
    wrap(<Hero item={item} />);
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).getByText('Un dernier été')).toBeInTheDocument();
    expect(
      within(hero).getByText('Et si l’été n’était pas le dernier ?'),
    ).toBeInTheDocument();
    expect(
      within(hero).getByText(/Pour ceux qui aiment les fins ouvertes/),
    ).toBeInTheDocument();
    const link = within(hero).getByRole('link', { name: /Lire l’avis/ });
    expect(link).toHaveAttribute('href', '/article/un-dernier-ete');
  });

  it('omits hook and callout without throwing when they are absent, still showing title/excerpt/counts', () => {
    wrap(<Hero item={base} />);
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).getByText('Un dernier été')).toBeInTheDocument();
    expect(within(hero).getByText(/Un huis clos solaire/)).toBeInTheDocument();
    expect(within(hero).getByText(/128/)).toBeInTheDocument();
    expect(within(hero).getByText(/24 commentaires/)).toBeInTheDocument();
    expect(within(hero).queryByText(/Pour ceux qui/)).not.toBeInTheDocument();
  });
});

describe('HM-3 RecentGrid', () => {
  const three: PublishedArticle[] = [
    { ...base, id: 'a', title: 'Titre A' },
    { ...base, id: 'b', title: 'Titre B', medium: 'livre' },
    { ...base, id: 'c', title: 'Titre C', medium: 'serie' },
  ];

  it('renders one card per item, each linking to /article/<id>', () => {
    wrap(<RecentAvisGrid items={three} />);
    for (const item of three) {
      const link = screen.getByRole('link', { name: new RegExp(item.title) });
      expect(link).toHaveAttribute('href', `/article/${item.id}`);
    }
    // section header present
    expect(
      screen.getByRole('heading', { name: 'Avis récents' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tout voir' })).toBeInTheDocument();
  });

  it('shows the Salon empty state and no cards for an empty list', () => {
    wrap(<RecentAvisGrid items={[]} />);
    expect(
      screen.getByText('Aucun avis pour ce médium pour l’instant.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /article/i }),
    ).not.toBeInTheDocument();
  });
});

describe('HM-4 Newsletter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders the heading and an email input', () => {
    wrap(<Newsletter />);
    expect(
      screen.getByRole('heading', { name: 'Le courrier du mois' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse e-mail')).toHaveAttribute(
      'type',
      'email',
    );
  });

  it('submitting does not throw, does not navigate, and logs no error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const before = window.location.href;
    const user = userEvent.setup();
    wrap(<Newsletter />);
    await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b.fr');
    await user.click(screen.getByRole('button', { name: /S’abonner/ }));
    expect(window.location.href).toBe(before);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

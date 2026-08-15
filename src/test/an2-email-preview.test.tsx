import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmailPreview from '../pages/AdminNewsletter/EmailPreview';
import { editionFor } from '../newsletter';
import { aBilan } from './fixtures';

const edition = editionFor(aBilan());

function renderPreview() {
  return render(
    <MemoryRouter>
      <EmailPreview edition={edition} />
    </MemoryRouter>,
  );
}

describe('AN-2 EmailPreview', () => {
  it('renders the masthead and the edition kicker', () => {
    renderPreview();
    const preview = within(screen.getByTestId('newsletter-preview'));
    expect(preview.getByText('et')).toBeInTheDocument();
    expect(preview.getByText(edition.eyebrow)).toBeInTheDocument();
  });

  it('names the bilan it was generated from in its caption bar', () => {
    renderPreview();
    expect(
      screen.getByText(`Aperçu — généré depuis « ${edition.title} »`),
    ).toBeInTheDocument();
    // The design's "De : … · À : vous" line gave way to that caption.
    expect(screen.queryByText(/De : Clap et chapitre/)).toBeNull();
  });

  it('leads with the month headline and its humeur', () => {
    renderPreview();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(edition.title);
    expect(screen.getByText(edition.mood)).toBeInTheDocument();
  });

  it('teases each coup de cœur with its medium label, title and hook', () => {
    renderPreview();
    for (const highlight of edition.highlights) {
      expect(screen.getByText(highlight.label)).toBeInTheDocument();
      expect(screen.getByText(highlight.title)).toBeInTheDocument();
      expect(screen.getByText(highlight.hook)).toBeInTheDocument();
    }
  });

  it('draws the covers as gradient tiles, never as images', () => {
    renderPreview();
    const preview = screen.getByTestId('newsletter-preview');
    expect(within(preview).getAllByTestId('poster-thumb')).toHaveLength(
      edition.highlights.length,
    );
    expect(preview.querySelectorAll('img')).toHaveLength(0);
  });

  it('sends the reader to the month it was generated from', () => {
    renderPreview();
    expect(screen.getByRole('link', { name: /Lire le bilan complet/ })).toHaveAttribute(
      'href',
      `/bilan-culturel?mois=${edition.id}`,
    );
  });

  it('closes on the subscriber footer, which is copy rather than links', () => {
    renderPreview();
    expect(
      screen.getByText(/Vous recevez ce courrier car vous êtes abonné·e/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Se désabonner/ })).toBeNull();
  });
});

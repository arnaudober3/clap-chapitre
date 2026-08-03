import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { defaultNewsletterSource, editionLabel } from '../mock/newsletter';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

// The pages these routes render read the API, so the suite needs content.
beforeEach(() => {
  useTestDb(SEED);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AN-5 admin newsletter routing', () => {
  it('renders the newsletter inside the admin shell at /admin/newsletter', async () => {
    renderAt('/admin/newsletter');
    expect(await screen.findByTestId('admin-newsletter-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-not-found-page')).toBeNull();
    expect(screen.queryByTestId('not-found-page')).toBeNull();
  });

  it('marks the rail entry as the current section', async () => {
    renderAt('/admin/newsletter');
    const active = screen
      .getAllByRole('link', { name: 'Newsletter' })
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(active.length).toBeGreaterThan(0);
  });

  it('hands the edition month to the shell top bar for mobile', async () => {
    renderAt('/admin/newsletter');
    const header = within(screen.getByRole('banner'));
    expect(
      header.getAllByText(`Édition ${editionLabel(defaultNewsletterSource())}`).length,
    ).toBeGreaterThan(0);
  });

  it('is where the dashboard newsletter CTA leads', async () => {
    const user = userEvent.setup();
    renderAt('/admin');
    // The dashboard fetches its cards; the CTA is part of the newsletter one.
    await user.click(await screen.findByRole('link', { name: 'Envoyer' }));
    expect(await screen.findByTestId('admin-newsletter-page')).toBeInTheDocument();
  });
});

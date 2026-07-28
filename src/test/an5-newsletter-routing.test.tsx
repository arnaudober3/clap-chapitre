import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { defaultNewsletterSource, editionLabel } from '../mock/newsletter';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AN-5 admin newsletter routing', () => {
  it('renders the newsletter inside the admin shell at /admin/newsletter', () => {
    renderAt('/admin/newsletter');
    expect(screen.getByTestId('admin-newsletter-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-placeholder-page')).toBeNull();
    expect(screen.queryByTestId('not-found-page')).toBeNull();
  });

  it('marks the rail entry as the current section', () => {
    renderAt('/admin/newsletter');
    const active = screen
      .getAllByRole('link', { name: 'Newsletter' })
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(active.length).toBeGreaterThan(0);
  });

  it('hands the edition month to the shell top bar for mobile', () => {
    renderAt('/admin/newsletter');
    const header = within(screen.getByRole('banner'));
    expect(
      header.getAllByText(`Édition ${editionLabel(defaultNewsletterSource())}`).length,
    ).toBeGreaterThan(0);
  });

  it('is where the dashboard newsletter CTA leads', async () => {
    const user = userEvent.setup();
    renderAt('/admin');
    await user.click(screen.getByRole('link', { name: 'Envoyer' }));
    expect(screen.getByTestId('admin-newsletter-page')).toBeInTheDocument();
  });
});

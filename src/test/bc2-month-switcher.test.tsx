import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MonthSwitcher from '../pages/BilanCulturel/MonthSwitcher';
import { aBilanSummary } from './fixtures';

/** Three months, newest first — the switcher needs siblings to render pills. */
const bilans = [
  aBilanSummary(),
  aBilanSummary({ id: '2026-06', month: 6, monthLabel: 'Juin', title: 'Les jours longs' }),
  aBilanSummary({ id: '2026-05', month: 5, monthLabel: 'Mai', title: 'Le mois des seuils' }),
];
const latestBilan = () => bilans[0];

function renderSwitcher() {
  const active = latestBilan();
  render(
    <MemoryRouter>
      <MonthSwitcher active={active} months={bilans} />
    </MemoryRouter>,
  );
  return active;
}

describe('BC-2 MonthSwitcher', () => {
  it('renders the "<monthLabel> <year>" H1 and a "Tous les bilans" link to /bilan-culturel/archives', () => {
    const active = renderSwitcher();
    expect(bilans.length).toBeGreaterThanOrEqual(3);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(`${active.monthLabel} ${active.year}`);
    const all = screen.getByRole('link', { name: /Tous les bilans/ });
    expect(all).toHaveAttribute('href', '/bilan-culturel/archives');
  });

  it('renders one pill per OTHER month (linking to ?mois=<id>) and never the active month', () => {
    const active = renderSwitcher();
    const others = bilans.filter((b) => b.id !== active.id);
    for (const bilan of others) {
      const pill = screen.getByRole('link', {
        name: new RegExp(`${bilan.monthLabel} ${bilan.year}`),
      });
      expect(pill).toHaveAttribute('href', `/bilan-culturel?mois=${bilan.id}`);
    }
    // The active month is the H1, not a pill link.
    expect(
      screen.queryByRole('link', {
        name: new RegExp(`^${active.monthLabel} ${active.year}$`),
      }),
    ).not.toBeInTheDocument();
  });
});

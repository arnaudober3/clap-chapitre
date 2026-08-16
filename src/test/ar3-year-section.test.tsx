import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import YearSection from '../pages/BilanCulturelArchives/YearSection';
import { aBilanSummary } from './fixtures';

const months = [
  aBilanSummary(),
  aBilanSummary({ id: '2026-06', month: 6, monthLabel: 'Juin', title: 'Les jours longs' }),
];
const currentYear = { year: 2026, months };
const latestBilan = () => months[0];

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}


describe('AR-3 YearSection', () => {
  it('expanded=true renders a MonthCard per month and marks the latest with "dernier"', () => {
    wrap(
      <YearSection
        year={currentYear.year}
        months={currentYear.months}
        latestId={latestBilan().id}
        expanded
        onToggle={() => {}}
      />,
    );
    const grid = screen.getByTestId('year-grid');
    expect(within(grid).getAllByTestId('month-card')).toHaveLength(
      currentYear.months.length,
    );
    const header = screen.getByTestId('year-header');
    expect(header).toHaveAttribute('aria-expanded', 'true');

    // The month equal to latestBilan().id gets the 'dernier' pill.
    const latestCard = within(grid)
      .getAllByTestId('month-card')
      .find((c) =>
        c.getAttribute('href') === `/bilan-culturel?mois=${latestBilan().id}`,
      );
    expect(latestCard).toBeDefined();
    expect(
      within(latestCard as HTMLElement).getByTestId('dernier-pill'),
    ).toBeInTheDocument();
  });

  it('expanded=false renders the header + count but no MonthCard/grid', () => {
    wrap(
      <YearSection
        year={currentYear.year}
        months={currentYear.months}
        expanded={false}
        onToggle={() => {}}
      />,
    );
    const header = screen.getByTestId('year-header');
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(header).toHaveTextContent(`${currentYear.months.length} bilans`);
    expect(screen.queryByTestId('year-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('month-card')).not.toBeInTheDocument();
  });

  it('clicking the header calls onToggle once and toggles via keyboard', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    wrap(
      <YearSection
        year={currentYear.year}
        months={currentYear.months}
        expanded={false}
        onToggle={onToggle}
      />,
    );
    const header = screen.getByTestId('year-header');
    await user.click(header);
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Focusable and keyboard-activatable (Enter / Space).
    header.focus();
    expect(header).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onToggle).toHaveBeenCalledTimes(3);
  });
});

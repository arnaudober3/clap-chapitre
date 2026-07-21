import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import YearStats from '../pages/APropos/YearStats';
import FollowCard from '../pages/APropos/FollowCard';
import { apropos } from '../mock/apropos';

const root = resolve(__dirname, '../..');
const statsSource = readFileSync(resolve(root, 'src/pages/APropos/YearStats.tsx'), 'utf8');
const followSource = readFileSync(resolve(root, 'src/pages/APropos/FollowCard.tsx'), 'utf8');

describe('AP-3 "Cette année" stats panel', () => {
  it('renders the title and one row per stat with label and value', () => {
    render(<YearStats title={apropos.statsTitle} stats={apropos.stats} />);
    expect(screen.getByText('Cette année')).toBeInTheDocument();
    const rows = screen.getAllByTestId('year-stat-row');
    expect(rows).toHaveLength(3);
    apropos.stats.forEach((stat, index) => {
      expect(within(rows[index]).getByText(stat.label)).toBeInTheDocument();
      expect(within(rows[index]).getByText(String(stat.value))).toBeInTheDocument();
    });
  });

  it('renders a 0 value and survives an empty stats list', () => {
    const { unmount } = render(
      <YearStats title="Cette année" stats={[{ label: 'Livres', value: 0 }]} />,
    );
    const row = screen.getByTestId('year-stat-row');
    expect(within(row).getByText('0')).toBeInTheDocument();
    unmount();

    expect(() => render(<YearStats title="Cette année" stats={[]} />)).not.toThrow();
    expect(screen.getByText('Cette année')).toBeInTheDocument();
    expect(screen.queryByTestId('year-stat-row')).not.toBeInTheDocument();
  });
});

describe('AP-3 follow CTA card', () => {
  const { title, copy, cta, to } = apropos.follow;

  it('renders the title, the copy and a gold pill link to /me-suivre', () => {
    render(
      <MemoryRouter>
        <FollowCard title={title} copy={copy} cta={cta} to={to} />
      </MemoryRouter>,
    );
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(copy)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: cta });
    expect(link).toHaveAttribute('href', '/me-suivre');
    expect(link.getAttribute('href')).not.toBe('#');
  });

  it('is a react-router Link — it needs a Router context', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<FollowCard title={title} copy={copy} cta={cta} to={to} />),
    ).toThrow();
    spy.mockRestore();
    expect(followSource).toContain("from 'react-router-dom'");
    expect(followSource).toContain('<Link');
  });

  it('uses tokens only — no raw hex color literal in either component', () => {
    expect(statsSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(followSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

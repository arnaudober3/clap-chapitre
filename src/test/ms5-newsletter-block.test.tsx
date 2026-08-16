import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NewsletterBlock } from '../components/ui';
import { useTestDb } from './api-server';

const root = resolve(__dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const blockSource = read('src/components/ui/NewsletterBlock.tsx');
const uiIndex = read('src/components/ui/index.ts');
const homeNewsletter = read('src/pages/Home/Newsletter.tsx');
const meSuivreFeature = read('src/pages/MeSuivre/NewsletterFeature.tsx');
const followCard = read('src/pages/APropos/FollowCard.tsx');
const homeCss = read('src/pages/Home/Home.module.css');
const meSuivreCss = read('src/pages/MeSuivre/MeSuivre.module.css');
const aproposCss = read('src/pages/APropos/APropos.module.css');

describe('MS-5 shared NewsletterBlock', () => {
  it("variant='band' renders the copy and a real signup form", async () => {
    useTestDb();
    const user = userEvent.setup();
    const { container } = render(
      <NewsletterBlock
        variant="band"
        title="Le courrier du mois"
        copy="Une lettre par mois."
        placeholder="votre@email.fr"
        cta="S’abonner"
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Le courrier du mois' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Une lettre par mois.')).toBeInTheDocument();

    const input = screen.getByLabelText('Adresse e-mail');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'votre@email.fr');

    // The honeypot: off-screen, unreachable by a keyboard user.
    const trap = container.querySelector('input[name="website"]');
    expect(trap).toHaveAttribute('aria-hidden', 'true');
    expect(trap).toHaveAttribute('tabindex', '-1');

    const form = container.querySelector('form') as HTMLFormElement;

    await user.type(input, 'a@b.fr');
    expect((input as HTMLInputElement).value).toBe('a@b.fr');
    await user.click(screen.getByRole('button', { name: 'S’abonner' }));
    // dispatchEvent returns false exactly when preventDefault() was called —
    // the form no longer stays inert past that point, but a submit must
    // never navigate or reload regardless of what the write does next.
    expect(fireEvent.submit(form)).toBe(false);
    expect(await screen.findByText('Merci ! Vous êtes abonné·e.')).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it("variant='feature' renders the eyebrow and subscribes for real", async () => {
    useTestDb();
    const user = userEvent.setup();
    const { container } = render(
      <NewsletterBlock
        variant="feature"
        eyebrow="La newsletter"
        title="Le courrier du mois"
        copy="Le bilan complet."
        placeholder="votre@email.fr"
        cta="S’abonner"
      />,
    );
    expect(screen.getByText('La newsletter')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Le courrier du mois' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Le bilan complet.')).toBeInTheDocument();

    const form = container.querySelector('form') as HTMLFormElement;
    await user.type(screen.getByLabelText('Adresse e-mail'), 'c@d.fr');
    await user.click(screen.getByRole('button', { name: 'S’abonner' }));
    expect(fireEvent.submit(form)).toBe(false);
    expect(await screen.findByText('Merci ! Vous êtes abonné·e.')).toBeInTheDocument();
  });

  it('rejects an implausible address before any write, on either form variant', async () => {
    const user = userEvent.setup();
    render(
      <NewsletterBlock
        variant="band"
        title="Le courrier du mois"
        copy="Une lettre par mois."
        placeholder="votre@email.fr"
        cta="S’abonner"
      />,
    );
    await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b');
    await user.click(screen.getByRole('button', { name: 'S’abonner' }));
    expect(
      await screen.findByText('Cette adresse ne ressemble pas à un e-mail.'),
    ).toBeInTheDocument();
  });

  it("variant='compact' renders a router Link and no form", () => {
    const { container } = render(
      <MemoryRouter>
        <NewsletterBlock
          variant="compact"
          title="On se suit ?"
          copy="Le bilan du mois dans votre boîte mail."
          cta="Me suivre →"
          to="/me-suivre"
        />
      </MemoryRouter>,
    );
    expect(container.querySelector('form')).toBeNull();
    expect(screen.queryByLabelText('Adresse e-mail')).not.toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Me suivre →' });
    expect(link).toHaveAttribute('href', '/me-suivre');
    expect(link.getAttribute('href')).not.toBe('#');
  });

  it('emits no empty heading or paragraph when title/copy are empty', () => {
    render(
      <MemoryRouter>
        <NewsletterBlock
          variant="compact"
          title=""
          copy=""
          cta="Me suivre →"
          to="/me-suivre"
        />
      </MemoryRouter>,
    );
    // An empty <h2> would put a nameless heading in the accessibility tree.
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(document.querySelectorAll('p')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Me suivre →' })).toBeInTheDocument();
  });

  it('owns no mock data and uses tokens only', () => {
    expect(blockSource).not.toMatch(/from ['"][^'"]*mock[^'"]*['"]/);
    expect(blockSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('is exported from src/components/ui alongside the other primitives', () => {
    for (const name of [
      'NewsletterBlock',
      'CardGrid',
      'PosterThumb',
      'SectionHeader',
      'ReviewCard',
    ]) {
      expect(uiIndex).toContain(name);
    }
  });

  it('all three call sites are thin wrappers with their duplicated CSS deleted', () => {
    for (const source of [homeNewsletter, meSuivreFeature, followCard]) {
      expect(source).toContain('NewsletterBlock');
      expect(source).not.toContain('<form');
      expect(source).not.toContain('useState');
    }
    expect(homeCss).not.toContain('.newsletterInner');
    expect(homeCss).not.toContain('.newsletterButton');
    expect(meSuivreCss).not.toContain('.newsletterForm');
    expect(meSuivreCss).not.toContain('.newsletterInput');
    expect(aproposCss).not.toContain('.followCard');
    expect(aproposCss).not.toContain('.followCta');
    // The dark-card gradient now lives in exactly one place.
    for (const css of [homeCss, meSuivreCss, aproposCss]) {
      expect(css).not.toContain('var(--dark-grad)');
    }
  });
});

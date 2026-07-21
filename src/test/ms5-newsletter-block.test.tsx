import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NewsletterBlock } from '../components/ui';

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
  it("variant='band' renders the copy and an inert signup form", async () => {
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

    const form = container.querySelector('form') as HTMLFormElement;

    await user.type(input, 'a@b.fr');
    expect((input as HTMLInputElement).value).toBe('a@b.fr');
    await user.click(screen.getByRole('button', { name: 'S’abonner' }));
    // dispatchEvent returns false exactly when preventDefault() was called.
    // Probe the dispatch result, NOT a listener on the form: React 18
    // delegates at the root container, so a form-level listener runs before
    // the onSubmit handler and would always read defaultPrevented === false.
    expect(fireEvent.submit(form)).toBe(false);
    expect(screen.queryByText(/merci|erreur|succès/i)).not.toBeInTheDocument();
  });

  it("variant='feature' renders the eyebrow and the same inert form", async () => {
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
    await user.click(screen.getByRole('button', { name: 'S’abonner' }));
    expect(fireEvent.submit(form)).toBe(false);
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

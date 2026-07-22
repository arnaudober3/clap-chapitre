import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewsletterFeature from '../pages/MeSuivre/NewsletterFeature';
import { meSuivre } from '../mock/mesuivre';

const root = resolve(__dirname, '../..');
const source = readFileSync(
  resolve(root, 'src/pages/MeSuivre/NewsletterFeature.tsx'),
  'utf8',
);

const content = meSuivre.newsletter;

function renderFeature() {
  return render(<NewsletterFeature {...content} />);
}

describe('MS-2 newsletter feature', () => {
  it('renders the eyebrow, title, copy and the signu˝p form', () => {
    renderFeature();
    expect(screen.getByText(content.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(content.title)).toBeInTheDocument();
    expect(screen.getByText(content.copy)).toBeInTheDocument();

    const input = screen.getByLabelText('Adresse e-mail');
    expect(input).toHaveAttribute('placeholder', 'votre@email.fr');
    expect(screen.getByRole('button', { name: content.cta })).toBeInTheDocument();
  });

  it('is a controlled input — typing updates its value', async () => {
    const user = userEvent.setup();
    renderFeature();
    const input = screen.getByLabelText('Adresse e-mail') as HTMLInputElement;
    await user.type(input, 'marie@zoe.fr');
    expect(input.value).toBe('marie@zoe.fr');
  });

  it('stays inert: submitting is defaultPrevented and shows no success/error text', async () => {
    const user = userEvent.setup();
    const { container } = renderFeature();
    const form = container.querySelector('form') as HTMLFormElement;

    const before = container.textContent;
    await user.click(screen.getByRole('button', { name: content.cta }));

    // dispatchEvent returns false exactly when preventDefault() was called.
    // Probe the dispatch result, NOT a listener on the form: React 18
    // delegates at the root container, so a form-level listener runs before
    // the onSubmit handler and would always read defaultPrevented === false.
    expect(fireEvent.submit(form)).toBe(false);

    // Enter inside the input submits too — still inert, still nothing new.
    await user.type(screen.getByLabelText('Adresse e-mail'), '{Enter}');
    expect(fireEvent.submit(form)).toBe(false);
    expect(container.textContent).toBe(before);
    expect(screen.queryByText(/merci|erreur|succès/i)).not.toBeInTheDocument();
  });

  it('uses a real email input and submit button inside a form', () => {
    const { container } = renderFeature();
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    const input = screen.getByLabelText('Adresse e-mail');
    expect(input).toHaveAttribute('type', 'email');
    expect(form?.contains(input)).toBe(true);
    const button = screen.getByRole('button', { name: content.cta });
    expect(button).toHaveAttribute('type', 'submit');
    expect(form?.contains(button)).toBe(true);
  });

  it('uses tokens only — no raw hex colour literal in the component', () => {
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

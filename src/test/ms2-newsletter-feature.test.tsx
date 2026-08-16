import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewsletterFeature from '../pages/MeSuivre/NewsletterFeature';
import { aMeSuivre } from './fixtures';
import { useTestDb } from './api-server';

const meSuivre = aMeSuivre();

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
  it('renders the eyebrow, title, copy and the signup form', () => {
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

  describe('submitting', () => {
    beforeEach(() => {
      useTestDb();
    });

    it('rejects an implausible address without a network round trip', async () => {
      const user = userEvent.setup();
      renderFeature();

      await user.type(screen.getByLabelText('Adresse e-mail'), 'a@b');
      await user.click(screen.getByRole('button', { name: content.cta }));

      expect(
        await screen.findByText('Cette adresse ne ressemble pas à un e-mail.'),
      ).toBeInTheDocument();
    });

    it('subscribes a plausible address and shows the confirmation', async () => {
      const user = userEvent.setup();
      renderFeature();

      const input = screen.getByLabelText('Adresse e-mail') as HTMLInputElement;
      await user.type(input, 'marie@zoe.fr');
      await user.click(screen.getByRole('button', { name: content.cta }));

      expect(await screen.findByText('Merci ! Vous êtes abonné·e.')).toBeInTheDocument();
      // The field clears once the write lands, so a second address can follow.
      expect(input.value).toBe('');
    });
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

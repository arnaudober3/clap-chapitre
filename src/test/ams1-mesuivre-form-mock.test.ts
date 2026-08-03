import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { mesuivreFormValues, linkMark } from '../content/mesuivre';
import { aMeSuivre } from './fixtures';

const meSuivre = aMeSuivre();
const formValues = () => mesuivreFormValues(meSuivre);

const root = resolve(__dirname, '../..');
const source = readFileSync(resolve(root, 'src/content/mesuivre.ts'), 'utf8');

describe('AMS-1 admin Me suivre form values', () => {
  it('carries the standfirst and one row per social of the public page', () => {
    const { intro, links } = formValues();
    expect(intro).toBe(meSuivre.intro);
    expect(links.map((row) => row.name)).toEqual(
      meSuivre.socials.map((social) => social.name),
    );
    // The SocialKey is what keys the row until the editor adds one of its own.
    expect(links.map((row) => row.id)).toEqual(
      meSuivre.socials.map((social) => social.key),
    );
  });

  it('prints the URLs the way design 6g does — no scheme, no www., no trailing slash', () => {
    const { links } = formValues();
    for (const row of links) {
      expect(row.url).not.toMatch(/^https?:\/\//);
      expect(row.url).not.toMatch(/^www\./);
      expect(row.url).not.toMatch(/\/$/);
    }
    // Nothing is lost on the way in: the host and path survive.
    expect(links.map((row) => row.url)).toEqual([
      'threads.net/@mariezoe',
      'letterboxd.com/mariezoe',
      'babelio.com/monprofil.php',
      'linkedin.com/in/mariezoe',
    ]);
  });

  it('uses the designer’s chip abbreviations, and degrades for anything else', () => {
    expect(linkMark('Threads')).toBe('Th');
    expect(linkMark('Letterboxd')).toBe('Lb');
    expect(linkMark('Babelio')).toBe('Ba');
    expect(linkMark('LinkedIn')).toBe('Li');
    // The two networks 6g draws that the public page does not carry.
    expect(linkMark('Instagram')).toBe('Ig');
    expect(linkMark('YouTube')).toBe('Yt');

    // Case- and whitespace-insensitive: the name is typed by hand in the editor.
    expect(linkMark('  letterboxd ')).toBe('Lb');

    // Unknown network: first two letters. Unnamed row: the add affordance.
    expect(linkMark('Mastodon')).toBe('Ma');
    expect(linkMark('')).toBe('+');
    expect(linkMark('   ')).toBe('+');
  });

  // The editor edits this object in place through its state, so it must never
  // be a window onto the mock the public page renders.
  it('returns a fresh, detached object on every call', () => {
    const first = formValues();
    const second = formValues();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.links).not.toBe(second.links);
    expect(first.links[0]).not.toBe(second.links[0]);

    first.intro = 'modifié';
    first.links[0].url = 'exemple.fr';
    first.links.pop();
    expect(formValues().intro).toBe(second.intro);
    expect(formValues().links[0].url).toBe(second.links[0].url);
    expect(formValues().links).toHaveLength(second.links.length);
  });

  it('stays a pure data module: no React, no network, no Date/random', () => {
    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toMatch(/\burl\(/);
    expect(source).not.toMatch(/\bfetch\(|new Date\(|Math\.random\(/);
  });
});

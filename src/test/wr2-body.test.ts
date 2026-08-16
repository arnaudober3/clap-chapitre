import { describe, it, expect } from 'vitest';
import {
  BodyError,
  MalformedBody,
  ids,
  int,
  objects,
  oneOf,
  optionalText,
  readJson,
  text,
} from '../../functions/_lib/body';

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/admin/articles', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('WR-2 readJson', () => {
  it('accepts a plain object', async () => {
    await expect(readJson(request({ title: 'Un dernier été' }))).resolves.toEqual({
      title: 'Un dernier été',
    });
  });

  it('refuses anything that is not an object — null and arrays included', async () => {
    // `typeof null === 'object'`, and an array would let `body.title` be
    // undefined rather than an error. Both have to be caught here so the
    // readers below can trust what they receive.
    await expect(readJson(request(null))).rejects.toBeInstanceOf(MalformedBody);
    await expect(readJson(request([1, 2]))).rejects.toBeInstanceOf(MalformedBody);
    await expect(readJson(request('"une chaîne"'))).rejects.toBeInstanceOf(MalformedBody);
  });

  it('refuses a body that is not JSON at all', async () => {
    await expect(readJson(request('{pas du json'))).rejects.toBeInstanceOf(MalformedBody);
  });

  it('refuses an oversized body on its declared length, before reading it', async () => {
    await expect(
      readJson(request({ body: 'x' }, { 'content-length': '999999' }), 1024),
    ).rejects.toBeInstanceOf(MalformedBody);
  });
});

describe('WR-2 text / optionalText', () => {
  it('trims, and treats whitespace-only as missing', () => {
    expect(text({ title: '  Un dernier été ' }, 'title', { max: 200 })).toBe('Un dernier été');
    // A title of three spaces is not a title.
    expect(() => text({ title: '   ' }, 'title', { max: 200 })).toThrow(BodyError);
    expect(() => text({}, 'title', { max: 200 })).toThrow(BodyError);
  });

  it('refuses a value over the ceiling, naming the field', () => {
    try {
      text({ title: 'x'.repeat(201) }, 'title', { max: 200 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BodyError);
      expect((error as BodyError).field).toBe('title');
    }
  });

  it('collapses absent, null and empty to undefined — the round trip stays lossless', () => {
    // `rows.ts` reads a NULL column back as an absent property; this is the
    // matching direction.
    expect(optionalText({}, 'hook', { max: 300 })).toBeUndefined();
    expect(optionalText({ hook: null }, 'hook', { max: 300 })).toBeUndefined();
    expect(optionalText({ hook: '' }, 'hook', { max: 300 })).toBeUndefined();
    expect(optionalText({ hook: '  ' }, 'hook', { max: 300 })).toBeUndefined();
  });

  it('still refuses a present-but-wrong type: an omission is not a mistake', () => {
    expect(() => optionalText({ hook: 42 }, 'hook', { max: 300 })).toThrow(BodyError);
  });
});

describe('WR-2 oneOf / int', () => {
  it('accepts a member of the frozen set and refuses anything else', () => {
    const media = ['film', 'serie', 'livre', 'doc'] as const;
    expect(oneOf({ medium: 'livre' }, 'medium', media)).toBe('livre');
    // The write-side counterpart of `?medium=flim` being a 400.
    expect(() => oneOf({ medium: 'flim' }, 'medium', media)).toThrow(BodyError);
    expect(() => oneOf({ medium: 'FILM' }, 'medium', media)).toThrow(BodyError);
  });

  it('takes an integer inside its bounds, and nothing else', () => {
    expect(int({ value: 63 }, 'value', { min: 0, max: 1000 })).toBe(63);
    expect(() => int({ value: 6.5 }, 'value', { min: 0 })).toThrow(BodyError);
    expect(() => int({ value: -1 }, 'value', { min: 0 })).toThrow(BodyError);
    // A numeric string is a mistake, not a number — same stance as `query.ts`.
    expect(() => int({ value: '63' }, 'value', {})).toThrow(BodyError);
  });
});

describe('WR-2 ids / objects', () => {
  it('keeps the order it was given — the order is the editorial data', () => {
    expect(ids({ avis: ['b', 'a', 'c'] }, 'avis', { max: 10 })).toEqual(['b', 'a', 'c']);
  });

  it('refuses duplicates rather than letting a composite key abort the batch', () => {
    expect(() => ids({ avis: ['a', 'a'] }, 'avis', { max: 10 })).toThrow(BodyError);
  });

  it('refuses an over-long list, a non-array, and a blank entry', () => {
    expect(() => ids({ avis: ['a', 'b'] }, 'avis', { max: 1 })).toThrow(BodyError);
    expect(() => ids({ avis: 'a' }, 'avis', { max: 10 })).toThrow(BodyError);
    expect(() => ids({ avis: ['a', ' '] }, 'avis', { max: 10 })).toThrow(BodyError);
  });

  it('treats an absent list as empty, not as an error', () => {
    expect(ids({}, 'avis', { max: 10 })).toEqual([]);
    expect(objects({}, 'edits', { max: 10 })).toEqual([]);
  });

  it('objects() refuses entries that are not objects', () => {
    expect(() => objects({ edits: [null] }, 'edits', { max: 10 })).toThrow(BodyError);
    expect(() => objects({ edits: ['x'] }, 'edits', { max: 10 })).toThrow(BodyError);
  });
});

/**
 * An in-memory R2 bucket, satisfying the `R2Bucket` interface.
 *
 * The same bargain `d1.ts` strikes, one size down: covers are files now, and a
 * test that uploads one should exercise the real handler — the type check, the
 * size ceiling, the content-addressed key — rather than a mock that agrees with
 * whatever it is handed. What is simulated here is only the storage.
 *
 * A `Map` is enough. R2's real semantics that matter to this project are: put
 * overwrites, get returns null for a missing key rather than throwing, and
 * delete is idempotent.
 */
import type { R2Bucket, R2Object } from '../../functions/types';

export interface TestBucket extends R2Bucket {
  /** Every stored key — how a test asserts an orphan was swept up. */
  keys(): string[];
}

export function createTestBucket(): TestBucket {
  const objects = new Map<string, { bytes: Uint8Array; contentType?: string }>();

  return {
    put: async (key, value, options) => {
      // The handlers always pass an ArrayBuffer; a stream would need draining,
      // and nothing in the project uploads one.
      const bytes = new Uint8Array(value as ArrayBuffer);
      objects.set(key, { bytes, contentType: options?.httpMetadata?.contentType });
      return undefined;
    },

    get: async (key): Promise<R2Object | null> => {
      const stored = objects.get(key);
      if (!stored) return null;
      return {
        // Built by hand rather than through `new Blob([...]).stream()`: jsdom
        // ships a Blob without `stream()`, and the failure surfaces as a 404
        // from the handler's own catch — a long way from its cause.
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(stored.bytes);
            controller.close();
          },
        }),
        httpMetadata: { contentType: stored.contentType },
        size: stored.bytes.byteLength,
      };
    },

    // Idempotent, like the real one: deleting a key that is not there is not an
    // error, which is what lets `forget` be best-effort.
    delete: async (key) => {
      objects.delete(key);
    },

    keys: () => [...objects.keys()],
  };
}

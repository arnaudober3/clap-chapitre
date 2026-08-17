/**
 * Cover art never renders larger than the 2:3 box every card, hero and archive
 * tile puts it in (`object-fit: cover`) — so nothing on the site ever shows more
 * than 300×450 pixels of it. Uploading the original photo would spend storage
 * and bandwidth on detail no page displays, which is why the browser re-encodes
 * it to that exact size, as WebP, before the bytes ever leave the editor's
 * machine.
 */

/** The width every cover is downscaled to. */
export const COVER_WIDTH = 300;
/** 2:3 — the aspect `ImageField`'s cover dropzone and every cover tile share. */
export const COVER_HEIGHT = 450;

/**
 * Crops `file` to the 2:3 cover box and re-encodes it as WebP.
 *
 * The crop mirrors `object-fit: cover`: the source is scaled up to fill
 * 300×450, then centered, rather than letterboxed — matching what the site
 * would have shown of the original file anyway.
 */
export async function toCoverWebp(file: File, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.max(COVER_WIDTH / bitmap.width, COVER_HEIGHT / bitmap.height);
    const sourceWidth = COVER_WIDTH / scale;
    const sourceHeight = COVER_HEIGHT / scale;
    const sourceX = (bitmap.width - sourceWidth) / 2;
    const sourceY = (bitmap.height - sourceHeight) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = COVER_WIDTH;
    canvas.height = COVER_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D context unavailable');
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      COVER_WIDTH,
      COVER_HEIGHT,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );
    if (!blob) throw new Error('WebP encoding failed');
    return blob;
  } finally {
    bitmap.close();
  }
}

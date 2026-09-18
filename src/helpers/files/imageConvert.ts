/** Image format that a browser-canvas can write: every other format can only be a source
 * @tutorial Troubleshooting
 * * `webp` is written by Chrome & Firefox but not by Safari: it silently returns a `png` instead, so
 * {@link imageConvert} rejects such a result rather than return a mislabeled file */
export type WUPImageEncodeFormat = "png" | "jpg" | "webp";

/** Mime-type that a format is written with */
const mimeByFormat: Record<WUPImageEncodeFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** Writable format of a mime-type; `undefined` when a canvas can't write it (`heic`, `gif`, `avif`, `svg`...).
 * It holds the legacy aliases as well: some tools & servers still return an old or an invalid mime-type */
const formatByMime: Record<string, WUPImageEncodeFormat | undefined> = {
  "image/png": "png",
  "image/x-png": "png", // an old mime-type that some tools still produce
  "image/jpeg": "jpg",
  "image/jpg": "jpg", // it's an invalid mime-type but some servers still return it
  "image/pjpeg": "jpg",
  "image/webp": "webp",
};

/** Options of {@link imageConvert} */
export interface IImageConvertOptions {
  /** Reduce the image to fit into the box (the image that's already smaller isn't touched) */
  maxWidth?: number;
  /** Reduce the image to fit into the box (the image that's already smaller isn't touched) */
  maxHeight?: number;
  /** Increase the image to fill the box (the image that's already bigger isn't touched) */
  minWidth?: number;
  /** Increase the image to fill the box (the image that's already bigger isn't touched) */
  minHeight?: number;
  /** Resize the image to fit this box (no matter whether it's bigger or smaller) */
  width?: number;
  /** Resize the image to fit this box (no matter whether it's bigger or smaller) */
  height?: number;
  /** When `false` the image is cut (centered) to match the pointed size exactly
   * @defaultValue true */
  keepAspectRatio?: boolean;
  /** Format of the result
   * @defaultValue the format of the pointed file; `png` when a canvas can't write it (`heic`, `gif`, `avif`...) */
  format?: WUPImageEncodeFormat;
  /** Quality of the lossy formats (`jpg` & `webp`) in range `0..1`; it's ignored by `png`
   * @defaultValue `0.92` (the browser default) */
  quality?: number;
  /** Css-color that fills the transparent parts of the image
   * @defaultValue `#fff` for `jpg` (it has no alpha-channel, so without the fill it becomes black); none for others */
  background?: string;
}

/** Result of {@link imageCalcSize}: the size of the result image & the part of the source that's drawn */
interface IImageDrawRect {
  /** Width of the result image */
  w: number;
  /** Height of the result image */
  h: number;
  /** Left of the source-part that's drawn (`0` unless the image is cut) */
  sx: number;
  /** Top of the source-part that's drawn (`0` unless the image is cut) */
  sy: number;
  /** Width of the source-part that's drawn (the whole width unless the image is cut) */
  sW: number;
  /** Height of the source-part that's drawn (the whole height unless the image is cut) */
  sH: number;
}

/** Returns the size that an image of the pointed size is resized to & the part of it that must be drawn;
 * it's the math of {@link imageConvert} without any canvas
 * @param options every option is optional & they are applied in order: `width/height`, `max...`, `min...`;
 * so `min...` wins when it conflicts with `max...`; a `0` option is the same as a missed one */
function imageCalcSize(sw: number, sh: number, options: IImageConvertOptions): IImageDrawRect {
  const { width, height, maxWidth, maxHeight, minWidth, minHeight } = options;
  let w: number;
  let h: number;

  if (options.keepAspectRatio === false) {
    // every axis is independent here: the image is cut below instead of being distorted
    w = width || sw;
    h = height || sh;
    if (maxWidth) w = Math.min(w, maxWidth);
    if (maxHeight) h = Math.min(h, maxHeight);
    if (minWidth) w = Math.max(w, minWidth);
    if (minHeight) h = Math.max(h, minHeight);
  } else {
    // the very same scale for both axes: `1` means "leave the source-size as it is"
    let scale = 1;
    if (width || height) {
      // fit into the box: the smallest scale fits both axes
      scale = Math.min(width ? width / sw : Infinity, height ? height / sh : Infinity);
    }
    // `max...` only reduces: it starts from the scale above, so a smaller image isn't touched
    scale = Math.min(scale, maxWidth ? maxWidth / sw : Infinity, maxHeight ? maxHeight / sh : Infinity);
    // `min...` is applied last, so it wins when it conflicts with `max...`
    scale = Math.max(scale, minWidth ? minWidth / sw : 0, minHeight ? minHeight / sh : 0);
    w = sw * scale;
    h = sh * scale;
  }

  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  if (options.keepAspectRatio !== false) {
    return { w, h, sx: 0, sy: 0, sW: sw, sH: sh }; // the whole source is drawn
  }

  // the source-part to draw: `cover` the result & cut the rest
  const scale = Math.max(w / sw, h / sh);
  const sW = Math.min(sw, Math.round(w / scale));
  const sH = Math.min(sh, Math.round(h / scale));

  return { w, h, sx: Math.round((sw - sW) / 2), sy: Math.round((sh - sH) / 2), sW, sH };
}

/** Decoded image that's ready to be drawn on a canvas */
interface IImageSource {
  img: CanvasImageSource;
  w: number;
  h: number;
  /** Frees the memory that the decoded image holds */
  close: () => void;
}

/** Decodes the file into a bitmap; `null` when the browser can't do it (an `svg`, an old browser...) */
async function imageDecodeBitmap(file: Blob): Promise<IImageSource | null> {
  if (typeof createImageBitmap !== "function") {
    return null;
  }
  try {
    // "from-image" applies the exif-rotation: otherwise a photo from a phone is drawn rotated
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { img: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  } catch {
    return null; // createImageBitmap doesn't support svg (& some old browsers don't support a Blob at all)
  }
}

/** Decodes the file via `<img>`: it reads every format that the browser can read (an `svg` included) */
async function imageDecodeElement(file: Blob): Promise<IImageSource> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("Image is broken or its format isn't supported"));
      el.src = url;
    });
    return { img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/** Returns the pointed image resized &/or converted to another format (with keeping the aspect ratio)
 *  * When pointed maxWidth & maxHeight: reduce image to fit (if image size is bigger)
 *  * When pointed minWidth & minHeight: increase image to fit (if image size is lower)
 *  * When pointed width & height: resize to fit this
 *
 * When option keepAspectRatio: false - then image is cut (centered) to fit size
 * @tutorial Support
 * * a source is read in every format that the browser can read: `tiff` & `heic` - by Safari only, `jxl` - by
 * Safari & by Chrome under a flag, `avif` - by Chrome 85+ / Safari 16.1+, the rest - by every modern browser.
 * A result is written in {@link WUPImageEncodeFormat} only
 * @tutorial Troubleshooting
 * * the file is returned as it is when nothing is changed at all: the very same size & format
 * & no `quality`/`background` is pointed
 * * an animated `gif`/`webp` loses the animation: only the 1st frame is kept
 * @example
 * const preview = await imageConvert(file, { maxWidth: 200, maxHeight: 200 });
 * const avatar = await imageConvert(file, { width: 96, height: 96, keepAspectRatio: false, format: "jpg" });
 * const small = await imageConvert(pngFile, { format: "webp", quality: 0.8 }); */
export default async function imageConvert(file: Blob, options: IImageConvertOptions = {}): Promise<Blob> {
  // a canvas can't write heic/gif/avif & other formats, so such a source falls back to png: point `format` to avoid it
  const format = options.format ?? formatByMime[file.type] ?? "png";
  const mime = mimeByFormat[format];
  // a pointed quality/background must be applied even when the size & the format aren't changed
  const isReEncode = options.quality != null || options.background != null;
  const { width, height, maxWidth, maxHeight, minWidth, minHeight } = options;
  if (!isReEncode && file.type === mime && !(width || height || maxWidth || maxHeight || minWidth || minHeight)) {
    return file; // nothing to do: decoding the image only to re-encode it back spends the time & loses the quality
  }

  const src = (await imageDecodeBitmap(file)) ?? (await imageDecodeElement(file));

  try {
    if (!src.w || !src.h) {
      throw new Error("Image has no size (an svg without width & height isn't supported)");
    }

    // calc new size
    const rect = imageCalcSize(src.w, src.h, options);
    if (!isReEncode && rect.w === src.w && rect.h === src.h && file.type === mime) {
      return file; // nothing to do: re-encoding only spends the time & loses the quality
    }

    // ************ encode

    const c = document.createElement("canvas");
    c.width = rect.w;
    c.height = rect.h;
    const bg = options.background ?? (format === "jpg" ? "#fff" : "");
    // `alpha: false` skips the per-pixel alpha-compositing: the whole canvas is covered by `bg` anyway
    const ctx = c.getContext("2d", { alpha: !bg });
    if (!ctx) {
      throw new Error("Canvas 2d-context isn't supported");
    }

    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, rect.w, rect.h);
    }
    ctx.imageSmoothingQuality = "high"; // otherwise a reduced image is too noisy
    ctx.drawImage(src.img, rect.sx, rect.sy, rect.sW, rect.sH, 0, 0, rect.w, rect.h);

    return new Promise((res, rej) => {
      c.toBlob(
        (b) => {
          c.width = 0; // free the pixel-buffer at once: GC is lazy with such a memory
          c.height = 0;
          if (!b) {
            rej(new Error(`Impossible to encode the image to '${format}'`));
          } else if (b.type !== mime) {
            rej(new Error(`Format '${format}' isn't supported by the browser`)); // a browser silently returns png instead
          } else {
            res(b);
          }
        },
        mime,
        options.quality
      );
    });
  } finally {
    src.close();
  }
}

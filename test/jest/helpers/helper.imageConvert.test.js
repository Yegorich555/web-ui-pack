import imageConvert from "web-ui-pack/helpers/files/imageConvert";

// jsdom (jest 29) implements neither a canvas nor an image-decoder: both are mocked below

/** Fake image-file: the mocked decoders read the size back from it (a file without a size is a broken one) */
function imgFile(w, h, type = "image/png") {
  const f = new Blob(["image-bytes"], { type });
  f.imgSize = { w, h };
  return f;
}

/** Object-urls that the helper has created: `{ [url]: file }` */
let urls = {};
/** Bitmaps that createImageBitmap has produced */
let bitmaps = [];
/** Everything that the helper did with the canvas; `null` when it never created one */
let drawn = null;
/** Result of the mocked `canvas.toBlob`: it's overridden to test the encoding-errors */
let encode = null;

/** `<img>`-decoder: jsdom loads no resource at all, so an image is resolved by the mocked object-urls */
class ImageMock {
  set src(url) {
    const file = urls[url];
    // the real decoding is always async: the callbacks must be called after `el.src = ...` returns
    Promise.resolve().then(() => {
      if (!file?.imgSize) {
        this.onerror(new Event("error"));
        return;
      }
      this.naturalWidth = file.imgSize.w;
      this.naturalHeight = file.imgSize.h;
      this.onload(new Event("load"));
    });
  }
}

describe("helper.imageConvert", () => {
  beforeEach(() => {
    urls = {};
    bitmaps = [];
    drawn = null;
    encode = (mime) => new Blob(["encoded"], { type: mime });
    global.Image = ImageMock;

    global.createImageBitmap = jest.fn(async (file) => {
      if (!file.imgSize) {
        throw new Error("test: the format isn't supported"); // createImageBitmap reads no svg & no broken file
      }
      const bmp = {
        width: file.imgSize.w,
        height: file.imgSize.h,
        isClosed: false,
        close: () => {
          bmp.isClosed = true;
        },
      };
      bitmaps.push(bmp);
      return bmp;
    });

    global.URL.createObjectURL = jest.fn((file) => {
      const url = `blob:test/${Object.keys(urls).length}`;
      urls[url] = file;
      return url;
    });
    global.URL.revokeObjectURL = jest.fn();

    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function getContextMock(kind, opts) {
      const ctx = {
        fillStyle: "",
        imageSmoothingQuality: "",
        fillRect: (...rect) => {
          drawn.fill = { style: ctx.fillStyle, rect };
        },
        drawImage: (img, ...args) => {
          drawn.img = img;
          drawn.draw = args;
          drawn.smoothing = ctx.imageSmoothingQuality;
        },
      };
      // WARN: the canvas is resized to 0 right after the encoding, so its size must be captured here
      drawn = { kind, alpha: opts.alpha, w: this.width, h: this.height, fill: null, draw: null };
      return ctx;
    });

    jest.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function toBlobMock(cb, mime, quality) {
      drawn.mime = mime;
      drawn.quality = quality;
      cb(encode(mime));
      drawn.isFreed = !this.width && !this.height;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Converts the image & returns `{sx},{sy},{sW},{sH} => {w}x{h}`: the drawn part of the source & the result size;
   * "as is" when the helper returned the very same file */
  async function resize(file, options) {
    drawn = null;
    const b = await imageConvert(file, options);
    return b === file ? "as is" : `${drawn.draw.slice(0, 4).join(",")} => ${drawn.w}x${drawn.h}`;
  }

  test("the very same file is returned when there is nothing to change", async () => {
    const f = imgFile(200, 100);
    await expect(imageConvert(f)).resolves.toBe(f); // no options at all
    await expect(imageConvert(f, { format: "png" })).resolves.toBe(f); // the very same format
    await expect(imageConvert(f, { maxWidth: 0, height: 0 })).resolves.toBe(f); // `0` is the same as a missed option
    const jpg = imgFile(200, 100, "image/jpeg");
    await expect(imageConvert(jpg, {})).resolves.toBe(jpg);
    // ...such a file isn't even decoded: re-encoding it back spends the time & loses the quality
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(drawn).toBeNull();

    // the box that the image already fits isn't a change either
    await expect(imageConvert(f, { maxWidth: 400, maxHeight: 400 })).resolves.toBe(f);
    expect(createImageBitmap).toHaveBeenCalledTimes(1); // ...but here it's decoded anyway: to get the size
    expect(drawn).toBeNull();
  });

  test("format: it's taken from the file & the legacy mime-types are supported", async () => {
    const conv = async (type, options) => (await imageConvert(imgFile(200, 100, type), options)).type;
    // `quality` forces the re-encoding: otherwise such a file is returned as it is
    expect(await conv("image/png", { quality: 1 })).toBe("image/png");
    expect(await conv("image/jpeg", { quality: 1 })).toBe("image/jpeg");
    expect(await conv("image/webp", { quality: 1 })).toBe("image/webp");
    // the legacy & the invalid mime-types are re-encoded into the ordinary ones
    expect(await conv("image/x-png")).toBe("image/png");
    expect(await conv("image/jpg")).toBe("image/jpeg");
    expect(await conv("image/pjpeg")).toBe("image/jpeg");
    // a canvas can't write such formats at all, so png is the fallback
    expect(await conv("image/heic")).toBe("image/png");
    expect(await conv("image/gif")).toBe("image/png");
    expect(await conv("image/avif")).toBe("image/png");
    // ...unless the format is pointed
    expect(await conv("image/heic", { format: "jpg" })).toBe("image/jpeg");
    expect(await conv("image/png", { format: "webp" })).toBe("image/webp");
  });

  test("quality & background force the re-encoding of the very same image", async () => {
    const f = imgFile(200, 100);
    await expect(imageConvert(f, { quality: 0.5 })).resolves.not.toBe(f);
    expect([drawn.w, drawn.h]).toEqual([200, 100]); // the size isn't changed at all
    expect(drawn.mime).toBe("image/png");
    expect(drawn.quality).toBe(0.5);

    await imageConvert(f, { quality: 0 }); // `0` is a valid quality & not a missed option
    expect(drawn.quality).toBe(0);

    await expect(imageConvert(f, { background: "#000" })).resolves.not.toBe(f);
    expect(drawn.quality).toBeUndefined(); // the browser default is used when nothing is pointed
    expect(drawn.fill).toEqual({ style: "#000", rect: [0, 0, 200, 100] });
  });

  test("resize: max... only reduces", async () => {
    const f = imgFile(200, 100);
    expect(await resize(f, { maxWidth: 100 })).toBe("0,0,200,100 => 100x50");
    expect(await resize(f, { maxHeight: 25 })).toBe("0,0,200,100 => 50x25");
    expect(await resize(f, { maxWidth: 100, maxHeight: 25 })).toBe("0,0,200,100 => 50x25"); // the smallest scale
    expect(await resize(f, { maxWidth: 400, maxHeight: 400 })).toBe("as is"); // a smaller image isn't touched
  });

  test("resize: min... only increases", async () => {
    const f = imgFile(200, 100);
    expect(await resize(f, { minWidth: 400 })).toBe("0,0,200,100 => 400x200");
    expect(await resize(f, { minHeight: 400 })).toBe("0,0,200,100 => 800x400");
    expect(await resize(f, { minWidth: 400, minHeight: 800 })).toBe("0,0,200,100 => 1600x800"); // the biggest scale
    expect(await resize(f, { minWidth: 100, minHeight: 50 })).toBe("as is"); // a bigger image isn't touched
    // min... is applied last, so it wins when it conflicts with max...
    expect(await resize(f, { maxWidth: 50, minWidth: 100 })).toBe("0,0,200,100 => 100x50");
  });

  test("resize: width & height fit the box in both directions", async () => {
    const f = imgFile(200, 100);
    expect(await resize(f, { width: 50 })).toBe("0,0,200,100 => 50x25");
    expect(await resize(f, { height: 25 })).toBe("0,0,200,100 => 50x25");
    expect(await resize(f, { width: 50, height: 50 })).toBe("0,0,200,100 => 50x25"); // the smallest scale fits both
    expect(await resize(f, { width: 400, height: 150 })).toBe("0,0,200,100 => 300x150"); // it increases as well
    expect(await resize(f, { width: 400, maxWidth: 300 })).toBe("0,0,200,100 => 300x150"); // max... reduces the result
    expect(await resize(f, { width: 200, height: 100 })).toBe("as is"); // the very same size
  });

  test("resize: the result is rounded & is never less than 1px", async () => {
    expect(await resize(imgFile(3, 1), { maxWidth: 2 })).toBe("0,0,3,1 => 2x1"); // 0.67px => 1px
    expect(await resize(imgFile(100, 3), { maxWidth: 10 })).toBe("0,0,100,3 => 10x1"); // 0.3px => 1px & not 0
  });

  test("keepAspectRatio: false cuts the image (centered)", async () => {
    const f = imgFile(200, 100);
    expect(await resize(f, { width: 100, height: 100, keepAspectRatio: false })).toBe("50,0,100,100 => 100x100");
    expect(await resize(f, { width: 300, height: 50, keepAspectRatio: false })).toBe("0,34,200,33 => 300x50");
    // every axis is independent here: a missed one is the source-size
    expect(await resize(f, { height: 50, keepAspectRatio: false })).toBe("0,25,200,50 => 200x50");
    expect(await resize(f, { width: 50, keepAspectRatio: false })).toBe("75,0,50,100 => 50x100");
    // ...and max.../min... clamp the axes independently as well
    expect(await resize(f, { width: 300, maxWidth: 100, minHeight: 200, keepAspectRatio: false })) //
      .toBe("75,0,50,100 => 100x200");
    expect(await resize(f, { height: 300, maxHeight: 50, minWidth: 400, keepAspectRatio: false })) //
      .toBe("0,38,200,25 => 400x50");
  });

  test("background: it fills the transparent parts of jpg only", async () => {
    const f = imgFile(200, 100);
    await imageConvert(f, { format: "jpg" });
    // jpg has no alpha-channel: without the fill a transparent image becomes black
    expect(drawn.fill).toEqual({ style: "#fff", rect: [0, 0, 200, 100] });
    expect(drawn.alpha).toBe(false); // the whole canvas is covered by the fill: the compositing is a spare work

    await imageConvert(f, { format: "jpg", background: "#0f0" }); // the pointed color wins
    expect(drawn.fill.style).toBe("#0f0");

    await imageConvert(f, { format: "webp" }); // the transparency is kept for the rest of the formats
    expect(drawn.fill).toBeNull();
    expect(drawn.alpha).toBe(true);

    await imageConvert(f, { format: "jpg", background: "" }); // an empty color drops the fill
    expect(drawn.fill).toBeNull();
    expect(drawn.alpha).toBe(true);
  });

  test("the bitmap-decoder applies the exif-rotation & everything is freed at the end", async () => {
    const f = imgFile(200, 100, "image/jpeg");
    await imageConvert(f, { maxWidth: 100 });
    // a photo from a phone is drawn rotated without such an option
    expect(createImageBitmap).toHaveBeenCalledWith(f, { imageOrientation: "from-image" });
    expect(URL.createObjectURL).not.toHaveBeenCalled(); // the bitmap-decoder needs no url at all
    expect(drawn.img).toBe(bitmaps[0]);
    expect(drawn.smoothing).toBe("high"); // a reduced image is too noisy otherwise
    expect(bitmaps[0].isClosed).toBe(true); // the decoded pixels are freed
    expect(drawn.isFreed).toBe(true); // ...the pixel-buffer of the canvas as well: GC is lazy with such a memory
  });

  test("the `<img>`-decoder is the fallback of createImageBitmap", async () => {
    const f = imgFile(200, 100);
    delete global.createImageBitmap; // an old browser has no such a function at all
    expect(await resize(f, { maxWidth: 100 })).toBe("0,0,200,100 => 100x50");
    expect(drawn.img).toBeInstanceOf(ImageMock);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/0"); // the url isn't leaked

    // createImageBitmap reads no svg, so it's the fallback here as well
    global.createImageBitmap = jest.fn(async () => {
      throw new Error("test: svg isn't supported");
    });
    expect(await resize(f, { maxWidth: 100 })).toBe("0,0,200,100 => 100x50");
    expect(drawn.img).toBeInstanceOf(ImageMock);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
  });

  test("rejects a file that no decoder can read", async () => {
    const broken = new Blob(["not an image"], { type: "image/png" }); // no size at all
    await expect(imageConvert(broken, { maxWidth: 100 })) //
      .rejects.toThrow("Image is broken or its format isn't supported");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/0"); // the url isn't leaked even here
    expect(drawn).toBeNull(); // no canvas at all
  });

  test("rejects an image without a size (an svg without width & height)", async () => {
    await expect(imageConvert(imgFile(0, 100), { maxWidth: 50 })).rejects.toThrow("Image has no size");
    await expect(imageConvert(imgFile(100, 0), { maxWidth: 50 })).rejects.toThrow("Image has no size");
    expect(bitmaps.map((b) => b.isClosed)).toEqual([true, true]); // the decoded pixels are freed anyway
  });

  test("rejects when the canvas isn't supported", async () => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    await expect(imageConvert(imgFile(200, 100), { maxWidth: 100 })) //
      .rejects.toThrow("Canvas 2d-context isn't supported");
    expect(bitmaps[0].isClosed).toBe(true);
  });

  test("rejects when the browser can't write the pointed format", async () => {
    const f = imgFile(200, 100);
    encode = () => null; // the encoding is failed
    await expect(imageConvert(f, { format: "webp" })).rejects.toThrow("Impossible to encode the image to 'webp'");
    expect(drawn.isFreed).toBe(true);

    // Safari silently returns a png instead of the pointed webp: such a mislabeled file must not be returned
    encode = () => new Blob(["encoded"], { type: "image/png" });
    await expect(imageConvert(f, { format: "webp" })).rejects.toThrow("Format 'webp' isn't supported by the browser");
    expect(drawn.isFreed).toBe(true);
    expect(bitmaps.map((b) => b.isClosed)).toEqual([true, true]);
  });
});

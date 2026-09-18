/** Real-browser part of imageConvert-tests: what jsdom/NodeJS can't do - a real canvas & a real image-decoder.
 * WARN: the encoded bytes aren't compared with a snapshot-file: an encoder isn't the same between browser-versions,
 * so the result is decoded back & checked by the size & by the pixels instead.
 * Everything else is covered by ./test/jest/helpers/helper.imageConvert.test.js */

describe("helper.imageConvert (browser)", () => {
  test("a real image is resized, re-encoded & the transparency is filled", async () => {
    const r = await page.evaluate(async () => {
      /** Returns the pointed canvas as a png-file */
      const toFile = (cnv) => new Promise((res) => cnv.toBlob(res, "image/png"));
      /** Returns `r,g,b` of the pixel of the pointed image */
      const pixel = (ctx, x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3).join(",");

      // source: the left half is red & the right one is transparent
      const src = document.createElement("canvas");
      src.width = 200;
      src.height = 100;
      const srcCtx = src.getContext("2d");
      srcCtx.fillStyle = "#ff0000";
      srcCtx.fillRect(0, 0, 100, 100);
      const file = await toFile(src);

      const out = await window.imageConvert(file, { maxWidth: 20, format: "jpg" });
      const sameFile = await window.imageConvert(file); // nothing to change: the very same file must be returned

      // decode the result back to check the real pixels
      const bmp = await createImageBitmap(out);
      const cnv = document.createElement("canvas");
      cnv.width = bmp.width;
      cnv.height = bmp.height;
      const ctx = cnv.getContext("2d");
      ctx.drawImage(bmp, 0, 0);

      return {
        srcType: file.type,
        type: out.type,
        size: `${bmp.width}x${bmp.height}`,
        left: pixel(ctx, 3, 5),
        right: pixel(ctx, 16, 5),
        isSameFile: sameFile === file,
        isBlob: out instanceof Blob && out.size > 0,
      };
    });

    expect(r.srcType).toBe("image/png");
    expect(r.isSameFile).toBe(true);
    expect(r.isBlob).toBe(true);
    expect(r.type).toBe("image/jpeg");
    expect(r.size).toBe("20x10"); // 200x100 is reduced by maxWidth with keeping the aspect-ratio
    // WARN: jpg is lossy, so the colors are never exact
    expect(r.left).toMatch(/^2[45][0-9],[0-9]{1,2},[0-9]{1,2}$/); // ~red
    expect(r.right).toMatch(/^2[45][0-9],2[45][0-9],2[45][0-9]$/); // ~white: jpg has no alpha-channel
  }, 60000);
});

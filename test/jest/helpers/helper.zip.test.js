/* eslint-disable no-new-func */
/* eslint-disable no-bitwise */
/* eslint-disable no-plusplus */
import zlib from "zlib";
import { TextEncoder, TextDecoder } from "util";
import zip from "web-ui-pack/helpers/zip";

// jsdom (jest 29) has no TextEncoder/TextDecoder
global.TextEncoder ??= TextEncoder;
global.TextDecoder ??= TextDecoder;

/** entries of this size (wkMinSize) and bigger are deflated in a WebWorker */
const wkMin = 16384;

// ***************************** helpers ******************************

/** deterministic pseudo-random generator (xorshift32; no Math.random - tests must be reproducible) */
function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s;
  };
}

/** incompressible bytes */
function randomBytes(n, seed = 1) {
  const r = rnd(seed);
  const a = new Uint8Array(n);
  for (let i = 0; i < n; ++i) a[i] = r() & 255;
  return a;
}

/** compressible text with many repeated sequences */
function textBytes(n, seed = 7) {
  const words = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa"];
  const r = rnd(seed);
  let s = "";
  while (s.length < n) s += `${words[r() % words.length]} ${words[r() % words.length]}, `;
  return new TextEncoder().encode(s.slice(0, n));
}

/** zipf-distributed bytes: such a skewed symbol-distribution produces a huffman-tree that is deeper
 * than the allowed 15 bits, so hTree() must re-balance code-lengths */
function zipfBytes(n, nSym, pow, seed) {
  const r = rnd(seed);
  const w = [];
  let tot = 0;
  for (let i = 0; i < nSym; ++i) {
    w[i] = 1 / (i + 1) ** pow;
    tot += w[i];
  }
  const a = new Uint8Array(n);
  for (let i = 0; i < n; ++i) {
    let x = (r() / 4294967296) * tot;
    let k = 0;
    while (k < nSym - 1 && x > w[k]) {
      x -= w[k];
      ++k;
    }
    a[i] = k;
  }
  return a;
}

/** parses zip-archive (reads central-directory & inflates every entry) */
function readZip(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const dec = new TextDecoder();
  let eo = -1;
  for (let i = buf.length - 22; i >= 0; --i) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eo = i;
      break;
    }
  }
  if (eo < 0) throw new Error("End of central directory is not found");
  const result = {
    total: dv.getUint16(eo + 8, true),
    count: dv.getUint16(eo + 10, true),
    cdSize: dv.getUint32(eo + 12, true),
    cdOffset: dv.getUint32(eo + 16, true),
    files: {},
    names: [],
  };
  let b = result.cdOffset;
  for (let i = 0; i < result.count; ++i) {
    if (dv.getUint32(b, true) !== 0x2014b50) throw new Error(`Wrong central-header signature at ${b}`);
    const os = buf[b + 5];
    const flags = dv.getUint16(b + 8, true);
    const compression = dv.getUint16(b + 10, true);
    const time = dv.getUint16(b + 12, true);
    const date = dv.getUint16(b + 14, true);
    const crc = dv.getUint32(b + 16, true);
    const csize = dv.getUint32(b + 20, true);
    const usize = dv.getUint32(b + 24, true);
    const fnl = dv.getUint16(b + 28, true);
    const exl = dv.getUint16(b + 30, true);
    const coml = dv.getUint16(b + 32, true);
    const attrs = dv.getUint32(b + 38, true);
    const off = dv.getUint32(b + 42, true);
    const name = dec.decode(buf.subarray(b + 46, b + 46 + fnl));
    const extra = buf.slice(b + 46 + fnl, b + 46 + fnl + exl);
    const comment = dec.decode(buf.subarray(b + 46 + fnl + exl, b + 46 + fnl + exl + coml));
    b += 46 + fnl + exl + coml;

    if (dv.getUint32(off, true) !== 0x4034b50) throw new Error(`Wrong local-header signature at ${off}`);
    const lfnl = dv.getUint16(off + 26, true);
    const lexl = dv.getUint16(off + 28, true);
    const start = off + 30 + lfnl + lexl;
    const raw = buf.slice(start, start + csize);
    result.names.push(name);
    result.files[name] = {
      raw,
      os,
      flags,
      compression,
      crc,
      csize,
      usize,
      attrs,
      extra,
      comment,
      // dos date & time
      year: ((date >> 9) & 127) + 1980,
      month: (date >> 5) & 15,
      day: date & 31,
      hours: (time >> 11) & 31,
      minutes: (time >> 5) & 63,
      seconds: (time & 31) * 2,
      /** original (inflated) content */
      get content() {
        return compression === 8 ? new Uint8Array(zlib.inflateRawSync(Buffer.from(raw))) : raw;
      },
      text() {
        return dec.decode(this.content);
      },
    };
  }
  return result;
}

/** every pending task of zip() is a micro-task, so a single macro-task drains them all */
const tick = () => new Promise((resolve) => setTimeout(resolve));

/** calls zip() and returns the callback-mock when everything is settled */
async function zipCalls(fn, data, opts) {
  const cb = jest.fn();
  if (opts === undefined) fn(data, cb);
  else fn(data, opts, cb);
  await tick();
  return cb;
}

/** calls zip() and returns its single result: `cb` must never be called twice */
async function zipRun(fn, data, opts) {
  const cb = await zipCalls(fn, data, opts);
  expect(cb).toBeCalledTimes(1);
  const [err, out] = cb.mock.calls[0];
  return { err, out };
}

/** compares byte-arrays: Uint8Array instances come from different realms here (jsdom vs NodeJS)
 * so toStrictEqual() can't be used */
function expectBytes(actual, expected) {
  expect(actual.length).toBe(expected.length);
  const a = Buffer.from(actual.buffer, actual.byteOffset, actual.length);
  const b = Buffer.from(expected.buffer, expected.byteOffset, expected.length);
  if (Buffer.compare(a, b) !== 0) expect(Array.from(actual)).toEqual(Array.from(expected)); // to get a readable diff
}

// ***************************** tests ******************************

describe("helper.zip", () => {
  test("archive with 0 & many entries", async () => {
    const empty = await zipRun(zip, {});
    expect(empty.err).toBeNull();
    expect(empty.out.length).toBe(22); // only 'end of central directory'
    expect(readZip(empty.out)).toMatchObject({ total: 0, count: 0, cdSize: 0, cdOffset: 0 });

    const data = {};
    for (let i = 0; i < 30; ++i) data[`f${i}.txt`] = `content ${i} `.repeat(20);
    const { err, out } = await zipRun(zip, data);
    expect(err).toBeNull();
    const z = readZip(out);
    expect(z.count).toBe(30);
    expect(z.total).toBe(30);
    expect(z.names).toEqual(Object.keys(data));
    expect(z.files["f29.txt"].text()).toBe("content 29 ".repeat(20));
  });

  test("single file: string & Uint8Array content + default headers", async () => {
    const txt = "Hello World! ".repeat(3);
    const bin = textBytes(2000);
    // no options at all: overload zip(data, cb)
    const { err, out } = await zipRun(zip, { "hello.txt": txt, "bin.dat": bin });
    expect(err).toBeNull();
    const z = readZip(out);
    expect(z.names).toEqual(["hello.txt", "bin.dat"]);

    const f = z.files["hello.txt"];
    expect(f.text()).toBe(txt);
    expect(f.usize).toBe(39);
    expect(f.compression).toBe(8);
    expect(f.flags).toBe(0); // ascii-name => no unicode-flag
    expect(f.os).toBe(0);
    expect(f.attrs).toBe(0);
    expect(f.comment).toBe("");
    expect(f.extra.length).toBe(0);
    expect(f.crc).toBe(zlib.crc32(f.content));

    const b = z.files["bin.dat"];
    expectBytes(b.content, bin);
    expect(b.usize).toBe(bin.length);
    expect(b.csize).toBeLessThan(bin.length); // it's really compressed
  });

  test("nested folders & options merge", async () => {
    // overload zip(data, opts, cb): shared options are merged with per-file ones
    const { err, out } = await zipRun(
      zip,
      {
        "def.txt": "some text ".repeat(20),
        "stored.txt": ["some text ".repeat(20), { level: 0 }],
        nested: [{ "in.txt": "inner text ".repeat(10) }, { level: 0 }],
        dir: { "f1.txt": "file1", sub: { "f2.txt": "file2" } },
      },
      { os: 3, attrs: 0o644 << 16, comment: "shared" }
    );
    expect(err).toBeNull();
    const z = readZip(out);
    expect(z.names).toEqual([
      "def.txt",
      "stored.txt",
      "nested/",
      "nested/in.txt",
      "dir/",
      "dir/f1.txt",
      "dir/sub/",
      "dir/sub/f2.txt",
    ]);

    const def = z.files["def.txt"];
    expect(def.compression).toBe(8);
    expect(def.os).toBe(3);
    expect(def.attrs).toBe((0o644 << 16) >>> 0);
    expect(def.comment).toBe("shared");
    expect(z.files["stored.txt"].compression).toBe(0); // level:0 => stored
    expect(z.files["stored.txt"].text()).toBe("some text ".repeat(20));
    // WARN: fltn() spreads only root-options into nested folders
    expect(z.files["nested/"].compression).toBe(0);
    expect(z.files["nested/in.txt"].compression).toBe(8);
    expect(z.files["nested/in.txt"].text()).toBe("inner text ".repeat(10));
    expect(z.files["dir/"].usize).toBe(0);
    expect(z.files["dir/sub/"].content.length).toBe(0);
    expect(z.files["dir/sub/f2.txt"].text()).toBe("file2");
  });

  test("options level: 0..9 & mem: 0..12", async () => {
    const data = textBytes(30000, 11);
    const results = await Promise.all([
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => zipRun(zip, { "t.txt": data }, { level })),
      ...[0, 1, 4, 8, 12].map((mem) => zipRun(zip, { "t.txt": data }, { mem })),
    ]);
    results.forEach(({ err, out }) => {
      expect(err).toBeNull();
      expectBytes(readZip(out).files["t.txt"].content, data);
    });
    expect(readZip(results[0].out).files["t.txt"].compression).toBe(0); // level:0 => stored as-is
    expect(readZip(results[0].out).files["t.txt"].csize).toBe(data.length);
  });

  test("option dictionary", async () => {
    const dict = new TextEncoder().encode("alpha beta gamma delta epsilon zeta eta theta iota kappa ");
    const data = textBytes(4000, 17);
    const { err, out } = await zipRun(zip, { "t.txt": data }, { dictionary: dict });
    expect(err).toBeNull();
    const f = readZip(out).files["t.txt"];
    expect(f.usize).toBe(data.length);
    expectBytes(new Uint8Array(zlib.inflateRawSync(Buffer.from(f.raw), { dictionary: Buffer.from(dict) })), data);

    // dictionary is cut to the last 32768 bytes
    const bigDict = textBytes(40000, 19);
    const r2 = await zipRun(zip, { "t.txt": data }, { dictionary: bigDict });
    expect(r2.err).toBeNull();
    const f2 = readZip(r2.out).files["t.txt"];
    const d2 = Buffer.from(bigDict.subarray(-32768));
    expectBytes(new Uint8Array(zlib.inflateRawSync(Buffer.from(f2.raw), { dictionary: d2 })), data);
  });

  test.each([
    ["compressible: several deflate-blocks", textBytes(400000, 23), 200000],
    ["incompressible: stored deflate-block", randomBytes(50000, 29), 50100],
    ["single repeated byte: huffman-tree with 1 symbol", new Uint8Array(20000).fill(65), 100],
    // skewed data: huffman-tree deeper than 15 bits must be re-balanced by hTree()
    ["skewed 256 symbols ^1.3", zipfBytes(40000, 256, 1.3, 722), 40000],
    ["skewed 256 symbols ^1.8", zipfBytes(40000, 256, 1.8, 764), 40000],
    ["skewed 160 symbols ^1.2", zipfBytes(40000, 160, 1.2, 554), 40000], // these two also force
    ["skewed 200 symbols ^1.3", zipfBytes(40000, 200, 1.3, 827), 40000], // the 'give the debt back' loop
  ])("deflate %s", async (_name, data, maxCSize) => {
    const { err, out } = await zipRun(zip, { "t.bin": data });
    expect(err).toBeNull();
    const f = readZip(out).files["t.bin"];
    expect(f.compression).toBe(8);
    expect(f.csize).toBeLessThanOrEqual(maxCSize);
    expectBytes(f.content, data);
  });

  test("tiny data without any match (empty huffman-tree)", async () => {
    const { err, out } = await zipRun(zip, { "a.txt": "ab", "b.txt": "", "c.txt": "x" });
    expect(err).toBeNull();
    const z = readZip(out);
    expect(z.files["a.txt"].text()).toBe("ab");
    expect(z.files["b.txt"].usize).toBe(0);
    expect(z.files["c.txt"].text()).toBe("x");
  });

  test("unicode filename & comment", async () => {
    const { err, out } = await zipRun(zip, {
      "имя.txt": ["значение", { comment: "коммент" }],
      "uni.txt": ["v", { comment: "тест" }],
      "ascii.txt": ["v", { comment: "plain" }],
    });
    expect(err).toBeNull();
    const z = readZip(out);
    expect(z.files["имя.txt"].flags).toBe(0x800); // unicode-flag is set
    expect(z.files["имя.txt"].text()).toBe("значение");
    expect(z.files["имя.txt"].comment).toBe("коммент");
    expect(z.files["uni.txt"].flags).toBe(0x800); // ascii-name but unicode-comment
    expect(z.files["uni.txt"].comment).toBe("тест");
    expect(z.files["ascii.txt"].flags).toBe(0);
    expect(z.files["ascii.txt"].comment).toBe("plain");
  });

  test("option mtime: Date | string | number | default", async () => {
    const dt = new Date(2020, 4, 17, 13, 45, 30);
    const { err, out } = await zipRun(zip, {
      "d.txt": ["v", { mtime: dt }],
      "s.txt": ["v", { mtime: "2021-06-18T10:20:30" }],
      "n.txt": ["v", { mtime: dt.getTime() }],
      "cur.txt": "v",
    });
    expect(err).toBeNull();
    const z = readZip(out);
    expect([z.files["d.txt"].year, z.files["d.txt"].month, z.files["d.txt"].day]).toEqual([2020, 5, 17]);
    expect([z.files["d.txt"].hours, z.files["d.txt"].minutes, z.files["d.txt"].seconds]).toEqual([13, 45, 30]);
    expect([z.files["s.txt"].year, z.files["s.txt"].month, z.files["s.txt"].day]).toEqual([2021, 6, 18]);
    expect([z.files["n.txt"].year, z.files["n.txt"].day]).toEqual([2020, 17]);
    expect(z.files["cur.txt"].year).toBe(new Date().getFullYear());
  });

  test("option extra", async () => {
    const extra = { 1: new Uint8Array([1, 2, 3]), 22: new Uint8Array([9]) };
    const { err, out } = await zipRun(zip, { "a.txt": ["v", { extra }] });
    expect(err).toBeNull();
    expect(Array.from(readZip(out).files["a.txt"].extra)).toEqual([1, 0, 3, 0, 1, 2, 3, 22, 0, 1, 0, 9]);
  });

  test("errors thrown synchronously", () => {
    const cb = () => {};
    expect(() => zip({ "a.txt": "1" }, {})).toThrow("no callback");
    expect(() => zip({ "a.txt": "1" }, "str", undefined)).toThrow("no callback");
    // single extra-field > 65535
    expect(() => zip({ "a.txt": ["v", { extra: { 1: new Uint8Array(65536) } }] }, cb)).toThrow("extra field too long");
    // sum of extra-fields > 65535
    const extra = { 1: new Uint8Array(40000), 2: new Uint8Array(40000) };
    expect(() => zip({ "a.txt": ["v", { extra }] }, cb)).toThrow("extra field too long");
  });

  test.each([
    ["date < 1980", { "a.txt": ["v", { mtime: new Date(1979, 0, 1) }] }, undefined, "date not in range 1980-2099"],
    ["date > 2099", { "a.txt": ["v", { mtime: new Date(2100, 0, 1) }] }, undefined, "date not in range 1980-2099"],
    ["mtime: 0 (1970)", { "a.txt": ["v", { mtime: 0 }] }, undefined, "date not in range 1980-2099"],
    ["filename too long", { [`${"a".repeat(70000)}.txt`]: "v" }, undefined, "filename too long"],
    // zipping is stopped instead of producing a corrupted archive - so the valid files are skipped too
    ["it among valid files", { "ok.txt": "v", [`${"a".repeat(70000)}.txt`]: "v", "o2.txt": "v" }, undefined, "filename too long"], // prettier-ignore
    ["deflate throws for every entry", { "a.txt": "v", "b.txt": "v" }, { dictionary: "not-an-array" }, /subarray/],
  ])("error reported to callback exactly once: %s", async (_name, data, opts, msg) => {
    // zipCalls() isn't enough here: zipRun() asserts that the callback is called exactly once
    const { err, out } = await zipRun(zip, data, opts);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(msg);
    expect(out).toBeNull();
  });

  test("returns terminate-function", async () => {
    const cb = jest.fn();
    const terminate = zip({ "a.txt": "v" }, cb);
    expect(typeof terminate).toBe("function");
    expect(terminate()).toBeUndefined(); // no workers here but it must not throw
    await tick();
    expect(cb).toBeCalledTimes(1); // sync-deflate is already done so terminate can't cancel it
  });
});

// ***************************** WebWorkers ******************************

/** replaces Worker/Blob/URL.createObjectURL with mocks that really execute the generated worker-code */
function mockWorkers() {
  const blobs = new Map();
  // parsing the (huge) cloned worker-code takes ~1s, so it's done once per unique code
  const compiled = new Map();
  const orig = { Blob: global.Blob, Worker: global.Worker, createObjectURL: global.URL.createObjectURL };

  class FakeWorker {
    constructor(url) {
      FakeWorker.instances.push(this);
      this.alive = true;
      this.onmessage = null;
      this.errListeners = [];
      const self = this;
      const store = {
        // WARN: delivery isn't gated by `alive`: a message handed to the main thread before terminate()
        // still arrives - exactly the race that zip() must survive
        postMessage: (msg) => self.alive && Promise.resolve().then(() => self.onmessage?.({ data: msg })),
        addEventListener: (type, fn) => type === "error" && self.errListeners.push(fn),
      };
      store.self = store;
      const code = blobs.get(url);
      // istanbul instruments dist-file: worker-code refers to the module-scoped counter - link it back
      const covName = (code.match(/\bcov_[0-9a-zA-Z_$]+/) || [])[0];
      const covKey = Object.keys(global.__coverage__ || {}).find((k) =>
        k.replace(/\\/g, "/").endsWith("/dist/helpers/zip.js")
      );
      if (covName && covKey) store[covName] = () => global.__coverage__[covKey];
      this.store = store;
      // 'with' + Proxy: worker-code assigns implicit globals (U8=..., onmessage=...)
      const scope = new Proxy(store, {
        has: () => true,
        get: (t, k) => (k in t ? t[k] : global[k]),
        set: (t, k, v) => {
          t[k] = v;
          return true;
        },
      });
      if (!compiled.has(code)) compiled.set(code, new Function("scope", `with(scope){${code}\n}`));
      compiled.get(code)(scope);
    }

    postMessage(msg) {
      if (!this.alive) return;
      Promise.resolve().then(() => {
        if (!this.alive) return;
        try {
          this.store.onmessage({ data: msg });
        } catch (e) {
          if (FakeWorker.dropStack) e.stack = "";
          this.errListeners.forEach((f) => f({ error: e }));
        }
      });
    }

    terminate() {
      this.alive = false;
    }
  }
  FakeWorker.instances = [];
  FakeWorker.dropStack = false;

  global.Blob = class FakeBlob {
    constructor(parts, opts) {
      this.parts = parts;
      this.type = opts && opts.type;
    }
  };
  global.URL.createObjectURL = (b) => {
    const url = `blob:mock/${blobs.size}`;
    blobs.set(url, b.parts.join(""));
    return url;
  };
  global.Worker = FakeWorker;

  return {
    FakeWorker,
    blobs,
    restore: () => {
      global.Blob = orig.Blob;
      global.URL.createObjectURL = orig.createObjectURL;
      global.Worker = orig.Worker;
    },
  };
}

describe("helper.zip (WebWorker)", () => {
  let mocked;
  let zipW;
  // level:1 - the worker-code is instrumented by istanbul, so the default level is needlessly slow here
  const wkOpts = { level: 1 };

  beforeAll(() => {
    mocked = mockWorkers();
    // WARN: 'wkSupported' is resolved on import so module must be re-imported after mocks are applied
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      zipW = require("web-ui-pack/helpers/zip").default;
    });
  });

  afterAll(() => mocked.restore());

  beforeEach(() => {
    mocked.FakeWorker.instances.length = 0;
    mocked.FakeWorker.dropStack = false;
  });

  test("only big deflated entries go to a worker", async () => {
    const big = textBytes(wkMin, 31);
    const small = textBytes(500, 37);
    const { err, out } = await zipRun(
      zipW,
      { "big.txt": big, "small.txt": small, "stored.bin": [big, { level: 0 }] },
      wkOpts
    );
    expect(err).toBeNull();
    expect(mocked.FakeWorker.instances.length).toBe(1); // small.txt & level:0 are handled inline
    const z = readZip(out);
    expectBytes(z.files["big.txt"].content, big);
    expectBytes(z.files["small.txt"].content, small);
    expectBytes(z.files["stored.bin"].content, big);
    expect(z.files["stored.bin"].compression).toBe(0);
  });

  test("pool is limited by 4 workers, blob-code is cached & option consume", async () => {
    const data = {};
    // 5th & 6th entries must re-use workers instead of spawning new ones (6th goes to the least busy one)
    for (let i = 0; i < 6; ++i) data[`f${i}.txt`] = [textBytes(wkMin, 41 + i), i ? {} : { consume: true }];
    const { err, out } = await zipRun(zipW, data, wkOpts);
    expect(err).toBeNull();
    expect(mocked.FakeWorker.instances.length).toBe(4); // wkMax
    expect(mocked.blobs.size).toBe(1); // the same blob-url is re-used by every worker
    const z = readZip(out);
    Object.keys(data).forEach((k) => expectBytes(z.files[k].content, data[k][0]));
  });

  test("worker-error is reported once even when other workers keep answering", async () => {
    const bad = { dictionary: "not-an-array" };
    // 1st error kills the whole zip; the 2nd error & the late success must be ignored
    const cb = await zipCalls(
      zipW,
      {
        "bad1.txt": [textBytes(wkMin, 57), bad],
        "bad2.txt": [textBytes(wkMin, 58), bad],
        "good.txt": textBytes(wkMin, 59),
      },
      wkOpts
    );
    expect(cb).toBeCalledTimes(1);
    const [err, out] = cb.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/subarray is not a function/);
    expect(err.stack).toBeTruthy();
    expect(out).toBeNull();

    // own stack is kept when the worker-error has none
    mocked.FakeWorker.dropStack = true;
    const r = await zipRun(zipW, { "big.txt": [textBytes(wkMin, 61), bad] }, wkOpts);
    expect(r.err.message).toMatch(/subarray is not a function/);
    expect(r.err.stack).toBeTruthy();
  });

  test("terminate cancels workers", async () => {
    const cb = jest.fn();
    const terminate = zipW({ "big.txt": textBytes(wkMin, 67) }, wkOpts, cb);
    terminate();
    await tick();
    expect(cb).not.toBeCalled();
    expect(mocked.FakeWorker.instances[0].alive).toBe(false);
  });

  test("pool isn't used after a sync-error (dead pool)", async () => {
    // 1st (small) file is deflated inline & throws => 2nd (big) file must not reach the pool
    const cb = await zipCalls(zipW, {
      "small.txt": [textBytes(500, 71), { dictionary: "not-an-array" }],
      "big.txt": textBytes(wkMin, 73),
    });
    expect(cb).toBeCalledTimes(1);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mocked.FakeWorker.instances.length).toBe(0);
  });
});

// ***************************** micro-task fallbacks ******************************

describe("helper.zip (mt fallbacks)", () => {
  /** re-imports zip.js with the pointed globals deleted ('mt' is resolved on import) */
  function importWithout(...names) {
    const origs = names.map((n) => global[n]);
    names.forEach((n) => delete global[n]);
    let z;
    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line global-require
        z = require("web-ui-pack/helpers/zip").default;
      });
    } finally {
      names.forEach((n, i) => {
        global[n] = origs[i];
      });
    }
    return z;
  }

  test("setTimeout & direct call are used when queueMicrotask is missed", async () => {
    const zt = importWithout("queueMicrotask");
    const { err, out } = await zipRun(zt, { "a.txt": "value" });
    expect(err).toBeNull();
    expect(readZip(out).files["a.txt"].text()).toBe("value");

    const zd = importWithout("queueMicrotask", "setTimeout");
    const cb = jest.fn();
    zd({ "a.txt": "value" }, cb);
    expect(cb).toBeCalledTimes(1); // callback is called synchronously
    expect(readZip(cb.mock.calls[0][1]).files["a.txt"].text()).toBe("value");
  });
});

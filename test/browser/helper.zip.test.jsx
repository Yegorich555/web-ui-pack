/** Real-browser part of zip-tests: what jsdom/NodeJS can't do - real WebWorkers.
 * The produced archive is compared byte-to-byte with ./helper.zip.snapshot.zip
 * Everything else is covered by ./test/jest/helpers/helper.zip.test.js */
const fs = require("fs");
const path = require("path");

describe("helper.zip (browser)", () => {
  test("archive matches the snapshot-file & big entries go through real WebWorkers", async () => {
    const r = await page.evaluate(async () => {
      // deterministic pseudo-random generator (xorshift32)
      const rnd = (seed) => {
        let s = seed >>> 0 || 1;
        return () => {
          s ^= s << 13;
          s >>>= 0;
          s ^= s >>> 17;
          s ^= s << 5;
          s >>>= 0;
          return s;
        };
      };
      /** compressible bytes */
      const textBytes = (n, seed) => {
        const words = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa"];
        const rn = rnd(seed);
        let s = "";
        while (s.length < n) s += `${words[rn() % words.length]} ${words[rn() % words.length]}, `;
        return new TextEncoder().encode(s.slice(0, n));
      };

      // count really created workers
      const OrigWorker = window.Worker;
      let workers = 0;
      window.Worker = class WorkerSpy extends OrigWorker {
        constructor(...args) {
          super(...args);
          ++workers;
        }
      };

      let out;
      try {
        out = await new Promise((res, rej) =>
          window.zip(
            {
              "big.txt": textBytes(40000, 3), // >16384 => deflated in a WebWorker
              "small.txt": "hello world ".repeat(5),
              "имя.txt": ["значение", { comment: "коммент" }],
              dir: { "in.txt": "inner ".repeat(50) },
              "stored.bin": [textBytes(5000, 5), { level: 0 }],
            },
            { mtime: "2024-03-05T06:07:08" }, // fixed date: otherwise zip-headers are never the same
            (err, d) => (err ? rej(err) : res(d))
          )
        );
      } finally {
        window.Worker = OrigWorker;
      }
      return { workers, bytes: Array.from(out) };
    });

    expect(r.workers).toBe(1); // only 'big.txt' is big enough for a worker
    const expected = fs.readFileSync(path.join(__dirname, "helper.zip.snapshot.zip"));
    expect(r.bytes.length).toBe(expected.length);
    expect(Buffer.compare(Buffer.from(r.bytes), expected)).toBe(0);
  }, 60000);
});

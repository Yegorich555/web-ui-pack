/// This is code imported from https://github.com/101arrowz/fflate and refactored to use locally
/// Only zip() & strToU8() are kept here (with everything they depend on)

// blob-urls with worker-code: index is workerId
const wkCache: Record<number, string> = {};

/** Run stringified code `c` in WebWorker and get result via callback */
const wk = <T>(
  c: string,
  id: number,
  msg: unknown,
  transfer: ArrayBuffer[],
  cb: (err: ZipError, msg: T) => void
): Worker => {
  if (!wkCache[id]) {
    const code = `${c};addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})`;
    wkCache[id] = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  }
  const w = new Worker(wkCache[id]);
  w.onmessage = (e) => {
    const { data } = e;
    const ed = data.$e$ as [string, number, string] | undefined;
    if (ed) {
      const [message, code, stack] = ed;
      const e2 = new Error(message) as ZipError;
      e2.code = code;
      // keep the local stack when the worker error carries none
      if (stack) e2.stack = stack;
      cb(e2, null!);
    } else cb(null!, data);
  };
  w.postMessage(msg, transfer);
  return w;
};

// aliases for shorter compressed code (most minifiers don't do this)
const U8 = Uint8Array;
const U16 = Uint16Array;
const I32 = Int32Array;

// fixed length extra bits
const fleb = new U8([
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0,
  /* impossible */ 0,
]);

// fixed distance extra bits
const fdeb = new U8([
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0,
]);

// code length index map
const clim = new U8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);

// get base, reverse index map from extra bits
const freb = (eb: Uint8Array, start: number): { b: Uint16Array; r: Int32Array } => {
  const b = new U16(31);
  for (let i = 0; i < 31; ++i) {
    start += 1 << eb[i - 1];
    b[i] = start;
  }
  // numbers here are at max 18 bits
  const r = new I32(b[30]);
  for (let i = 1; i < 30; ++i) {
    for (let j = b[i]; j < b[i + 1]; ++j) {
      r[j] = ((j - b[i]) << 5) | i;
    }
  }
  return { b, r };
};

const { r: revfl } = freb(fleb, 2);
// we can ignore the fact that the other numbers are wrong; they never happen anyway
revfl[258] = 28;
const { r: revfd } = freb(fdeb, 0);

// map of value to reverse (assuming 16 bits)
const rev = new U16(32768);
for (let i = 0; i < 32768; ++i) {
  // reverse table algorithm from SO
  let x = ((i & 0xaaaa) >> 1) | ((i & 0x5555) << 1);
  x = ((x & 0xcccc) >> 2) | ((x & 0x3333) << 2);
  x = ((x & 0xf0f0) >> 4) | ((x & 0x0f0f) << 4);
  rev[i] = (((x & 0xff00) >> 8) | ((x & 0x00ff) << 8)) >> 1;
}

// create huffman tree from U8 "map": index -> code length for code index
// mb (max bits) must be at most 15
const hMap = (cd: Uint8Array, mb: number, r: 0 | 1): Uint16Array => {
  const s = cd.length;
  // index
  let i = 0;
  // U16 "map": index -> # of codes with bit length = index
  const l = new U16(mb);
  // length of cd must be 288 (total # of codes)
  for (; i < s; ++i) {
    if (cd[i]) ++l[cd[i] - 1];
  }
  // U16 "map": index -> minimum code for bit length = index
  const le = new U16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = (le[i - 1] + l[i - 1]) << 1;
  }
  let co: Uint16Array;
  if (r) {
    // U16 "map": index -> number of actual bits, symbol for code
    co = new U16(1 << mb);
    // bits to remove for reverser
    const rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      // ignore 0 lengths
      if (cd[i]) {
        // num encoding both symbol and bits read
        const sv = (i << 4) | cd[i];
        // free bits
        const r2 = mb - cd[i];
        // start value
        let v = le[cd[i] - 1]++ << r2;
        // m is end value
        for (const m = v | ((1 << r2) - 1); v <= m; ++v) {
          // every 16 bit value starting with the code yields the same result
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new U16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> (15 - cd[i]);
      }
    }
  }
  return co;
};

// fixed length tree
const flt = new U8(288);
for (let i = 0; i < 144; ++i) flt[i] = 8;
for (let i = 144; i < 256; ++i) flt[i] = 9;
for (let i = 256; i < 280; ++i) flt[i] = 7;
for (let i = 280; i < 288; ++i) flt[i] = 8;
// fixed distance tree
const fdt = new U8(32);
for (let i = 0; i < 32; ++i) fdt[i] = 5;
// fixed length map
const flm = /* #__PURE__ */ hMap(flt, 9, 0);
// fixed distance map
const fdm = /* #__PURE__ */ hMap(fdt, 5, 0);

// get end of byte
const shft = (p: number): number => ((p + 7) / 8) | 0;

// typed array slice - allows garbage collector to free original reference,
// while being more compatible than .slice
const slc = (v: Uint8Array, s: number, e?: number): Uint8Array => {
  if (s == null || s < 0) s = 0;
  if (e == null || e > v.length) e = v.length;
  // can't use .constructor in case user-supplied
  return new U8(v.subarray(s, e));
};

// error codes
const ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler", // determined by compression function
  undefined,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data",
  // determined by unknown compression method
];

/** An error generated within this library */
export interface ZipError extends Error {
  /** The code associated with this error */
  code: number;
}

const err = (ind: number, msg?: string | 0, nt?: 1): ZipError => {
  const e: Partial<ZipError> = new Error(msg || ec[ind]);
  e.code = ind;
  // probably used on NodeJS side - if (Error.captureStackTrace) Error.captureStackTrace(e, err);
  if (!nt) throw e;
  return e as ZipError;
};

// starting at p, write the minimum number of bits that can hold v to d
const wbits = (d: Uint8Array, p: number, v: number): void => {
  v <<= p & 7;
  const o = (p / 8) | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};

// starting at p, write the minimum number of bits (>8) that can hold v to d
const wbits16 = (d: Uint8Array, p: number, v: number): void => {
  v <<= p & 7;
  const o = (p / 8) | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};

type HuffNode = {
  // symbol
  s: number;
  // frequency
  f: number;
  // left child
  l?: HuffNode;
  // right child
  r?: HuffNode;
};

// creates code lengths from a frequency table
const hTree = (d: Uint16Array, mb: number): { t: Uint8Array; l: number } => {
  // Need extra info to make a tree
  const t: HuffNode[] = [];
  for (let i = 0; i < d.length; ++i) {
    if (d[i]) t.push({ s: i, f: d[i] });
  }
  const s = t.length;
  const t2 = t.slice();
  if (!s) return { t: et, l: 0 };
  if (s === 1) {
    const v = new U8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort((a, b) => a.f - b.f);
  // after i2 reaches last ind, will be stopped
  // freq must be greater than largest possible number of symbols
  t.push({ s: -1, f: 25001 });
  let l = t[0];
  let r = t[1];
  let i0 = 0;
  let i1 = 1;
  let i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  // efficient algorithm from UZIP.js
  // i0 is lookbehind, i2 is lookahead - after processing two low-freq
  // symbols that combined have high freq, will start processing i2 (high-freq,
  // non-composite) symbols instead
  // see https://reddit.com/r/photopea/comments/ikekht/uzipjs_questions/
  while (i1 !== s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 !== i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  let maxSym = t2[0].s;
  for (let i = 1; i < s; ++i) {
    if (t2[i].s > maxSym) maxSym = t2[i].s;
  }
  // code lengths
  const tr = new U16(maxSym + 1);
  // max bits in tree
  let mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    // more algorithms from UZIP.js
    //  ind    debt
    let i = 0;
    let dt = 0;
    //    left            cost
    const lft = mbt - mb;
    const cst = 1 << lft;
    t2.sort((a, b) => tr[b.s] - tr[a.s] || a.f - b.f);
    for (; i < s; ++i) {
      const i3 = t2[i].s;
      if (tr[i3] > mb) {
        dt += cst - (1 << (mbt - tr[i3]));
        tr[i3] = mb;
      } else break;
    }
    dt >>= lft;
    while (dt > 0) {
      const i3 = t2[i].s;
      if (tr[i3] < mb) dt -= 1 << (mb - tr[i3]++ - 1);
      else ++i;
    }
    for (; i >= 0 && dt; --i) {
      const i3 = t2[i].s;
      if (tr[i3] === mb) {
        --tr[i3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new U8(tr), l: mbt };
};
// get the max length and assign length codes
const ln = (n: HuffNode, l: Uint16Array, d: number): number =>
  n.s === -1 ? Math.max(ln(n.l!, l, d + 1), ln(n.r!, l, d + 1)) : (l[n.s] = d);

// length codes generation
const lc = (c: Uint8Array): { c: Uint16Array; n: number } => {
  let s = c.length;
  // Note that the semicolon was intentional
  while (s && !c[--s]);
  const cl = new U16(++s);
  //  ind      num         streak
  let cli = 0;
  let cln = c[0];
  let cls = 1;
  const w = (v: number): void => {
    cl[cli++] = v;
  };
  for (let i = 1; i <= s; ++i) {
    if (c[i] === cln && i !== s) ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138) w(32754);
        if (cls > 2) {
          w(cls > 10 ? ((cls - 11) << 5) | 28690 : ((cls - 3) << 5) | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln);
        --cls;
        for (; cls > 6; cls -= 6) w(8304);
        if (cls > 2) {
          w(((cls - 3) << 5) | 8208);
          cls = 0;
        }
      }
      while (cls--) w(cln);
      cls = 1;
      cln = c[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};

// calculate the length of output from tree, code lengths
const clen = (cf: Uint16Array, cl: Uint8Array): number => {
  let l = 0;
  for (let i = 0; i < cl.length; ++i) l += cf[i] * cl[i];
  return l;
};

// writes a fixed block
// returns the new bit pos
const wfblk = (out: Uint8Array, pos: number, dat: Uint8Array): number => {
  // no need to write 00 as type: TypedArray defaults to 0
  const s = dat.length;
  const o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (let i = 0; i < s; ++i) out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};

// writes a block
const wblk = (
  dat: Uint8Array,
  out: Uint8Array,
  final: number,
  syms: Int32Array,
  lf: Uint16Array,
  df: Uint16Array,
  eb: number,
  li: number,
  bs: number,
  bl: number,
  p: number
): number => {
  wbits(out, p++, final);
  ++lf[256];
  const { t: dlt, l: mlb } = hTree(lf, 15);
  const { t: ddt, l: mdb } = hTree(df, 15);
  const { c: lclt, n: nlc } = lc(dlt);
  const { c: lcdt, n: ndc } = lc(ddt);
  const lcfreq = new U16(19);
  for (let i = 0; i < lclt.length; ++i) ++lcfreq[lclt[i] & 31];
  for (let i = 0; i < lcdt.length; ++i) ++lcfreq[lcdt[i] & 31];
  const { t: lct, l: mlcb } = hTree(lcfreq, 7);
  let nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc);
  const flen = (bl + 5) << 3;
  const ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  const dtlen =
    clen(lf, dlt) +
    clen(df, ddt) +
    eb +
    14 +
    3 * nlcc +
    clen(lcfreq, lct) +
    2 * lcfreq[16] +
    3 * lcfreq[17] +
    7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen) return wfblk(out, p, dat.subarray(bs, bs + bl));
  let lm: Uint16Array;
  let ll: Uint8Array;
  let dm: Uint16Array;
  let dl: Uint8Array;
  wbits(out, p, 1 + ((dtlen < ftlen) as unknown as number));
  p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0);
    ll = dlt;
    dm = hMap(ddt, mdb, 0);
    dl = ddt;
    const llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (let i = 0; i < nlcc; ++i) wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    const lcts = [lclt, lcdt];
    for (let it = 0; it < 2; ++it) {
      const clct = lcts[it];
      for (let i = 0; i < clct.length; ++i) {
        const len = clct[i] & 31;
        wbits(out, p, llm[len]);
        p += lct[len];
        if (len > 15) {
          wbits(out, p, (clct[i] >> 5) & 127);
          p += clct[i] >> 12;
        }
      }
    }
  } else {
    lm = flm;
    ll = flt;
    dm = fdm;
    dl = fdt;
  }
  for (let i = 0; i < li; ++i) {
    const sym = syms[i];
    if (sym > 255) {
      const len = (sym >> 18) & 31;
      wbits16(out, p, lm[len + 257]);
      p += ll[len + 257];
      if (len > 7) {
        wbits(out, p, (sym >> 23) & 31);
        p += fleb[len];
      }
      const dst = sym & 31;
      wbits16(out, p, dm[dst]);
      p += dl[dst];
      if (dst > 3) {
        wbits16(out, p, (sym >> 5) & 8191);
        p += fdeb[dst];
      }
    } else {
      wbits16(out, p, lm[sym]);
      p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};

// deflate options (nice << 13) | chain
const deo = /* #__PURE__ */ new I32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);

// empty
const et = /* #__PURE__ */ new U8(0);

// compresses data into a raw DEFLATE buffer; wi0 - wait index: end of the prepended dictionary (if any)
const dflt = (dat: Uint8Array, lvl: number, plvl: number, wi0: number): Uint8Array => {
  const s = dat.length;
  // writing to this writes to the output buffer
  const w = new U8(s + 5 * (1 + Math.ceil(s / 7000)));
  let pos = 0;
  if (lvl) {
    const opt = deo[lvl - 1];
    const n = opt >> 13;
    const c = opt & 8191;
    const msk = (1 << plvl) - 1;
    //    prev 2-byte val map    curr 2-byte val map
    const prev = new U16(32768);
    const head = new U16(msk + 1);
    const bs1 = Math.ceil(plvl / 3);
    const bs2 = 2 * bs1;
    const hsh = (i: number): number => (dat[i] ^ (dat[i + 1] << bs1) ^ (dat[i + 2] << bs2)) & msk;
    // 24576 is an arbitrary number of maximum symbols per block
    // 424 buffer for last block
    const syms = new I32(25000);
    // length/literal freq   distance freq
    const lf = new U16(288);
    const df = new U16(32);
    //  l/lcnt  exbits  index          l/lind  waitdx          blkpos
    let lc2 = 0;
    let eb = 0;
    let i = 0;
    let li = 0;
    let wi = wi0;
    let bs = 0;
    for (; i + 2 < s; ++i) {
      // hash value
      const hv = hsh(i);
      // index mod 32768    previous index mod
      let imod = i & 32767;
      let pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      // We always should modify head and prev, but only add symbols if
      // this data is not yet processed ("wait" for wait index)
      if (wi <= i) {
        // bytes remaining
        const rem = s - i;
        if ((lc2 > 7000 || li > 24576) && rem > 423) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = 0;
          lc2 = 0;
          eb = 0;
          bs = i;
          for (let j = 0; j < 286; ++j) lf[j] = 0;
          for (let j = 0; j < 30; ++j) df[j] = 0;
        }
        //  len    dist   chain
        let l = 2;
        let d = 0;
        let ch = c;
        let dif = (imod - pimod) & 32767;
        if (rem > 2 && hv === hsh(i - dif)) {
          const maxn = Math.min(n, rem) - 1;
          const maxd = Math.min(32767, i);
          // max possible length
          // not capped at dif because decompressors implement "rolling" index population
          const ml = Math.min(258, rem);
          while (dif <= maxd && --ch && imod !== pimod) {
            if (dat[i + l] === dat[i + l - dif]) {
              let nl = 0;
              for (; nl < ml && dat[i + nl] === dat[i + nl - dif]; ++nl);
              if (nl > l) {
                l = nl;
                d = dif;
                // break out early when we reach "nice" (we are satisfied enough)
                if (nl > maxn) break;
                // now, find the rarest 2-byte sequence within this
                // length of literals and search for that instead.
                // Much faster than just using the start
                const mmd = Math.min(dif, nl - 2);
                let md = 0;
                for (let j = 0; j < mmd; ++j) {
                  const ti = (i - dif + j) & 32767;
                  const pti = prev[ti];
                  const cd = (ti - pti) & 32767;
                  if (cd > md) {
                    md = cd;
                    pimod = ti;
                  }
                }
              }
            }
            // check the previous match
            imod = pimod;
            pimod = prev[imod];
            dif += (imod - pimod) & 32767;
          }
        }
        // d will be nonzero only when a match was found
        if (d) {
          // store both dist and len data in one int32
          // Make sure this is recognized as a len/dist with 28th bit (2^28)
          syms[li++] = 268435456 | (revfl[l] << 18) | revfd[d];
          const lin = revfl[l] & 31;
          const din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc2;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, 1, syms, lf, df, eb, li, bs, i - bs, pos);
  } else {
    for (let i = wi0; i < s + 1; i += 65535) {
      // end
      let e = i + 65535;
      if (e >= s) {
        // write final block
        w[(pos / 8) | 0] = 1;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
  }
  return slc(w, 0, shft(pos));
};

// crc check
type CRCV = {
  p(d: Uint8Array): void;
  d(): number;
};

// CRC32 table
const crct = /* #__PURE__ */ (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; ++i) {
    let c = i;
    let k = 9;
    while (--k) c = (c & 1 && -306674912) ^ (c >>> 1);
    t[i] = c;
  }
  return t;
})();

// CRC32
const crc = (): CRCV => {
  let c = -1;
  return {
    p(d) {
      // closures have awful performance
      let cr = c;
      for (let i = 0; i < d.length; ++i) cr = crct[(cr & 255) ^ d[i]] ^ (cr >>> 8);
      c = cr;
    },
    d() {
      return ~c;
    },
  };
};

/** Options for compressing data into a DEFLATE format */
export interface DeflateOptions {
  /** The level of compression to use, ranging from 0-9.
   *
   * 0 will store the data without compression.
   * 1 is fastest but compresses the worst, 9 is slowest but compresses the best.
   * The default level is 6.
   *
   * Typically, binary data benefits much more from higher values than text data.
   * In both cases, higher values usually take disproportionately longer than the reduction in final size that results.
   *
   * For example, a 1 MB text file could:
   * - become 1.01 MB with level 0 in 1ms
   * - become 400 kB with level 1 in 10ms
   * - become 320 kB with level 9 in 100ms */
  level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  /** The memory level to use, ranging from 0-12. Increasing this increases speed and compression ratio at the cost of memory.
   *
   * Note that this is exponential: while level 0 uses 8 kB, level 4 uses 128 kB, level 8 uses 2 MB, and level 12 uses 32 MB.
   * It is recommended not to lower the value below 4, since that tends to hurt performance.
   * In addition, values above 8 tend to help very little on most data and can even hurt performance.
   *
   * The default value is automatically determined based on the size of the input data. */
  mem?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  /** A buffer containing common byte sequences in the input data that can be used to significantly improve compression ratios.
   *
   * Dictionaries should be 32kB or smaller and include strings or byte sequences likely to appear in the input.
   * The decompressor must supply the same dictionary as the compressor to extract the original data.
   *
   * Dictionaries only improve aggregate compression ratio when reused across multiple small inputs. They should typically not be used otherwise.
   *
   * Avoid using dictionaries with GZIP and ZIP to maximize software compatibility. */
  dictionary?: Uint8Array;
}

/** Callback for asynchronous (de)compression methods
 * @param err Any error that occurred
 * @param data The resulting data. Only present if `err` is null */
export type ZipCallback = (err: ZipError | Error | null, data: Uint8Array | null) => void;

// async callback-based compression
interface AsyncOptions {
  /** Whether or not to "consume" the source data. This will make the typed array/buffer you pass in
   * unusable but will increase performance and reduce memory usage. */
  consume?: boolean;
}

/** Options for compressing data asynchronously into a DEFLATE format */
export interface AsyncDeflateOptions extends DeflateOptions, AsyncOptions {}

/** A terminable compression/decompression process */
export interface AsyncTerminable {
  /** Terminates the worker thread immediately. The callback will not be called. */
  (): void;
}

// deflate with opts
const dopt = (dat: Uint8Array, opt: DeflateOptions): Uint8Array => {
  // wait index: dictionary bytes are prepended for matching only, never emitted
  let wi = 0;
  if (opt.dictionary) {
    const dict = opt.dictionary.subarray(-32768);
    const newDat = new U8(dict.length + dat.length);
    newDat.set(dict);
    newDat.set(dat, dict.length);
    dat = newDat;
    wi = dict.length;
  }
  // memory level
  const mem = opt.mem != null ? 12 + opt.mem : Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5);
  return dflt(dat, opt.level == null ? 6 : opt.level, mem, wi);
};

// Walmart object spread
const mrg = <A, B>(a: A, b: B): A & B => ({ ...a, ...b } as A & B);

// worker clone

// This is possibly the craziest part of the entire codebase, despite how simple it may seem.
// The only parameter to this function is a closure that returns an array of variables outside of the function scope.
// We're going to try to figure out the variable names used in the closure as strings because that is crucial for workerization.
// We will return an object mapping of true variable name to value (basically, the current scope as a JS object).
// The reason we can't just use the original variable names is minifiers mangling the toplevel scope.

// This took me three weeks to figure out how to do.
const wcln = (fn: () => unknown[], fnStr: string, td: Record<string, unknown>): string => {
  const dt = fn();
  const st = fn.toString();
  const ks = st
    .slice(st.indexOf("[") + 1, st.lastIndexOf("]"))
    .replace(/\s+/g, "")
    .split(",");
  for (let i = 0; i < dt.length; ++i) {
    const v = dt[i];
    const k = ks[i];
    if (typeof v === "function") {
      fnStr += `;${k}=`;
      const str = v.toString();
      if (v.prototype) {
        // for global objects
        if (str.indexOf("[native code]") !== -1) {
          const spInd = str.indexOf(" ", 8) + 1;
          fnStr += str.slice(spInd, str.indexOf("(", spInd));
        } else {
          fnStr += str;
          // eslint-disable-next-line no-restricted-syntax, guard-for-in -- inherited members must be cloned also
          for (const t in v.prototype) fnStr += `;${k}.prototype.${t}=${v.prototype[t].toString()}`;
        }
      } else fnStr += str;
    } else td[k] = v;
  }
  return fnStr;
};

type CachedWorker = {
  // code
  c: string;
  // extra
  e: Record<string, unknown>;
};

const ch: CachedWorker[] = [];
// clone bufs
const cbfs = (v: Record<string, unknown>): ArrayBuffer[] => {
  const tl: ArrayBuffer[] = [];
  Object.keys(v).forEach((k) => {
    if ((v[k] as Uint8Array).buffer) {
      tl.push((v[k] = new ((v[k] as Uint8Array).constructor as typeof U8)(v[k] as Uint8Array)).buffer);
    }
  });
  return tl;
};

// use a worker to execute code
const wrkr = <T, R>(
  fns: (() => unknown[])[],
  init: (ev: MessageEvent<T>) => void,
  id: number,
  cb: (err: ZipError, msg: R) => void
): Worker => {
  if (!ch[id]) {
    let fnStr = "";
    const td: Record<string, unknown> = {};
    const m = fns.length - 1;
    for (let i = 0; i < m; ++i) fnStr = wcln(fns[i], fnStr, td);
    ch[id] = { c: wcln(fns[m], fnStr, td), e: td };
  }
  const td = mrg({}, ch[id].e);
  return wk(
    `${ch[id].c};onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=${init.toString()}}`,
    id,
    td,
    cbfs(td),
    cb
  );
};

const bDflt = (): unknown[] => [
  U8,
  U16,
  I32,
  fleb,
  fdeb,
  clim,
  revfl,
  revfd,
  flm,
  flt,
  fdm,
  fdt,
  rev,
  deo,
  et,
  hMap,
  wbits,
  wbits16,
  hTree,
  ln,
  lc,
  clen,
  wfblk,
  wblk,
  shft,
  slc,
  dflt,
  dopt,
  deflateSync,
  pbf,
];
// post buf
const pbf = (msg: Uint8Array): void => (postMessage as Worker["postMessage"])(msg, [msg.buffer]);

// async helper
const cbify = <T extends AsyncOptions>(
  dat: Uint8Array,
  opts: T,
  fns: (() => unknown[])[],
  init: (ev: MessageEvent<[Uint8Array, T]>) => void,
  id: number,
  cb: ZipCallback
): AsyncTerminable => {
  const w = wrkr<[Uint8Array, T], Uint8Array>(fns, init, id, (werr, wdat) => {
    w.terminate();
    cb(werr, wdat);
  });
  w.postMessage([dat, opts], opts.consume ? [dat.buffer as ArrayBuffer] : []);
  return () => {
    w.terminate();
  };
};

// write bytes
const wbytes = (d: Uint8Array, b: number, v: number): void => {
  for (; v; ++b) {
    d[b] = v;
    v >>>= 8;
  }
};

/** Asynchronously compresses data with DEFLATE without any wrapper
 * @param data The data to compress
 * @param opts The compression options
 * @param cb The function to be called upon compression completion
 * @returns A function that can be used to immediately terminate the compression */
function deflate(data: Uint8Array, opts: AsyncDeflateOptions, cb: ZipCallback): AsyncTerminable;
/** Asynchronously compresses data with DEFLATE without any wrapper
 * @param data The data to compress
 * @param cb The function to be called upon compression completion */
function deflate(data: Uint8Array, cb: ZipCallback): AsyncTerminable;
function deflate(data: Uint8Array, opts: AsyncDeflateOptions | ZipCallback, cb?: ZipCallback): AsyncTerminable {
  if (!cb) {
    cb = opts as ZipCallback;
    opts = {};
  }
  if (typeof cb !== "function") err(7);
  return cbify(data, opts as AsyncDeflateOptions, [bDflt], (ev) => pbf(deflateSync(ev.data[0], ev.data[1])), 0, cb);
}

/** Compresses data with DEFLATE without any wrapper
 * @param data The data to compress
 * @param opts The compression options
 * @returns The deflated version of the data */
function deflateSync(data: Uint8Array, opts?: DeflateOptions): Uint8Array {
  return dopt(data, opts || {});
}

/** Attributes for files added to a ZIP archive object */
export interface ZipAttributes {
  /** The operating system of origin for this file. The value is defined
   * by PKZIP's APPNOTE.txt, section 4.4.2.2. For example, 0 (the default)
   * is MS/DOS, 3 is Unix, 19 is macOS. */
  os?: number;

  /** The file's attributes. These are traditionally somewhat complicated
   * and platform-dependent, so using them is scarcely necessary. However,
   * here is a representation of what this is, bit by bit:
   *
   * `TTTTugtrwxrwxrwx0000000000ADVSHR`
   *
   * TTTT = file type (rarely useful)
   *
   * u = setuid, g = setgid, t = sticky
   *
   * rwx = user permissions, rwx = group permissions, rwx = other permissions
   *
   * 0000000000 = unused
   *
   * A = archive, D = directory, V = volume label, S = system file, H = hidden, R = read-only
   *
   * If you want to set the Unix permissions, for instance, just bit shift by 16, e.g. 0o644 << 16.
   * Note that attributes usually only work in conjunction with the `os` setting: you must use
   * `os` = 3 (Unix) if you want to set Unix permissions */
  attrs?: number;

  /** Extra metadata to add to the file. This field is defined by PKZIP's APPNOTE.txt,
   * section 4.4.28. At most 65,535 bytes may be used in each ID. The ID must be an
   * integer between 0 and 65,535, inclusive.
   *
   * This field is incredibly rare and almost never needed except for compliance with
   * proprietary standards and software. */
  extra?: Record<number, Uint8Array>;

  /** The comment to attach to the file. This field is defined by PKZIP's APPNOTE.txt,
   * section 4.4.26. The comment must be at most 65,535 bytes long UTF-8 encoded. This
   * field is not read by consumer software. */
  comment?: string;

  /** When the file was last modified. Defaults to the current time.
   * Set this to 0 to avoid revealing a modification date entirely. */
  mtime?: Date | string | number;
}

/** Options for creating a ZIP archive */
interface ZipOptions extends DeflateOptions, ZipAttributes {}

/** Options for asynchronously creating a ZIP archive */
export interface AsyncZipOptions extends AsyncDeflateOptions, ZipAttributes {}

/** A file that can be used to create a ZIP archive */
type ZippableFile = Uint8Array | Zippable | [Uint8Array | Zippable, ZipOptions];

/** A file that can be used to asynchronously create a ZIP archive */
export type AsyncZippableFile = Uint8Array | AsyncZippable | [Uint8Array | AsyncZippable, AsyncZipOptions];

/** The complete directory structure of a ZIPpable archive */
interface Zippable {
  [path: string]: ZippableFile;
}

/** The complete directory structure of an asynchronously ZIPpable archive */
export interface AsyncZippable {
  [path: string]: AsyncZippableFile;
}

// flattened Zippable
type FlatZippable<A extends boolean> = Record<string, [Uint8Array, A extends true ? AsyncZipOptions : ZipOptions]>;

// flatten a directory structure
const fltn = <A extends boolean, D = A extends true ? AsyncZippable : Zippable>(
  d: D,
  p: string,
  t: FlatZippable<A>,
  o: ZipOptions
): void => {
  const src = d as unknown as Record<string, ZippableFile>;
  Object.keys(src).forEach((k) => {
    let val = src[k];
    let n = p + k;
    let op = o;
    if (Array.isArray(val)) {
      op = mrg(o, val[1]);
      [val] = val;
    }
    if (ArrayBuffer.isView(val)) t[n] = [val, op] as unknown as FlatZippable<A>[string];
    else {
      n += "/";
      t[n] = [new U8(0), op] as unknown as FlatZippable<A>[string];
      fltn(val as unknown as A extends true ? AsyncZippable : Zippable, n, t, o);
    }
  });
};

// text encoder (created lazily to avoid work on import)
let te: TextEncoder | undefined;

/** Converts a string into a Uint8Array for use with compression methods
 * @param str The string to encode
 * @returns The string encoded in UTF-8 binary */
export function strToU8(str: string): Uint8Array {
  te ??= new TextEncoder();
  return te.encode(str);
}

// zip header file
type ZHF = ZipAttributes & {
  /** The size of the file in bytes. This attribute may be invalid after
   * the file is added to the ZIP archive; it must be correct only before the
   * stream completes. */
  size: number;

  /** A CRC of the original file contents. This attribute may be invalid after
   * the file is added to the ZIP archive; it must be correct only before the
   * stream completes. */
  crc: number;

  /** The compression format for the data stream. This number is determined by
   * the spec in PKZIP's APPNOTE.txt, section 4.4.5. For example, 0 = no
   * compression, 8 = deflate, 14 = LZMA */
  compression: number;

  /** Bits 1 and 2 of the general purpose bit flag, specified in PKZIP's
   * APPNOTE.txt, section 4.4.4. Should be between 0 and 3. This is unlikely
   * to be necessary. */
  flag?: number;
};

// extra field length
const exfl = (ex?: ZHF["extra"]): number => {
  let le = 0;
  if (ex) {
    Object.values(ex).forEach((v) => {
      const l = v.length;
      if (l > 65535) err(9);
      le += l + 4;
    });
    // the header's extra-field-length slot is 2 bytes, so the sum must fit too
    if (le > 65535) err(9);
  }
  return le;
};

// write zip header
const wzh = (
  d: Uint8Array,
  b: number,
  f: ZHF,
  fn: Uint8Array,
  u: boolean,
  c: number,
  ce?: number,
  co?: Uint8Array
): number => {
  const fl = fn.length;
  const ex = f.extra;
  const col = co && co.length;
  const exl = exfl(ex);
  wbytes(d, b, ce != null ? 0x2014b50 : 0x4034b50);
  b += 4;
  if (ce != null) {
    d[b++] = 20;
    d[b++] = f.os!;
  }
  d[b] = 20;
  b += 2; // spec compliance? what's that?
  d[b++] = (f.flag! << 1) | (c < 0 ? 8 : 0);
  d[b++] = u ? 8 : 0;
  d[b++] = f.compression & 255;
  d[b++] = f.compression >> 8;
  const dt = new Date(f.mtime == null ? Date.now() : f.mtime);
  const y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119) err(10);
  wbytes(
    d,
    b,
    (y << 25) |
      ((dt.getMonth() + 1) << 21) |
      (dt.getDate() << 16) |
      (dt.getHours() << 11) |
      (dt.getMinutes() << 5) |
      (dt.getSeconds() >> 1)
  );
  b += 4;
  if (c !== -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl);
  wbytes(d, b + 14, exl);
  b += 16;
  if (ce != null) {
    wbytes(d, b, col!);
    wbytes(d, b + 6, f.attrs!);
    wbytes(d, b + 10, ce);
    b += 14;
  }
  d.set(fn, b);
  b += fl;
  if (exl) {
    Object.keys(ex!).forEach((k) => {
      const exf = ex![k as unknown as number];
      const l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4);
      b += 4 + l;
    });
  }
  if (col) {
    d.set(co, b);
    b += col;
  }
  return b;
};

// write zip footer (end of central directory)
const wzf = (o: Uint8Array, b: number, c: number, d: number, e: number): void => {
  wbytes(o, b, 0x6054b50); // skip disk
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};

type AsyncZipDat = ZHF & {
  // compressed data
  c: Uint8Array;
  // filename
  f: Uint8Array;
  // comment
  m?: Uint8Array;
  // unicode
  u: boolean;
};

/** Asynchronously creates a ZIP file
 * @param data The directory structure for the ZIP archive
 * @param opts The main options, merged with per-file options
 * @param cb The callback to call with the generated ZIP archive
 * @returns A function that can be used to immediately terminate the compression */
export function zip(data: AsyncZippable, opts: AsyncZipOptions, cb: ZipCallback): AsyncTerminable;
/** Asynchronously creates a ZIP file
 * @param data The directory structure for the ZIP archive
 * @param cb The callback to call with the generated ZIP archive
 * @returns A function that can be used to immediately terminate the compression */
export function zip(data: AsyncZippable, cb: ZipCallback): AsyncTerminable;
export function zip(data: AsyncZippable, opts: AsyncZipOptions | ZipCallback, cb?: ZipCallback): AsyncTerminable {
  if (!cb) {
    cb = opts as ZipCallback;
    opts = {};
  }
  if (typeof cb !== "function") err(7);
  const r: FlatZippable<true> = {};
  fltn(data, "", r, opts as AsyncZipOptions);
  const k = Object.keys(r);
  let lft = k.length;
  let o = 0;
  let tot = 0;
  const slft = lft;
  const files = new Array<AsyncZipDat>(lft);
  const term: AsyncTerminable[] = [];
  const tAll = (): void => {
    for (let i = 0; i < term.length; ++i) term[i]();
  };
  let cbd: ZipCallback = (a, b) => {
    mt(() => {
      cb(a, b);
    });
  };
  mt(() => {
    cbd = cb;
  });
  const cbf = (): void => {
    const out = new U8(tot + 22);
    const oe = o;
    const cdl = tot - o;
    tot = 0;
    for (let i = 0; i < slft; ++i) {
      const f = files[i];
      try {
        const l = f.c.length;
        wzh(out, tot, f, f.f, f.u, l);
        const badd = 30 + f.f.length + exfl(f.extra);
        const loc = tot + badd;
        out.set(f.c, loc);
        wzh(out, o, f, f.f, f.u, l, tot, f.m);
        o += 16 + badd + (f.m ? f.m.length : 0);
        tot = loc + l;
      } catch (e) {
        cbd(e as Error, null);
        return;
      }
    }
    wzf(out, o, files.length, cdl, oe);
    cbd(null, out);
  };
  if (!lft) cbf();
  // Cannot use lft because it can decrease
  for (let i = 0; i < slft; ++i) {
    const fn = k[i];
    const [file, p] = r[fn];
    const c = crc();
    const size = file.length;
    c.p(file);
    const f = strToU8(fn);
    const s = f.length;
    const com = p.comment;
    const m = com ? strToU8(com) : undefined;
    const ms = m ? m.length : 0;
    const exl = exfl(p.extra);
    const compression = p.level === 0 ? 0 : 8;
    // eslint-disable-next-line no-loop-func -- callback intentionally updates shared counters
    const cbl = (e: ZipError | Error | null, d: Uint8Array | null): void => {
      if (e) {
        tAll();
        cbd(e, null);
      } else {
        const l = d!.length;
        files[i] = mrg(p, {
          size,
          crc: c.d(),
          c: d!,
          f,
          m,
          u: s !== fn.length || (!!com && com.length !== ms),
          compression,
        });
        o += 30 + s + exl + l;
        tot += 76 + 2 * (s + exl) + ms + l;
        if (!--lft) cbf();
      }
    };
    if (s > 65535) {
      // filename too long: report and skip this entry to avoid a 2nd callback + corrupt archive
      cbl(err(11, 0, 1), null);
      continue;
    }
    if (!compression) cbl(null, file);
    else if (size < 160000) {
      try {
        cbl(null, deflateSync(file, p));
      } catch (e) {
        cbl(e as Error, null);
      }
    } else term.push(deflate(file, p, cbl));
  }
  return tAll;
}

const mt: (fn: () => void) => void = (() => {
  if (typeof queueMicrotask === "function") return queueMicrotask;
  if (typeof setTimeout === "function") return setTimeout;
  return (fn: () => void) => fn();
})();

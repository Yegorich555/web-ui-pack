/** Returns parsed date from string based on pointed format
 * @param format 'yyyy-MM-dd hh:mm:ss.fff AZ'
 * @example
 * "yyyy-MM-dd hh:mm:ss.fff Z" => "2022-04-23 16:09:12.234" // point 'Z' at the end for UTCdate
 * "yyyy-MM-dd hh:mm:ss a" => "2022-04-23 04:09:12 pm" // point 'a' or 'A' at the end for 12hour format
 * "yyyy-MM-dd hh:mm:ss.fff aZ" => "2022-04-23 04:09:12 pm" // point 'Z' at the end for UTCdate
 * "yyyy-MM-dd hh:mm:ss" => "2022-04-23 16:09:12"
 * "yyyy-M-d h:m:s" => "2022-4-23 13:9:12"
 * "dd/MM/yyyy" => "23/04/2022"
 * "yyyy-MM-ddThh:mm:ss.fffZ" // ISOstring
 * "YYYYMMDD hhmmss" etc.
 */
export default function dateFromString(
  v: string,
  format = "YYYY-MM-DD",
  options: {
    /** Disable partially matching format
     *    strict: false => "yyy-MM-dd" and "2022-05" returns date (but "2022-05-6" returns null)
     *    strict: true => "yyy-MM-dd" and "2022-05" returns null
     * @defaultValue true
     */
    strict?: boolean;
    /** Output value returns true if detected out of range value: day > 31 etc. */
    isOutOfRange?: boolean;
  } = { strict: true }
): Date | null {
  if (!v) {
    return null;
  }
  const isUTC = format.endsWith("Z") || format.endsWith("z");
  format = isUTC ? format.substring(0, format.length - 1) : format;

  const h12 = format.endsWith("a") || format.endsWith("A") ? format[format.length - 1] : "";
  format = h12 ? format.substring(0, format.length - 1) : format;

  let char = format[0];
  let cnt = 1;
  const r = { y: 0, M: 1, d: 1, h: 0, m: 0, s: 0, f: 0 };

  let iShift = 0;
  let i = 1;
  const ln = options.strict ? format.length : Math.min(v.length, format.length);
  // const ln = format.length;
  for (; i <= ln; ++i) {
    const ch = format[i];
    if (char !== ch) {
      // prettier-ignore
      switch (char) {
        case "Y": char = "y"; break;
        case "D": char = "d"; break;
        case "H": char = "h"; break;
        case "S": char = "s"; break;
        case "F": char = "f"; break;
        default: break;
      }
      if (r[char as keyof typeof r] !== undefined) {
        if (cnt === 1) {
          const n = v.charCodeAt(i - cnt + 1) - 48; // checking next char
          if (n >= 0 && n <= 9) {
            ++cnt; // for case "YYYY-M-D" => "2022-11-24"
            ++iShift;
          }
        }
        const k = i + iShift;
        const s = v.substring(k - cnt, k);
        r[char as keyof typeof r] = Number.parseInt(s, 10);
        if (s.length !== cnt) {
          // --r.M;
          // options.isOutOfRange = isOutOfRange(r, isUTC, null);
          return null;
        }
      }
      char = ch;
      cnt = 1;
    } else {
      ++cnt;
    }
  }

  if (h12) {
    char = v[v.length - 2];
    if (char === "P" || char === "p") {
      r.h += 12;
    } else if (char !== "A" && char !== "a") {
      return null;
    } else if (r.h === 12) {
      r.h = 0; // 12:00 AM means 00:00
    }
  }

  --r.M;
  let dt: Date;
  if (isUTC) {
    dt = new Date(Date.UTC(r.y, r.M, r.d, r.h, r.m, r.s, r.f));
  } else {
    dt = new Date(r.y, r.M, r.d, r.h, r.m, r.s, r.f);
  }
  if (Number.isNaN(dt.valueOf())) {
    return null;
  }

  options.isOutOfRange = isOutOfRange(r, isUTC, dt);
  if (options.isOutOfRange) {
    return null;
  }

  if (options.strict) {
    const usedLn = i + iShift - 1;
    const expectedLn = v.length - (h12 ? 2 : 0) - (isUTC && (v.endsWith("z") || v.endsWith("Z")) ? 1 : 0);
    if (usedLn !== expectedLn) {
      return null;
    }
  }

  return dt;
}

function isOutOfRange(
  r: { y: number; M: number; d: number; h: number; m: number; s: number; f: number },
  isUTC: boolean,
  v: Date | null
): boolean {
  // NiceToHave: expect(getOutOfRange("2022-2", "yyyy-MM-dd")).toBe(true)
  return (
    r.M < 0 ||
    r.M > 11 ||
    r.d < 1 ||
    r.d > 31 ||
    r.h > 23 ||
    r.m > 59 ||
    r.s > 59 ||
    r.f > 999 ||
    (v && r.M !== v[`get${isUTC ? "UTC" : ""}Month`]()) ||
    false
  );
}

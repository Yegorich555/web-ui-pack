import localeInfo from "./localeInfo";

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
 * "MMM d/yyyy, hh:mm A" => "Apr 23, 04:09 PM" (depends on localeInfo.namesMonthShort)
 * "YYYYMMDD hhmmss" etc.
 * @tutorial Troubleshooting
 * * AM PM in the middle isn't supported (only at the end): use  'hh:mm, d/m/yyyy A' instead 'hh:mm A, d/m/yyyy'
 */
export default function dateFromString(
  v: string,
  format = "YYYY-MM-DD",
  options: {
    /** Enables rule: if detected out of range value: day > 31 etc. then throws exeption "Out of range";
     *  Disable it to return `null` instead
     * @defaultValue true */
    throwOutOfRange?: boolean;
  } = { throwOutOfRange: true }
): Date | null {
  if (!v) {
    return null;
  }

  // support for MMM format
  format = format.replace(/MMM/, () /* (_s: string, _index: number) */ => {
    localeInfo.namesMonthShort.some((name, i) => {
      let isFound = false;
      v = v.replace(name, () => {
        isFound = true;
        return (i + 1).toString();
      });
      return isFound;
    });
    return "M";
  });

  let fLast = format.length - 1;
  const isUTC = format.endsWith("Z") || format.endsWith("z");
  fLast -= isUTC ? 1 : 0;

  const h12 = format[fLast] === "a" || format[fLast] === "A";
  let vLast = v.length - 1;
  if (h12) {
    fLast -= 1;
    vLast -= 2;
  }

  const r = { y: 0, M: 0, d: 0, h: 0, m: 0, s: 0, f: 0 };

  let vi = 0;
  let yCnt = 0;
  for (let fi = 0; vi <= vLast; ++vi, ++fi) {
    let char = format[fi];
    // prettier-ignore
    switch (char) {
        case "Y": char = "y"; break;
        case "D": char = "d"; break;
        case "H": char = "h"; break;
        case "S": char = "s"; break;
        case "F": char = "f"; break;
        default: break;
      }
    const num = v.charCodeAt(vi) - 48;
    const isNum = num >= 0 && num <= 9;
    const key = char as keyof typeof r;

    if (isNum) {
      if (r[key] !== undefined) {
        r[key] = r[key] * 10 + num;
        if (key === "y") {
          ++yCnt;
        }
      } else {
        // rollback to prev
        fi -= 2;
        vi -= 1;
      }
    } else if (char !== v[vi]) {
      return null; // if dateFromString("202A-BB-DD", "YYYY-MM-DD")
    }
  }

  if (h12) {
    const char = v[v.length - 2];
    if (char === "P" || char === "p") {
      r.h += 12;
    } else if (char !== "A" && char !== "a") {
      return null;
    } else if (r.h === 12) {
      r.h = 0; // 12:00 AM means 00:00
    }
  }

  if (yCnt === 2) {
    r.y += 2000; // to support "YY-MM-DD" => "22-01-02"
  }

  --r.M;
  let dt: Date;
  if (isUTC) {
    dt = new Date(Date.UTC(r.y, r.M, r.d, r.h, r.m, r.s, r.f));
  } else {
    dt = new Date(r.y, r.M, r.d, r.h, r.m, r.s, r.f);
  }

  // case impossible
  // if (Number.isNaN(dt.valueOf())) {
  //   return null;
  // }

  const isOut = isOutOfRange(r, isUTC, dt);
  if (isOut && options.throwOutOfRange) {
    const err = RangeError("Out of range") as RangeError & { details: any };
    err.details = { format, raw: v, options, parsed: r };
    console.warn(`${err.message}. Details:`, err.details);
    throw err;
  } else if (isOut) {
    return null;
  }

  return dt;
}

function isOutOfRange(
  r: { y: number; M: number; d: number; h: number; m: number; s: number; f: number },
  isUTC: boolean,
  v: Date | null
): boolean {
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

// console.warn(dateFromString("Apr 23/2022, 04:09 PM", "MMM d/yyyy, hh:mm A"));
// console.warn(dateFromString("04:09 AM, Apr 23/2022", "hh:mm, MMM d/yyyy"));

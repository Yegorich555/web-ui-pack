export function zeroBefore(v: number, length: number): string {
  const s = `${v}`;
  const rc = length - s.length;
  if (rc > 0) {
    return "0".repeat(rc) + s;
  }
  return s;
}

/** Returns a string representation of a date-time according to pointed format
 * @param format 'yyyy-MM-dd hh:mm:ss.fff AZ'
 * @example
 * "yyyy-MM-dd hh:mm:ss.fff Z" => "2022-04-23 16:09:12.234" // point 'Z' at the end for UTCdate
 * "yyyy-MM-dd hh:mm:ss a" => "2022-04-23 04:09:12 pm" // point 'a' or 'A' at the end for 12hour format
 * "yyyy-MM-dd hh:mm:ss.fff aZ" => "2022-04-23 04:09:12 pm" // point 'Z' at the end for UTCdate
 * "yyyy-MM-dd hh:mm:ss" => "2022-04-23 16:09:12"
 * "yyyy-M-d h:m:s" => "2022-4-23 13:9:12"
 * "dd/MM/yyyy" => "23/04/2022"
 */
export default function dateToString(v: Date, format: string): string {
  if (Number.isNaN(v.valueOf())) {
    return "NaN";
  }
  const isUTC = format.endsWith("Z") || format.endsWith("z");
  format = isUTC ? format.substring(0, format.length - 1) : format;
  const ukey = isUTC ? "UTC" : "";

  let h12 = format.endsWith("a") || format.endsWith("A") ? format[format.length - 1] : "";
  format = h12 ? format.substring(0, format.length - 1) : format;

  let char = format[0];
  let cnt = 1;
  let s = "";
  for (let i = 1; i <= format.length; ++i) {
    const ch = format[i];
    if (char !== ch) {
      switch (char) {
        case "y":
        case "Y":
          s += zeroBefore(v[`get${ukey}FullYear`].call(v), cnt);
          break;
        case "M": // todo allow yyyy-mm-dd
          s += zeroBefore(v[`get${ukey}Month`].call(v) + 1, cnt);
          break;
        case "d":
        case "D":
          s += zeroBefore(v[`get${ukey}Date`].call(v), cnt);
          break;
        case "h":
        case "H":
          {
            const hh = v[`get${ukey}Hours`].call(v);
            s += zeroBefore(h12 ? hh % 12 || 12 : hh, cnt);
            if (h12) {
              // eslint-disable-next-line no-nested-ternary
              h12 = hh < 12 ? (h12 === "A" ? "AM" : "am") : h12 === "A" ? "PM" : "pm";
            }
          }
          break;
        case "m":
          s += zeroBefore(v[`get${ukey}Minutes`].call(v), cnt);
          break;
        case "s":
        case "S":
          s += zeroBefore(v[`get${ukey}Seconds`].call(v), cnt);
          break;
        case "f":
        case "F":
          s += zeroBefore(v[`get${ukey}Milliseconds`].call(v), cnt);
          break;
        default: {
          s += char.repeat(cnt);
        }
      }
      char = ch;
      cnt = 1;
    } else {
      ++cnt;
    }
  }

  return s + h12;
}

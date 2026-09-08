import { stringPrettify } from "../string";
import dateToString from "../dateToString";
import localeInfo from "../../objects/localeInfo";

/** New-line between rows: `CRLF` is required by RFC 4180 & is expected by Excel */
const newLine = "\r\n";

/** Returns the first possible char in the 1st row as delimiter: `TAB`, `|`, `;` or `,`; it's `;` when none is found */
export function csvDefineDelimiter(csv: string): ";" | "\t" | "|" | "," {
  for (let i = 0; i < csv.length; ++i) {
    const c = csv[i];
    if (c === ";" || c === "," || c === "|" || c === "\t") {
      return c;
    }
    if (c === "\n" || c === "\r") {
      break; // only the 1st row matters
    }
  }
  return ";";
}

export interface ICsvFormat {
  /** Format that a `Date` is rendered by; it's a {@link dateToString} format (`yyyy-MM-dd hh:mm:ss A`)
   * @defaultValue {@link localeInfo.dateTime} */
  dateTimeFormat?: string;
  /** Text for `null` & `undefined` values
   * @defaultValue "" */
  nullFormat?: string;
  /** Returns text for a `boolean` value
   * @defaultValue `(v) => (v ? "true" : "false")` */
  boolFormat?: (v: boolean) => string;
}

/** Returns text of a value according to pointed mapping (everything else is stringified by `value.toString()`) */
function csvFromValue(v: unknown, format: Required<ICsvFormat>): string {
  if (v == null) {
    return format.nullFormat;
  }
  if (typeof v === "string") {
    return v; // the most often case: nothing to convert at all
  }
  if (typeof v === "boolean") {
    return format.boolFormat(v);
  }
  return v instanceof Date ? dateToString(v, format.dateTimeFormat) : (v as any).toString();
}

/** Single column of the csv: the item-property that fills it & the text of its header-cell */
export interface ICsvColumnMap<T = any> {
  /** Item property name to map on csv column */
  propName: keyof T;
  /** Text of header, if `undefined` then extacted from propName via stringPrettify() */
  headerText?: string;
}

export interface ICsvOptions {
  /** Single char that separates the values inside a row
   * @defaultValue "|" */
  delimiter?: string;
  /** Rules that a value is stringified by */
  format?: ICsvFormat;
}

/** Returns csv string from pointed data
 * @param mapping columns of the result; by default every own prop of every item becomes a column & the header-row
 * contains the property names as they are, so such a result can be parsed back by {@link csvToData}
 * @tutorial Troubleshooting
 * * a value is never escaped/quoted, so a value that contains the delimiter or a new-line breaks the structure
 * of the file: pick a delimiter that the data doesn't contain */
export function csvFromData<T extends Record<string, any>>(
  items: Array<T>,
  mapping: Array<ICsvColumnMap<T>>,
  options?: ICsvOptions
): string {
  const d = options?.delimiter ?? "|";
  const f: Required<ICsvFormat> = {
    // the locale can be refreshed after this module is imported, so the default is resolved here & not statically
    dateTimeFormat: options?.format?.dateTimeFormat || localeInfo.dateTime,
    nullFormat: options?.format?.nullFormat ?? "",
    boolFormat: options?.format?.boolFormat ?? ((v) => (v ? "true" : "false")),
  };

  let csv = mapping.map((x) => x.headerText ?? stringPrettify(x.propName as string)).join(d) + newLine;

  const lastInd = mapping.length - 1;
  items.forEach((row) => {
    mapping.forEach((col, i) => {
      const nextStrVal = csvFromValue(row[col.propName], f);
      if (nextStrVal) {
        csv += nextStrVal;
      }
      csv += i === lastInd ? newLine : d;
    });
  });

  return csv;
}

/** Returns array of objects parsed from csv: the 1st row is expected to be a header-row with the property names;
 * every value stays a string, so convert it itself if a number/date/boolean is expected
 * @param delimiter single char; by default it's auto-defined by {@link csvDefineDelimiter}
 * @tutorial Troubleshooting
 * * a quoted value isn't supported (for the sake of the performance): a `"` is an ordinary char & a delimiter
 * or a new-line always ends the value/row - even inside quotes */
export function csvToData<T>(csv: string, delimiter?: string): Array<T> {
  delimiter ??= csvDefineDelimiter(csv);
  if (csv.charCodeAt(0) === 0xfeff) {
    csv = csv.substring(1); // BOM: Excel & other tools mark an utf8-file by it and it's not a part of the 1st prop
  }

  const props: string[] = []; // the header-row: prop-names for the returned items
  const items: T[] = [];
  let item: Record<string, string> = {}; // the item that is filled now (it's thrown away for the header-row)
  let isHeader = true;
  let hasValue = false; // a row without any value at all is skipped: it's just a spare new-line
  let iCol = 0;
  // charCodeAt() + int-compare instead of csv[i] + string-compare: it's the hottest loop of the whole file
  const dCode = delimiter.charCodeAt(0);
  const len = csv.length;

  for (let i = 0; ; ) {
    /* ---------- a single value ---------- */
    const iStart = i;
    while (i < len) {
      const c = csv.charCodeAt(i);
      if (c === dCode || c === 10 /* \n */ || c === 13 /* \r */) {
        break;
      }
      ++i;
    }
    const v = csv.substring(iStart, i);

    if (isHeader) {
      props.push(v);
    } else {
      item[props[iCol] ?? iCol] = v; // an extra value that the header doesn't cover gets its index
      if (v !== "") {
        hasValue = true;
      }
    }
    ++iCol;

    /* ---------- the end of the row ---------- */
    if (i < len && csv.charCodeAt(i) === dCode) {
      ++i;
      continue; // the next value of the very same row
    }

    if (isHeader) {
      isHeader = false;
    } else if (hasValue) {
      items.push(item as T);
    }
    item = {};
    hasValue = false;
    iCol = 0;

    if (i >= len) {
      break; // the file is over: the last row can be an empty one - it's skipped above
    }
    i += csv.charCodeAt(i) === 13 /* \r */ && csv.charCodeAt(i + 1) === 10 /* \n */ ? 2 : 1;
  }

  return items;
}

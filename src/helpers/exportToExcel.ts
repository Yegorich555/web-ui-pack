import zip from "./zip";
import { stringPrettify } from "./string";
import dateToString from "./dateToString";
import localeInfo from "../objects/localeInfo";

/** Main concepts: max performance and min memory consumption on excel sheet generation.
 *
 * The module is split by the lifetime of the parts:
 * - pure helpers & static xml-parts are defined on the module-level: allocated once instead of on every export;
 * - {@link createStyles} is the only stateful collector: Excel stores every font/fill once & a cell refers to it;
 * - {@link renderSheet} is a single pass over the data: a value is measured & rendered at once, so nothing
 *   per-cell is kept in memory (see the comment there);
 * - {@link exportToExcel} is an orchestrator: builds the per-export {@link IExportContext} & zips the result. */

export interface IExcelFont {
  /** Size of the font in points
   * @defaultValue 11 */
  size?: number;
  /** Name of the font; must be installed on the machine where the document is opened
   * @defaultValue "Calibri" */
  family?: string; // todo OR explicit known strings ???
  /** Style of the text; only a single one is applicable at once */
  style?: "bold" | "italic" | "underline";
  /** Color of the text in hex-format `#rrggbb`, ex. `#ff0000`;
   * an unparsable value is ignored (so the inherited color stays applied) */
  color?: string;
  /** Background color of the cell
   * @see {@link IExcelFont.color} for the supported format */
  backgroundColor?: string;
}

export interface IExcelColumnMap<T = any> {
  /** Item property name to map on excel cell per column */
  propName: keyof T;
  /** Text of header, if `undefined` then extacted from propName via stringPrettify() */
  headerText?: string;
  /** Font for the header cell of the column; missed options are inherited from the sheet-font
   * @defaultValue {@link exportToExcel.$defaults.fontHeader} + {@link exportToExcel.$defaults.font} => `{ size: 11, family: "Calibri", style: 'bold' }` */
  headerFont?: IExcelFont;
  /** Width for column; by default it's auto-defined by the longest content */
  width?: number;
  /** Limit max width for column */
  maxWidth?: number;
}

export interface IExcelSheet<T = any> {
  /** Items to paste into excel according to mapping in columns */
  data: Array<T>;
  /** Mapping config */
  mapping: IExcelColumnMap<T>[];
  /** Name of the Excel tab; default is `Sheet{number}` */
  name?: string;
  /** Font for excelSheet
   * @defaultValue {@link exportToExcel.$defaults.font} => `{ size: 11, family: "Calibri" }` */
  font?: IExcelFont;
}

/** Font with the options that are required by the file-format (so it's always ready to be rendered) */
type IExcelFontFull = IExcelFont & Required<Pick<IExcelFont, "size" | "family">>;

/** Rendered xml-parts of a sheet: the data is never stored cell-by-cell, only the ready-to-use content */
interface ISheetParts {
  /** Content of `<sheetData>` (the header-row + every data-row) already encoded into UTF-8 chunks */
  rows: IUtf8Writer;
  /** Content of `<cols>`: the resolved width of every column */
  colsXml: string;
  /** Header texts of the columns: required by the table-part */
  headers: Array<string>;
  /** Excel-name of the last column: required by the table-ref */
  lastLetter: string;
  /** Count of the data-rows (without the header-row) */
  rowsCount: number;
}

/** Sheet ready to be rendered into the file-parts */
interface IExportSheet {
  /** Number of the sheet: Excel enumerates the files & the ids from 1 */
  num: number;
  /** Escaped name of the excel-tab */
  name: string;
  parts: ISheetParts;
  /** An empty table (a header row without data) is treated by Excel as a broken content, so it's skipped at all */
  hasTable: boolean;
}

/** Options that are the same for every sheet of the export: created once per {@link exportToExcel} call */
interface IExportContext {
  /** Collector of the document styles */
  styles: IStyles;
  /** Font of the document: {@link exportToExcel.$defaults.font} merged into the format-required base */
  font: IExcelFontFull;
  /** Font of the header-row: {@link exportToExcel.$defaults.fontHeader} */
  fontHeader: IExcelFont | undefined;
  /** Width in px of a single Excel-unit of the column width */
  unitPx: number;
  /** @see {@link exportToExcel.$defaults.getCellValue} */
  getCellValue: <T>(headerKey: IExcelColumnMap<T>, v: T[keyof T]) => string;
}

/* ---------------------------------- Shared helpers ---------------------------------- */

const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

const escapeRE = /[&<>"'`]/g;
/** Non-global twin of {@link escapeRE} - `test()` takes the fast regexp-path, while `replace()` with a callback
 * takes the generic one even if nothing matches. Almost no cell needs escaping, so the pre-check is ~3x cheaper */
const escapeTestRE = /[&<>"'`]/;
const escapeChar = (m: string): string => escapeMap[m as keyof typeof escapeMap];

/** Escapes the chars that aren't allowed in the xml-content; called for every single cell, so it's a hot path */
const escape = (str: string): string => (escapeTestRE.test(str) ? str.replace(escapeRE, escapeChar) : str);

// created lazily: some environments (jsdom in the tests) get the global only after this module is imported
let textEncoder: TextEncoder | undefined;

/** Encodes the string into the UTF-8 bytes that the archive is built from */
function encodeUtf8(str: string): Uint8Array {
  textEncoder ??= new TextEncoder();
  return textEncoder.encode(str);
}

/** Size of the pending string that triggers the encoding; a bigger one saves a few `encode()` calls but keeps
 * a bigger temporary string alive - and the whole point of the writer is to never grow such a string */
const chunkChars = 64 * 1024;

/** Collector of a big xml: the pieces are encoded chunk by chunk, so the document never exists as a single huge
 * JS string. `encode()` of a 30MB string first flattens it (a full copy of the text) and only then allocates the
 * bytes - here the temporary string never exceeds {@link chunkChars} & only the final buffer is allocated at once */
interface IUtf8Writer {
  /** Appends a complete piece of the xml (never a half of it - see the note in {@link createUtf8Writer}) */
  add(str: string): void;
  /** Encodes the rest & joins everything into a single buffer wrapped by the pointed xml-parts.
   * WARN: it can be called only once - the collected chunks are released while they are being copied */
  toBytes(prefix: string, suffix: string): Uint8Array;
}

const emptyBytes = new Uint8Array(0);

function createUtf8Writer(): IUtf8Writer {
  const chunks: Array<Uint8Array> = [];
  let total = 0;
  let pending = "";

  /** WARN: the whole `pending` is encoded at once, so a chunk always ends on an `add()` boundary - splitting it
   * by a fixed length instead could cut a surrogate pair in half & turn an emoji into a pair of `U+FFFD` */
  const flush = (): void => {
    if (!pending) return;
    const bytes = encodeUtf8(pending);
    chunks.push(bytes);
    total += bytes.length;
    pending = "";
  };

  return {
    add(str: string): void {
      pending += str;
      if (pending.length >= chunkChars) flush();
    },
    toBytes(prefix: string, suffix: string): Uint8Array {
      flush();
      const pre = prefix ? encodeUtf8(prefix) : emptyBytes;
      const post = suffix ? encodeUtf8(suffix) : emptyBytes;
      const result = new Uint8Array(pre.length + total + post.length);
      result.set(pre, 0);
      let offset = pre.length;
      for (let i = 0; i < chunks.length; ++i) {
        const chunk = chunks[i];
        result.set(chunk, offset);
        offset += chunk.length;
        chunks[i] = emptyBytes; // let the chunk be collected while the rest is still being copied
      }
      result.set(post, offset);
      chunks.length = 0;
      total = 0;
      return result;
    },
  };
}

/** Line-separator inside a cell (array values are joined by it) */
const newLineCode = 10;
const newLine = String.fromCharCode(newLineCode);

/** `BCKPRXbdehnopqu` & non-latin (cyrillic etc.) chars are 8px wide */
const defaultCharPx = 8;

/** Auto-width of a column: the file-format has no auto-width at all - `bestFit` is only a marker & Excel never
 * re-measures such a column, so the width must be estimated here.
 * Everything is calculated in pixels of the default font (Calibri 11, see {@link exportToExcel.$defaults.font}),
 * scaled to the really applied font & converted into Excel-units (the widest digit of the document font) at the end */
const autoWidth = {
  /** Excel's unit of the column width: the widest digit of the document font */
  maxDigitPx: 7,
  /** Font-size (in points) that `charPx` & `maxDigitPx` are measured for */
  basePt: 11,
  /** A bold text is ~6% wider than the regular one */
  boldRatio: 1.06,
  /** Excel reserves 5px inside a cell (2px padding on both sides + 1px for the border) + 2px as a gap */
  cellPaddingPx: 7,
  /** Space for the autoFilter dropdown button in a header cell */
  filterButtonPx: 18,
  /** Char width in px indexed by the char-code (only ASCII: every other char is `defaultCharPx`), measured via GDI
   * itself (TextRenderer.MeasureText of a char repeated 100 times / 100):
   * Excel renders a cell text via GDI, where every glyph advance is rounded to a whole pixel - so summing
   * fractional font-metrics instead under-estimates a long text by ~7% and cuts it off.
   * It's built eagerly on purpose: 128 bytes + ~65µs once on the import, against a lazy-init check that would
   * land on the hottest loop of the whole export (getTextPx runs it per char of every cell).
   * WARN: re-measure these values if {@link exportToExcel.$defaults.font} is changed */
  charPx: ((): Uint8Array => {
    const groups: Array<[number, string]> = [
      [3, " '"],
      [4, ",.:;Iijl`"],
      [5, "!()-J[]frt{}"],
      [6, '"/Lcsz\\'],
      [7, "0123456789#$*+<=>?EFSTYZ^_agkvxy|~"],
      [9, "ADGHUV"],
      [10, "NOQ&"],
      [11, "%w"],
      [12, "Mm"],
      [13, "@W"],
    ];
    const result = new Uint8Array(128).fill(defaultCharPx);
    groups.forEach(([px, chars]) => {
      for (let i = 0; i < chars.length; ++i) result[chars.charCodeAt(i)] = px;
    });
    return result;
  })(),

  /** Ratio between the pointed font & the one that `charPx` is measured for */
  getScale(font: IExcelFontFull): number {
    return (font.size / autoWidth.basePt) * (font.style === "bold" ? autoWidth.boldRatio : 1);
  },
  /** Width in px of the longest line of the text; called for every single cell, so it's a hot path */
  getTextPx(text: string): number {
    const { charPx } = autoWidth; // a local is cheaper than a property-load on every char
    let max = 0;
    let line = 0;
    for (let i = 0; i < text.length; ++i) {
      const code = text.charCodeAt(i);
      if (code === newLineCode) {
        if (line > max) max = line;
        line = 0;
      } else line += code < 128 ? charPx[code] : defaultCharPx;
    }
    return line > max ? line : max;
  },
  /** Converts px into Excel-units (rounded to 1/100 to keep the xml small) */
  toUnits(px: number, unitPx: number): number {
    return Math.ceil((px / unitPx) * 100) / 100;
  },
};

/** Converts `#rrggbb` into the ARGB-hex that the file-format requires (`FF` is a fully opaque color);
 * `undefined` if the value isn't parsable */
function toARGB(color: string | undefined): string | undefined {
  const hex = color?.replace("#", "");
  return hex && /^[\da-f]{6}$/i.test(hex) ? `FF${hex.toUpperCase()}` : undefined;
}

/** Base font of the document: the file-format requires size & family to be always defined */
const baseFont: IExcelFontFull = { size: 11, family: "Calibri" };

const fontStyleXml: Record<Required<IExcelFont>["style"], string> = {
  bold: "<b/>",
  italic: "<i/>",
  underline: "<u/>",
};

/** Merges fonts from left to right; only defined options are taken (so a user can skip any of them);
 * an unparsable color is skipped either - so the inherited one isn't lost because of a typo */
function mergeFont(base: IExcelFontFull, ...fonts: Array<IExcelFont | undefined>): IExcelFontFull {
  const result: IExcelFontFull = { ...base };
  for (let i = 0; i < fonts.length; ++i) {
    const font = fonts[i];
    if (!font) continue;
    const keys = Object.keys(font) as Array<keyof IExcelFont>;
    for (let k = 0; k < keys.length; ++k) {
      const key = keys[k];
      const value = font[key];
      if (value === undefined) continue;
      if ((key === "color" || key === "backgroundColor") && !toARGB(value as string)) continue;
      (result[key] as unknown) = value;
    }
  }
  return result;
}

/** Excel-name of the column by its index: `A`, `B`, ... `Z`, `AA`, `AB` etc. */
function getColumnLetter(colIndex: number): string {
  let name = "";
  for (let i = colIndex; i >= 0; i = Math.floor(i / 26) - 1) {
    name = String.fromCharCode(65 + (i % 26)) + name;
  }
  return name;
}

/** Text of the header-cell: an explicit one or prettified propName */
function getHeaderText(header: IExcelColumnMap): string {
  return header.headerText !== undefined ? header.headerText : stringPrettify(header.propName as string);
}

/* ------------------------------------- Styles --------------------------------------- */

/** Storage of unique xml-parts of `styles.xml` */
interface IStylesCollection {
  /** Registered parts in the order of the indexes */
  items: Array<string>;
  /** Returns an index of the part & appends it if it's not registered yet */
  indexOf(xml: string): number;
}

interface IStyles {
  /** Returns the ready-to-use style-attribute of a cell (`s="1" `) according to the pointed font;
   * an empty string for the default format - it's applied by Excel itself & mustn't be set per cell */
  getCellStyle(font: IExcelFontFull, isWrapText: boolean): string;
  /** Content of `xl/styles.xml`: call it when all the sheets are generated */
  toXml(): string;
}

const styleSheetHead = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">`;

const styleSheetTail = `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/><extLst><ext uri="{EB79DEF2-80B8-43e5-95BD-54CBDDF9020C}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:slicerStyles defaultSlicerStyle="SlicerStyleLight1"/></ext><ext uri="{9260A510-F301-46a8-8635-F512D64BE5F5}" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main"><x15:timelineStyles defaultTimelineStyle="TimeSlicerStyleLight1"/></ext></extLst></styleSheet>`;

/** Creates a storage of the unique xml-parts; `startIndex` is the 1st index that a custom part can take */
function createStylesCollection(startIndex = 0): IStylesCollection {
  const items: Array<string> = [];
  const indexes = new Map<string, number>();
  return {
    items,
    indexOf(xml: string): number {
      let i = indexes.get(xml);
      if (i === undefined) {
        i = items.length + startIndex;
        indexes.set(xml, i);
        items.push(xml);
      }
      return i;
    },
  };
}

function getFontXml(f: IExcelFontFull): string {
  const color = toARGB(f.color);
  return (
    `<font>${f.style ? fontStyleXml[f.style] : ""}<sz val="${f.size}"/>` +
    `${color ? `<color rgb="${color}"/>` : ""}<name val="${escape(f.family)}"/><family val="2"/></font>`
  );
}

/** Collector of the document styles: Excel stores every font/fill/cell-format once & a cell refers to it by index */
function createStyles(defaultFont: IExcelFontFull): IStyles {
  const fonts = createStylesCollection();
  /** Excel reserves the first 2 fills for itself (`none` & `gray125`), so a custom one starts from the index 2 */
  const fills = createStylesCollection(2);
  const cellXfs = createStylesCollection();

  const styles: IStyles = {
    getCellStyle(font: IExcelFontFull, isWrapText: boolean): string {
      const fontId = fonts.indexOf(getFontXml(font));
      const bgColor = toARGB(font.backgroundColor);
      const fillId = bgColor
        ? fills.indexOf(
            `<fill><patternFill patternType="solid"><fgColor rgb="${bgColor}"/><bgColor indexed="64"/></patternFill></fill>`
          )
        : 0;
      const id = cellXfs.indexOf(
        `<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="0" xfId="0" applyFont="1"` +
          `${fillId ? ` applyFill="1"` : ""} applyAlignment="1">` +
          `<alignment vertical="top"${isWrapText ? ` wrapText="1"` : ""}/></xf>`
      );
      // Excel applies cellXfs[0] to a cell without the `s` attribute: so the default format costs nothing in the xml
      return id === 0 ? "" : `s="${id}" `;
    },
    toXml(): string {
      return (
        `${styleSheetHead}<fonts count="${fonts.items.length}">${fonts.items.join("")}</fonts>` +
        `<fills count="${fills.items.length + 2}"><fill><patternFill patternType="none"/></fill>` +
        `<fill><patternFill patternType="gray125"/></fill>${fills.items.join("")}</fills>` +
        `<borders count="1"><border/></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="${cellXfs.items.length}">${cellXfs.items.join("")}</cellXfs>${styleSheetTail}`
      );
    },
  };

  // the default font must be registered the 1st: Excel measures a column width in the widest digit of the font[0]
  styles.getCellStyle(defaultFont, false);
  return styles;
}

/* ----------------------------------- Sheet render ----------------------------------- */

/** Maps the data of the sheet & renders it into the xml-parts.
 *
 * A single pass over the data: a cell value is measured for the auto-width & appended to the xml at once, so
 * nothing is stored per cell. Keeping the mapped values instead (as `Array<Array<{value, style}>>`) costs an array
 * per row + an object & a retained string per cell and forces 2 extra passes over the whole dataset. */
function renderSheet(sheet: IExcelSheet, ctx: IExportContext): ISheetParts {
  const { styles, getCellValue } = ctx;
  const columns = sheet.mapping;
  const colCount = columns.length;
  const font = mergeFont(ctx.font, sheet.font);
  // a font is the same for every cell of the sheet, so the styles are defined once & re-used by all the rows
  const cellStyle = styles.getCellStyle(font, false);
  const cellStyleWrap = styles.getCellStyle(font, true);
  const rowScale = autoWidth.getScale(font);
  // the same for the header-row: a column re-merges it only if it has an own font
  const sheetHeaderFont = mergeFont(font, ctx.fontHeader);

  /** Excel-names of the columns: `A`, `B`, ... `AA`; cached because every single cell refers to it */
  const letters: Array<string> = [];
  const headers: Array<string> = [];
  /** Widest content of the column in px; `-1` marks a column with an explicit width (nothing to measure) */
  const maxPx = new Float64Array(colCount);
  let headerCells = "";

  for (let c = 0; c < colCount; ++c) {
    const h = columns[c];
    const text = getHeaderText(h);
    const headerFont = h.headerFont ? mergeFont(sheetHeaderFont, h.headerFont) : sheetHeaderFont;
    const letter = getColumnLetter(c);
    letters.push(letter);
    headers.push(text);
    maxPx[c] =
      h.width !== undefined
        ? -1
        : autoWidth.getTextPx(text) * autoWidth.getScale(headerFont) + autoWidth.filterButtonPx;
    const style = styles.getCellStyle(headerFont, false);
    headerCells += `<c r="${letter}1" ${style}t="inlineStr"><is><t>${escape(text)}</t></is></c>`;
  }

  const { data } = sheet;
  const rows = createUtf8Writer();
  rows.add(`<row r="1">${headerCells}</row>`);

  for (let r = 0; r < data.length; ++r) {
    const item = data[r];
    // +1 to make it 1-based as Excel enumerates the rows & +1 for the header-row; stringified once per row
    const rowNum = `${r + 2}`;
    let cells = "";
    for (let c = 0; c < colCount; ++c) {
      const h = columns[c];
      const v = getCellValue(h, item[h.propName]);
      // an array is joined by the new-line, so such a cell must be wrapped
      const isArray = Array.isArray(v);
      let value = "";
      if (isArray) value = v.join(newLine);
      else if (v != null) value = v.toString();
      const px = maxPx[c];
      if (px >= 0) {
        const w = autoWidth.getTextPx(value) * rowScale;
        if (w > px) maxPx[c] = w;
      }
      cells += `<c r="${letters[c]}${rowNum}" ${isArray ? cellStyleWrap : cellStyle}t="inlineStr"><is><t>${escape(
        value
      )}</t></is></c>`;
    }
    rows.add(`<row r="${rowNum}">${cells}</row>`);
  }

  let colsXml = "";
  for (let c = 0; c < colCount; ++c) {
    const { width, maxWidth } = columns[c];
    // an explicit width wins; otherwise it's defined by the longest content measured above
    const w =
      width ??
      Math.min(autoWidth.toUnits(maxPx[c] + autoWidth.cellPaddingPx, ctx.unitPx), maxWidth ?? Number.MAX_SAFE_INTEGER);
    colsXml += `<col min="${c + 1}" max="${c + 1}" width="${w}" bestFit="1" customWidth="1"/>`;
  }

  return { rows, colsXml, headers, lastLetter: letters[colCount - 1], rowsCount: data.length };
}

/* --------------------------------- Xml generation ----------------------------------- */

const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const workbookHead = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mx="http://schemas.microsoft.com/office/mac/excel/2008/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><workbookPr/><sheets>`;

const workbookRelsHead = `<?xml version="1.0" ?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;

const workbookRelsTail = `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

const contentTypesHead = `<?xml version="1.0" ?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default ContentType="application/xml" Extension="xml"/><Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/>`;

const contentTypesTail = `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" PartName="/xl/workbook.xml"/><Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" PartName="/xl/styles.xml"/></Types>`;

const worksheetHead = `<?xml version="1.0" ?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:mx="http://schemas.microsoft.com/office/mac/excel/2008/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">`;

/** `xl/workbook.xml`: the list of the tabs of the document */
function getWorkbookXml(sheets: Array<IExportSheet>): string {
  let items = "";
  for (let i = 0; i < sheets.length; ++i) {
    const s = sheets[i];
    items += `<sheet state="visible" name="${s.name}" sheetId="${s.num}" r:id="rId${s.num + 2}"/>`;
  }
  return `${workbookHead}${items}</sheets><definedNames/><calcPr/></workbook>`;
}

/** `xl/_rels/workbook.xml.rels`: links from the workbook to the sheet-files & to the styles */
function getWorkbookRelsXml(sheets: Array<IExportSheet>): string {
  let items = "";
  for (let i = 0; i < sheets.length; ++i) {
    const { num } = sheets[i];
    items +=
      `<Relationship Id="rId${num + 2}" Target="worksheets/sheet${num}.xml" ` +
      `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>`;
  }
  return `${workbookRelsHead}${items}${workbookRelsTail}`;
}

/** `[Content_Types].xml`: the mime-type of every file inside the archive */
function getContentTypesXml(sheets: Array<IExportSheet>): string {
  let items = "";
  for (let i = 0; i < sheets.length; ++i) {
    const { num, hasTable } = sheets[i];
    items +=
      `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" ` +
      `PartName="/xl/worksheets/sheet${num}.xml"/>`;
    if (hasTable) {
      items +=
        `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml" ` +
        `PartName="/xl/tables/table${num}.xml"/>`;
    }
  }
  return `${contentTypesHead}${items}${contentTypesTail}`;
}

/** `xl/worksheets/sheet{num}.xml`: the widths of the columns + the header-row & the data-rows.
 * The rows are already encoded, so the head & the tail are only wrapped around them - the biggest file of the
 * document is never built as a string. `<cols>` has to go first, that's why the widths are resolved before it */
function getWorkSheetBytes({ parts, hasTable }: IExportSheet): Uint8Array {
  return parts.rows.toBytes(
    `${worksheetHead}<cols>${parts.colsXml}</cols><sheetData>`,
    `</sheetData>${hasTable ? `<tableParts count="1"><tablePart r:id="rId1"/></tableParts>` : ""}</worksheet>`
  );
}

/** `xl/tables/table{num}.xml`: the table over the data - it provides the autoFilter & the row-striping */
function getTableXml({ num, parts }: IExportSheet): string {
  const { headers } = parts;
  const ref = `A1:${parts.lastLetter}${parts.rowsCount + 1}`;

  let cols = "";
  for (let i = 0; i < headers.length; ++i) {
    cols += `<tableColumn id="${i + 1}" name="${escape(headers[i])}"/>`;
  }

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `id="${num}" name="Table${num}" displayName="Table${num}" ref="${ref}" insertRow="1" totalsRowShown="0">` +
    `<autoFilter ref="${ref}"/><tableColumns count="${headers.length}">${cols}</tableColumns>` +
    `<tableStyleInfo name="TableStyleLight16" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`
  );
}

/** `xl/worksheets/_rels/sheet{num}.xml.rels`: the link from the sheet to its table-file */
function getTableRelsXml(num: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${num}.xml"/></Relationships>`;
}

/* ----------------------------------- Orchestrator ----------------------------------- */

/** Export pointed data into excel-file according to provided mapping */
export default async function exportToExcel<T>(sheetsData: Array<IExcelSheet<T>>): Promise<Blob> {
  const { getCellValue, font, fontHeader } = exportToExcel.$defaults;
  const documentFont = mergeFont(baseFont, font);
  const ctx: IExportContext = {
    styles: createStyles(documentFont),
    font: documentFont,
    fontHeader,
    getCellValue,
    unitPx: autoWidth.maxDigitPx * (documentFont.size / autoWidth.basePt),
  };

  const sheets: Array<IExportSheet> = sheetsData.map((sheet, i) => {
    const num = i + 1;
    const parts = renderSheet(sheet, ctx);
    return {
      num,
      parts,
      /** Excel doesn't allow []:*?/\ in a tab name and cuts it by 31 chars */
      name: escape((sheet.name || `Sheet${num}`).replace(/[[\]:*?/\\]/g, " ").substring(0, 31)),
      hasTable: parts.rowsCount > 0,
    };
  });

  // Flat file structure for zip(). It accepts the UTF-8 bytes as-is, so every part is encoded right here instead
  // of inside zip(): that way an xml-string becomes garbage as soon as it's converted & the whole document never
  // exists as strings and as bytes at the same time. The small parts are tiny enough to be built as a string
  const files: Record<string, Uint8Array> = {
    "xl/workbook.xml": encodeUtf8(getWorkbookXml(sheets)),
    "xl/_rels/workbook.xml.rels": encodeUtf8(getWorkbookRelsXml(sheets)),
    "_rels/.rels": encodeUtf8(relsXml),
    "[Content_Types].xml": encodeUtf8(getContentTypesXml(sheets)),
  };

  sheets.forEach((s) => {
    files[`xl/worksheets/sheet${s.num}.xml`] = getWorkSheetBytes(s);
    if (s.hasTable) {
      files[`xl/tables/table${s.num}.xml`] = encodeUtf8(getTableXml(s));
      files[`xl/worksheets/_rels/sheet${s.num}.xml.rels`] = encodeUtf8(getTableRelsXml(s.num));
    }
    // the rendered xml is the biggest allocation of the export: drop it as soon as it's encoded
    s.parts = null!;
  });
  // styles are collected during the generation above, so the file is added at the very end
  files["xl/styles.xml"] = encodeUtf8(ctx.styles.toXml());

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, (err, res) => {
      if (err || !res) reject(err || new Error("Zip failed"));
      else resolve(res);
    });
  });

  // `zipped` is passed as-is: wrapping it into a new Uint8Array would copy the whole file one more time.
  // The cast is only about the lib-typing (`Uint8Array<ArrayBufferLike>`): zip() never returns a SharedArrayBuffer
  return new Blob([zipped as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

exportToExcel.$defaults = {
  /** Returns string value for cell based on value type */
  getCellValue: function getCellValue<T>(headerKey: IExcelColumnMap<T>, v: T[keyof T]): string {
    if (v == null) return "";
    if (v instanceof Date) return dateToString(v, localeInfo.dateTime);
    const t = typeof v;
    if (t === "string") return v as string;
    if (t === "boolean") return v ? "true" : "false";
    if (t === "number") return v.toString();
    return v as string;
  },

  /** Font of every cell of the document; a missed option is replaced with `{ size: 11, family: "Calibri" }`
   * @see {@link IExcelSheet.font} to override it per sheet */
  font: { size: 11, family: "Calibri" } as IExcelFont,

  /** Font of the header-row; missed options are inherited from {@link exportToExcel.$defaults.font}
   * @see {@link IExcelColumnMap.headerFont} to override it per column */
  fontHeader: { style: "bold" } as IExcelFont,
};

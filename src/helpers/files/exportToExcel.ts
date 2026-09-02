import zip, { strToU8 } from "./zip";
import { stringPrettify } from "../string";
import dateToString from "../dateToString";
import localeInfo from "../../objects/localeInfo";
import utilSaveAsFile from "./saveAsFile";

/* Main concepts: max performance and min memory consumption on excel sheet generation.
 *
 * The module is split by the lifetime of the parts:
 * - pure helpers & static xml-parts are defined on the module-level: allocated once instead of on every export;
 * - {@link createStyles} is the only stateful collector: Excel stores every font/fill once & a cell refers to it;
 * - {@link renderSheet} is a single pass over the data: a value is measured & rendered at once, so nothing
 *   per-cell is kept in memory (see the comment there);
 * - {@link exportToExcel} is an orchestrator: builds the per-export {@link IExportContext} & zips the result.
 *  */

/** Font & styles that applied to cell or globally per sheet/document */
export interface IExcelStyle {
  /** Size of the font in points
   * @defaultValue 11 */
  fontSize?: number;
  /** Name of the font;
   *
   * WARN: the auto-width of a column is measured only for the listed fonts (see {@link autoWidth.familyPx});
   * any other font is measured as `Calibri`, so point {@link IExcelColumnMap.width} for such a case
   * @defaultValue "Calibri" */
  fontFamily?: /** Default of Excel 2007-2021; on Linux it's substituted by the metric-compatible `Carlito` */
  | "Calibri" // Fonts that are shipped with Excel on both Windows & macOS, so a document keeps the same look everywhere
    // core web fonts: pre-installed on Windows & macOS regardless of the Office version
    | "Arial"
    | "Courier New"
    | "Georgia"
    | "Tahoma"
    | "Times New Roman"
    | "Trebuchet MS"
    | "Verdana"
    // ClearType collection: shipped with Office 2007+
    | "Cambria"
    | "Candara"
    | "Consolas"
    | "Constantia"
    | "Corbel"
    | "Segoe UI"
    | (string & {});
  /** Style of the text; point several styles for example:`ExcelFontStyles.bold | ExcelFontStyles.underline` */
  fontStyle?: ExcelFontStyles;

  /** Color of the text in hex-format `#rrggbb`, ex. `#ff0000`;
   * an unparsable value is ignored (so the inherited color stays applied) */
  color?: string;
  /** Background color of the cell
   * @see {@link IExcelStyle.color} for the supported format */
  backgroundColor?: string;

  /** Horizontal alignment of the content of the cell
   * @defaultValue `general` of Excel => a text is aligned to the left & a number/date to the right */
  horizontalAlign?: "left" | "center" | "right";
  /** Vertical alignment of the content of the cell
   * @defaultValue "top" */
  verticalAlign?: "top" | "center" | "bottom";
}

/** Style of the text of a cell */
export const enum ExcelFontStyles {
  bold = 1,
  italic = 1 << 1,
  underline = 1 << 2,
}

export interface IExcelSettings {
  /** Style for every data-cell of the sheet/column; missed options are inherited from the upper level
   * ({@link IExcelSheet.style} + {@link exportToExcel.$defaults.style}). It's the base of the header-cell either,
   * so a column keeps its own fontFamily/fontSize in the header-row as well
   * @defaultValue {@link IExcelSheet.style} => the style of the sheet */
  style?: IExcelStyle;

  /** Style for the header cell of the column; missed options are inherited from the header-style of the sheet
   * ({@link IExcelSheet.headerStyle} + {@link exportToExcel.$defaults.headerStyle} + the style of the sheet)
   * @defaultValue {@link exportToExcel.$defaults.headerStyle} + {@link exportToExcel.$defaults.style} => `{ fontSize: 11, fontFamily: "Calibri", fontStyle: ExcelFontStyles.bold }` */
  headerStyle?: IExcelStyle;

  /** Format that a date-cell is rendered by; it's a {@link dateToString} format (`yyyy-MM-dd hh:mm:ss A`)
   * that is converted into the number-format of Excel (`yyyy-mm-dd hh:mm:ss AM/PM`)
   *
   * WARN: Excel has no timezone at all, so a date is stored as the local wall-clock time; the `Z`-suffix
   * (the UTC-flag of {@link dateToString}) is ignored
   * @defaultValue {@link exportToExcel.$defaults.dateTimeFormat}
   * @defaultValue {@link localeInfo.dateTime} */
  dateTimeFormat?: string;
}

export interface IExcelColumnMap<T = any> extends IExcelSettings {
  /** Item property name to map on excel cell per column */
  propName: keyof T;
  /** Text of header, if `undefined` then extacted from propName via stringPrettify() */
  headerText?: string;
  /** Width for column; by default it's auto-defined by the longest content */
  width?: number;
  /** Point +X or -X to affect on auto-width */
  widthOffset?: number; // todo implement
  /** Limit max width for column */
  maxWidth?: number;
}

export interface IExcelSheet<T = any> extends IExcelSettings {
  /** Items to paste into excel according to mapping in columns */
  data: Array<T>;
  /** Mapping config */
  mapping: IExcelColumnMap<T>[];
  /** Name of the Excel tab; default is `Sheet{number}` */
  name?: string;

  // todo currently saved excel-sheets formatted in blue-colors: table formatting 16 in my case. - add ability to change it per sheet as it works with fontFamily
}

/** Way that Excel stores & parses the content of a cell (see {@link IExcelCellValue.type}) */
export const enum ExcelCellTypes {
  /** An ordinary text */
  text,
  /** Multiline text */
  textWrap,
  /** Store as a real number so Excel sums/sorts/filters */
  number,
  /** Store as date so Excel sorts/filters: the value is a date-serial (see {@link IExcelCellValue.stringVal})
   * & the cell is rendered by {@link IExcelSettings.dateTimeFormat} */
  date,
}

/** Content of a single cell: {@link exportToExcel.$defaults.getCellValue} maps an item-property into it */
export interface IExcelCellValue {
  /** Way that Excel stores the {@link IExcelCellValue.stringVal} */
  type: ExcelCellTypes;
  /** Content of the cell; it's always a string - the xml is a text by itself.
   *
   * For {@link ExcelCellTypes.date} it's a number of days since the Excel-epoch (see the note
   * in {@link exportToExcel.$defaults.getCellValue}) - the only way that Excel stores a date */
  stringVal: string;
}

/** Hook that overrides the content &/or the style of a single cell: see the `cellCallback` argument
 * of {@link exportToExcel} */
export type IExcelCellCallback<T = any> = (
  /** Cell that {@link exportToExcel.$defaults.getCellValue} has mapped the item-property into.
   * WARN: never mutate it - an empty cell is a shared read-only object; return an own one instead */
  value: IExcelCellValue,
  /** Index of the item in {@link IExcelSheet.data} */
  itemIndex: number,
  /** Column that the cell belongs to */
  mapping: IExcelColumnMap<T>
) => { value?: IExcelCellValue; style?: IExcelStyle } | undefined | null;

/** Font with the options that are required by the file-format (so it's always ready to be rendered) */
type IExcelStyleFull = IExcelStyle & Required<Pick<IExcelStyle, "fontSize" | "fontFamily">>;

/** Own font of a cell resolved into everything that the render & the auto-width need: it depends only on the
 * font-object that {@link IExcelCellCallback} returns & on the column, so it's cached per such a pair */
interface ICellOverride {
  /** The pointed font merged into the font of the column */
  style: IExcelStyleFull;
  /** `s="N" ` of the cell indexed by {@link ExcelCellTypes}: a wrapped & a date-cell need an own cell-format */
  styleXml: Array<string | undefined>;
  /** Metrics of {@link ICellOverride.style}: the auto-width measures such a cell by them */
  metrics: IFontMetrics;
  /** Ratio of the font-size of {@link ICellOverride.style} to the measured one */
  scale: number;
  /** Width in px of a date-cell of this font (`-1` - not measured yet): a date is rendered by the format,
   * so every date of the pair takes the very same width - see {@link renderSheet} */
  datePx: number;
}

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
  allStyles: IStyles;
  style: IExcelStyleFull;
  headerStyle: IExcelStyle | undefined;
  /** Width in px of a single Excel-unit of the column width */
  unitPx: number;
  getCellValue: <T = any>(v: T[keyof T]) => IExcelCellValue;
  cellCallback: IExcelCellCallback | undefined;
  dateTimeFormat: string;
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
    const bytes = strToU8(pending);
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
      const pre = prefix ? strToU8(prefix) : emptyBytes;
      const post = suffix ? strToU8(suffix) : emptyBytes;
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

/** Empty cell: the fallback for a {@link exportToExcel.$defaults.getCellValue} that returns nothing at all.
 * WARN: it's read-only by the contract - the render never writes into a mapped cell */
const emptyCell: IExcelCellValue = { type: ExcelCellTypes.text, stringVal: "" };

/** Days between the Excel-epoch (`1899-12-30`: the year-1900 leap-bug of Lotus is a part of the format)
 * and `1970-01-01` of the JS-epoch */
const excelEpochDays = 25569;
const msPerDay = 86400000;

/** The widest date that a date-column is measured by: a 4-digit year & 2-digit month/day/hours/minutes/seconds
 * (the supported fonts render every digit by the same width, so the exact digits don't matter) */
const widestDate = new Date(2222, 11, 28, 22, 58, 58, 888);

/** Count of the ASCII chars (`32..126`) that {@link autoWidth.familyPx} holds the measured width of */
const asciiCount = 95;

/** Everything that the auto-width needs to know about a face of a font: decoded from {@link autoWidth.familyPx} */
interface IFontMetrics {
  /** Width in px of an ASCII char indexed by the char-code; a code out of `32..126` holds `defaultPx` */
  charPx: Uint8Array;
  /** Width in px of a non-ASCII (cyrillic etc.) char */
  defaultPx: number;
  /** Width in px of the widest digit: Excel's unit of the column width */
  maxDigitPx: number;
}

/** Auto-width of a column: the file-format has no auto-width at all - `bestFit` is only a marker & Excel never
 * re-measures such a column, so the width must be estimated here.
 * Everything is calculated in pixels of the really applied font & converted into Excel-units (the widest digit
 * of the document font, see {@link exportToExcel.$defaults.style}) at the end */
const autoWidth = {
  /** Font-size (in points) that {@link autoWidth.familyPx} is measured for */
  basePt: 11,
  /** Excel reserves 5px inside a cell (2px padding on both sides + 1px for the border) + 2px as a gap */
  cellPaddingPx: 7,
  /** Space for the autoFilter dropdown button in a header cell */
  filterButtonPx: 18,
  /** Char widths of a family as `[regular, bold]`, measured at {@link autoWidth.basePt} via GDI itself
   * (`GetCharWidth32W` of the font selected into a DC):
   * Excel renders a cell text via GDI, where every glyph advance is hinted to a whole pixel - so summing
   * the fractional font-metrics instead under-estimates a long text by ~7% and cuts it off. A per-family (or
   * a per-face) ratio doesn't work either, because that hinting isn't proportional: a digits-only text of
   * `Arial` is ~11% wider than the same one of `Calibri` while its lowercase text is only ~6% wider, and
   * `Arial Bold` ranges from +1% to +13% over `Arial` depending on the chars - so every face is measured
   * on its own & only the font-size is applied as a ratio (see {@link autoWidth.getScale}).
   * A face holds the chars `32..126` packed one per char as `px + 48` (so the char `0` means 0px) plus
   * the 96th char - the width of a non-latin (cyrillic etc.) char, averaged over `А..я` of the face.
   * WARN: measure the advances themselves & never a rendered string: GDI kerns a pair (`11` of `Arial` is 1px
   * narrower than 2 `1`), while Excel doesn't kern a cell at all - so a measured run under-estimates the width.
   * WARN: the keys are lower-cased (Excel treats a font-name case-insensitively); a font that isn't listed here
   * is measured as `Calibri` - a substituted font can't be predicted anyway */
  familyPx: new Map<string, readonly [string, string]>([
    ["calibri", ["35677;:3557745467777777777447777=988977994586<::8:87799=877565774786885784474<888856587;77657579", "35777;;4557745467777777777447777=988977:94586=::8:877:9>887565775786885784474<888856587;77657579"]], // prettier-ignore
    ["arial", ["45588=:3556945448888888888449998?9:;;:9;:37:8;:<:<;:9:9?998444585888884883373=888858487;7785359:", "44788=;4556945448888888888449999?9;;;:9<;48;9=;<:<;::;9=::8545985898995994484<999968599;8786469:"]], // prettier-ignore
    ["cambria", ["34698=:4666835378888888888448886=998:989:5598<::9:979:9>998575864787875784484<888866588<787656;9", "35698?;4667935389999999999449997>::9;98:;55:8=::9::8:::>998686964897985895595=999977598<8876569:"]], // prettier-ignore
    ["candara", ["347878:4558844448577878788448885?998:879:4697=::8:988:8=888545884787885883373<888856587;87754589", "347878:4558844448577878788448885?998:879:4697=::8:988:9>988545884787885884484<888866587<87754589"]], // prettier-ignore
    ["consolas", ["888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888", "888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888"]], // prettier-ignore
    ["constantia", ["44587<:3667845468577878788448887=:9:;98;<55:8>;<9<989;:?:99565886787975894484=988866597;7775558:", "45587<;3667845469577878788448887=:::<98;<65;9>;<:<;89<:?:995658868979858:5595>:99977698;8885558;"]], // prettier-ignore
    ["corbel", ["345:8<:3558845448787878688448886?:99:88::4698<:;9;988:9=999545875787875883473<888856587;77753589", "346:8<:3558855448777878788458887?:99:98::4698<;;9;999;:>::9545876887885884484=888856687;88754589"]], // prettier-ignore
    ["courier new", ["999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999", "999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999"]], // prettier-ignore
    ["georgia", ["456:9<;3667:4647978898888855:::7>:::;:9<<78:9><<9<;89<:?;;9676::8887875894484>988866598<887666::", "458;:=<4777;5657:89999:9::66;;;8?;;;<;:<>89<;?=<;<<:;=;A<<:777;;89:8:868:5595?:9::876:9=998868;<"]], // prettier-ignore
    ["segoe ui", ["44698<<3556:3636888888888833:::7>:99;87:;4597=;;8;988:9>989565:64897985984474=899956587;777545::", "45799==4667;4647999999999944;;;7>;:9;88;;57:8><;9;:89;:?:99676;65897986994484>999967698<887656;:"]], // prettier-ignore
    ["tahoma", ["546;8?:3668;5556888888888855;;;7>999:88::6697<:;8;98::9>9:8666;88887885882472=888857588:887767;9", "457<:B<477:<5659::::::::::55<<<9>:::;99;;78:9=<<:<;:9;:?:;9797<:8998996995595=999978699=9989:9<;"]], // prettier-ignore
    ["times new roman", ["45587=<3557835447777777777348887>;::;98:;56;9=;;9;:89;;>:;9545684777775773373;777756477;77673789", "45888?=4558945448888888888559998>;;;;:9;<68<:?;<9<;8:;:>::9545985787884884494<888867588:8766368:"]], // prettier-ignore
    ["trebuchet ms", ["565889;2666866688888888888668886<989988::4798;::8:979:9=898656888887886884683=888866687;87768689", "56699:;3666966669999999999669997<:99:99::4898<:;9;989:9=998656999898996894684=989966699<8887979:"]], // prettier-ignore
    ["verdana", ["567<:@;477:<5757::::::::::77<<<8?::;;99<;57:8=;<9<::9;:?:9:777<::998995993593?9:9968699=999:7:<:", "569=;C=588;=575:;;;;;;;;;;66===9><;;<::<<88<:><=;=<;:<;@;;:8:8=;;::8::6::46:4@::::797::>::9;8;=<"]], // prettier-ignore
  ]),
  /** Decoded {@link autoWidth.familyPx} indexed by `family` + the face: only the faces that an export really
   * uses are unpacked & they are kept forever - a document has a couple of them & a table is 128 bytes */
  metrics: new Map<string, IFontMetrics>(),
  /** Metrics of the face that the pointed font is rendered by (`italic` & `underline` don't change the advances,
   * so they share the regular one); called once per sheet & per column (not per cell), so the lower-casing of
   * the font-name & the lazy decoding are affordable here */
  getMetrics(style: IExcelStyleFull): IFontMetrics {
    const isBold = style.fontStyle !== undefined && (style.fontStyle & ExcelFontStyles.bold) !== 0;
    const family = style.fontFamily.toLowerCase();
    const key = isBold ? `${family} bold` : family;
    let m = autoWidth.metrics.get(key);
    if (m) return m;
    const faces = autoWidth.familyPx.get(family) ?? autoWidth.familyPx.get("calibri")!;
    const widths = faces[isBold ? 1 : 0];
    // the last packed char is the non-latin one: it fills the whole table, so a code that isn't measured
    // (a control char included) falls back to it without any extra check on the hot path
    const defaultPx = widths.charCodeAt(asciiCount) - 48;
    const charPx = new Uint8Array(128).fill(defaultPx);
    let maxDigitPx = 0;
    for (let i = 0; i < asciiCount; ++i) {
      const px = widths.charCodeAt(i) - 48;
      charPx[i + 32] = px;
      // the chars 48..57 (`0`..`9`) are the items 16..25 of the packed string
      if (i > 15 && i < 26 && px > maxDigitPx) maxDigitPx = px;
    }
    m = { charPx, defaultPx, maxDigitPx };
    autoWidth.metrics.set(key, m);
    return m;
  },
  /** Ratio between the pointed font-size & the measured {@link autoWidth.basePt} one */
  getScale(style: IExcelStyleFull): number {
    return style.fontSize / autoWidth.basePt;
  },
  /** Width in px of a single Excel-unit of the column width: the widest digit of the pointed document-font */
  getUnitPx(style: IExcelStyleFull): number {
    return autoWidth.getMetrics(style).maxDigitPx * autoWidth.getScale(style);
  },
  /** Width in px of the longest line of the text; called for every single cell, so it's a hot path: the metrics
   * are resolved by the caller (once per column) & unpacked into locals - cheaper than a property-load per char */
  getTextPx(text: string, charPx: Uint8Array, defaultPx: number): number {
    let max = 0;
    let line = 0;
    for (let i = 0; i < text.length; ++i) {
      const code = text.charCodeAt(i);
      if (code === newLineCode) {
        if (line > max) max = line;
        line = 0;
      } else line += code < 128 ? charPx[code] : defaultPx;
    }
    return line > max ? line : max;
  },
  /** Excel-units of a column that a user has never resized: the standard `8.43` chars of the document-font
   * (the usual 64px of `Calibri 11`). WARN: such a width must be pointed explicitly - a `<col>` without
   * the `width` collapses the column to 0 & Excel shows it as a hidden one */
  getDefaultWidth(unitPx: number): number {
    // 5px is what Excel reserves inside a cell: `cellPaddingPx` without the 2px gap that only the auto-width adds
    return autoWidth.toUnits(8.43 * unitPx + 5, unitPx);
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

/** Base font of the document: the file-format requires fontSize & fontFamily to be always defined */
const baseFont: IExcelStyleFull = { fontSize: 11, fontFamily: "Calibri" };

/** Every bit that {@link ExcelFontStyles} defines: an unknown bit of a user-value is ignored by the render */
const fontStyleMask = ExcelFontStyles.bold | ExcelFontStyles.italic | ExcelFontStyles.underline;

/** Xml-part of `styles.xml` per {@link IExcelStyle.fontStyle} (the index is the bitmask itself): the file-format
 * requires the tags to be ordered, so all the combinations are built once instead of per font */
const fontStyleXml: string[] = [];
// the index 0 (no style at all) holds an empty part, so a font without a style needs no branch either
for (let i = 0; i <= fontStyleMask; ++i) {
  fontStyleXml[i] =
    `${i & ExcelFontStyles.bold ? "<b/>" : ""}${i & ExcelFontStyles.italic ? "<i/>" : ""}` +
    `${i & ExcelFontStyles.underline ? "<u/>" : ""}`;
}

/** Merges fonts from left to right; only defined options are taken (so a user can skip any of them);
 * an unparsable color is skipped either - so the inherited one isn't lost because of a typo */
function mergeStyle(base: IExcelStyleFull, ...styles: Array<IExcelStyle | undefined>): IExcelStyleFull {
  const result: IExcelStyleFull = { ...base };
  for (let i = 0; i < styles.length; ++i) {
    const s = styles[i];
    if (!s) continue;
    const keys = Object.keys(s) as Array<keyof IExcelStyle>;
    for (let k = 0; k < keys.length; ++k) {
      const key = keys[k];
      const value = s[key];
      if (value === undefined) continue;
      if ((key === "color" || key === "backgroundColor") && !toARGB(value as string)) continue;
      (result[key] as unknown) = value;
    }
  }
  return result;
}

/** Count of the columns that a sheet has (`A`..`XFD`): the file-format doesn't allow more */
const maxColumns = 16384;

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
  /** Returns the index of the cell-format in `cellXfs` according to the pointed font; it's never `0` -
   * that index is reserved (see the note in {@link createStyles}) */
  getCellStyle(style: IExcelStyleFull, isWrapText: boolean, numFmtId?: number): number;
  /** Returns the id of the number-format that renders the pointed {@link IExcelSettings.dateTimeFormat}
   * & registers the format if it's not registered yet */
  getNumFmtId(dateTimeFormat: string): number;
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

/** Excel reserves the ids `0..163` for its built-in number-formats, so a custom one starts from 164 */
const numFmtStartId = 164;

/** Chars that Excel understands as a literal of a date-format as-is; any other one is escaped with a backslash
 * (`/` is the locale date-separator of Excel & a letter is a token, so both must be escaped) */
const dateLiteralRE = /[-.,: ]/;

/** Runs of the same char: a token of a date-format is such a run in both {@link dateToString} & Excel */
const dateRunRE = /(.)\1*/g;

/** Tokens of {@link dateToString} that Excel understands as the very same but lower-cased ones */
const dateTokenRE = /[yYMdDhHmsS]/;

/** Converts a {@link dateToString} format into the number-format of Excel:
 * `YYYY-MM-DD hh:mm:ss A` => `yyyy-mm-dd hh:mm:ss AM/PM` */
function toExcelDateFormat(format: string): string {
  // the suffixes of dateToString: `Z` - the UTC-flag (Excel has no timezone, so it's just dropped),
  // `a`/`A` - the 12-hour format (Excel defines it by the AM/PM-token at the end)
  let f = format.endsWith("Z") || format.endsWith("z") ? format.substring(0, format.length - 1) : format;
  const h12 = f.endsWith("a") || f.endsWith("A");
  f = h12 ? f.substring(0, f.length - 1) : f;

  // a token is a run of the same char in both formats & means the very same in Excel but lower-cased
  // ('MMM' is the short name of the month either), so only the fractions & the literals are really mapped
  f = f.replace(dateRunRE, (run: string, char: string) => {
    if (!dateTokenRE.test(char)) {
      // 'ss.fff' => 'ss.000' - the fractions of a second; a literal that Excel can read as a token of its own
      // is escaped (`\/` etc.), the rest is kept as it is
      if (char === "f" || char === "F") return "0".repeat(run.length);
      return dateLiteralRE.test(char) ? run : `\\${char}`.repeat(run.length);
    }
    if (char === "y" || char === "Y") return run.length > 2 ? "yyyy" : "yy"; // Excel has no 'yyy' at all
    // WARN: the run is cut by 2 ('MMM' - by 3): 'mmmm'/'dddd' mean the name of a month/week-day in Excel
    // & not a zero-padded number as in dateToString
    return run.substring(0, char === "M" && run.length === 3 ? 3 : 2).toLowerCase();
  });

  return h12 ? `${f}AM/PM` : f;
}

function getFontXml(f: IExcelStyleFull): string {
  const color = toARGB(f.color);
  return (
    `<font>${f.fontStyle ? fontStyleXml[f.fontStyle & fontStyleMask] : ""}<sz val="${f.fontSize}"/>` +
    `${color ? `<color rgb="${color}"/>` : ""}<name val="${escape(f.fontFamily)}"/><family val="2"/></font>`
  );
}

/** Collector of the document styles: Excel stores every font/fill/cell-format once & a cell refers to it by index */
function createStyles(defaultStyle: IExcelStyleFull): IStyles {
  const fonts = createStylesCollection();
  /** Excel reserves the first 2 fills for itself (`none` & `gray125`), so a custom one starts from the index 2 */
  const fills = createStylesCollection(2);
  const cellXfs = createStylesCollection();
  const numFmts = createStylesCollection(numFmtStartId);
  /** Id of the number-format per pointed {@link IExcelSettings.dateTimeFormat}: a format is converted only once
   * (every sheet/column re-asks for it, but the whole document usually has a single one) */
  const numFmtIds = new Map<string, number>();

  const styles: IStyles = {
    getNumFmtId(dateTimeFormat: string): number {
      let id = numFmtIds.get(dateTimeFormat);
      if (id === undefined) {
        id = numFmts.indexOf(escape(toExcelDateFormat(dateTimeFormat)));
        numFmtIds.set(dateTimeFormat, id);
      }
      return id;
    },
    getCellStyle(style: IExcelStyleFull, isWrapText: boolean, numFmtId = 0): number {
      const fontId = fonts.indexOf(getFontXml(style));
      const bgColor = toARGB(style.backgroundColor);
      const fillId = bgColor
        ? fills.indexOf(
            `<fill><patternFill patternType="solid"><fgColor rgb="${bgColor}"/><bgColor indexed="64"/></patternFill></fill>`
          )
        : 0;
      return cellXfs.indexOf(
        `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="0" xfId="0" applyFont="1"` +
          `${numFmtId ? ` applyNumberFormat="1"` : ""}${fillId ? ` applyFill="1"` : ""} applyAlignment="1">` +
          `<alignment${style.horizontalAlign ? ` horizontal="${style.horizontalAlign}"` : ""} ` +
          `vertical="${style.verticalAlign || "top"}"${isWrapText ? ` wrapText="1"` : ""}/></xf>`
      );
    },
    toXml(): string {
      // `numFmts` is the very 1st part of the styleSheet by the schema & is skipped at all if nothing is registered
      let numFmtsXml = "";
      for (let i = 0; i < numFmts.items.length; ++i) {
        numFmtsXml += `<numFmt numFmtId="${numFmtStartId + i}" formatCode="${numFmts.items[i]}"/>`;
      }
      return (
        `${styleSheetHead}${numFmtsXml ? `<numFmts count="${numFmts.items.length}">${numFmtsXml}</numFmts>` : ""}` +
        `<fonts count="${fonts.items.length}">${fonts.items.join("")}</fonts>` +
        `<fills count="${fills.items.length + 2}"><fill><patternFill patternType="none"/></fill>` +
        `<fill><patternFill patternType="gray125"/></fill>${fills.items.join("")}</fills>` +
        `<borders count="1"><border/></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="${cellXfs.items.length}">${cellXfs.items.join("")}</cellXfs>${styleSheetTail}`
      );
    },
  };

  // Excel binds cellXfs[0] to its built-in `Normal` cell-style & applies neither of them to a cell that carries
  // no own `s`: such a cell keeps the Excel-defaults instead (the BOTTOM vertical alignment among them, so a
  // custom `<alignment>` of cellXfs[0] is simply lost). So the index 0 is reserved by the very same plain xf that
  // Excel writes itself, every real format starts from 1 & a cell always refers to its own one - see renderSheet()
  cellXfs.items.push(`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`);
  // the default font must be registered the 1st: Excel measures a column width in the widest digit of the font[0]
  styles.getCellStyle(defaultStyle, false);
  return styles;
}

/* ----------------------------------- Sheet render ----------------------------------- */

/** Maps the data of the sheet & renders it into the xml-parts.
 *
 * A single pass over the data: a cell value is measured for the auto-width & appended to the xml at once, so
 * nothing is stored per cell. Keeping the mapped values instead (as `Array<Array<{value, style}>>`) costs an array
 * per row + an object & a retained string per cell and forces 2 extra passes over the whole dataset. */
function renderSheet(sheet: IExcelSheet, ctx: IExportContext): ISheetParts {
  const { allStyles: styles, getCellValue, cellCallback } = ctx;
  const cols = sheet.mapping;
  const colCount = cols.length;
  const font = mergeStyle(ctx.style, sheet.style);
  // the font of the sheet is the one of every column that doesn't override it & of the cells around the data,
  // so its style is resolved once & re-used below instead of being re-registered per column
  const sheetStyle = styles.getCellStyle(font, false);
  const sheetColStyleXml = ` style="${sheetStyle}"`;
  // the header-row is the sheet-font + the header-options of the document & of the sheet (so a header keeps
  // the family/size of the sheet & points only the difference); a column re-merges it only if it has an own font
  const sheetHeaderFont = mergeStyle(font, ctx.headerStyle, sheet.headerStyle);

  /** Excel-names of the columns: `A`, `B`, ... `AA`; cached because every single cell refers to it */
  const letters: Array<string> = [];
  const headers: Array<string> = [];
  /** Widest content of the column in px; `-1` marks a column with an explicit width (nothing to measure) */
  const maxPx = new Float64Array(colCount);
  // The font can differ per column, so everything that a cell of it needs is resolved once here & indexed
  // by the column in the loops below.
  // WARN: every single cell must carry an own `s` - the format of `<col>`/`<row>` is applied by Excel ONLY to
  // a cell that isn't stored in the sheet at all, and a stored `<c>` without `s` gets no format at all (not even
  // cellXfs[0] - see createStyles). `<col>` is still required for the cells around the data - see below
  /** `s="N" ` of an ordinary cell of the column */
  const cellStyleXml: Array<string> = [];
  /** `s="N" ` of a wrapped (array) cell of the column */
  const cellStyleWrapXml: Array<string> = [];
  /** `s="N" ` of a date-cell of the column: resolved by {@link getDateStyleXml} on the 1st date of the column */
  const cellStyleDateXml: Array<string | undefined> = [];
  /** ` style="N"` of the `<col>` of the column */
  const colStyleXml: Array<string> = [];
  /** Metrics of the column-font: the auto-width measures the header & every cell of the column by them */
  const cellMetrics: Array<IFontMetrics> = [];
  /** Font of the column (the sheet-font + an own one of the column): the base of a cell with an own font */
  const colFonts: Array<IExcelStyleFull> = [];
  /** Ratio of the font-size of the column to the measured one */
  const cellScale = new Float64Array(colCount);
  let headerCells = "";

  for (let c = 0; c < colCount; ++c) {
    const h = cols[c];
    const text = getHeaderText(h);
    // an own font of the column is merged into the sheet-font & becomes the base of its header either;
    // a column without it re-uses the ready fonts/styles of the sheet, so nothing is allocated per column
    const colFont = h.style ? mergeStyle(font, h.style) : font;
    colFonts.push(colFont);
    const hBase = h.style ? mergeStyle(colFont, ctx.headerStyle, sheet.headerStyle) : sheetHeaderFont;
    const hFont = h.headerStyle ? mergeStyle(hBase, h.headerStyle) : hBase;
    const letter = getColumnLetter(c);
    letters.push(letter);
    headers.push(text);

    const colStyle = h.style ? styles.getCellStyle(colFont, false) : sheetStyle;
    const wrapStyle = styles.getCellStyle(colFont, true);
    cellStyleXml.push(`s="${colStyle}" `);
    cellStyleWrapXml.push(`s="${wrapStyle}" `);
    colStyleXml.push(` style="${colStyle}"`);

    // the column defines the auto-width by its own font: the data-cells are measured by it & the header-cell
    // by the header-font on top of it.
    // WARN: the header-font can't be skipped here - it's `bold` by default & a bold text is up to 16% wider
    // (`Tahoma`, `Georgia`), so a column that is defined by its header would be cut off
    const m = autoWidth.getMetrics(colFont);
    cellMetrics.push(m);
    cellScale[c] = autoWidth.getScale(colFont);
    const hm = autoWidth.getMetrics(hFont);
    maxPx[c] =
      h.width !== undefined
        ? -1
        : autoWidth.getTextPx(text, hm.charPx, hm.defaultPx) * autoWidth.getScale(hFont) + autoWidth.filterButtonPx;

    const headerStyle = styles.getCellStyle(hFont, false);
    headerCells += `<c r="${letter}1" s="${headerStyle}" t="inlineStr"><is><t>${escape(text)}</t></is></c>`;
  }

  /** Format that a date-cell of the column is rendered by: an own one of the column wins over the sheet
   * & over the document */
  function getDateFormat(c: number): string {
    return cols[c].dateTimeFormat || sheet.dateTimeFormat || ctx.dateTimeFormat;
  }

  /** Width in px of the widest date of the pointed format rendered by the pointed font: a date-cell stores
   * a number that has nothing to do with the rendered text, so it's measured by the format instead */
  function getDatePx(format: string, m: IFontMetrics, scale: number): number {
    return autoWidth.getTextPx(dateToString(widestDate, format), m.charPx, m.defaultPx) * scale;
  }

  /** Returns `s="N" ` of a date-cell of the column & caches it.
   *
   * It's called only when such a cell really occurs, so a column without a date registers no number-format at all.
   * The auto-width is resolved here either: every date of the column takes the very same width (see
   * {@link getDatePx}), so measuring it once per column is enough */
  function getDateStyleXml(c: number): string {
    const format = getDateFormat(c);
    const dateStyle = styles.getCellStyle(colFonts[c], false, styles.getNumFmtId(format));
    const px = maxPx[c];
    if (px >= 0) {
      const w = getDatePx(format, cellMetrics[c], cellScale[c]);
      if (w > px) maxPx[c] = w;
    }
    const xml = `s="${dateStyle}" `;
    cellStyleDateXml[c] = xml;
    return xml;
  }

  /** Resolved options per own font of a cell & per column - see {@link getCellOverride}; it's weak, so nothing
   * is retained after the export & a font that the callback allocates per cell dies with its cell */
  const overrides = new WeakMap<IExcelStyle, Array<ICellOverride | undefined>>();

  /** Everything that a cell with an own font needs, resolved once per (font-object, column) pair: a callback
   * usually returns a couple of shared font-objects (`red`, `bold` etc.), so nothing is re-merged & no metrics
   * are re-resolved per cell. A font-object that is allocated by the callback itself simply misses the cache */
  function getCellOverride(c: number, cellStyle: IExcelStyle): ICellOverride {
    let byCol = overrides.get(cellStyle);
    if (byCol === undefined) {
      byCol = [];
      overrides.set(cellStyle, byCol);
    }
    let ov = byCol[c];
    if (ov === undefined) {
      // an own font of the cell is merged into the font of the column: only the difference has to be pointed
      const s = mergeStyle(colFonts[c], cellStyle);
      ov = { style: s, styleXml: [], metrics: autoWidth.getMetrics(s), scale: autoWidth.getScale(s), datePx: -1 };
      byCol[c] = ov;
    }
    return ov;
  }

  /** Returns `s="N" ` of a cell with an own font & caches it: a wrapped & a date-cell need an own cell-format
   * exactly as an ordinary cell of the column does */
  function getOverrideStyleXml(c: number, ov: ICellOverride, type: ExcelCellTypes): string {
    let xml = ov.styleXml[type];
    if (xml === undefined) {
      const numFmtId = type === ExcelCellTypes.date ? styles.getNumFmtId(getDateFormat(c)) : 0;
      xml = `s="${styles.getCellStyle(ov.style, type === ExcelCellTypes.textWrap, numFmtId)}" `;
      ov.styleXml[type] = xml;
    }
    return xml;
  }

  const { data } = sheet;
  const rows = createUtf8Writer();
  rows.add(`<row r="1">${headerCells}</row>`);

  for (let ri = 0; ri < data.length; ++ri) {
    const item = data[ri];
    // +1 to make it 1-based as Excel enumerates the rows & +1 for the header-row; stringified once per row
    const rowNum = `${ri + 2}`;
    let cells = "";
    for (let c = 0; c < colCount; ++c) {
      const h = cols[c];
      // the mapped cell is consumed right here & never stored, so the object that it comes in dies immediately:
      // V8 allocates such a short-living object by a pointer-bump & the scavenger costs nothing for it (it walks
      // the survivors only) - measured as ~1% against a mutable holder that is re-used for every cell
      let cObjVal = getCellValue<any>(item[h.propName]) || emptyCell;
      /** Options of a cell that points an own font; `undefined` - the cell keeps the style of the column.
       * The callback is asked once per cell & the branch is predictable, so an export without it pays nothing */
      let ov: ICellOverride | undefined;
      if (cellCallback) {
        const res = cellCallback(cObjVal, ri, h);
        // a callback that only styles a cell returns no value at all, so the mapped one stays applied
        if (res != null) {
          if (res.value) cObjVal = res.value;
          if (res.style) ov = getCellOverride(c, res.style);
        }
      }
      const { type } = cObjVal;
      // a `null` isn't expected here, but it must not produce a 'null' in a cell
      const value = cObjVal.stringVal || "";
      const px = maxPx[c];
      if (px >= 0) {
        // a date is excluded here: the stored value has nothing to do with the rendered text, so such a column
        // is measured once by its format - see getDateStyleXml()
        if (type < ExcelCellTypes.date) {
          const m = ov ? ov.metrics : cellMetrics[c];
          // WARN: a number is measured by its JS-representation - the `General` format that Excel really renders
          // it by is close enough & can only be narrower (Excel rounds a long fraction to fit the column)
          const w = autoWidth.getTextPx(value, m.charPx, m.defaultPx) * (ov ? ov.scale : cellScale[c]);
          if (w > px) maxPx[c] = w;
        } else if (ov) {
          // an own font renders the very same date wider/narrower, so it's measured once per (font, column)
          // pair either - getDateStyleXml() covers only the cells that keep the font of the column
          if (ov.datePx < 0) ov.datePx = getDatePx(getDateFormat(c), ov.metrics, ov.scale);
          if (ov.datePx > px) maxPx[c] = ov.datePx;
        }
      }
      /** `s="N" ` of the cell: an own font of the cell wins over the style of the column */
      let styleXml: string;
      if (ov) styleXml = getOverrideStyleXml(c, ov, type);
      else if (type === ExcelCellTypes.date) styleXml = cellStyleDateXml[c] || getDateStyleXml(c);
      else if (type === ExcelCellTypes.textWrap) styleXml = cellStyleWrapXml[c];
      else styleXml = cellStyleXml[c];
      // a number (a date is stored as one either) is never escaped & needs no `<is>`-wrapper, so it's a separate
      // & much shorter template; the numeric types are the last ones in the enum, so it's a single comparison
      cells +=
        type >= ExcelCellTypes.number
          ? `<c r="${letters[c]}${rowNum}" ${styleXml}t="n"><v>${value}</v></c>`
          : `<c r="${letters[c]}${rowNum}" ${styleXml}t="inlineStr"><is><t>${escape(value)}</t></is></c>`;
    }
    rows.add(`<row r="${rowNum}">${cells}</row>`);
  }

  let colsXml = "";
  for (let c = 0; c < colCount; ++c) {
    const { width, maxWidth } = cols[c];
    // an explicit width wins; otherwise it's defined by the longest content measured above
    const w =
      width ??
      Math.min(autoWidth.toUnits(maxPx[c] + autoWidth.cellPaddingPx, ctx.unitPx), maxWidth ?? Number.MAX_SAFE_INTEGER);
    colsXml += `<col min="${c + 1}" max="${c + 1}" width="${w}"${colStyleXml[c]} bestFit="1" customWidth="1"/>`;
  }
  // the sheet-font belongs to the whole sheet & not only to the mapped columns, but Excel stores a format per
  // column - so the rest of them takes the same style with the standard width (`customWidth` isn't set: they
  // aren't resized, only formatted). It covers a cell that isn't stored in the sheet at all - the one that
  // a user types in after the export
  if (colCount < maxColumns) {
    const w = autoWidth.getDefaultWidth(ctx.unitPx);
    colsXml += `<col min="${colCount + 1}" max="${maxColumns}" width="${w}"${sheetColStyleXml}/>`;
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
export default async function exportToExcel<T>(
  sheetsData: Array<IExcelSheet<T>>,
  /** Point a filename with extension to save the result into a file at once; otherwise the returned Blob
   * can be saved later by the very same helper `web-ui-pack/helpers/files/saveAsFile` (or not saved at all)
   * @example "test-excel.xlsx" */
  saveAsFile?: string | null | false,
  /** Called for every single data-cell of every sheet right after the value is mapped by
   * {@link exportToExcel.$defaults.getCellValue}: return an own `value` &/or `font` to override the cell, ex.
   * `(v) => (v.stringVal[0] === "-" ? { style: redFont } : undefined)`.
   *
   * The `font` is merged into the font of the column, so only the difference has to be pointed, and the
   * auto-width of the column follows such a cell as well (a wider/bolder font included).
   *
   * WARN: it's called for every single cell (the hottest path of the export together with `getCellValue`):
   * - return the very same font-object for the cells that share the style (a `const` outside of the callback):
   * an own font is merged & measured once per such an object & column, while an object-literal that is built
   * per cell misses that cache & is re-resolved every time;
   * - never mutate the pointed `value` - an empty cell is a shared read-only object; return an own one instead */
  cellCallback?: IExcelCellCallback<T> // todo add ability to set tooltip per cell
): Promise<Blob> {
  const { getCellValue, style, headerStyle, dateTimeFormat } = exportToExcel.$defaults;
  const documentFont = mergeStyle(baseFont, style);
  const ctx: IExportContext = {
    allStyles: createStyles(documentFont),
    style: documentFont,
    headerStyle,
    getCellValue,
    cellCallback,
    // the locale can be refreshed after this module is imported, so the default is resolved here & not on $defaults
    dateTimeFormat: dateTimeFormat || localeInfo.dateTime,
    unitPx: autoWidth.getUnitPx(documentFont),
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
    "xl/workbook.xml": strToU8(getWorkbookXml(sheets)),
    "xl/_rels/workbook.xml.rels": strToU8(getWorkbookRelsXml(sheets)),
    "_rels/.rels": strToU8(relsXml),
    "[Content_Types].xml": strToU8(getContentTypesXml(sheets)),
  };

  sheets.forEach((s) => {
    files[`xl/worksheets/sheet${s.num}.xml`] = getWorkSheetBytes(s);
    if (s.hasTable) {
      files[`xl/tables/table${s.num}.xml`] = strToU8(getTableXml(s));
      files[`xl/worksheets/_rels/sheet${s.num}.xml.rels`] = strToU8(getTableRelsXml(s.num));
    }
    // the rendered xml is the biggest allocation of the export: drop it as soon as it's encoded
    s.parts = null!;
  });
  // styles are collected during the generation above, so the file is added at the very end
  files["xl/styles.xml"] = strToU8(ctx.allStyles.toXml());

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, (err, res) => {
      if (err || !res) reject(err || new Error("Zip failed"));
      else resolve(res);
    });
  });

  // `zipped` is passed as-is: wrapping it into a new Uint8Array would copy the whole file one more time.
  // The cast is only about the lib-typing (`Uint8Array<ArrayBufferLike>`): zip() never returns a SharedArrayBuffer
  const b = new Blob([zipped as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  if (saveAsFile) {
    utilSaveAsFile(b, saveAsFile);
  }

  return b;
}

exportToExcel.$defaults = {
  dateTimeFormat: "",

  getCellValue: function getCellValue(v) {
    const t = typeof v;
    if (t === "string") return { type: ExcelCellTypes.text, stringVal: v as string };

    if (v == null) return { type: ExcelCellTypes.text, stringVal: "" };

    if (v instanceof Date) {
      const ms = v.valueOf();
      if (Number.isNaN(ms)) return { type: ExcelCellTypes.text, stringVal: "Invalid date" };
      // Excel stores a date as a number of days since its epoch & renders it by the format of the cell; the format
      // has no timezone, so the local wall-clock time is stored - the very same date that a user sees in the app
      return {
        type: ExcelCellTypes.date,
        stringVal: `${(ms - v.getTimezoneOffset() * 60000) / msPerDay + excelEpochDays}`,
      };
    }

    if (Array.isArray(v)) return { type: ExcelCellTypes.textWrap, stringVal: v.join(newLine) };

    if (t === "boolean") return { type: ExcelCellTypes.text, stringVal: v ? "true" : "false" };
    if (t === "number") {
      if (!Number.isFinite(v)) return { type: ExcelCellTypes.text, stringVal: "Invalid number" }; // NaN & Infinity have no representation in the format at all (Excel reports such file as corrupted)
      return { type: ExcelCellTypes.number, stringVal: (v as number).toString() };
    }

    return { type: ExcelCellTypes.text, stringVal: (v as any).toString() };
  },

  style: { fontSize: 11, fontFamily: "Calibri", verticalAlign: "center" },
  headerStyle: { fontStyle: ExcelFontStyles.bold },
} as IExcelDefaults;

interface IExcelDefaults extends IExcelSettings {
  /** Maps an item-property into the content of a cell: how Excel must store it + the already stringified value
   * (a finite number becomes {@link ExcelCellTypes.number}, a Date - a real {@link ExcelCellTypes.date},
   * an array - a multiline {@link ExcelCellTypes.textWrap}, everything else - a plain {@link ExcelCellTypes.text}).
   *
   * Override it to change the format of a value or to force a type, ex. to store an amount as a number:
   * `getCellValue: (h, v) => ({ type: ExcelCellTypes.number, value: (+v).toFixed(2) })`.
   *
   * WARN: it's called for every single cell (the hottest path of the export), so it must stay small & must
   * never allocate anything besides the returned cell - the render reads the cell right away & drops it */
  getCellValue: <T = any>(v: T[keyof T]) => IExcelCellValue;
}

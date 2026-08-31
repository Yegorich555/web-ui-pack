import zip from "./zip";
import { stringPrettify } from "./string";
import dateToString from "./dateToString";
import localeInfo from "../objects/localeInfo";

/** Main concepts: max performance and min memory consumption on excel sheet generation
 * If IExcelSheet doesn't contain .font or mapping[i].headerFont defined by user then we must apply font and styles globally for the whole excel file based on exportToExcel.$defaults.font
 *
 */
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

interface IExcelCell {
  value: string;
  style: string;
}

interface IExportConfig {
  mappedColumns: Array<IExcelCell & { width: number }>;
  mappedRows: Array<Array<IExcelCell>>;
}

const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

const escape = (str: string): string => str.replace(/[&<>"'`]/g, (m) => escapeMap[m as keyof typeof escapeMap]);

/** Line-separator inside a cell (array values are joined by it) */
const newLine = String.fromCharCode(10);
const newLineCode = 10;

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
  /** Width in px of the longest line of the text */
  getTextPx(text: string): number {
    let max = 0;
    let line = 0;
    for (let i = 0; i < text.length; ++i) {
      const code = text.charCodeAt(i);
      if (code === newLineCode) {
        if (line > max) max = line;
        line = 0;
      } else line += code < 128 ? autoWidth.charPx[code] : defaultCharPx;
    }
    return line > max ? line : max;
  },
  /** Width in px of the widest content of the column (a header & rows are scaled by their own fonts) */
  getColumnPx(
    rows: IExportConfig["mappedRows"],
    i: number,
    headerText: string,
    rowScale: number,
    headerScale: number
  ): number {
    let max = autoWidth.getTextPx(headerText) * headerScale + autoWidth.filterButtonPx;
    for (let r = 0; r < rows.length; ++r) {
      const px = autoWidth.getTextPx(rows[r][i].value) * rowScale;
      if (px > max) max = px;
    }
    return max + autoWidth.cellPaddingPx;
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

/** Static parts of the document: defined once to avoid re-allocating on every export */
const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const styleSheetHead = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">`;

const styleSheetTail = `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/><extLst><ext uri="{EB79DEF2-80B8-43e5-95BD-54CBDDF9020C}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:slicerStyles defaultSlicerStyle="SlicerStyleLight1"/></ext><ext uri="{9260A510-F301-46a8-8635-F512D64BE5F5}" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main"><x15:timelineStyles defaultTimelineStyle="TimeSlicerStyleLight1"/></ext></extLst></styleSheet>`;

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

/** Collector of the document styles: Excel stores every font/fill/cell-format once & a cell refers to it by index */
function createStyles(defaultFont: IExcelFontFull): IStyles {
  const collection = (startIndex = 0): IStylesCollection => {
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
  };

  const fonts = collection();
  /** Excel reserves the first 2 fills for itself (`none` & `gray125`), so a custom one starts from the index 2 */
  const fills = collection(2);
  const cellXfs = collection();

  const getFontXml = (f: IExcelFontFull): string => {
    const color = toARGB(f.color);
    return (
      `<font>${f.style ? fontStyleXml[f.style] : ""}<sz val="${f.size}"/>` +
      `${color ? `<color rgb="${color}"/>` : ""}<name val="${escape(f.family)}"/><family val="2"/></font>`
    );
  };

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

/** Export pointed data into excel-file according to provided mapping */
export default async function exportToExcel<T>(sheetsData: Array<IExcelSheet<T>>): Promise<Blob> {
  const { getCellValue, font: defFont, fontHeader: defFontHeader } = exportToExcel.$defaults;
  const defaultFont = mergeFont(baseFont, defFont);
  const styles = createStyles(defaultFont);
  /** Width in px of a single Excel-unit of the column width */
  const unitPx = autoWidth.maxDigitPx * (defaultFont.size / autoWidth.basePt);

  const getHeaderText = (header: IExcelColumnMap): string => {
    if (header.headerText !== undefined) {
      return header.headerText as string;
    }

    return stringPrettify(header.propName as string);
  };

  const getSheetConfig = (sheet: IExcelSheet): IExportConfig => {
    const headerKeys = sheet.mapping;
    const font = mergeFont(defaultFont, sheet.font);
    // a font is the same for every cell of the sheet, so the styles are defined once & re-used by all the rows
    const cellStyle = styles.getCellStyle(font, false);
    const cellStyleWrap = styles.getCellStyle(font, true);
    const rowScale = autoWidth.getScale(font);
    // the same for the header-row: a column re-merges it only if it has an own font
    const sheetHeaderFont = mergeFont(font, defFontHeader);

    // a single pass over the data: a value & a style of the cell are defined at once
    const mappedRows: IExportConfig["mappedRows"] = sheet.data.map((item) =>
      headerKeys.map((h) => {
        const v = getCellValue(h, item[h.propName]);
        // an array is joined by the new-line, so such a cell must be wrapped
        if (Array.isArray(v)) return { value: v.join(newLine), style: cellStyleWrap };
        return { value: v == null ? "" : v.toString(), style: cellStyle };
      })
    );

    const mappedColumns: IExportConfig["mappedColumns"] = headerKeys.map((h, i) => {
      const value = getHeaderText(h);
      const headerFont = h.headerFont ? mergeFont(sheetHeaderFont, h.headerFont) : sheetHeaderFont;
      const { width, maxWidth } = h;
      return {
        value,
        style: styles.getCellStyle(headerFont, false),
        // an explicit width wins & skips scanning of the rows; otherwise it's defined by the longest content
        width:
          width ??
          Math.min(
            autoWidth.toUnits(
              autoWidth.getColumnPx(mappedRows, i, value, rowScale, autoWidth.getScale(headerFont)),
              unitPx
            ),
            maxWidth ?? Number.MAX_SAFE_INTEGER
          ),
      };
    });

    return { mappedColumns, mappedRows };
  };

  const generateColumnLetter = (colIndex: number): string => {
    const prefix = Math.floor(colIndex / 26);
    const letter = String.fromCharCode(97 + (colIndex % 26)).toUpperCase();
    if (prefix === 0) {
      return letter;
    }
    return generateColumnLetter(prefix - 1) + letter;
  };

  const sheets = sheetsData.map((sheet, i) => {
    const num = i + 1;
    const config = getSheetConfig(sheet);
    return {
      num,
      config,
      /** Excel doesn't allow []:*?/\ in a tab name and cuts it by 31 chars */
      name: escape((sheet.name || `Sheet${num}`).replace(/[[\]:*?/\\]/g, " ").substring(0, 31)),
      // an empty table (a header row without data) is treated by Excel as a broken content, so skip it at all
      hasTable: config.mappedRows.length > 0,
    };
  });

  const formatRow = (row: Array<IExcelCell>, index: number): string => {
    // To ensure the row number starts as in excel.
    const rowIndex = index + 1;
    let rowCells = "";
    for (let i = 0; i < row.length; ++i) {
      const cell = row[i];
      rowCells += `<c r="${generateColumnLetter(i)}${rowIndex}" ${cell.style}t="inlineStr"><is><t>${escape(
        cell.value
      )}</t></is></c>`;
    }
    return `<row r="${rowIndex}">${rowCells}</row>`;
  };

  const workbookXML =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mx="http://schemas.microsoft.com/office/mac/excel/2008/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><workbookPr/><sheets>` +
    `${sheets
      .map((s) => `<sheet state="visible" name="${s.name}" sheetId="${s.num}" r:id="rId${s.num + 2}"/>`)
      .join("")}</sheets><definedNames/><calcPr/></workbook>`;

  const workbookXMLRels =
    `<?xml version="1.0" ?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `${sheets
      .map(
        (s) =>
          `<Relationship Id="rId${s.num + 2}" Target="worksheets/sheet${
            s.num
          }.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>`
      )
      .join(
        ""
      )}<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const contentTypes =
    `<?xml version="1.0" ?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default ContentType="application/xml" Extension="xml"/><Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/>` +
    `${sheets
      .map(
        (s) =>
          `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" PartName="/xl/worksheets/sheet${
            s.num
          }.xml"/>${
            s.hasTable
              ? `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml" PartName="/xl/tables/table${s.num}.xml"/>`
              : ""
          }`
      )
      .join(
        ""
      )}<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" PartName="/xl/workbook.xml"/><Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" PartName="/xl/styles.xml"/></Types>`;

  const getWorkSheet = (
    columns: IExportConfig["mappedColumns"],
    rows: IExportConfig["mappedRows"],
    hasTable: boolean
  ): string =>
    `<?xml version="1.0" ?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:mx="http://schemas.microsoft.com/office/mac/excel/2008/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><cols>` +
    `${columns
      .map((col, i) => `<col min="${i + 1}" max="${i + 1}" width="${col.width}" bestFit="1" customWidth="1"/>`)
      .join("")}</cols><sheetData>${
      formatRow(columns, 0) + rows.map((row, index) => formatRow(row, index + 1)).join("")
    }</sheetData>${hasTable ? `<tableParts count="1"><tablePart r:id="rId1"/></tableParts>` : ""}</worksheet>`;

  const getTableTemplate = (
    columns: IExportConfig["mappedColumns"],
    rows: IExportConfig["mappedRows"],
    num: number
  ): string => {
    const lastNum = generateColumnLetter(columns.length - 1) + (rows.length + 1);
    return (
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${num}" name="Table${num}" displayName="Table${num}" ref="A1:${lastNum}" insertRow="1" totalsRowShown="0"><autoFilter ref="A1:${lastNum}"/><tableColumns count="${columns.length}">` +
      `${columns
        .map((item, i) => `<tableColumn id="${i + 1}" name="${escape(item.value)}"/>`)
        .join(
          ""
        )}</tableColumns><tableStyleInfo name="TableStyleLight16" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`
    );
  };

  const getTableRelationShip = (num: number): string =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${num}.xml"/></Relationships>`;

  // Create a flat file structure for zip: strings are encoded to UTF-8 binary by zip() itself
  const files: Record<string, string> = {
    "xl/workbook.xml": workbookXML,
    "xl/_rels/workbook.xml.rels": workbookXMLRels,
    "_rels/.rels": rels,
    "[Content_Types].xml": contentTypes,
  };

  sheets.forEach(({ num, config, hasTable }) => {
    files[`xl/worksheets/sheet${num}.xml`] = getWorkSheet(config.mappedColumns, config.mappedRows, hasTable);
    if (hasTable) {
      files[`xl/tables/table${num}.xml`] = getTableTemplate(config.mappedColumns, config.mappedRows, num);
      files[`xl/worksheets/_rels/sheet${num}.xml.rels`] = getTableRelationShip(num);
    }
  });
  // styles are collected during the generation above, so the file is added at the very end
  files["xl/styles.xml"] = styles.toXml();

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, (err, res) => {
      if (err || !res) reject(err || new Error("Zip failed"));
      else resolve(res);
    });
  });

  return new Blob([new Uint8Array(zipped)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

exportToExcel.$defaults = {
  /** Returns string value for cell based on value type */
  getCellValue: function getCellValue<T>(headerKey: IExcelColumnMap<T>, v: T[keyof T]): string {
    if (v == null) return "";
    if (v instanceof Date) return dateToString(v, localeInfo.dateTime);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return v.toString();
    return v as string;
  },
  /** Font of every cell of the document; a missed option is replaced with `{ size: 11, family: "Calibri" }`
   * @see {@link IExcelSheet.font} to override it per sheet */
  font: { size: 11, family: "Calibri" } as IExcelFont,
  /** Font of the header-row; missed options are inherited from {@link exportToExcel.$defaults.font}
   * @see {@link IExcelColumnMap.headerFont} to override it per column */
  fontHeader: { style: "bold" } as IExcelFont,
};

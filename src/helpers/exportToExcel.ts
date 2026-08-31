import zip from "./zip";
import { stringPrettify } from "./string";
import dateToString from "./dateToString";
import localeInfo from "../objects/localeInfo";

interface IExcelColumnMap<T = any> {
  /** Item property name to map on excel cell per column */
  propName: keyof T;
  /** Text of header, if `undefined` then extacted from propName via stringPrettify() */
  text?: string;
  /** Width for column; by default auto-defined by the longest content */
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
}

interface IExportConfig {
  columns: Array<string>;
  mappedColumns: Array<{ value: string; style: string; width: number }>;
  rows: Array<Array<string>>;
  mappedRows: Array<Array<{ value: string; style: string }>>;
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

/** Char width in pixels of the default font (Calibri 11, see `styleSheet` below).
 * Excel renders a cell text via GDI: every glyph advance is rounded to a whole pixel, so the width must be
 * summed in pixels as well - summing fractional font-metrics under-estimates a long text by ~7% & cuts it off.
 * Values are measured via GDI itself (TextRenderer.MeasureText of a char repeated 100 times / 100).
 * The file-format has no auto-width at all: `bestFit` is only a marker and Excel never re-measures such a column */
const charPx: Record<string, number> = {};
const charPxGroups: Array<[number, string]> = [
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
charPxGroups.forEach(([px, chars]) => chars.split("").forEach((c) => (charPx[c] = px)));

/** `BCKPRXbdehnopqu` & non-latin (cyrillic etc.) chars are 8px wide */
const defaultCharPx = 8;

/** Excel's unit of the column width: the widest digit of the default font */
const maxDigitPx = 7;
/** Excel reserves 5px inside a cell (2px padding on both sides + 1px for the border) + 2px as a gap */
const cellPaddingPx = 7;
/** Space for the autoFilter dropdown button in a header cell */
const filterButtonPx = 18;

/** Width of the text in pixels */
const getTextPx = (text: string): number => {
  let px = 0;
  for (let i = 0; i < text.length; ++i) {
    px += charPx[text[i]] ?? defaultCharPx;
  }
  return px;
};

/** Static parts of the document: defined once to avoid re-allocating on every export */
const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const styleSheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"><fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills><fill></fill></fills><borders><border></border></borders><cellStyleXfs><xf/></cellStyleXfs><cellXfs><xf><alignment vertical="top"/></xf><xf><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs/><tableStyles defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/><extLst><ext uri="{EB79DEF2-80B8-43e5-95BD-54CBDDF9020C}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main"><x14:slicerStyles defaultSlicerStyle="SlicerStyleLight1"/></ext><ext uri="{9260A510-F301-46a8-8635-F512D64BE5F5}" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main"><x15:timelineStyles defaultTimelineStyle="TimeSlicerStyleLight1"/></ext></extLst></styleSheet>`;

/** Export pointed data into excel-file according to provided mapping */
export default async function exportToExcel<T>(sheetsData: Array<IExcelSheet<T>>): Promise<Blob> {
  const newLine = String.fromCharCode(10);
  const styles = {
    default: 's="0" ',
    array: 's="1" ',
    getStyle(value: string) {
      return Array.isArray(value) ? styles.array : styles.default;
    },
  };

  const formatIfArray = (value: string): string => {
    if (Array.isArray(value)) return value.join(newLine);
    return value;
  };
  const formatToString = (value: string): string => {
    const v = formatIfArray(value);
    if (v == null) return "";
    return v.toString();
  };

  const arrayMax = (array: number[]): number => {
    let result = 0;
    array.forEach((v) => {
      if (v > result) result = v;
    });
    return result;
  };

  /** Width in pixels of the longest line of the cell */
  const getCellPx = (cell: { value: string; style: string }): number => {
    if (!cell.value) return 0;
    return arrayMax(cell.value.split(newLine).map((line) => getTextPx(line)));
  };

  const getHeaderText = (header: IExcelColumnMap): string => {
    if (header.text !== undefined) {
      return header.text as string;
    }

    return stringPrettify(header.propName as string);
  };

  /** Width in Excel-units by the longest content of the column (rounded to 1/100 to keep the xml small) */
  const getAutoWidth = (rows: IExportConfig["mappedRows"], i: number, headerText: string): number => {
    const contentPx = arrayMax(rows.map((row) => getCellPx(row[i])));
    const headerPx = getTextPx(headerText) + filterButtonPx;
    return Math.ceil(((Math.max(contentPx, headerPx) + cellPaddingPx) / maxDigitPx) * 100) / 100;
  };

  const getSheetConfig = (sheet: IExcelSheet): IExportConfig => {
    const headerKeys = sheet.mapping;

    const config: IExportConfig = {
      columns: headerKeys.map((h) => getHeaderText(h)),
      mappedRows: [],
      mappedColumns: [],
      rows: sheet.data.map((item) => headerKeys.map((h) => exportToExcel.$defaults.getCellValue(h, item[h.propName]))),
    };

    config.mappedRows = config.rows.map((row) =>
      row.map((value) => ({ value: formatToString(value), style: styles.getStyle(value) }))
    );

    config.mappedColumns = config.columns.map((value, i) => {
      const { width, maxWidth } = headerKeys[i];
      return {
        value,
        style: styles.default,
        // an explicit width wins & skips scanning of the rows; otherwise it's defined by the longest content
        width: width ?? Math.min(getAutoWidth(config.mappedRows, i, value), maxWidth ?? Number.MAX_SAFE_INTEGER),
      };
    });

    return config;
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

  const formatRow = (row: Array<{ value: string; style: string }>, index: number): string => {
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
    "xl/styles.xml": styleSheet,
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
};
